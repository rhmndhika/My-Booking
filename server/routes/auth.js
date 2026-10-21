const express = require("express");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const { queryOne, run } = require("../config/db");
const { formatUser } = require("../utils/serialize");
const { HttpError, sendError } = require("../utils/httpError");
const generateToken = require("../utils/generateToken");
const { protect } = require("../middleware/auth");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// @route   POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, password, phone } = req.body;
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!name || !email || !password) {
      throw new HttpError(400, "Nama, email, dan password wajib diisi");
    }
    if (!EMAIL_RE.test(email)) throw new HttpError(400, "Format email tidak valid");
    if (password.length < 6) throw new HttpError(400, "Password minimal 6 karakter");

    const existing = await queryOne("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) throw new HttpError(400, "Email sudah terdaftar");

    const hash = await bcrypt.hash(password, 10);
    let result;
    try {
      result = await run(
        "INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)",
        [String(name).trim(), email, hash, phone || null]
      );
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") throw new HttpError(400, "Email sudah terdaftar");
      throw e;
    }

    const user = formatUser(await queryOne("SELECT * FROM users WHERE id = ?", [result.insertId]));
    res.status(201).json({
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id),
    });
  } catch (err) {
    sendError(res, err, "Gagal mendaftar");
  }
});

// @route   POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { password } = req.body;
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!email || !password) throw new HttpError(400, "Email dan password wajib diisi");

    const row = await queryOne("SELECT * FROM users WHERE email = ?", [email]);
    if (!row) throw new HttpError(401, "Email atau password salah");

    if (!row.password) {
      throw new HttpError(400, "Akun ini terdaftar melalui Google. Silakan login dengan Google.");
    }
    const isMatch = await bcrypt.compare(password, row.password);
    if (!isMatch) throw new HttpError(401, "Email atau password salah");

    const user = formatUser(row);
    if (!user.isActive) throw new HttpError(403, "Akun anda dinonaktifkan");

    res.json({
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      token: generateToken(user.id),
    });
  } catch (err) {
    sendError(res, err, "Gagal login");
  }
});

// @route   GET /api/auth/me
router.get("/me", protect, async (req, res) => {
  res.json({
    _id: req.user.id,
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    avatar: req.user.avatar,
    phone: req.user.phone,
  });
});

// @route   GET /api/auth/google  (mulai flow OAuth Google)
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

// @route   GET /api/auth/google/callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed`,
  }),
  (req, res) => {
    const token = generateToken(req.user.id);
    // Redirect kembali ke client sambil membawa token
    res.redirect(`${process.env.CLIENT_URL}/oauth-success?token=${token}`);
  }
);

module.exports = router;
