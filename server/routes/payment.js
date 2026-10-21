const express = require("express");
const crypto = require("crypto");
const midtransClient = require("midtrans-client");
const { queryOne, run } = require("../config/db");
const { formatBookingJoined } = require("../utils/serialize");
const { HttpError, sendError } = require("../utils/httpError");
const { protect } = require("../middleware/auth");

const router = express.Router();

const coreApi = new midtransClient.CoreApi({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// @route   POST /api/payment/notification
// Webhook yang dipanggil Midtrans setiap ada perubahan status transaksi
router.post("/notification", async (req, res) => {
  try {
    const notification = req.body;

    // Verifikasi signature key agar request benar-benar dari Midtrans
    const { order_id, status_code, gross_amount, signature_key } = notification;
    const expectedSignature = crypto
      .createHash("sha512")
      .update(order_id + status_code + gross_amount + process.env.MIDTRANS_SERVER_KEY)
      .digest("hex");

    if (signature_key !== expectedSignature) {
      throw new HttpError(403, "Signature tidak valid");
    }

    const statusResponse = await coreApi.transaction.notification(notification);
    const { order_id: orderId, transaction_status, fraud_status, payment_type } = statusResponse;

    const booking = await queryOne("SELECT id FROM bookings WHERE midtransOrderId = ?", [orderId]);
    if (!booking) throw new HttpError(404, "Booking tidak ditemukan");

    // Kumpulkan kolom yang perlu diubah, lalu satu UPDATE
    const changes = {};
    if (transaction_status === "capture" || transaction_status === "settlement") {
      if (fraud_status === "accept" || !fraud_status) {
        changes.status = "waiting_approval";
        changes.paymentStatus = "paid";
        changes.paymentMethod = payment_type;
        changes.paidAt = new Date();
      }
    } else if (transaction_status === "pending") {
      changes.status = "pending_payment";
    } else if (["deny", "cancel", "expire", "failure"].includes(transaction_status)) {
      changes.status = transaction_status === "expire" ? "expired" : "cancelled";
      changes.cancelledBy = "system";
      changes.cancelReason = `Pembayaran ${transaction_status}`;
    } else if (transaction_status === "refund") {
      changes.paymentStatus = "refunded";
      changes.status = "cancelled";
    }

    if (Object.keys(changes).length > 0) {
      await run("UPDATE bookings SET ?, updatedAt = NOW() WHERE id = ?", [changes, booking.id]);
    }
    res.status(200).json({ message: "OK" });
  } catch (err) {
    console.error("Payment notification error:", err.message);
    sendError(res, err, "Gagal memproses notifikasi");
  }
});

// @route   GET /api/payment/status/:orderId  (cek status manual dari client, untuk polling)
router.get("/status/:orderId", protect, async (req, res) => {
  try {
    const row = await queryOne(
      `SELECT b.*, c.id AS c_id, c.name AS c_name
       FROM bookings b
       JOIN courts c ON c.id = b.courtId
       WHERE b.midtransOrderId = ?`,
      [req.params.orderId]
    );
    if (!row) throw new HttpError(404, "Booking tidak ditemukan");
    if (row.userId !== req.user.id && req.user.role !== "admin") {
      throw new HttpError(403, "Tidak diizinkan");
    }
    res.json(formatBookingJoined(row));
  } catch (err) {
    sendError(res, err, "Gagal cek status");
  }
});

module.exports = router;
