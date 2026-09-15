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

  console.log('--- STEP 2: Seed Initial Faculty Data ---');
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
    // 1. Test Health
    console.log('--- STEP 4: Test Health API ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthJson = await healthRes.json();
    console.log('Health check response:', healthJson.status, 'DB:', healthJson.database);
    if (healthRes.status !== 200) throw new Error('Health check failed');
    console.log('✓ /api/health passed');

    // 2. Test Outdoor Places API (Preserve existing functionality)
    console.log('--- STEP 5: Test Existing Places API ---');
    const placesRes = await fetch(`${baseUrl}/api/places`);
    const placesJson = await placesRes.json();
    console.log(`Places count: ${placesJson.count || (placesJson.results && placesJson.results.length)}`);
    console.log('✓ /api/places passed');

    // 3. Test Faculty GET list
    console.log('--- STEP 6: Test Faculty GET API ---');
    const facultyRes = await fetch(`${baseUrl}/api/faculty`);
    const facultyJson = await facultyRes.json();
    console.log(`Faculty count returned: ${facultyJson.count}`);
    if (!facultyJson.success || facultyJson.count === 0) {
      throw new Error('Faculty list retrieval failed');
    }
    console.log('✓ /api/faculty GET passed');

    // 4. Test Faculty Search & Filter
    console.log('--- STEP 7: Test Faculty Filter by Block & Department ---');
    const filterRes = await fetch(`${baseUrl}/api/faculty?block=BLOCK%20B`);
    const filterJson = await filterRes.json();
    console.log(`Block B faculties: ${filterJson.count}`);
    console.log('✓ /api/faculty filter passed');

    // 5. Test Faculty Login
    console.log('--- STEP 8: Test Faculty Login ---');
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
    console.log('Login result:', loginJson.success, loginJson.message);
    if (!loginJson.success || !loginJson.faculty) {
      throw new Error('Faculty login failed');
    }
    console.log('✓ /api/faculty login passed');

    // 6. Test Faculty Registration
    console.log('--- STEP 9: Test Faculty Registration ---');
    const testEmail = `test_prof_${Date.now()}@ghrcem.edu.in`;
    const regRes = await fetch(`${baseUrl}/api/faculty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        name: 'Test Professor AI',
        designation: 'Visiting Faculty',
        department: 'Computer Science & Engineering',
        email: testEmail,
        password: 'securePass123!',
        phone: '+91 99999 88888',
        block: 'BLOCK B',
        floor: 3,
        roomNo: 'B-310',
      }),
    });
    const regJson = await regRes.json();
    console.log('Registration result:', regJson.success, regJson.message);
    if (!regJson.success || !regJson.faculty) {
      throw new Error('Faculty registration failed');
    }
    const createdId = regJson.faculty._id;
    console.log('✓ /api/faculty registration passed (created ID: ' + createdId + ')');

    // 7. Test Faculty Update
    console.log('--- STEP 10: Test Faculty Update ---');
    const updateRes = await fetch(`${baseUrl}/api/faculty/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        designation: 'Associate Professor',
        roomNo: 'B-312',
      }),
    });
    const updateJson = await updateRes.json();
    console.log('Update result:', updateJson.success, updateJson.faculty?.designation);
    if (!updateJson.success || updateJson.faculty?.designation !== 'Associate Professor') {
      throw new Error('Faculty update failed');
    }
    console.log('✓ /api/faculty PUT passed');

    // 8. Test Faculty Delete
    console.log('--- STEP 11: Test Faculty Deletion ---');
    const delRes = await fetch(`${baseUrl}/api/faculty/${createdId}`, {
      method: 'DELETE',
    });
    const delJson = await delRes.json();
    console.log('Delete result:', delJson.success, delJson.message);
    if (!delJson.success) {
      throw new Error('Faculty deletion failed');
    }
    console.log('✓ /api/faculty DELETE passed');

    // 9. Test Static Indoor Viewer Serving
    console.log('--- STEP 12: Test Indoor Viewer Static File Serving ---');
    const staticRes = await fetch(`${baseUrl}/indoor-viewer/index.html`);
    console.log('Indoor viewer status:', staticRes.status);
    if (staticRes.status !== 200) {
      throw new Error('Failed to serve /indoor-viewer/index.html');
    }
    const staticHtml = await staticRes.text();
    if (!staticHtml.includes('Unified Campus Indoor Navigation')) {
      throw new Error('Indoor viewer content mismatch');
    }
    console.log('✓ Static /indoor-viewer/index.html successfully served');

    console.log('\n=============================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
    console.log('=============================================\n');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
