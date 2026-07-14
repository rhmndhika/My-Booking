const express = require("express");
const midtransClient = require("midtrans-client");
const Booking = require("../models/Booking");
const Court = require("../models/Court");
const { protect } = require("../middleware/auth");

const router = express.Router();

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// @route   POST /api/bookings   (buat booking baru + generate snap token)
router.post("/", protect, async (req, res) => {
  try {
    const { courtId, date, slots, customerName, customerPhone, notes } = req.body;

    if (!courtId || !date || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ message: "Data booking tidak lengkap" });
    }

    const court = await Court.findById(courtId);
    if (!court || !court.isActive) {
      return res.status(404).json({ message: "Lapangan tidak tersedia" });
    }

    // Validasi tanggal tidak boleh di masa lalu
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(date);
    if (bookingDate < today) {
      return res.status(400).json({ message: "Tidak bisa booking untuk tanggal yang sudah lewat" });
    }

    // Cek konflik jadwal (double booking prevention)
    const now = new Date();
    const conflicting = await Booking.find({
      court: courtId,
      date,
      status: { $in: ["pending_payment", "waiting_approval", "confirmed"] },
    });

    const takenSlots = new Set();
    conflicting.forEach((b) => {
      if (b.status === "pending_payment" && b.expiresAt && b.expiresAt < now) return; // sudah expired, abaikan
      b.slots.forEach((s) => takenSlots.add(s));
    });

    const clash = slots.find((s) => takenSlots.has(s));
    if (clash !== undefined) {
      return res.status(409).json({
        message: `Jam ${clash}:00 sudah dibooking oleh pengguna lain. Silakan pilih jam lain.`,
      });
    }

    const totalPrice = slots.length * court.pricePerHour;
    const orderId = `BADMINTON-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const expiryMinutes = parseInt(process.env.PAYMENT_EXPIRY_MINUTES || "15", 10);

    const booking = await Booking.create({
      user: req.user._id,
      court: courtId,
      date,
      slots: slots.sort((a, b) => a - b),
      totalPrice,
      customerName: customerName || req.user.name,
      customerPhone: customerPhone || req.user.phone,
      notes,
      status: "pending_payment",
      midtransOrderId: orderId,
      expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
    });

    // Buat transaksi Midtrans Snap
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: totalPrice,
      },
      customer_details: {
        first_name: req.user.name,
        email: req.user.email,
        phone: customerPhone || req.user.phone || "-",
      },
      item_details: [
        {
          id: courtId,
          price: court.pricePerHour,
          quantity: slots.length,
          name: `Sewa ${court.name} (${slots.length} jam)`.slice(0, 50),
        },
      ],
      expiry: {
        unit: "minutes",
        duration: expiryMinutes,
      },
    };

    const transaction = await snap.createTransaction(parameter);
    booking.snapToken = transaction.token;
    await booking.save();

    res.status(201).json({
      booking,
      snapToken: transaction.token,
      redirectUrl: transaction.redirect_url,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });
  } catch (err) {
    res.status(500).json({ message: "Gagal membuat booking", error: err.message });
  }
});

// @route   GET /api/bookings/my   (booking milik user login)
router.get("/my", protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("court", "name location image pricePerHour")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil data booking", error: err.message });
  }
});

// @route   GET /api/bookings/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("court");
    if (!booking) return res.status(404).json({ message: "Booking tidak ditemukan" });
    if (
      booking.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Tidak diizinkan" });
    }
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil booking", error: err.message });
  }
});

// @route   PUT /api/bookings/:id/cancel   (user membatalkan booking miliknya sendiri)
router.put("/:id/cancel", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking tidak ditemukan" });
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Tidak diizinkan" });
    }
    if (!["pending_payment", "waiting_approval", "confirmed"].includes(booking.status)) {
      return res.status(400).json({ message: "Booking ini tidak bisa dibatalkan" });
    }

    booking.status = "cancelled";
    booking.cancelledBy = "user";
    booking.cancelReason = req.body.reason || "Dibatalkan oleh pengguna";
    await booking.save();

    res.json({ message: "Booking berhasil dibatalkan", booking });
  } catch (err) {
    res.status(500).json({ message: "Gagal membatalkan booking", error: err.message });
  }
});

module.exports = router;
