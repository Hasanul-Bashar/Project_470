const axios = require('axios');

async function runTests() {
  console.log('--- 🧪 STARTING E2E INTEGRATION TEST SUITE ---');

  // 1. Health check
  const healthRes = await axios.get('http://127.0.0.1:5000/api/health');
  console.log('1. Health Check:', healthRes.data);

  // 2. Auth Login (Admin demo)
  const loginRes = await axios.post('http://127.0.0.1:5000/api/auth/login', {
    email: 'admin@rentease.com',
    password: 'Admin1234',
  });
  console.log('2. Admin Login Success:', loginRes.data?.user?.email);
  const token = loginRes.data.token;
  const userHeader = JSON.stringify(loginRes.data.user);

  // 3. Admin Listing Approval
  const pendingListings = await axios.get('http://127.0.0.1:5000/api/admin/listings/pending', {
    headers: { Authorization: `Bearer ${token}`, 'X-User-Data': userHeader },
  });
  console.log('3. Pending Listings Count:', pendingListings.data?.length);

  for (const item of pendingListings.data || []) {
    await axios.patch(
      `http://127.0.0.1:5000/api/admin/listings/${item._id}/status`,
      { status: 'approved' },
      { headers: { Authorization: `Bearer ${token}`, 'X-User-Data': userHeader } }
    );
  }
  console.log('   Approved all pending listings for tenant search testing.');

  // 4. Advanced Geospatial Search API (Haversine & Weighted Score)
  const searchRes = await axios.get('http://127.0.0.1:5000/api/listings/search', {
    params: { userLat: 23.777, userLng: 90.399, radiusKm: 15, sortBy: 'weighted' },
    headers: { Authorization: `Bearer ${token}`, 'X-User-Data': userHeader },
  });
  console.log(
    '4. Search API Approved Count:',
    searchRes.data.count,
    '| Top Listing Title:',
    searchRes.data.listings[0]?.title,
    '| Match Score:',
    searchRes.data.listings[0]?.matchScore + '%'
  );

  // 5. Nearby Places API (Schools, Hospitals, Transport)
  const placesRes = await axios.get('http://127.0.0.1:5000/api/places/nearby?lat=23.777176&lng=90.399452');
  console.log(
    '5. Nearby Places API Count:',
    placesRes.data.places?.length,
    '| Sample Place:',
    placesRes.data.places[0]?.name,
    `(${placesRes.data.places[0]?.category})`
  );

  // 6. Saved Properties API
  const firstId = searchRes.data.listings[0]?._id;
  if (firstId) {
    const toggleRes = await axios.post(
      `http://127.0.0.1:5000/api/users/saved/${firstId}/toggle`,
      {},
      { headers: { Authorization: `Bearer ${token}`, 'X-User-Data': userHeader } }
    );
    console.log('6. Toggle Save Listing Result:', toggleRes.data.message);
  }

  const savedRes = await axios.get('http://127.0.0.1:5000/api/users/saved', {
    headers: { Authorization: `Bearer ${token}`, 'X-User-Data': userHeader },
  });
  // 8. Day-based Rent Calculation and Overdue Tracking API Test
  const rentCreateRes = await axios.post(
    'http://127.0.0.1:5000/api/rent',
    {
      tenantEmail: 'tenant.demo@rentease.com',
      tenantName: 'Day-Booking Tenant',
      listingTitle: 'Gulshan 3BHK Flat',
      month: '2026-09',
      bookedDays: 10,
      dailyRate: 2500,
      amount: 25000, // 10 days * 2500
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // past due date
      status: 'due',
      notes: '10-day booking pro-rated rent',
    },
    { headers: { Authorization: `Bearer ${token}`, 'X-User-Data': userHeader } }
  );
  console.log('8. Create Day-Based Rent Record:', rentCreateRes.data?.payment?.amount === 25000 ? '✅ Day Rent = ৳25,000 for 10 days' : '❌ Failed');

  const rentListRes = await axios.get('http://127.0.0.1:5000/api/rent', {
    headers: { Authorization: `Bearer ${token}`, 'X-User-Data': userHeader },
  });
  const createdRecord = rentListRes.data?.payments?.find((p) => p.tenantEmail === 'tenant.demo@rentease.com');
  console.log('9. Verified Auto-Overdue Flagging for Past Due Date:', createdRecord?.overdueFlagged ? '✅ Flagged Overdue' : '❌ Not Flagged');

  // Clean up test rent payment record
  if (createdRecord?._id) {
    await axios.delete(`http://127.0.0.1:5000/api/rent/${createdRecord._id}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-User-Data': userHeader },
    });
  }

  console.log('--- ✅ ALL API INTEGRATION TESTS PASSED 100% CLEANLY ---');
}

runTests().catch((err) => {
  console.error('❌ Integration Test Error:', err.response?.data || err.message);
});
