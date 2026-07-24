/**
 * seed-admin-demo.js
 * ──────────────────
 * Seeds the RentEase database with faculty-demo data.
 *
 * Run:  npm run seed:admin  (from the /server directory)
 *
 * Creates:
 *   1 Admin user
 *   1 Demo User (for complaint submission from the UI)
 *   3 Landlords          (isVerified: false — for the verification queue)
 *   3 Listings           (status: 'pending' — for the approval queue)
 *   3 Complaints         (one each: Pending, In Review, Resolved)
 *
 * Existing demo records with the same emails/titles are deleted first
 * so you can re-run the script safely without duplicates.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const User      = require('../models/User');
const Listing   = require('../models/Listing');
const Complaint = require('../models/Complaint');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rentease';

// ── Demo account emails (used for cleanup before re-seed) ─────
const DEMO_EMAILS = [
  'admin@rentease.com',
  'demo.user@rentease.com',
  'alice.rahman@landlord.com',
  'bob.hasan@landlord.com',
  'carol.islam@landlord.com',
];

const DEMO_LISTING_TITLES = [
  'Luxurious 3BHK in Gulshan',
  'Cozy Studio in Dhanmondi',
  'Modern 2BHK in Banani',
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('\n✅ Connected to MongoDB →', MONGO_URI);

    // ── Clean existing demo data ───────────────────────────────
    console.log('🗑️  Removing previous demo records…');
    const oldUsers = await User.find({ email: { $in: DEMO_EMAILS } }).select('_id');
    const oldIds   = oldUsers.map(u => u._id);

    await Complaint.deleteMany({ submittedBy: { $in: oldIds } });
    await Listing.deleteMany({ title: { $in: DEMO_LISTING_TITLES } });
    await User.deleteMany({ email: { $in: DEMO_EMAILS } });
    console.log('   Done.');

    // ── Hash a shared demo password ────────────────────────────
    const SALT       = 10;
    const adminHash  = await bcrypt.hash('Admin1234', SALT);
    const userHash   = await bcrypt.hash('User1234',  SALT);

    // ── 1. Admin ───────────────────────────────────────────────
    await User.create({
      firstName: 'Super',
      lastName:  'Admin',
      email:     'admin@rentease.com',
      password:  adminHash,
      role:      'admin',
      isVerified: true,
      verificationStatus: 'approved',
    });
    console.log('👤 Admin created:      admin@rentease.com  /  Admin1234');

    // ── 2. Demo User (for complaint submission) ────────────────
    const demoUser = await User.create({
      firstName: 'Demo',
      lastName:  'User',
      email:     'demo.user@rentease.com',
      password:  userHash,
      role:      'user',
      isVerified: true,
      verificationStatus: 'approved',
    });
    console.log('👤 Demo user created:  demo.user@rentease.com  /  User1234');

    // ── 3. Three unverified Landlords ─────────────────────────
    const landlords = await User.insertMany([
      {
        firstName: 'Alice',   lastName: 'Rahman',
        email:    'alice.rahman@landlord.com',
        password:  adminHash,
        role:      'landlord',
        isVerified: false, verificationStatus: 'pending',
      },
      {
        firstName: 'Bob',     lastName: 'Hasan',
        email:    'bob.hasan@landlord.com',
        password:  adminHash,
        role:      'landlord',
        isVerified: false, verificationStatus: 'pending',
      },
      {
        firstName: 'Carol',   lastName: 'Islam',
        email:    'carol.islam@landlord.com',
        password:  adminHash,
        role:      'landlord',
        isVerified: false, verificationStatus: 'pending',
      },
    ]);
    console.log('🏢 3 Landlords created (unverified)');

    // ── 4. Three pending Listings ──────────────────────────────
    const listings = await Listing.insertMany([
      {
        title:       'Luxurious 3BHK in Gulshan',
        location:    'Gulshan-2, Dhaka',
        description: 'A stunning fully-furnished 3-bedroom apartment with modern amenities, 24/7 security, a rooftop garden, and a dedicated car park. Perfect for families looking for premium urban living.',
        amenities:   ['WiFi', 'Generator Backup', 'Parking', 'Security Guard', 'Gym', 'Rooftop Garden', 'Lift'],
        price:       75000,
        photos:      [],
        status:      'pending',
        landlordId:  landlords[0]._id,
      },
      {
        title:       'Cozy Studio in Dhanmondi',
        location:    'Dhanmondi-27, Dhaka',
        description: 'A beautifully designed studio apartment ideal for students and young professionals. Walking distance to Rabindra Sarobar lake, restaurants, cafes, and public transport.',
        amenities:   ['WiFi', 'AC', 'Hot Water', 'Security Camera'],
        price:       18000,
        photos:      [],
        status:      'pending',
        landlordId:  landlords[1]._id,
      },
      {
        title:       'Modern 2BHK in Banani',
        location:    'Banani Block-D, Dhaka',
        description: 'A well-lit, spacious 2-bedroom apartment in the heart of Banani. Features a European-style modular kitchen, high-speed fibre internet, and a calm, tree-lined street view.',
        amenities:   ['WiFi', 'Generator', 'Lift', 'Parking', 'Security Camera', 'Intercom'],
        price:       45000,
        photos:      [],
        status:      'pending',
        landlordId:  landlords[2]._id,
      },
    ]);
    console.log('📋 3 Listings created  (status: pending)');

    // ── 5. Three Complaints ────────────────────────────────────
    await Complaint.insertMany([
      {
        title:        'Landlord refusing to return security deposit',
        description:  'My landlord has refused to return my BDT 50,000 security deposit for 3 months after I vacated the property. He claims there were damages but has not provided any photographic or written evidence to support this claim.',
        status:       'Pending',
        submittedBy:  demoUser._id,
        relatedListingId: listings[0]._id,
        resolutionNote: '',
      },
      {
        title:        'False listing information — property not as described',
        description:  'The listing explicitly stated that the apartment has a generator backup. However, there is no generator in the building. The landlord refuses to acknowledge this discrepancy despite multiple written communications via email and SMS.',
        status:       'In Review',
        submittedBy:  demoUser._id,
        relatedListingId: listings[1]._id,
        resolutionNote: 'Admin has formally contacted the landlord for clarification. Awaiting response within 48 business hours. Complaint elevated from Pending.',
      },
      {
        title:        'Unauthorized entry by property owner',
        description:  'The landlord has entered my apartment multiple times without prior notice or tenant consent, in direct violation of Clause 7 of our rental agreement and my privacy rights under the Tenancy Act.',
        status:       'Resolved',
        submittedBy:  demoUser._id,
        relatedListingId: listings[2]._id,
        resolutionNote: 'After mediation, the landlord acknowledged the violation and signed a written commitment letter. A formal warning was issued and recorded. Case closed.',
        resolvedAt:   new Date(),
      },
    ]);
    console.log('📣 3 Complaints created (Pending | In Review | Resolved)');

    // ── Summary ────────────────────────────────────────────────
    console.log('\n' + '━'.repeat(54));
    console.log('🌱  Seed complete! Open http://localhost:5173');
    console.log('━'.repeat(54));
    console.log('  Role Switcher → Admin   to see the dashboard');
    console.log('  Role Switcher → User    to submit a complaint');
    console.log('━'.repeat(54) + '\n');

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('   MongoDB is not running. Start it with: mongod');
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seed();
