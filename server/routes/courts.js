const express = require("express");
const multer = require("multer");
const path = require("path");
const Court = require("../models/Court");
const Booking = require("../models/Booking");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `court-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    cb(ok ? null : new Error("Hanya file jpg, png, webp yang diperbolehkan"), ok);
  },
});

// @route   GET /api/courts   (publik - hanya lapangan aktif, kecuali admin minta semua)
router.get("/", async (req, res) => {
  try {
    const filter = req.query.all === "true" ? {} : { isActive: true };
    if (req.query.sportType) {
      filter.sportType = req.query.sportType;
    }
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

    const closedEntry = (court.closedDates || []).find((c) => c.date === date);
    if (closedEntry) {
      return res.json({
        court: { _id: court._id, name: court.name, pricePerHour: court.pricePerHour, sportType: court.sportType },
        date,
        closed: true,
        closedReason: closedEntry.reason || "",
        slots: [],
      });
    }

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

    res.json({ court: { _id: court._id, name: court.name, pricePerHour: court.pricePerHour, sportType: court.sportType }, date, slots });
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

// @route   POST /api/courts/:id/thumbnail   (admin - upload foto thumbnail)
router.post("/:id/thumbnail", protect, adminOnly, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Tidak ada file yang dikirim" });
    const court = await Court.findById(req.params.id);
    if (!court) return res.status(404).json({ message: "Lapangan tidak ditemukan" });

    court.image = `/uploads/${req.file.filename}`;
    await court.save();
    res.json(court);
  } catch (err) {
    res.status(500).json({ message: "Gagal upload thumbnail", error: err.message });
  }
});

// @route   DELETE /api/courts/:id/thumbnail   (admin - hapus foto thumbnail)
router.delete("/:id/thumbnail", protect, adminOnly, async (req, res) => {
  try {
    const court = await Court.findById(req.params.id);
    if (!court) return res.status(404).json({ message: "Lapangan tidak ditemukan" });

    court.image = "";
    await court.save();
    res.json(court);
  } catch (err) {
    res.status(500).json({ message: "Gagal menghapus thumbnail", error: err.message });
  }
});

// @route   POST /api/courts/:id/images   (admin - upload gambar gallery)
router.post("/:id/images", protect, adminOnly, upload.array("images", 10), async (req, res) => {
  try {
    const court = await Court.findById(req.params.id);
    if (!court) return res.status(404).json({ message: "Lapangan tidak ditemukan" });

    const newImages = req.files.map((f) => `/uploads/${f.filename}`);
    court.images = [...(court.images || []), ...newImages];
    await court.save();
    res.json(court);
  } catch (err) {
    res.status(500).json({ message: "Gagal upload gambar", error: err.message });
  }
});

// @route   DELETE /api/courts/:id/images   (admin - hapus gambar)
router.delete("/:id/images", protect, adminOnly, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const court = await Court.findById(req.params.id);
    if (!court) return res.status(404).json({ message: "Lapangan tidak ditemukan" });

    court.images = (court.images || []).filter((img) => img !== imageUrl);
    await court.save();
    res.json(court);
  } catch (err) {
    res.status(500).json({ message: "Gagal menghapus gambar", error: err.message });
  }
});

// @route   POST /api/courts/:id/closed-dates   (admin - tambah tanggal libur)
router.post("/:id/closed-dates", protect, adminOnly, async (req, res) => {
  try {
    const { date, reason } = req.body;
    if (!date) return res.status(400).json({ message: "Parameter date wajib diisi" });

    const court = await Court.findById(req.params.id);
    if (!court) return res.status(404).json({ message: "Lapangan tidak ditemukan" });

    const exists = (court.closedDates || []).some((c) => c.date === date);
    if (exists) return res.status(400).json({ message: "Tanggal sudah ada dalam jadwal libur" });

    court.closedDates.push({ date, reason: reason || "" });
    await court.save();
    res.json(court);
  } catch (err) {
    res.status(500).json({ message: "Gagal menambah jadwal libur", error: err.message });
  }
});

// @route   DELETE /api/courts/:id/closed-dates   (admin - hapus tanggal libur)
router.delete("/:id/closed-dates", protect, adminOnly, async (req, res) => {
  try {
    const { date } = req.body;
    const court = await Court.findById(req.params.id);
    if (!court) return res.status(404).json({ message: "Lapangan tidak ditemukan" });

    court.closedDates = (court.closedDates || []).filter((c) => c.date !== date);
    await court.save();
    res.json(court);
  } catch (err) {
    res.status(500).json({ message: "Gagal menghapus jadwal libur", error: err.message });
  }
});

module.exports = router;
