const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Listing = require('../models/Listing');
const { encodeGeohash, getGridKey } = require('../utils/spatialUtils');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rentease';
const DEMO_LANDLORD_EMAIL = 'demo.landlord@rentease.com';

const DEMO_LISTINGS = [
  {
    title: 'Bright 2-Bedroom Home in Mirpur',
    location: 'Mirpur-10, Dhaka',
    description: 'A bright, family-friendly two-bedroom home with a quiet balcony, reliable utilities, and easy access to Mirpur-10 metro and local markets.',
    amenities: ['WiFi', 'Generator', 'Lift', 'Parking', 'Balcony', 'Security'],
    price: 22000,
    size: 950,
    propertyType: 'Apartment',
    furnishedStatus: 'Semi-Furnished',
    coordinates: { lat: 23.8069, lng: 90.3687 },
    polygon: [{ lat: 23.8058, lng: 90.3677 }, { lat: 23.8080, lng: 90.3677 }, { lat: 23.8080, lng: 90.3697 }, { lat: 23.8058, lng: 90.3697 }],
    nearbyFacilities: [
      { name: 'Mirpur-10 Metro Station', category: 'Transport', distance: '650 m' },
      { name: 'Mirpur Central Hospital', category: 'Hospitals', distance: '1.2 km' },
      { name: 'Mirpur Shopping Centre', category: 'Shopping', distance: '900 m' },
    ],
  },
  {
    title: 'Cozy Studio near Dhanmondi Lake',
    location: 'Dhanmondi-27, Dhaka',
    description: 'A furnished studio for students or young professionals, close to cafes, universities, public transport, and the walking paths around Dhanmondi Lake.',
    amenities: ['WiFi', 'AC', 'Hot Water', 'Lift', 'Security'],
    price: 18000,
    size: 600,
    propertyType: 'Studio',
    furnishedStatus: 'Furnished',
    coordinates: { lat: 23.7542, lng: 90.3769 },
    polygon: [{ lat: 23.7532, lng: 90.3759 }, { lat: 23.7552, lng: 90.3759 }, { lat: 23.7552, lng: 90.3779 }, { lat: 23.7532, lng: 90.3779 }],
    nearbyFacilities: [
      { name: 'Rabindra Sarobar', category: 'Other', distance: '500 m' },
      { name: 'Dhanmondi Ideal School', category: 'Schools', distance: '800 m' },
      { name: 'Dhanmondi Town Hall Market', category: 'Shopping', distance: '1 km' },
    ],
  },
  {
    title: 'Modern 3-Bedroom Apartment in Uttara',
    location: 'Uttara Sector 7, Dhaka',
    description: 'A spacious three-bedroom apartment with excellent daylight, family amenities, parking, and quick access to Uttara sector parks and the airport road.',
    amenities: ['WiFi', 'Generator', 'Lift', 'Parking', 'Balcony', 'Gas', 'Security'],
    price: 38000,
    size: 1450,
    propertyType: 'Apartment',
    furnishedStatus: 'Semi-Furnished',
    coordinates: { lat: 23.8759, lng: 90.3795 },
    polygon: [{ lat: 23.8747, lng: 90.3783 }, { lat: 23.8771, lng: 90.3783 }, { lat: 23.8771, lng: 90.3807 }, { lat: 23.8747, lng: 90.3807 }],
    nearbyFacilities: [
      { name: 'Uttara North Metro Station', category: 'Transport', distance: '1.1 km' },
      { name: 'Uttara Crescent Hospital', category: 'Hospitals', distance: '900 m' },
      { name: 'Rajuk Uttara Model School', category: 'Schools', distance: '700 m' },
    ],
  },
  {
    title: 'Executive 2-Bedroom Flat in Banani',
    location: 'Banani Block-D, Dhaka',
    description: 'A polished two-bedroom flat in a well-connected neighborhood with a modular kitchen, high-speed internet, lift, generator backup, and dedicated parking.',
    amenities: ['WiFi', 'Generator', 'Lift', 'Parking', 'AC', 'Security', 'CCTV'],
    price: 45000,
    size: 1200,
    propertyType: 'Apartment',
    furnishedStatus: 'Furnished',
    coordinates: { lat: 23.7937, lng: 90.4066 },
    polygon: [{ lat: 23.7925, lng: 90.4054 }, { lat: 23.7949, lng: 90.4054 }, { lat: 23.7949, lng: 90.4078 }, { lat: 23.7925, lng: 90.4078 }],
    nearbyFacilities: [
      { name: 'Banani Lake', category: 'Other', distance: '750 m' },
      { name: 'Banani Super Market', category: 'Shopping', distance: '450 m' },
      { name: 'Banani Clinic', category: 'Hospitals', distance: '1 km' },
    ],
  },
  {
    title: 'Luxury Family Villa in Gulshan',
    location: 'Gulshan-2, Dhaka',
    description: 'A premium family villa with generous living space, a private garden, multiple bedrooms, secure parking, and dependable backup utilities in Gulshan-2.',
    amenities: ['WiFi', 'Generator', 'Parking', 'Balcony', 'AC', 'Security', 'Garden'],
    price: 75000,
    size: 2200,
    propertyType: 'Villa',
    furnishedStatus: 'Furnished',
    coordinates: { lat: 23.7925, lng: 90.4078 },
    polygon: [{ lat: 23.7912, lng: 90.4065 }, { lat: 23.7938, lng: 90.4065 }, { lat: 23.7938, lng: 90.4091 }, { lat: 23.7912, lng: 90.4091 }],
    nearbyFacilities: [
      { name: 'Gulshan Lake Park', category: 'Other', distance: '600 m' },
      { name: 'Gulshan 2 Circle', category: 'Transport', distance: '500 m' },
      { name: 'Gulshan Shopping Centre', category: 'Shopping', distance: '850 m' },
    ],
  },
];

async function seedDemo() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB: ${MONGO_URI.replace(/:\/\/.*@/, '://***@')}`);

    const password = await bcrypt.hash('Demo1234', 10);
    const landlord = await User.findOneAndUpdate(
      { email: DEMO_LANDLORD_EMAIL },
      {
        firstName: 'Demo',
        lastName: 'Landlord',
        email: DEMO_LANDLORD_EMAIL,
        password,
        role: 'landlord',
        isVerifiedLandlord: true,
        isOtpVerified: true,
        isFirstLogin: false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const titles = DEMO_LISTINGS.map(({ title }) => title);
    await Listing.deleteMany({ title: { $in: titles } });

    const listings = DEMO_LISTINGS.map((listing) => ({
      ...listing,
      geohash: encodeGeohash(listing.coordinates.lat, listing.coordinates.lng, 5),
      gridKey: getGridKey(listing.coordinates.lat, listing.coordinates.lng),
      photos: [],
      status: 'approved',
      landlordId: landlord._id,
      bookedDates: [],
    }));

    await Listing.insertMany(listings);
    console.log(`Seeded ${listings.length} approved demo listings.`);
    console.log('Demo tenant: demo.user@rentease.com (the client opens this portal automatically)');
    console.log('Demo landlord: demo.landlord@rentease.com / Demo1234');
  } catch (error) {
    console.error('Demo seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedDemo();
