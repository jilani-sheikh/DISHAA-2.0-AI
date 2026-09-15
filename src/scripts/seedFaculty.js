const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const Faculty = require('../models/Faculty');

const initialFaculties = [
  {
    name: 'Dr. A. K. Sharma',
    designation: 'HOD & Senior Professor',
    department: 'Computer Science & Engineering',
    email: 'hod.cse@ghrcem.edu.in',
    phone: '+91 98765 43210',
    password: 'password123',
    role: 'faculty',
    sittingLocation: { block: 'BLOCK C', floor: 0, roomNo: 'C-005' },
  },
  {
    name: 'Prof. Rajesh Verma',
    designation: 'Assistant Professor',
    department: 'Artificial Intelligence & Data Science',
    email: 'rajesh.verma@ghrcem.edu.in',
    phone: '+91 98765 43211',
    password: 'password123',
    role: 'faculty',
    sittingLocation: { block: 'BLOCK A', floor: 0, roomNo: 'A-102' },
  },
  {
    name: 'Dr. Sunita Deshmukh',
    designation: 'Associate Professor',
    department: 'Information Technology',
    email: 'sunita.d@ghrcem.edu.in',
    phone: '+91 98765 43212',
    password: 'password123',
    role: 'faculty',
    sittingLocation: { block: 'BLOCK B', floor: 1, roomNo: 'B-108' },
  },
  {
    name: 'Prof. Manoj Kulkarni',
    designation: 'Assistant Professor',
    department: 'Mechanical Engineering',
    email: 'manoj.k@ghrcem.edu.in',
    phone: '+91 98765 43213',
    password: 'password123',
    role: 'faculty',
    sittingLocation: { block: 'BLOCK C', floor: 0, roomNo: 'C-010' },
  },
  {
    name: 'Dr. Priya Nair',
    designation: 'Professor',
    department: 'Electronics & Telecommunication',
    email: 'priya.nair@ghrcem.edu.in',
    phone: '+91 98765 43214',
    password: 'password123',
    role: 'faculty',
    sittingLocation: { block: 'BLOCK B', floor: 2, roomNo: 'B-210' },
  },
  {
    name: 'Dr. Sneha Patil',
    designation: 'Associate Professor',
    department: 'Computer Science & Engineering',
    email: 'sneha.patil@ghrcem.edu.in',
    phone: '+91 98765 43215',
    password: 'password123',
    role: 'faculty',
    sittingLocation: { block: 'BLOCK B', floor: 4, roomNo: 'B-404' },
  },
];

async function seed() {
  const shouldManageConnection = mongoose.connection.readyState === 0;
  if (shouldManageConnection) {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dishaa';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected.');
  }

  for (const fac of initialFaculties) {
    const existing = await Faculty.findOne({ email: fac.email }).select('+password');
    const hashedPassword = await bcrypt.hash(fac.password, 10);

    if (!existing) {
      await Faculty.create({
        ...fac,
        password: hashedPassword,
      });
      console.log(`Created faculty with hashed password: ${fac.name}`);
    } else {
      // If legacy unhashed password exists, upgrade it
      if (!existing.password || (!existing.password.startsWith('$2a$') && !existing.password.startsWith('$2b$'))) {
        existing.password = hashedPassword;
        await existing.save();
        console.log(`Upgraded existing faculty password to bcrypt: ${fac.name}`);
      } else {
        console.log(`Faculty already secured: ${fac.name}`);
      }
    }
  }

  console.log('Seeding completed.');
  if (shouldManageConnection && require.main === module) {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
}

module.exports = { seed, initialFaculties };
