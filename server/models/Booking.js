const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    court: { type: mongoose.Schema.Types.ObjectId, ref: "Court", required: true },
    date: { type: String, required: true }, // format YYYY-MM-DD
    // daftar jam yang dibooking, contoh: [8, 9, 10] artinya slot 08:00-09:00, 09:00-10:00, 10:00-11:00
    slots: [{ type: Number, required: true }],
    totalPrice: { type: Number, required: true },
    customerName: { type: String },
    customerPhone: { type: String },
    notes: { type: String },
    status: {
      type: String,
      enum: [
        "pending_payment", // menunggu pembayaran
        "waiting_approval", // sudah bayar, menunggu approve admin
        "confirmed", // disetujui admin
        "rejected", // ditolak admin
        "cancelled", // dibatalkan (user/admin/expired)
        "expired", // tidak bayar dalam batas waktu
      ],
      default: "pending_payment",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    midtransOrderId: { type: String, unique: true, sparse: true },
    snapToken: { type: String },
    paymentMethod: { type: String },
    paidAt: { type: Date },
    expiresAt: { type: Date }, // batas waktu pembayaran
    cancelledBy: { type: String, enum: ["user", "admin", "system"] },
    cancelReason: { type: String },
  },
  { timestamps: true }
);

// Index untuk mempercepat pengecekan konflik jadwal
bookingSchema.index({ court: 1, date: 1, status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
