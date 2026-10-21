const express = require("express");
const { query, queryOne, run } = require("../config/db");
const {
  formatUser,
  formatBooking,
  formatBookingJoined,
  selectCols,
  USER_COLUMNS_SAFE,
} = require("../utils/serialize");
const { HttpError, sendError } = require("../utils/httpError");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.use(protect, adminOnly);

const count = async (sql, params = []) => Number((await queryOne(sql, params)).n);

// @route   GET /api/admin/bookings   (semua booking, dengan filter)
router.get("/bookings", async (req, res) => {
  try {
    const { status, court, date, q } = req.query;
    const where = [];
    const params = [];
    if (status) { where.push("b.status = ?"); params.push(status); }
    if (court) { where.push("b.courtId = ?"); params.push(court); }
    if (date) { where.push("b.`date` = ?"); params.push(date); }
    if (q) {
      where.push("(u.name LIKE ? OR u.email LIKE ? OR c.name LIKE ?)");
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    const rows = await query(
      `SELECT b.*,
              ${selectCols("u", "u_", ["id", "name", "email", "phone"])},
              ${selectCols("c", "c_", ["id", "name", "location"])}
       FROM bookings b
       JOIN users u ON u.id = b.userId
       JOIN courts c ON c.id = b.courtId
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY b.createdAt DESC`,
      params
    );
    res.json(rows.map(formatBookingJoined));
  } catch (err) {
    sendError(res, err, "Gagal mengambil data booking");
  }
});

const getBooking = async (id) => {
  const booking = await queryOne("SELECT * FROM bookings WHERE id = ?", [id]);
  if (!booking) throw new HttpError(404, "Booking tidak ditemukan");
  return booking;
};

// @route   PUT /api/admin/bookings/:id/approve
router.put("/bookings/:id/approve", async (req, res) => {
  try {
    const booking = await getBooking(req.params.id);
    if (booking.paymentStatus !== "paid") {
      throw new HttpError(400, "Booking belum dibayar, tidak bisa di-approve");
    }
    if (booking.status !== "waiting_approval") {
      throw new HttpError(400, "Status booking tidak dalam menunggu approval");
    }
    await run("UPDATE bookings SET status = 'confirmed', updatedAt = NOW() WHERE id = ?", [booking.id]);
    const updated = await queryOne("SELECT * FROM bookings WHERE id = ?", [booking.id]);
    res.json({ message: "Booking berhasil disetujui", booking: formatBooking(updated) });
  } catch (err) {
    sendError(res, err, "Gagal menyetujui booking");
  }
});

// @route   PUT /api/admin/bookings/:id/reject
router.put("/bookings/:id/reject", async (req, res) => {
  try {
    const booking = await getBooking(req.params.id);
    await run(
      "UPDATE bookings SET status = 'rejected', cancelledBy = 'admin', cancelReason = ?, updatedAt = NOW() WHERE id = ?",
      [req.body.reason || "Ditolak oleh admin", booking.id]
    );
    const updated = await queryOne("SELECT * FROM bookings WHERE id = ?", [booking.id]);
    res.json({ message: "Booking berhasil ditolak", booking: formatBooking(updated) });
  } catch (err) {
    sendError(res, err, "Gagal menolak booking");
  }
});

// @route   PUT /api/admin/bookings/:id/cancel  (admin membatalkan kapan saja)
router.put("/bookings/:id/cancel", async (req, res) => {
  try {
    const booking = await getBooking(req.params.id);
    if (["cancelled", "rejected", "expired"].includes(booking.status)) {
      throw new HttpError(400, "Booking sudah tidak aktif");
    }
    await run(
      "UPDATE bookings SET status = 'cancelled', cancelledBy = 'admin', cancelReason = ?, updatedAt = NOW() WHERE id = ?",
      [req.body.reason || "Dibatalkan oleh admin", booking.id]
    );
    const updated = await queryOne("SELECT * FROM bookings WHERE id = ?", [booking.id]);
    res.json({ message: "Booking berhasil dibatalkan", booking: formatBooking(updated) });
  } catch (err) {
    sendError(res, err, "Gagal membatalkan booking");
  }
});

// @route   GET /api/admin/stats   (statistik dashboard)
router.get("/stats", async (req, res) => {
  try {
    const [totalCourts, activeCourts, totalUsers, totalBookings, confirmedBookings, waitingApproval, revenueRow] =
      await Promise.all([
        count("SELECT COUNT(*) AS n FROM courts"),
        count("SELECT COUNT(*) AS n FROM courts WHERE isActive = 1"),
        count("SELECT COUNT(*) AS n FROM users WHERE role = 'user'"),
        count("SELECT COUNT(*) AS n FROM bookings"),
        count("SELECT COUNT(*) AS n FROM bookings WHERE status = 'confirmed'"),
        count("SELECT COUNT(*) AS n FROM bookings WHERE status = 'waiting_approval'"),
        queryOne("SELECT COALESCE(SUM(totalPrice), 0) AS total FROM bookings WHERE paymentStatus = 'paid'"),
      ]);

    // Booking 7 hari terakhir untuk grafik
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = await query(
      "SELECT id, createdAt, totalPrice, paymentStatus FROM bookings WHERE createdAt >= ?",
      [sevenDaysAgo]
    );

    res.json({
      totalCourts,
      activeCourts,
      totalUsers,
      totalBookings,
      confirmedBookings,
      waitingApproval,
      totalRevenue: Number(revenueRow.total) || 0,
      recentBookings: recent.map((r) => ({ ...r, _id: r.id })),
    });
  } catch (err) {
    sendError(res, err, "Gagal mengambil statistik");
  }
});

// @route   GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const rows = await query(
      `SELECT ${USER_COLUMNS_SAFE.join(", ")} FROM users ORDER BY createdAt DESC`
    );
    res.json(rows.map(formatUser));
  } catch (err) {
    sendError(res, err, "Gagal mengambil data user");
  }
});

const getUser = async (id) => {
  const user = await queryOne(`SELECT ${USER_COLUMNS_SAFE.join(", ")} FROM users WHERE id = ?`, [id]);
  if (!user) throw new HttpError(404, "User tidak ditemukan");
  return user;
};

// @route   PUT /api/admin/users/:id/toggle-active   (blokir / aktifkan user)
router.put("/users/:id/toggle-active", async (req, res) => {
  try {
    const user = await getUser(req.params.id);
    await run("UPDATE users SET isActive = NOT isActive, updatedAt = NOW() WHERE id = ?", [user.id]);
    res.json({ message: "Status user diperbarui", user: formatUser(await getUser(user.id)) });
  } catch (err) {
    sendError(res, err, "Gagal memperbarui user");
  }
});

// @route   PUT /api/admin/users/:id/role   (jadikan admin / user biasa)
router.put("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) throw new HttpError(400, "Role tidak valid");

    const user = await getUser(req.params.id);
    await run("UPDATE users SET role = ?, updatedAt = NOW() WHERE id = ?", [role, user.id]);
    res.json({ message: "Role user diperbarui", user: formatUser(await getUser(user.id)) });
  } catch (err) {
    sendError(res, err, "Gagal memperbarui role");
  }
});

module.exports = router;
