const mongoose = require("mongoose");

const courtSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sportType: {
      type: String,
      required: true,
      enum: ["badminton", "futsal", "basketball", "padel"],
      default: "badminton",
    },
    location: { type: String, required: true },
    mapsLink: { type: String, default: "" },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    images: [{ type: String }],
    pricePerHour: { type: Number, required: true, min: 0 },
    facilities: [{ type: String }],
    openHour: { type: Number, default: 6 },
    closeHour: { type: Number, default: 23 },
    isActive: { type: Boolean, default: true },
    closedDates: [
      {
        date: { type: String, required: true },
        reason: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Court", courtSchema);
