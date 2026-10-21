const mysql = require("mysql2/promise");
const schema = require("./schema");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
  timezone: "Z", // simpan & baca waktu sebagai UTC
});

// SELECT -> array baris
const query = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params);
  return rows;
};

// SELECT -> satu baris (atau null)
const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

// INSERT / UPDATE / DELETE -> { insertId, affectedRows, ... }
const run = async (sql, params = []) => {
  const [result] = await pool.query(sql, params);
  return result;
};

// Jalankan beberapa query dalam satu transaksi. `fn` menerima koneksi (conn.query).
const withTransaction = async (fn) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const initSchema = async () => {
  for (const stmt of schema) await pool.query(stmt);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const connectDB = async () => {
  // Retry: container MariaDB kadang butuh beberapa detik untuk siap
  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await pool.query("SELECT 1");
      await initSchema();
      console.log(`MariaDB connected: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
      return;
    } catch (error) {
      console.error(`Gagal konek MariaDB (percobaan ${attempt}/${maxAttempts}): ${error.message}`);
      if (attempt === maxAttempts) process.exit(1);
      await sleep(3000);
    }
  }
};

module.exports = { pool, query, queryOne, run, withTransaction, initSchema, connectDB };
