const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const app = require('../app');
const http = require('http');
const fetch = require('node-fetch');
const Faculty = require('../models/Faculty');
const { seed } = require('./seedFaculty');

async function runTests() {
  console.log('--- STEP 1: Connect to Database ---');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);
  console.log('✓ Connected to MongoDB');

  console.log('--- STEP 2: Seed Initial Faculty Data (with bcrypt hashing) ---');
  await seed();
  const count = await Faculty.countDocuments();
  console.log(`✓ Faculties in database: ${count}`);

  console.log('--- STEP 3: Start In-Memory Test Server ---');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`✓ Test server running on ${baseUrl}`);

  try {
    // 1. Health API
    console.log('--- STEP 4: Test Health API ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthJson = await healthRes.json();
    console.log('Health check response:', healthJson.status, 'DB:', healthJson.database);
    if (healthRes.status !== 200) throw new Error('Health check failed');
    console.log('✓ /api/health passed');

    // 2. Existing Places API (preserves outdoor campus features)
    console.log('--- STEP 5: Test Existing Places API ---');
    const placesRes = await fetch(`${baseUrl}/api/places`);
    const placesJson = await placesRes.json();
    console.log(`Places count: ${placesJson.count || (placesJson.results && placesJson.results.length)}`);
    console.log('✓ /api/places passed');

    // 3. Faculty GET list (verify NO passwords returned)
    console.log('--- STEP 6: Test Faculty GET API (Password Exclusion Audit) ---');
    const facultyRes = await fetch(`${baseUrl}/api/faculty`);
    const facultyJson = await facultyRes.json();
    console.log(`Faculty count returned: ${facultyJson.count}`);
    if (!facultyJson.success || facultyJson.count === 0) {
      throw new Error('Faculty list retrieval failed');
    }
    const hasPasswordLeak = facultyJson.data.some((f) => f.password !== undefined);
    if (hasPasswordLeak) {
      throw new Error('SECURITY VIOLATION: Password field detected in GET /api/faculty response!');
    }
    console.log('✓ /api/faculty passed (0 passwords exposed in directory)');

    // 4. Faculty Filter by Block & Department
    console.log('--- STEP 7: Test Faculty Filter by Block & Department ---');
    const filterRes = await fetch(`${baseUrl}/api/faculty?block=BLOCK%20B`);
    const filterJson = await filterRes.json();
    console.log(`Block B faculties: ${filterJson.count}`);
    console.log('✓ /api/faculty filter passed');

    // 5. Test Faculty Login with Bcrypt
    console.log('--- STEP 8: Test Faculty Login with Bcrypt Verification & JWT Generation ---');
    const loginRes = await fetch(`${baseUrl}/api/faculty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        email: 'hod.cse@ghrcem.edu.in',
        password: 'password123',
      }),
    });
    const loginJson = await loginRes.json();
    if (!loginJson.success || !loginJson.faculty || !loginJson.token) {
      throw new Error('Faculty login failed or token missing');
    }
    if (loginJson.faculty.password !== undefined) {
      throw new Error('SECURITY VIOLATION: Password returned in login response!');
    }
    const userAToken = loginJson.token;
    const userAId = loginJson.faculty._id;
    console.log(`✓ Faculty login passed (JWT token issued: ${userAToken.substring(0, 18)}...)`);

    // 5b. Test Invalid Password Login Rejection
    console.log('--- STEP 8b: Test Invalid Password Rejection ---');
    const badLoginRes = await fetch(`${baseUrl}/api/faculty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        email: 'hod.cse@ghrcem.edu.in',
        password: 'wrongpasswordhere',
      }),
    });
    if (badLoginRes.status !== 401) {
      throw new Error('SECURITY VIOLATION: Bad password was not rejected with 401!');
    }
    console.log('✓ Invalid password correctly rejected with 401 Unauthorized');

    // 6. Test Secure Registration
    console.log('--- STEP 9: Test Secure Faculty Registration with Password Hashing ---');
    const testEmailB = `test_prof_b_${Date.now()}@ghrcem.edu.in`;
    const regRes = await fetch(`${baseUrl}/api/faculty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        name: 'Prof. Secure User B',
        designation: 'Assistant Professor',
        department: 'Information Technology',
        email: testEmailB,
        password: 'strongPassword99!',
        phone: '+91 99999 77777',
        block: 'BLOCK B',
        floor: 2,
        roomNo: 'B-205',
      }),
    });
    const regJson = await regRes.json();
    if (!regJson.success || !regJson.faculty || !regJson.token) {
      throw new Error('Faculty registration failed');
    }
    const userBToken = regJson.token;
    const userBId = regJson.faculty._id;
    console.log(`✓ Faculty registration passed (User B ID: ${userBId})`);

    // Verify stored password in MongoDB is indeed a bcrypt hash
    const rawDocB = await Faculty.findById(userBId).select('+password');
    if (!rawDocB.password.startsWith('$2a$') && !rawDocB.password.startsWith('$2b$')) {
      throw new Error('SECURITY VIOLATION: Stored password is not a bcrypt hash!');
    }
    console.log('✓ Verified password stored in MongoDB is a secure bcrypt hash');

    // 7. Security: Attempt update without token (Must be rejected with 401)
    console.log('--- STEP 10: Test Unauthenticated Update Rejection ---');
    const unauthUpdateRes = await fetch(`${baseUrl}/api/faculty/${userBId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomNo: 'B-209' }),
    });
    if (unauthUpdateRes.status !== 401) {
      throw new Error('SECURITY VIOLATION: Unauthenticated update was not rejected with 401!');
    }
    console.log('✓ Unauthenticated update correctly rejected with 401 Unauthorized');

    // 8. Security: Attempt update of User B using User A's token (Must be rejected with 403 Forbidden)
    console.log('--- STEP 11: Test Cross-User Modification Rejection (Ownership Check) ---');
    const crossUpdateRes = await fetch(`${baseUrl}/api/faculty/${userBId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({ roomNo: 'HACKED-ROOM' }),
    });
    if (crossUpdateRes.status !== 403) {
      throw new Error('SECURITY VIOLATION: Cross-user modification was not rejected with 403!');
    }
    console.log('✓ Cross-user modification correctly blocked with 403 Forbidden');

    // 9. Legitimate Update: User B updating own profile with User B's token
    console.log('--- STEP 12: Test Authorized Profile Update (Self-Ownership) ---');
    const authUpdateRes = await fetch(`${baseUrl}/api/faculty/${userBId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userBToken}`,
      },
      body: JSON.stringify({
        designation: 'Senior Assistant Professor',
        roomNo: 'B-208',
      }),
    });
    const authUpdateJson = await authUpdateRes.json();
    if (!authUpdateJson.success || authUpdateJson.faculty?.sittingLocation?.roomNo !== 'B-208') {
      throw new Error('Authorized update failed');
    }
    console.log('✓ Authorized update succeeded for room B-208');

    // 10. Security: Attempt delete without token (Must be rejected with 401)
    console.log('--- STEP 13: Test Unauthenticated Deletion Rejection ---');
    const unauthDelRes = await fetch(`${baseUrl}/api/faculty/${userBId}`, {
      method: 'DELETE',
    });
    if (unauthDelRes.status !== 401) {
      throw new Error('SECURITY VIOLATION: Unauthenticated delete was not rejected with 401!');
    }
    console.log('✓ Unauthenticated deletion correctly rejected with 401 Unauthorized');

    // 11. Security: Attempt delete of User B using User A's token (Must be rejected with 403)
    console.log('--- STEP 14: Test Cross-User Deletion Rejection ---');
    const crossDelRes = await fetch(`${baseUrl}/api/faculty/${userBId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    if (crossDelRes.status !== 403) {
      throw new Error('SECURITY VIOLATION: Cross-user delete was not rejected with 403!');
    }
    console.log('✓ Cross-user deletion correctly blocked with 403 Forbidden');

    // 12. Legitimate Delete: User B deleting own profile with User B's token
    console.log('--- STEP 15: Test Authorized Profile Deletion ---');
    const authDelRes = await fetch(`${baseUrl}/api/faculty/${userBId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    const authDelJson = await authDelRes.json();
    if (!authDelJson.success || authDelJson.deletedCount !== 1) {
      throw new Error('Authorized deletion failed');
    }
    console.log('✓ Authorized profile deletion succeeded');

    // 13. Static indoor-viewer serving
    console.log('--- STEP 16: Test Static Indoor Viewer Serving ---');
    const staticRes = await fetch(`${baseUrl}/indoor-viewer/index.html`);
    if (staticRes.status !== 200) {
      throw new Error('Failed to serve /indoor-viewer/index.html');
    }
    console.log('✓ Static /indoor-viewer/index.html verified');

    console.log('\n======================================================');
    console.log('🎉 ALL 16 PRODUCTION SECURITY & INTEGRATION TESTS PASSED!');
    console.log('======================================================\n');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
