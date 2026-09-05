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
const RentPayment = require('../models/RentPayment');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const Notification = require('../models/Notification');
const Agreement = require('../models/Agreement');
const { generateAgreementPdf } = require('../services/agreementPdfService');


const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rentease';

// ── Demo account emails (used for cleanup before re-seed) ─────
const DEMO_EMAILS = [
  'admin@rentease.com',
  'admin2@rentease.com',
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

    // ── 1. Admins ──────────────────────────────────────────────
    await User.create({
      firstName: 'Super',
      lastName:  'Admin',
      email:     'admin@rentease.com',
      password:  adminHash,
      role:      'admin',
      isVerified: true,
      isOtpVerified: true,
      isVerifiedLandlord: true,
      verificationStatus: 'approved',
    });

    await User.create({
      firstName: 'Secondary',
      lastName:  'Admin',
      email:     'admin2@rentease.com',
      password:  adminHash,
      role:      'admin',
      isOtpVerified: true,
      isVerifiedLandlord: true,
    });
    console.log('👤 Admin 1 created:    admin@rentease.com  /  Admin1234');
    console.log('👤 Admin 2 created:    admin2@rentease.com /  Admin1234');

    // ── 2. Demo User (for complaint submission) ────────────────
    const demoUser = await User.create({
      firstName: 'Demo',
      lastName:  'User',
      email:     'demo.user@rentease.com',
      password:  userHash,
      role:      'user',
      isVerified: true,
      isOtpVerified: true,
      isVerifiedLandlord: true,
      verificationStatus: 'approved',
    });

    console.log('👤 Demo user created:  demo.user@rentease.com  /  User1234');

    // ── 3. Landlords ──────────────────────────────────────────
    const landlords = await User.insertMany([
      {
        firstName: 'Alice',   lastName: 'Rahman',
        email:    'alice.rahman@landlord.com',
        password:  adminHash,
        role:      'landlord',
        isVerifiedLandlord: true,
        isOtpVerified: true,
      },
      {
        firstName: 'Bob',     lastName: 'Hasan',
        email:    'bob.hasan@landlord.com',
        password:  adminHash,
        role:      'landlord',
        isVerifiedLandlord: true,
        isOtpVerified: true,
      },
      {
        firstName: 'Carol',   lastName: 'Islam',
        email:    'carol.islam@landlord.com',
        password:  adminHash,
        role:      'landlord',
        isVerifiedLandlord: false,
        isOtpVerified: true,
      },
    ]);
    console.log('🏢 3 Landlords created (2 Verified, 1 Pending)');

    // ── 4. Three pending Listings ──────────────────────────────
    const listings = await Listing.insertMany([
      {
        title:       'Luxurious 3BHK in Gulshan',
        location:    'Gulshan-2, Dhaka',
        description: 'A stunning fully-furnished 3-bedroom apartment with modern amenities, 24/7 security, a rooftop garden, and a dedicated car park. Perfect for families looking for premium urban living.',
        amenities:   ['WiFi', 'Generator Backup', 'Parking', 'Security Guard', 'Gym', 'Rooftop Garden', 'Lift'],
        price:       75000,
        size:        1800,
        propertyType: 'Apartment',
        furnishedStatus: 'Furnished',
        coordinates: { lat: 23.7925, lng: 90.4078 },
        polygon:     [{ lat: 23.791, lng: 90.406 }, { lat: 23.794, lng: 90.406 }, { lat: 23.794, lng: 90.409 }, { lat: 23.791, lng: 90.409 }],
        geohash:     'wh0r7',
        gridKey:     'grid_23.750_90.400',
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
        size:        600,
        propertyType: 'Studio',
        furnishedStatus: 'Furnished',
        coordinates: { lat: 23.7542, lng: 90.3769 },
        polygon:     [{ lat: 23.752, lng: 90.374 }, { lat: 23.756, lng: 90.374 }, { lat: 23.756, lng: 90.378 }, { lat: 23.752, lng: 90.378 }],
        geohash:     'wh0r2',
        gridKey:     'grid_23.750_90.350',
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
        size:        1200,
        propertyType: 'Apartment',
        furnishedStatus: 'Semi-Furnished',
        coordinates: { lat: 23.7937, lng: 90.4066 },
        polygon:     [{ lat: 23.792, lng: 90.404 }, { lat: 23.795, lng: 90.404 }, { lat: 23.795, lng: 90.408 }, { lat: 23.792, lng: 90.408 }],
        geohash:     'wh0r7',
        gridKey:     'grid_23.750_90.400',
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

    // ── 6. Sample Rent Payments (Paid, Due, Overdue) ───────────
    await RentPayment.deleteMany({});
    const pastDueDate = new Date();
    pastDueDate.setDate(pastDueDate.getDate() - 5); // 5 days ago (overdue)

    const futureDueDate = new Date();
    futureDueDate.setDate(futureDueDate.getDate() + 7); // 7 days in future (due)

    await RentPayment.insertMany([
      {
        tenantId: demoUser._id.toString(),
        tenantName: 'Demo User',
        tenantEmail: 'demo.user@rentease.com',
        landlordId: landlords[0]._id.toString(),
        landlordName: 'Alice Rahman',
        listingId: listings[0]._id,
        listingTitle: 'Luxurious 3BHK in Gulshan',
        month: '2026-08',
        amount: 37500,
        bookedDays: 15,
        dailyRate: 2500,
        dueDate: new Date('2026-08-05'),
        status: 'paid',
        paidDate: new Date('2026-08-03'),
        paymentMethod: 'Bank Transfer',
        notes: '15 days booked (15 days @ ৳2,500/day). August rent paid on time.',
        overdueFlagged: false,
      },
      {
        tenantId: demoUser._id.toString(),
        tenantName: 'Demo User',
        tenantEmail: 'demo.user@rentease.com',
        landlordId: landlords[0]._id.toString(),
        landlordName: 'Alice Rahman',
        listingId: listings[0]._id,
        listingTitle: 'Luxurious 3BHK in Gulshan',
        month: '2026-09',
        amount: 25000,
        bookedDays: 10,
        dailyRate: 2500,
        dueDate: pastDueDate,
        status: 'overdue',
        paidDate: null,
        paymentMethod: 'Cash',
        notes: '10 days booked (10 days @ ৳2,500/day). September rent overdue.',
        overdueFlagged: true,
      },
      {
        tenantId: demoUser._id.toString(),
        tenantName: 'Demo User',
        tenantEmail: 'demo.user@rentease.com',
        landlordId: landlords[1]._id.toString(),
        landlordName: 'Bob Hasan',
        listingId: listings[1]._id,
        listingTitle: 'Cozy Studio in Dhanmondi',
        month: '2026-09',
        amount: 4200,
        bookedDays: 7,
        dailyRate: 600,
        dueDate: futureDueDate,
        status: 'due',
        paidDate: null,
        paymentMethod: 'bKash',
        notes: '7 days booked (7 days @ ৳600/day). Upcoming September rent.',
        overdueFlagged: false,
      },
    ]);
    console.log('💳 3 Rent Records created (1 Paid | 1 Due | 1 Flagged Overdue — Day-based rent calculated)');

    // ── 7. Sample Maintenance Requests ─────────────────────────
    await MaintenanceRequest.deleteMany({});
    await MaintenanceRequest.insertMany([
      {
        tenantId: demoUser._id.toString(),
        tenantName: 'Demo User',
        tenantEmail: 'demo.user@rentease.com',
        landlordId: landlords[0]._id.toString(),
        landlordName: 'Alice Rahman',
        landlordEmail: 'alice.rahman@landlord.com',
        listingId: listings[0]._id,
        listingTitle: 'Luxurious 3BHK in Gulshan',
        category: 'Plumbing',
        title: 'Leaking kitchen pipe under counter',
        description: 'Water has been leaking steadily underneath the main kitchen sink cabinet. It requires immediate plumber inspection to avoid wood damage.',
        urgency: 'Emergency',
        photoUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop',
        status: 'Submitted',
        landlordNotes: '',
        scheduledDate: null,
        cost: 0,
        statusHistory: [
          { status: 'Submitted', updatedAt: new Date(), updatedBy: 'Demo User', note: 'Issue reported by tenant (preliminary state awaiting landlord review).' },
        ],
      },
      {
        tenantId: demoUser._id.toString(),
        tenantName: 'Demo User',
        tenantEmail: 'demo.user@rentease.com',
        landlordId: landlords[1]._id.toString(),
        landlordName: 'Bob Hasan',
        listingId: listings[1]._id,
        listingTitle: 'Cozy Studio in Dhanmondi',
        category: 'HVAC / AC',
        title: 'Air conditioner not cooling properly',
        description: 'The split AC unit in the bedroom blows warm air and makes a rattling sound when powered on.',
        urgency: 'High',
        photoUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop',
        status: 'Submitted',
        landlordNotes: '',
        scheduledDate: null,
        cost: 0,
        statusHistory: [
          { status: 'Submitted', updatedAt: new Date(), updatedBy: 'Demo User', note: 'Maintenance request created.' },
        ],
      },
      {
        tenantId: demoUser._id.toString(),
        tenantName: 'Demo User',
        tenantEmail: 'demo.user@rentease.com',
        landlordId: landlords[0]._id.toString(),
        landlordName: 'Alice Rahman',
        listingId: listings[0]._id,
        listingTitle: 'Luxurious 3BHK in Gulshan',
        category: 'Electrical',
        title: 'Master bedroom main light switch loose',
        description: 'The toggle switch for the overhead lights in the master bedroom feels loose and flickers occasionally.',
        urgency: 'Medium',
        photoUrl: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&auto=format&fit=crop',
        status: 'Resolved',
        landlordNotes: 'Electrician replaced switch panel on Aug 20.',
        scheduledDate: new Date('2026-08-20'),
        cost: 45,
        statusHistory: [
          { status: 'Submitted', updatedAt: new Date('2026-08-18'), updatedBy: 'Demo User', note: 'Issue reported.' },
          { status: 'Acknowledged', updatedAt: new Date('2026-08-19'), updatedBy: 'Alice Rahman', note: 'Acknowledged.' },
          { status: 'In Progress', updatedAt: new Date('2026-08-19'), updatedBy: 'Alice Rahman', note: 'Electrician hired.' },
          { status: 'Resolved', updatedAt: new Date('2026-08-20'), updatedBy: 'Alice Rahman', note: 'Switch replaced and tested.' },
        ],
      },
    ]);
    console.log('🛠️ 3 Maintenance Requests created (Submitted | In Progress | Resolved)');

    // ── 8. Sample Notifications ────────────────────────────
    await Notification.deleteMany({});
    await Notification.insertMany([
      {
        recipientId: demoUser._id.toString(),
        recipientEmail: 'demo.user@rentease.com',
        recipientRole: 'user',
        type: 'rent_overdue',
        title: '🚨 Overdue Rent — Luxurious 3BHK in Gulshan',
        message: 'Your rent of ৳75,000 for September 2026 is OVERDUE. Please pay immediately.',
        link: '/rent-tracking',
        isRead: false,
      },
      {
        recipientId: demoUser._id.toString(),
        recipientEmail: 'demo.user@rentease.com',
        recipientRole: 'user',
        type: 'maintenance_submitted',
        title: '✅ Maintenance Ticket Submitted',
        message: 'Your "Leaking kitchen pipe" request has been submitted. It will stay in preliminary "Submitted" status until reviewed by landlord.',
        link: '/maintenance',
        isRead: false,
      },
      {
        recipientId: demoUser._id.toString(),
        recipientEmail: 'demo.user@rentease.com',
        recipientRole: 'user',
        type: 'rent_due',
        title: '💳 Rent Due — Cozy Studio in Dhanmondi',
        message: 'Your rent of ৳18,000 for September 2026 is due. Please pay before the due date.',
        link: '/rent-tracking',
        isRead: false,
      },
      {
        recipientId: demoUser._id.toString(),
        recipientEmail: 'demo.user@rentease.com',
        recipientRole: 'user',
        type: 'maintenance_resolved',
        title: '✅ Maintenance Resolved: Electrical Switch',
        message: 'Your "Master bedroom light switch" repair has been resolved. Electrician replaced the switch panel.',
        link: '/maintenance',
        isRead: true,
      },
      {
        recipientId: landlords[0]._id.toString(),
        recipientEmail: 'alice.rahman@landlord.com',
        recipientRole: 'landlord',
        type: 'maintenance_submitted',
        title: '🔴 EMERGENCY — New Maintenance Ticket',
        message: 'Tenant Demo User submitted an Emergency Plumbing issue at Luxurious 3BHK in Gulshan.',
        link: '/maintenance',
        isRead: false,
      },
      {
        recipientId: 'admin-001',
        recipientEmail: 'admin@rentease.com',
        recipientRole: 'admin',
        type: 'system',
        title: 'ℹ️ System: 2 Overdue Rent Alerts Active',
        message: 'There are currently 2 tenant rent records flagged as overdue across the platform.',
        link: '/rent-tracking',
        isRead: false,
      },
    ]);
    console.log('🔔 6 Notifications seeded (3 unread for tenant, 1 landlord, 1 admin)');

    // ── 9. Sample Rental Agreements ─────────────────────────────
    await Agreement.deleteMany({});

    const sampleAgreementData = {
      agreementId: 'AGR-2026-9A8F',
      landlordId: landlords[0]._id.toString(),
      landlordName: 'Alice Rahman',
      landlordEmail: 'alice.rahman@landlord.com',
      landlordPhone: '+880 1711-889900',
      tenantId: demoUser._id.toString(),
      tenantName: 'Demo User',
      tenantEmail: 'demo.user@rentease.com',
      tenantPhone: '+880 1819-554433',
      listingId: listings[0]._id,
      listingTitle: 'Luxurious 3BHK in Gulshan',
      propertyAddress: 'House 42, Road 11, Block D, Gulshan-2',
      city: 'Dhaka',
      rentAmount: 75000,
      depositAmount: 150000,
      paymentDueDate: 5,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      leaseTermMonths: 12,
      clauses: [
        { title: 'Monthly Payment & Overdue Terms', text: 'Rent must be cleared on or before the 5th of every month. Overdue payments incur a 2% daily penalty.' },
        { title: 'Maintenance & Service Requests', text: 'Tenant is required to log all plumbing, electrical, and structural repair requests via the RentEase Maintenance Module.' },
        { title: 'Subletting Restriction', text: 'Subletting or secondary leasing without explicit written authorization from the Landlord is strictly prohibited.' },
        { title: 'Security Deposit Refund', text: 'The 2-month security deposit will be refunded within 14 business days post move-out inspection.' },
      ],
      status: 'Finalized',
      createdBy: landlords[0]._id.toString(),
    };

    const pdfRes = await generateAgreementPdf(sampleAgreementData);

    await Agreement.create({
      ...sampleAgreementData,
      sha256Hash: pdfRes.sha256Hash,
      pdfFilename: pdfRes.filename,
      pdfGeneratedAt: new Date(),
      isVerified: true,
      lastVerifiedAt: new Date(),
    });

    console.log('📄 1 Rental Agreement created & PDF generated (SHA-256: ' + pdfRes.sha256Hash.substring(0, 16) + '…)');

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
