const express = require("express");
const multer = require("multer");
const path = require("path");
const { query, queryOne, run } = require("../config/db");
const { formatCourt, parseJson } = require("../utils/serialize");
const { HttpError, sendError } = require("../utils/httpError");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

const ACTIVE_STATUSES = ["pending_payment", "waiting_approval", "confirmed"];
const SPORTS = ["badminton", "futsal", "basketball", "padel"];

// Hanya field ini yang boleh diisi dari request body
const COURT_FIELDS = [
  "name", "sportType", "location", "mapsLink", "description", "image", "images",
  "pricePerHour", "facilities", "openHour", "closeHour", "isActive", "closedDates",
];

// Validasi + normalisasi body menjadi object { kolom: nilai } siap masuk SQL
const buildCourtData = (body, { partial }) => {
  const data = {};
  for (const k of COURT_FIELDS) if (body[k] !== undefined) data[k] = body[k];

  if (!partial) {
    for (const f of ["name", "location", "pricePerHour"]) {
      if (data[f] === undefined || data[f] === null || data[f] === "") {
        throw new HttpError(400, `Field ${f} wajib diisi`);
      }
    }
  }
  if (data.name !== undefined) {
    data.name = String(data.name).trim();
    if (!data.name) throw new HttpError(400, "Nama lapangan tidak boleh kosong");
  }
  if (data.sportType !== undefined && !SPORTS.includes(data.sportType)) {
    throw new HttpError(400, `sportType harus salah satu dari: ${SPORTS.join(", ")}`);
  }
  if (data.pricePerHour !== undefined) {
    const p = Number(data.pricePerHour);
    if (!Number.isFinite(p) || p < 0) throw new HttpError(400, "Harga per jam tidak valid");
    data.pricePerHour = Math.round(p);
  }
  for (const k of ["openHour", "closeHour"]) {
    if (data[k] !== undefined) {
      const h = Number(data[k]);
      if (!Number.isInteger(h) || h < 0 || h > 24) throw new HttpError(400, `${k} tidak valid`);
      data[k] = h;
    }
  }
  if (data.isActive !== undefined) {
    data.isActive = data.isActive === true || data.isActive === "true" || data.isActive === 1 ? 1 : 0;
  }
  for (const k of ["images", "facilities", "closedDates"]) {
    if (data[k] !== undefined) {
      if (!Array.isArray(data[k])) throw new HttpError(400, `${k} harus berupa array`);
      data[k] = JSON.stringify(data[k]);
    }
  }
  return data;
};

const getCourt = async (id) => formatCourt(await queryOne("SELECT * FROM courts WHERE id = ?", [id]));

// Update beberapa kolom sekaligus. Nama kolom berasal dari whitelist, bukan dari user.
const updateCourt = (id, data) =>
  run("UPDATE courts SET ?, updatedAt = NOW() WHERE id = ?", [data, id]);

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
    const where = [];
    const params = [];
    if (req.query.all !== "true") where.push("isActive = 1");
    if (req.query.sportType) {
      where.push("sportType = ?");
      params.push(req.query.sportType);
    }
    const sql =
      "SELECT * FROM courts" +
      (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
      " ORDER BY createdAt DESC";
    const rows = await query(sql, params);
    res.json(rows.map(formatCourt));
  } catch (err) {
    sendError(res, err, "Gagal mengambil data lapangan");
  }
});

// @route   GET /api/courts/:id
router.get("/:id", async (req, res) => {
  try {
    const court = await getCourt(req.params.id);
    if (!court) throw new HttpError(404, "Lapangan tidak ditemukan");
    res.json(court);
  } catch (err) {
    sendError(res, err, "Gagal mengambil data lapangan");
  }
});

// @route   GET /api/courts/:id/availability?date=YYYY-MM-DD
// Mengembalikan daftar jam beserta status (available/booked)
router.get("/:id/availability", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) throw new HttpError(400, "Parameter date wajib diisi");

    const court = await getCourt(req.params.id);
    if (!court) throw new HttpError(404, "Lapangan tidak ditemukan");

    const courtInfo = {
      _id: court.id,
      id: court.id,
      name: court.name,
      pricePerHour: court.pricePerHour,
      sportType: court.sportType,
    };

    const closedEntry = court.closedDates.find((c) => c.date === date);
    if (closedEntry) {
      return res.json({
        court: courtInfo,
        date,
        closed: true,
        closedReason: closedEntry.reason || "",
        slots: [],
      });
    }

    // Booking yang masih "menahan" slot: belum expired & bukan cancel/reject
    const activeBookings = await query(
      "SELECT slots, status, expiresAt FROM bookings WHERE courtId = ? AND `date` = ? AND status IN (?)",
      [court.id, date, ACTIVE_STATUSES]
    );

    const now = new Date();
    const bookedSlots = new Set();
    activeBookings.forEach((b) => {
      // Abaikan pending_payment yang sudah lewat waktu (dibersihkan oleh job, tapi jaga-jaga)
      if (b.status === "pending_payment" && b.expiresAt && b.expiresAt < now) return;
      parseJson(b.slots, []).forEach((s) => bookedSlots.add(s));
    });

    const slots = [];
    for (let h = court.openHour; h < court.closeHour; h++) {
      slots.push({
        hour: h,
        label: `${String(h).padStart(2, "0")}:00 - ${String(h + 1).padStart(2, "0")}:00`,
        available: !bookedSlots.has(h),
      });
    }

    res.json({ court: courtInfo, date, slots });
  } catch (err) {
    sendError(res, err, "Gagal mengambil ketersediaan");
  }
});

// @route   POST /api/courts   (admin)
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const data = buildCourtData(req.body, { partial: false });
    const result = await run("INSERT INTO courts SET ?", [data]);
    res.status(201).json(await getCourt(result.insertId));
  } catch (err) {
    sendError(res, err, "Gagal menambah lapangan");
  }
});

// @route   PUT /api/courts/:id   (admin)
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const existing = await getCourt(req.params.id);
    if (!existing) throw new HttpError(404, "Lapangan tidak ditemukan");

    const data = buildCourtData(req.body, { partial: true });
    if (Object.keys(data).length === 0) return res.json(existing);

    await updateCourt(existing.id, data);
    res.json(await getCourt(existing.id));
  } catch (err) {
    sendError(res, err, "Gagal mengubah lapangan");
  }
});

// @route   DELETE /api/courts/:id   (admin)
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const court = await getCourt(req.params.id);
    if (!court) throw new HttpError(404, "Lapangan tidak ditemukan");

    const activeBooking = await queryOne(
      "SELECT id FROM bookings WHERE courtId = ? AND status IN (?) LIMIT 1",
      [court.id, ACTIVE_STATUSES]
    );
    if (activeBooking) {
      throw new HttpError(
        400,
        "Tidak bisa menghapus lapangan yang masih memiliki booking aktif. Nonaktifkan saja."
      );
    }

    try {
      await run("DELETE FROM courts WHERE id = ?", [court.id]);
    } catch (e) {
      // Lapangan yang punya riwayat booking (selesai/batal) dilindungi foreign key
      if (e.errno === 1451) {
        throw new HttpError(
          400,
          "Lapangan ini memiliki riwayat booking dan tidak bisa dihapus. Nonaktifkan saja."
        );
      }
      throw e;
    }
    res.json({ message: "Lapangan berhasil dihapus" });
  } catch (err) {
    sendError(res, err, "Gagal menghapus lapangan");
  }
});

// @route   POST /api/courts/:id/thumbnail   (admin - upload foto thumbnail)
router.post("/:id/thumbnail", protect, adminOnly, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) throw new HttpError(400, "Tidak ada file yang dikirim");
    const court = await getCourt(req.params.id);
    if (!court) throw new HttpError(404, "Lapangan tidak ditemukan");

    await updateCourt(court.id, { image: `/uploads/${req.file.filename}` });
    res.json(await getCourt(court.id));
  } catch (err) {
    sendError(res, err, "Gagal upload thumbnail");
  }
});

// @route   DELETE /api/courts/:id/thumbnail   (admin - hapus foto thumbnail)
router.delete("/:id/thumbnail", protect, adminOnly, async (req, res) => {
  try {
    const court = await getCourt(req.params.id);
    if (!court) throw new HttpError(404, "Lapangan tidak ditemukan");

    await updateCourt(court.id, { image: "" });
    res.json(await getCourt(court.id));
  } catch (err) {
    sendError(res, err, "Gagal menghapus thumbnail");
  }
});

// @route   POST /api/courts/:id/images   (admin - upload gambar gallery)
router.post("/:id/images", protect, adminOnly, upload.array("images", 10), async (req, res) => {
  try {
    const court = await getCourt(req.params.id);
    if (!court) throw new HttpError(404, "Lapangan tidak ditemukan");

    const newImages = (req.files || []).map((f) => `/uploads/${f.filename}`);
    await updateCourt(court.id, { images: JSON.stringify([...court.images, ...newImages]) });
    res.json(await getCourt(court.id));
  } catch (err) {
    sendError(res, err, "Gagal upload gambar");
  }
});

// @route   DELETE /api/courts/:id/images   (admin - hapus gambar)
router.delete("/:id/images", protect, adminOnly, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const court = await getCourt(req.params.id);
    if (!court) throw new HttpError(404, "Lapangan tidak ditemukan");

    const remaining = court.images.filter((img) => img !== imageUrl);
    await updateCourt(court.id, { images: JSON.stringify(remaining) });
    res.json(await getCourt(court.id));
  } catch (err) {
    sendError(res, err, "Gagal menghapus gambar");
  }
});

// @route   POST /api/courts/:id/closed-dates   (admin - tambah tanggal libur)
router.post("/:id/closed-dates", protect, adminOnly, async (req, res) => {
  try {
    const { date, reason } = req.body;
    if (!date) throw new HttpError(400, "Parameter date wajib diisi");

    const court = await getCourt(req.params.id);
    if (!court) throw new HttpError(404, "Lapangan tidak ditemukan");

    if (court.closedDates.some((c) => c.date === date)) {
      throw new HttpError(400, "Tanggal sudah ada dalam jadwal libur");
    }

    const updated = [...court.closedDates, { date, reason: reason || "" }];
    await updateCourt(court.id, { closedDates: JSON.stringify(updated) });
    res.json(await getCourt(court.id));
  } catch (err) {
    sendError(res, err, "Gagal menambah jadwal libur");
  }
});

// @route   DELETE /api/courts/:id/closed-dates   (admin - hapus tanggal libur)
router.delete("/:id/closed-dates", protect, adminOnly, async (req, res) => {
  try {
    const { date } = req.body;
    const court = await getCourt(req.params.id);
    if (!court) throw new HttpError(404, "Lapangan tidak ditemukan");

    const remaining = court.closedDates.filter((c) => c.date !== date);
    await updateCourt(court.id, { closedDates: JSON.stringify(remaining) });
    res.json(await getCourt(court.id));
  } catch (err) {
    sendError(res, err, "Gagal menghapus jadwal libur");
  }
});

module.exports = router;
