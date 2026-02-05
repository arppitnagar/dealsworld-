const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const seedData = async () => {
  const deals = [
    {
      title: "50% Off Pizza Combo",
      description: "Buy pizza combo at half price when group completes",
      category: "Food",
      price: 499,
      originalPrice: 999,
      minGroupSize: 5,
      joinedUsers: 2,
      location: "Bangalore",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "active",
      approved: true,
      vendorId: "vendor_001",
      createdAt: new Date(),
    },
    {
      title: "iPhone Accessories Deal",
      description: "Group deal on premium iPhone accessories",
      category: "Electronics",
      price: 1999,
      originalPrice: 2999,
      minGroupSize: 10,
      joinedUsers: 4,
      location: "Mumbai",
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      status: "active",
      approved: true,
      vendorId: "vendor_002",
      createdAt: new Date(),
    },
    {
      title: "Fashion Clearance Sale",
      description: "Group deal on branded clothing",
      category: "Fashion",
      price: 1499,
      originalPrice: 2499,
      minGroupSize: 8,
      joinedUsers: 1,
      location: "Delhi",
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      status: "active",
      approved: true,
      vendorId: "vendor_003",
      createdAt: new Date(),
    },
  ];

  for (const deal of deals) {
    await db.collection("deals").add(deal);
  }
  console.log("Database Seeded!");
  process.exit();
};

seedData();
