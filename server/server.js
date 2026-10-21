require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const session = require("express-session");
const passport = require("./config/passport");
const { connectDB, run } = require("./config/db");

const authRoutes = require("./routes/auth");
const courtRoutes = require("./routes/courts");
const bookingRoutes = require("./routes/bookings");
const paymentRoutes = require("./routes/payment");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());

app.use("/api/auth", authRoutes);
app.use("/api/courts", courtRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => res.json({ status: "OK", time: new Date() }));

// Job berkala: batalkan otomatis booking yang belum dibayar melebihi batas waktu
const EXPIRE_CHECK_INTERVAL = 60 * 1000; // cek tiap 1 menit
const startExpireJob = () => {
  setInterval(async () => {
    try {
      const result = await run(
        `UPDATE bookings
         SET status = 'expired', cancelledBy = 'system', cancelReason = ?, updatedAt = NOW()
         WHERE status = 'pending_payment' AND expiresAt < ?`,
        ["Batas waktu pembayaran habis", new Date()]
      );
      if (result.affectedRows > 0) {
        console.log(`[Auto-expire] ${result.affectedRows} booking ditandai expired`);
      }
    } catch (err) {
      console.error("Auto-expire job error:", err.message);
    }
  }, EXPIRE_CHECK_INTERVAL);
};

// Error handler global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Terjadi kesalahan pada server", error: err.message });
});

const PORT = process.env.PORT || 5001;

// Jalankan server setelah database siap
connectDB().then(() => {
  startExpireJob();
  app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
});
