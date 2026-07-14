const express = require("express");
const crypto = require("crypto");
const midtransClient = require("midtrans-client");
const Booking = require("../models/Booking");
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
      return res.status(403).json({ message: "Signature tidak valid" });
    }

    const statusResponse = await coreApi.transaction.notification(notification);
    const { order_id: orderId, transaction_status, fraud_status, payment_type } = statusResponse;

    const booking = await Booking.findOne({ midtransOrderId: orderId });
    if (!booking) {
      return res.status(404).json({ message: "Booking tidak ditemukan" });
    }

    if (transaction_status === "capture" || transaction_status === "settlement") {
      if (fraud_status === "accept" || !fraud_status) {
        booking.status = "waiting_approval";
        booking.paymentStatus = "paid";
        booking.paymentMethod = payment_type;
        booking.paidAt = new Date();
      }
    } else if (transaction_status === "pending") {
      booking.status = "pending_payment";
    } else if (
      ["deny", "cancel", "expire", "failure"].includes(transaction_status)
    ) {
      booking.status = transaction_status === "expire" ? "expired" : "cancelled";
      booking.cancelledBy = "system";
      booking.cancelReason = `Pembayaran ${transaction_status}`;
    } else if (transaction_status === "refund") {
      booking.paymentStatus = "refunded";
      booking.status = "cancelled";
    }

    await booking.save();
    res.status(200).json({ message: "OK" });
  } catch (err) {
    console.error("Payment notification error:", err.message);
    res.status(500).json({ message: "Gagal memproses notifikasi", error: err.message });
  }
});

// @route   GET /api/payment/status/:orderId  (cek status manual dari client, untuk polling)
router.get("/status/:orderId", protect, async (req, res) => {
  try {
    const booking = await Booking.findOne({ midtransOrderId: req.params.orderId }).populate(
      "court",
      "name"
    );
    if (!booking) return res.status(404).json({ message: "Booking tidak ditemukan" });
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Tidak diizinkan" });
    }
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: "Gagal cek status", error: err.message });
  }
});

module.exports = router;
