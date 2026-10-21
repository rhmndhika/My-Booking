const jwt = require("jsonwebtoken");
const { queryOne } = require("../config/db");
const { formatUser } = require("../utils/serialize");

const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Tidak ada token, akses ditolak" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const row = await queryOne("SELECT * FROM users WHERE id = ?", [decoded.id]);

    if (!row) {
      return res.status(401).json({ message: "User tidak ditemukan" });
    }
    const user = formatUser(row); // tanpa password, isActive jadi boolean
    if (!user.isActive) {
      return res.status(403).json({ message: "Akun anda dinonaktifkan" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token tidak valid atau kadaluarsa" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Hanya admin yang diizinkan mengakses" });
};

module.exports = { protect, adminOnly };
