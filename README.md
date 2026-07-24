# Project Name: RentEase — Property Rental and Listing Platform

## Group Members:
1. **Md Hasanul Bashar** (ID: 23201222)
2. **Rufaiyah Islam** (ID: 23301595)
3. **Prapon Saha** (ID: 23201403)
4. **Anindya Pandob Rahul** (ID: 23201630)

---

### What Our Project Offers:
RentEase is a comprehensive property rental platform that connects tenants, landlords, and administrators in one secure and user-friendly system. Tenants can search and filter properties, explore nearby locations, save favorites, compare listings, submit rental requests, make online payments, and communicate with landlords.

Landlords can create and manage property listings, set availability, handle booking requests, track rent and maintenance, communicate with tenants, and monitor property performance through analytics. The platform also includes Stripe payment integration, rental agreement generation with document verification, reviews and ratings, AI-powered property search, trust scoring, notifications, and admin tools for verification and dispute management.

Overall, RentEase simplifies the entire rental process—from property discovery and booking to payments and rental management.

---

# RentEase — Admin Dashboard & Complaint Management

> **Faculty Demo Build** — MERN stack features authored as a standalone module
> that can be cleanly merged into the team's shared repository.

---

## ⚠️ Prerequisite — MongoDB Connection

The seed script and the server both need a running MongoDB instance (Local or Atlas).

### 🌐 Option A — MongoDB Atlas (Free Cloud, Recommended)
1. Open `server/.env` and paste your Atlas connection string:
   ```env
   MONGO_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/rentease?retryWrites=true&w=majority
   ```

### 💻 Option B — Local MongoDB
1. Make sure MongoDB Community Server is installed and running locally.
2. `server/.env`:
   ```env
   MONGO_URI=mongodb://localhost:27017/rentease
   ```

---

## 🚀 Quick Start

### Step 1 — Install Dependencies
```bash
# Terminal 1 — Server
cd server
npm install

# Terminal 2 — Client
cd client
npm install
```

### Step 2 — Seed Demo Data
```bash
# Run from the /server directory
npm run seed:admin
```

Expected output:
```
✅ Connected to MongoDB
🗑️  Removing previous demo records…
👤 Admin created:      admin@rentease.com  /  Admin1234
👤 Demo user created:  demo.user@rentease.com  /  User1234
🏢 3 Landlords created (unverified)
📋 3 Listings created  (status: pending)
📣 3 Complaints created (Pending | In Review | Resolved)
🌱 Seed complete! Open http://localhost:5173
```

### Step 3 — Start Both Servers
```bash
# Terminal 1 — Backend (Express on :5000)
cd server && npm run dev

# Terminal 2 — Frontend (Vite on :5173)
cd client && npm run dev
```

Open **http://localhost:5173**

---

## 🔄 Live Demo Role Switcher

The **top-right pill toggle** in the header switches between roles without a login page:

| Role | What You See |
|---|---|
| 👤 **User** (default) | Complaint submission form |
| 🛡 **Admin** | Dashboard + Landlord & Listing queues + Dispute table |

---

## 📡 API Reference

### Admin Routes — `/api/admin` (requires Admin role)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/stats` | Platform KPI counts |
| `GET` | `/api/admin/landlords/pending` | Unverified landlord list |
| `PATCH` | `/api/admin/landlords/:id/verify` | `{ action: "approve"\|"reject" }` |
| `GET` | `/api/admin/listings/pending` | Pending listing queue |
| `PATCH` | `/api/admin/listings/:id/status` | `{ status: "approved"\|"rejected" }` |

### Complaints Routes — `/api/complaints`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/complaints` | Any user | Submit a complaint |
| `GET` | `/api/complaints?status=` | Admin | List with optional status filter |
| `GET` | `/api/complaints/:id` | Admin | Full complaint detail |
| `PATCH` | `/api/complaints/:id/status` | Admin | Update status + resolution note |

---

## 🗂 Folder Structure

```
rentease/
├── client/                    ← Vite + React (port :5173)
│   └── src/
│       ├── context/AuthContext.jsx      ← Mock JWT role switcher
│       ├── services/adminApi.js         ← Admin Axios calls
│       ├── services/complaintsApi.js    ← Complaints Axios calls
│       ├── components/
│       │   ├── Header.jsx
│       │   ├── Modal.jsx                ← Reusable overlay
│       │   ├── admin/
│       │   │   ├── StatCards.jsx
│       │   │   ├── LandlordTable.jsx
│       │   │   └── ListingQueue.jsx
│       │   └── complaints/
│       │       ├── ComplaintForm.jsx
│       │       ├── DisputeTable.jsx
│       │       └── DisputeDetailModal.jsx
│       └── pages/
│           ├── AdminDashboard.jsx
│           └── ComplaintsPage.jsx
│
└── server/                    ← Express + Mongoose (port :5000)
    ├── models/
    │   ├── User.js             ← Defensive export
    │   ├── Listing.js          ← Defensive export
    │   └── Complaint.js        ← Defensive export
    ├── routes/
    │   ├── admin.routes.js
    │   └── complaints.routes.js
    ├── middleware/auth.middleware.js
    └── scripts/seed-admin-demo.js
```
