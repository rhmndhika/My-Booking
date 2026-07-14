const express = require("express");
const Court = require("../models/Court");
const Booking = require("../models/Booking");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/courts   (publik - hanya lapangan aktif, kecuali admin minta semua)
router.get("/", async (req, res) => {
  try {
    const filter = req.query.all === "true" ? {} : { isActive: true };
    const courts = await Court.find(filter).sort({ createdAt: -1 });
    res.json(courts);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil data lapangan", error: err.message });
  }
});

// @route   GET /api/courts/:id
router.get("/:id", async (req, res) => {
  try {
    const court = await Court.findById(req.params.id);
    if (!court) return res.status(404).json({ message: "Lapangan tidak ditemukan" });
    res.json(court);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil data lapangan", error: err.message });
  }
});

// @route   GET /api/courts/:id/availability?date=YYYY-MM-DD
// Mengembalikan daftar jam beserta status (available/booked)
router.get("/:id/availability", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "Parameter date wajib diisi" });

    const court = await Court.findById(req.params.id);
    if (!court) return res.status(404).json({ message: "Lapangan tidak ditemukan" });

    // Booking yang masih "menahan" slot: belum expired & bukan cancel/reject
    const activeBookings = await Booking.find({
      court: court._id,
      date,
      status: { $in: ["pending_payment", "waiting_approval", "confirmed"] },
    }).select("slots status expiresAt");

    const now = new Date();
    const bookedSlots = new Set();
    activeBookings.forEach((b) => {
      // Abaikan pending_payment yang sudah lewat waktu (akan dibersihkan oleh job, tapi jaga-jaga)
      if (b.status === "pending_payment" && b.expiresAt && b.expiresAt < now) return;
      b.slots.forEach((s) => bookedSlots.add(s));
    });

    const slots = [];
    for (let h = court.openHour; h < court.closeHour; h++) {
      slots.push({
        hour: h,
        label: `${String(h).padStart(2, "0")}:00 - ${String(h + 1).padStart(2, "0")}:00`,
        available: !bookedSlots.has(h),
      });
    }

    res.json({ court: { _id: court._id, name: court.name, pricePerHour: court.pricePerHour }, date, slots });
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil ketersediaan", error: err.message });
  }
});

// @route   POST /api/courts   (admin)
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const court = await Court.create(req.body);
    res.status(201).json(court);
  } catch (err) {
    res.status(500).json({ message: "Gagal menambah lapangan", error: err.message });
  }
});

// @route   PUT /api/courts/:id   (admin)
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const court = await Court.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!court) return res.status(404).json({ message: "Lapangan tidak ditemukan" });
    res.json(court);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengubah lapangan", error: err.message });
  }
});

// @route   DELETE /api/courts/:id   (admin)
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const court = await Court.findById(req.params.id);
    if (!court) return res.status(404).json({ message: "Lapangan tidak ditemukan" });

    const activeBooking = await Booking.findOne({
      court: court._id,
      status: { $in: ["pending_payment", "waiting_approval", "confirmed"] },
    });
    if (activeBooking) {
      return res.status(400).json({
        message: "Tidak bisa menghapus lapangan yang masih memiliki booking aktif. Nonaktifkan saja.",
      });
    }

    await court.deleteOne();
    res.json({ message: "Lapangan berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ message: "Gagal menghapus lapangan", error: err.message });
  }
});

module.exports = router;
