const express = require("express");
const Booking = require("../models/Booking");
const Court = require("../models/Court");
const User = require("../models/User");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.use(protect, adminOnly);

// @route   GET /api/admin/bookings   (semua booking, dengan filter)
router.get("/bookings", async (req, res) => {
  try {
    const { status, court, date, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (court) filter.court = court;
    if (date) filter.date = date;

    let query = Booking.find(filter)
      .populate("user", "name email phone")
      .populate("court", "name location")
      .sort({ createdAt: -1 });

    let bookings = await query;

    if (q) {
      const search = q.toLowerCase();
      bookings = bookings.filter(
        (b) =>
          b.user?.name?.toLowerCase().includes(search) ||
          b.user?.email?.toLowerCase().includes(search) ||
          b.court?.name?.toLowerCase().includes(search)
      );
    }

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil data booking", error: err.message });
  }
});

// @route   PUT /api/admin/bookings/:id/approve
router.put("/bookings/:id/approve", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking tidak ditemukan" });
    if (booking.paymentStatus !== "paid") {
      return res.status(400).json({ message: "Booking belum dibayar, tidak bisa di-approve" });
    }
    if (booking.status !== "waiting_approval") {
      return res.status(400).json({ message: "Status booking tidak dalam menunggu approval" });
    }
    booking.status = "confirmed";
    await booking.save();
    res.json({ message: "Booking berhasil disetujui", booking });
  } catch (err) {
    res.status(500).json({ message: "Gagal menyetujui booking", error: err.message });
  }
});

// @route   PUT /api/admin/bookings/:id/reject
router.put("/bookings/:id/reject", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking tidak ditemukan" });
    booking.status = "rejected";
    booking.cancelledBy = "admin";
    booking.cancelReason = req.body.reason || "Ditolak oleh admin";
    await booking.save();
    res.json({ message: "Booking berhasil ditolak", booking });
  } catch (err) {
    res.status(500).json({ message: "Gagal menolak booking", error: err.message });
  }
});

// @route   PUT /api/admin/bookings/:id/cancel  (admin membatalkan kapan saja)
router.put("/bookings/:id/cancel", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking tidak ditemukan" });
    if (["cancelled", "rejected", "expired"].includes(booking.status)) {
      return res.status(400).json({ message: "Booking sudah tidak aktif" });
    }
    booking.status = "cancelled";
    booking.cancelledBy = "admin";
    booking.cancelReason = req.body.reason || "Dibatalkan oleh admin";
    await booking.save();
    res.json({ message: "Booking berhasil dibatalkan", booking });
  } catch (err) {
    res.status(500).json({ message: "Gagal membatalkan booking", error: err.message });
  }
});

// @route   GET /api/admin/stats   (statistik dashboard)
router.get("/stats", async (req, res) => {
  try {
    const [totalCourts, activeCourts, totalUsers, totalBookings, confirmedBookings, waitingApproval, revenueAgg] =
      await Promise.all([
        Court.countDocuments(),
        Court.countDocuments({ isActive: true }),
        User.countDocuments({ role: "user" }),
        Booking.countDocuments(),
        Booking.countDocuments({ status: "confirmed" }),
        Booking.countDocuments({ status: "waiting_approval" }),
        Booking.aggregate([
          { $match: { paymentStatus: "paid" } },
          { $group: { _id: null, total: { $sum: "$totalPrice" } } },
        ]),
      ]);

    // Statistik booking per hari (7 hari terakhir) untuk grafik
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentBookings = await Booking.find({ createdAt: { $gte: sevenDaysAgo } }).select(
      "createdAt totalPrice paymentStatus"
    );

    res.json({
      totalCourts,
      activeCourts,
      totalUsers,
      totalBookings,
      confirmedBookings,
      waitingApproval,
      totalRevenue: revenueAgg[0]?.total || 0,
      recentBookings,
    });
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil statistik", error: err.message });
  }
});

// @route   GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil data user", error: err.message });
  }
});

// @route   PUT /api/admin/users/:id/toggle-active   (blokir / aktifkan user)
router.put("/users/:id/toggle-active", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: "Status user diperbarui", user });
  } catch (err) {
    res.status(500).json({ message: "Gagal memperbarui user", error: err.message });
  }
});

// @route   PUT /api/admin/users/:id/role   (jadikan admin / user biasa)
router.put("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Role tidak valid" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select(
      "-password"
    );
    res.json({ message: "Role user diperbarui", user });
  } catch (err) {
    res.status(500).json({ message: "Gagal memperbarui role", error: err.message });
  }
});

module.exports = router;
