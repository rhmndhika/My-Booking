const mongoose = require("mongoose");

const courtSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true },
    mapsLink: { type: String, default: "" },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    pricePerHour: { type: Number, required: true, min: 0 },
    facilities: [{ type: String }], // contoh: ["AC", "Toilet", "Parkir", "Kantin"]
    openHour: { type: Number, default: 6 }, // jam buka (24h format), contoh 6 = 06:00
    closeHour: { type: Number, default: 23 }, // jam tutup, contoh 23 = 23:00
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Court", courtSchema);
