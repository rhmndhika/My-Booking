// Mengubah baris mentah dari MariaDB menjadi bentuk JSON yang dipakai frontend:
// - tambah `_id` (= id), supaya frontend lama tetap jalan
// - TINYINT 0/1 -> true/false
// - kolom JSON (TEXT) -> array
// - password tidak pernah ikut dikirim

const parseJson = (v, fallback) => {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
};

const bool = (v) => v === 1 || v === true || v === "1";

const COURT_JSON_FIELDS = ["images", "facilities", "closedDates"];

const COURT_COLUMNS = [
  "id", "name", "sportType", "location", "mapsLink", "description", "image", "images",
  "pricePerHour", "facilities", "openHour", "closeHour", "isActive", "closedDates",
  "createdAt", "updatedAt",
];

// Kolom user tanpa password (aman untuk SELECT daftar user)
const USER_COLUMNS_SAFE = [
  "id", "name", "email", "googleId", "phone", "avatar", "role",
  "isVerified", "isActive", "createdAt", "updatedAt",
];

const formatUser = (r) => {
  if (!r) return r;
  const { password, ...rest } = r;
  const out = { ...rest, _id: r.id };
  if ("isVerified" in rest) out.isVerified = bool(rest.isVerified);
  if ("isActive" in rest) out.isActive = bool(rest.isActive);
  return out;
};

const formatCourt = (r) => {
  if (!r) return r;
  const out = { ...r, _id: r.id };
  for (const k of COURT_JSON_FIELDS) if (k in r) out[k] = parseJson(r[k], []);
  if ("description" in r) out.description = r.description || "";
  if ("isActive" in r) out.isActive = bool(r.isActive);
  return out;
};

// Tanpa JOIN: `user` dan `court` berisi ID (sama seperti Mongoose sebelum populate)
const formatBooking = (r) => {
  if (!r) return r;
  return { ...r, _id: r.id, slots: parseJson(r.slots, []), user: r.userId, court: r.courtId };
};

// Ambil kolom berprefix (misal u_name) dari hasil JOIN lalu hapus dari row
const pick = (row, prefix) => {
  const o = {};
  for (const k of Object.keys(row)) {
    if (k.startsWith(prefix)) {
      o[k.slice(prefix.length)] = row[k];
      delete row[k];
    }
  }
  return o;
};

// Hasil JOIN: kolom u_* menjadi `user`, c_* menjadi `court` (object bersarang)
const formatBookingJoined = (row) => {
  const r = { ...row };
  const u = pick(r, "u_");
  const c = pick(r, "c_");
  const out = formatBooking(r);
  if (u.id != null) out.user = formatUser(u);
  if (c.id != null) out.court = formatCourt(c);
  return out;
};

// Membuat daftar kolom "alias.kolom AS prefixkolom" untuk SELECT dengan JOIN
const selectCols = (alias, prefix, cols) => cols.map((c) => `${alias}.${c} AS ${prefix}${c}`).join(", ");

module.exports = {
  parseJson,
  bool,
  formatUser,
  formatCourt,
  formatBooking,
  formatBookingJoined,
  selectCols,
  COURT_COLUMNS,
  USER_COLUMNS_SAFE,
};
