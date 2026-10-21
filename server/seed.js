// Jalankan dengan: node seed.js
// Membuat tabel (jika belum ada), akun admin default, dan lapangan contoh
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { pool, queryOne, run, initSchema } = require("./config/db");

const courts = [
  {
    name: "Lapangan A - GOR Sejahtera",
    sportType: "badminton",
    location: "Jl. Merdeka No. 1, Jakarta",
    description: "Lapangan indoor dengan lantai vinyl standar internasional.",
    pricePerHour: 75001,
    facilities: ["AC", "Toilet", "Parkir", "Kantin"],
    openHour: 6,
    closeHour: 23,
  },
  {
    name: "Lapangan B - GOR Sejahtera",
    sportType: "badminton",
    location: "Jl. Merdeka No. 1, Jakarta",
    description: "Lapangan indoor dengan pencahayaan LED terang.",
    pricePerHour: 70000,
    facilities: ["Toilet", "Parkir"],
    openHour: 6,
    closeHour: 23,
  },
  {
    name: "Lapangan VIP - GOR Sejahtera",
    sportType: "futsal",
    location: "Jl. Merdeka No. 1, Jakarta",
    description: "Lapangan futsal premium dengan rumput sintetis.",
    pricePerHour: 120000,
    facilities: ["AC", "Toilet", "Parkir", "Kantin", "Ruang Tunggu VIP"],
    openHour: 6,
    closeHour: 23,
  },
  {
    name: "Lapangan Basket - Arena Sport",
    sportType: "basketball",
    location: "Jl. Sudirman No. 50, Jakarta",
    description: "Lapangan basket indoor dengan ring standar nasional.",
    pricePerHour: 80000,
    facilities: ["AC", "Toilet", "Parkir", "Shower"],
    openHour: 7,
    closeHour: 22,
  },
  {
    name: "Padel Court 1 - Padel Hub",
    sportType: "padel",
    location: "Jl. Gatot Subroto No. 12, Jakarta",
    description: "Lapangan padel indoor dengan kaca tempered dan rumput sintetis.",
    pricePerHour: 100000,
    facilities: ["AC", "Toilet", "Parkir", "Wifi"],
    openHour: 6,
    closeHour: 23,
  },
];

const runSeed = async () => {
  await initSchema();

  const adminEmail = "admin@sportbook.com";
  const admin = await queryOne("SELECT id FROM users WHERE email = ?", [adminEmail]);
  if (!admin) {
    const hash = await bcrypt.hash("admin123", 10); // segera ganti setelah login pertama
    await run(
      "INSERT INTO users (name, email, password, role, isVerified) VALUES (?, ?, ?, 'admin', 1)",
      ["Administrator", adminEmail, hash]
    );
    console.log("Akun admin default dibuat:");
    console.log("  email   :", adminEmail);
    console.log("  password: admin123");
  } else {
    console.log("Akun admin sudah ada:", adminEmail);
  }

  const { n } = await queryOne("SELECT COUNT(*) AS n FROM courts");
  if (Number(n) === 0) {
    for (const c of courts) {
      await run("INSERT INTO courts SET ?", [
        { ...c, facilities: JSON.stringify(c.facilities), images: "[]", closedDates: "[]", image: "" },
      ]);
    }
    console.log(`${courts.length} lapangan contoh berhasil ditambahkan`);
  }

  console.log("Seeding selesai");
  await pool.end();
};

runSeed().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => {});
  process.exit(1);
});
