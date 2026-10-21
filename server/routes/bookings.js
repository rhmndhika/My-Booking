const express = require("express");
const midtransClient = require("midtrans-client");
const { query, queryOne, run, withTransaction } = require("../config/db");
const {
  formatBooking,
  formatBookingJoined,
  parseJson,
  selectCols,
  COURT_COLUMNS,
} = require("../utils/serialize");
const { HttpError, sendError } = require("../utils/httpError");
const { protect } = require("../middleware/auth");

const router = express.Router();

const ACTIVE_STATUSES = ["pending_payment", "waiting_approval", "confirmed"];

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// @route   POST /api/bookings   (buat booking baru + generate snap token)
router.post("/", protect, async (req, res) => {
  try {
    const { courtId, date, customerName, customerPhone, notes } = req.body;
    const rawSlots = req.body.slots;

    if (!courtId || !date || !Array.isArray(rawSlots) || rawSlots.length === 0) {
      throw new HttpError(400, "Data booking tidak lengkap");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HttpError(400, "Format tanggal harus YYYY-MM-DD");
    }
    const slots = [...new Set(rawSlots.map(Number))].sort((a, b) => a - b);
    if (slots.some((s) => !Number.isInteger(s))) {
      throw new HttpError(400, "Format jam tidak valid");
    }

    // Validasi tanggal tidak boleh di masa lalu
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(date) < today) {
      throw new HttpError(400, "Tidak bisa booking untuk tanggal yang sudah lewat");
    }

    const orderId = `BADMINTON-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const expiryMinutes = parseInt(process.env.PAYMENT_EXPIRY_MINUTES || "15", 10);

    // Transaksi + SELECT ... FOR UPDATE pada baris lapangan: request bersamaan
    // untuk lapangan yang sama diproses satu per satu, sehingga tidak ada double booking.
    const { bookingId, court, totalPrice } = await withTransaction(async (conn) => {
      const [courts] = await conn.query("SELECT * FROM courts WHERE id = ? FOR UPDATE", [courtId]);
      const court = courts[0];
      if (!court || !court.isActive) throw new HttpError(404, "Lapangan tidak tersedia");

      if (slots.some((s) => s < court.openHour || s >= court.closeHour)) {
        throw new HttpError(400, "Jam di luar jam operasional lapangan");
      }

      // Cek konflik jadwal
      const [conflicting] = await conn.query(
        "SELECT slots, status, expiresAt FROM bookings WHERE courtId = ? AND `date` = ? AND status IN (?)",
        [court.id, date, ACTIVE_STATUSES]
      );
      const now = new Date();
      const takenSlots = new Set();
      conflicting.forEach((b) => {
        if (b.status === "pending_payment" && b.expiresAt && b.expiresAt < now) return; // sudah expired
        parseJson(b.slots, []).forEach((s) => takenSlots.add(s));
      });
      const clash = slots.find((s) => takenSlots.has(s));
      if (clash !== undefined) {
        throw new HttpError(409, `Jam ${clash}:00 sudah dibooking oleh pengguna lain. Silakan pilih jam lain.`);
      }

      const totalPrice = slots.length * court.pricePerHour;
      const [ins] = await conn.query(
        `INSERT INTO bookings
          (userId, courtId, \`date\`, slots, totalPrice, customerName, customerPhone, notes,
           status, midtransOrderId, expiresAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?)`,
        [
          req.user.id,
          court.id,
          date,
          JSON.stringify(slots),
          totalPrice,
          customerName || req.user.name,
          customerPhone || req.user.phone || null,
          notes || null,
          orderId,
          new Date(Date.now() + expiryMinutes * 60 * 1000),
        ]
      );
      return { bookingId: ins.insertId, court, totalPrice };
    });

    // Buat transaksi Midtrans Snap
    const parameter = {
      transaction_details: { order_id: orderId, gross_amount: totalPrice },
      customer_details: {
        first_name: req.user.name,
        email: req.user.email,
        phone: customerPhone || req.user.phone || "-",
      },
      item_details: [
        {
          id: String(court.id),
          price: court.pricePerHour,
          quantity: slots.length,
          name: `Sewa ${court.name} (${slots.length} jam)`.slice(0, 50),
        },
      ],
      expiry: { unit: "minutes", duration: expiryMinutes },
    };

    let transaction;
    try {
      transaction = await snap.createTransaction(parameter);
    } catch (e) {
      // Midtrans gagal: lepas slot yang sudah ditahan
      await run(
        "UPDATE bookings SET status = 'cancelled', cancelledBy = 'system', cancelReason = ?, updatedAt = NOW() WHERE id = ?",
        ["Gagal membuat transaksi pembayaran", bookingId]
      );
      throw e;
    }

    await run("UPDATE bookings SET snapToken = ?, updatedAt = NOW() WHERE id = ?", [
      transaction.token,
      bookingId,
    ]);
    const booking = await queryOne("SELECT * FROM bookings WHERE id = ?", [bookingId]);

    res.status(201).json({
      booking: formatBooking(booking),
      snapToken: transaction.token,
      redirectUrl: transaction.redirect_url,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });
  } catch (err) {
    sendError(res, err, "Gagal membuat booking");
  }
});

// @route   GET /api/bookings/my   (booking milik user login)
router.get("/my", protect, async (req, res) => {
  try {
    const rows = await query(
      `SELECT b.*, ${selectCols("c", "c_", ["id", "name", "location", "image", "pricePerHour"])}
       FROM bookings b
       JOIN courts c ON c.id = b.courtId
       WHERE b.userId = ?
       ORDER BY b.createdAt DESC`,
      [req.user.id]
    );
    res.json(rows.map(formatBookingJoined));
  } catch (err) {
    sendError(res, err, "Gagal mengambil data booking");
  }
});

// @route   GET /api/bookings/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const row = await queryOne(
      `SELECT b.*, ${selectCols("c", "c_", COURT_COLUMNS)}
       FROM bookings b
       JOIN courts c ON c.id = b.courtId
       WHERE b.id = ?`,
      [req.params.id]
    );
    if (!row) throw new HttpError(404, "Booking tidak ditemukan");
    if (row.userId !== req.user.id && req.user.role !== "admin") {
      throw new HttpError(403, "Tidak diizinkan");
    }
    res.json(formatBookingJoined(row));
  } catch (err) {
    sendError(res, err, "Gagal mengambil booking");
  }
});

// @route   PUT /api/bookings/:id/cancel   (user membatalkan booking miliknya sendiri)
router.put("/:id/cancel", protect, async (req, res) => {
  try {
    const booking = await queryOne("SELECT * FROM bookings WHERE id = ?", [req.params.id]);
    if (!booking) throw new HttpError(404, "Booking tidak ditemukan");
    if (booking.userId !== req.user.id) throw new HttpError(403, "Tidak diizinkan");
    if (!ACTIVE_STATUSES.includes(booking.status)) {
      throw new HttpError(400, "Booking ini tidak bisa dibatalkan");
    }

    await run(
      "UPDATE bookings SET status = 'cancelled', cancelledBy = 'user', cancelReason = ?, updatedAt = NOW() WHERE id = ?",
      [req.body.reason || "Dibatalkan oleh pengguna", booking.id]
    );
    const updated = await queryOne("SELECT * FROM bookings WHERE id = ?", [booking.id]);
    res.json({ message: "Booking berhasil dibatalkan", booking: formatBooking(updated) });
  } catch (err) {
    sendError(res, err, "Gagal membatalkan booking");
  }
});

module.exports = router;
