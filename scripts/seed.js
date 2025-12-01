// scripts/seed.js
const mongoose = require('mongoose');
require('dotenv').config();

const Ambulance = require('../models/Ambulance');
const Hospital = require('../models/Hospital');
const Emergency = require('../models/Emergency');

//
// 🚑 UPDATED AMBULANCE DATA (FIXED)
// - added driverPhone (required field)
// - status changed to lowercase ("available")
// - structure matches Ambulance.js
//
const ambulances = [
  {
    driverName: 'Vikki',
    driverPhone: '9876543210',
    vehicleNumber: 'KA-23-A-1001',
    status: 'available',
    location: { type: 'Point', coordinates: [74.58, 16.42] }
  },
  {
    driverName: 'Tukky',
    driverPhone: '9876501234',
    vehicleNumber: 'KA-23-A-1002',
    status: 'available',
    location: { type: 'Point', coordinates: [74.60, 16.44] }
  },
  {
    driverName: 'Ramesh',
    driverPhone: '9988776655',
    vehicleNumber: 'KA-22-B-3344',
    status: 'available',
    location: { type: 'Point', coordinates: [74.49, 15.85] }
  },
  {
    driverName: 'Suhas',
    driverPhone: '9123456789',
    vehicleNumber: 'KA-24-C-9876',
    status: 'available',
    location: { type: 'Point', coordinates: [74.63, 16.40] }
  },
  {
    driverName: 'Mahesh',
    driverPhone: '9090909090',
    vehicleNumber: 'KA-23-Z-5555',
    status: 'available',
    location: { type: 'Point', coordinates: [74.52, 15.90] }
  }
];

//
// 🏥 HOSPITAL DATA (NO CHANGE NEEDED)
//
const hospitals = [
  {
    name: 'Omkar Hospital, Chikodi',
    address: 'Belgaum Naka, Nipani, Karnataka 591222',
    contactNumber: '9845123456',
    availableBeds: 12,
    location: { type: 'Point', coordinates: [74.3786, 16.4042] }
  },
  {
    name: 'Prajwal Hospital, Belagavi',
    address: 'Nehru Nagar, Belagavi, Karnataka 590010',
    contactNumber: '9012345678',
    availableBeds: 20,
    location: { type: 'Point', coordinates: [74.520, 15.888] }
  },
  {
    name: 'KLE Hospital, Belagavi',
    address: 'KLE Campus, Belagavi, Karnataka',
    contactNumber: '9112233445',
    availableBeds: 5,
    location: { type: 'Point', coordinates: [74.508, 15.860] }
  },
  {
    name: 'City Hospital, Nippani',
    address: 'Main Road, Nippani, Karnataka',
    contactNumber: '9988776655',
    availableBeds: 10,
    location: { type: 'Point', coordinates: [74.39, 16.40] }
  },
  {
    name: 'Government Hospital, Chikodi',
    address: 'Chikodi City, Karnataka',
    contactNumber: '9090909090',
    availableBeds: 8,
    location: { type: 'Point', coordinates: [74.60, 16.43] }
  }
];

//
//
// 🌱 SEED FUNCTION
//
const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for seeding...');

    // Clear data
    await Promise.all([
      Ambulance.deleteMany({}),
      Hospital.deleteMany({}),
      Emergency.deleteMany({})
    ]);
    console.log('🧹 Old data cleared.');

    // Insert hospitals + ambulances
    const createdHospitals = await Hospital.insertMany(hospitals);
    const createdAmbulances = await Ambulance.insertMany(ambulances);

    console.log('🏥 Hospitals + 🚑 Ambulances inserted.');

    //
    // 🚨 EMERGENCY SEED SAMPLE DATA
    //
    const emergencies = [
      {
        description: "Road accident near Rani Channamma University.",
        aiSummary: "Two injured, one unconscious. Immediate help required.",
        location: { type: "Point", coordinates: [74.515, 15.862] },
        guestContact: "9876543210",
        severity: "High",
        assignedHospital: createdHospitals[1]._id,
        assignedAmbulance: createdAmbulances[0]._id,
        trackingToken: "BEL-ACC-001",
        status: "Dispatched"
      },
      {
        description: "Fire injury near Chikodi Market.",
        aiSummary: "Severe burns; urgent treatment needed.",
        location: { type: "Point", coordinates: [74.59, 16.42] },
        guestContact: "9876501234",
        severity: "High",
        assignedHospital: createdHospitals[0]._id,
        assignedAmbulance: createdAmbulances[1]._id,
        trackingToken: "CHK-FIR-002",
        status: "Pending"
      },
      {
        description: "Heart attack case at Nippani Bus Stand.",
        aiSummary: "Senior citizen collapsed; CPR required.",
        location: { type: "Point", coordinates: [74.39, 16.39] },
        guestContact: "9988776655",
        severity: "High",
        assignedHospital: createdHospitals[3]._id,
        assignedAmbulance: createdAmbulances[2]._id,
        trackingToken: "NIP-HRT-003",
        status: "OnRoute"
      },
      {
        description: "Bike accident near KLE Hospital Road.",
        aiSummary: "Young man with leg fracture.",
        location: { type: "Point", coordinates: [74.507, 15.861] },
        guestContact: "9090909090",
        severity: "Medium",
        assignedHospital: createdHospitals[2]._id,
        assignedAmbulance: createdAmbulances[3]._id,
        trackingToken: "BEL-BIK-004",
        status: "Arrived"
      },
      {
        description: "Child injured after falling from stairs in school.",
        aiSummary: "Possible head injury; immediate attention required.",
        location: { type: "Point", coordinates: [74.60, 16.44] },
        guestContact: "9123456789",
        severity: "Medium",
        assignedHospital: createdHospitals[4]._id,
        assignedAmbulance: createdAmbulances[4]._id,
        trackingToken: "CHK-CHD-005",
        status: "Admitted"
      }
    ];

    await Emergency.insertMany(emergencies);
    console.log('🚨 Emergencies inserted!');

  } catch (err) {
    console.error('❌ Error seeding DB:', err);

    if (err && err.errors) {
      console.error('Validation errors:');
      for (const key of Object.keys(err.errors)) {
        console.error(` - ${key}:`, err.errors[key].message || err.errors[key]);
      }
    }

  } finally {
    await mongoose.connection.close();
    console.log('🔒 Connection closed.');
  }
};

seedDatabase();
