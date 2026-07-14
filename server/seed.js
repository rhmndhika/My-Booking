// Jalankan dengan: node seed.js
// Membuat akun admin default agar bisa langsung login ke dashboard admin
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Court = require("./models/Court");

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const adminEmail = "admin@badminton.com";
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: "Administrator",
      email: adminEmail,
      password: "admin123", // segera ganti setelah login pertama
      role: "admin",
      isVerified: true,
    });
    console.log("Akun admin default dibuat:");
    console.log("  email   :", adminEmail);
    console.log("  password: admin123");
  } else {
    console.log("Akun admin sudah ada:", adminEmail);
  }

  const courtCount = await Court.countDocuments();
  if (courtCount === 0) {
    await Court.insertMany([
      {
        name: "Lapangan A - GOR Sejahtera",
        location: "Jl. Merdeka No. 1, Jakarta",
        description: "Lapangan indoor dengan lantai vinyl standar internasional.",
        pricePerHour: 75001,
        facilities: ["AC", "Toilet", "Parkir", "Kantin"],
        openHour: 6,
        closeHour: 23,
        image: "",
      },
      {
        name: "Lapangan B - GOR Sejahtera",
        location: "Jl. Merdeka No. 1, Jakarta",
        description: "Lapangan indoor dengan pencahayaan LED terang.",
        pricePerHour: 70000,
        facilities: ["Toilet", "Parkir"],
        openHour: 6,
        closeHour: 23,
        image: "",
      },
      {
        name: "Lapangan VIP - GOR Sejahtera",
        location: "Jl. Merdeka No. 1, Jakarta",
        description: "Lapangan premium dengan AC dan ruang tunggu ber-sofa.",
        pricePerHour: 120000,
        facilities: ["AC", "Toilet", "Parkir", "Kantin", "Ruang Tunggu VIP"],
        openHour: 6,
        closeHour: 23,
        image: "",
      },
    ]);
    console.log("3 lapangan contoh berhasil ditambahkan");
  }

  console.log("Seeding selesai");
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
