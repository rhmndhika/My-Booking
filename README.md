# 🏸 BadmintonKu - Aplikasi Booking Lapangan Badminton

Aplikasi full-stack untuk booking lapangan badminton online dengan payment gateway,
sistem approval admin, dan login via email/password atau Google.

## Struktur Folder

```
badminton-booking/
├── server/     -> Backend (Node.js, Express, MongoDB/Mongoose)
└── client/     -> Frontend (React + Vite, Ant Design)
```

## Fitur Utama

### User

- Daftar & login (email/password) atau login dengan Google (OAuth 2.0)
- Melihat daftar lapangan beserta harga, fasilitas, dan lokasi
- Memilih tanggal & jam booking (slot per jam), otomatis menampilkan jam yang
  sudah terisi (tidak bisa dipilih lagi)
- Pembayaran online via **Midtrans Snap** (kartu kredit, e-wallet, VA, dsb)
- Melihat riwayat & status booking sendiri
- Membatalkan booking sendiri (slot otomatis terbuka kembali untuk orang lain)
- Booking yang tidak dibayar dalam batas waktu (default 15 menit) otomatis
  dibatalkan sistem sehingga slot kembali tersedia

### Admin

- Dashboard statistik (jumlah lapangan, user, booking, pendapatan, dll)
- Kelola lapangan: tambah, edit, nonaktifkan, hapus lapangan, atur harga,
  fasilitas, dan jam operasional
- Kelola booking: approve booking yang sudah dibayar, tolak, atau batalkan
  booking kapan saja
- Kelola pengguna: lihat semua user, ubah role (user/admin), blokir/aktifkan
  akun

## Alur Status Booking

```
pending_payment  -> user membuat booking, menunggu pembayaran (ada batas waktu)
waiting_approval -> pembayaran berhasil (via webhook Midtrans), menunggu admin approve
confirmed        -> admin menyetujui booking
rejected         -> admin menolak booking (misal ada masalah pembayaran)
cancelled        -> dibatalkan oleh user/admin
expired          -> tidak dibayar sampai batas waktu habis
```

Slot jam yang berstatus `pending_payment` (belum kedaluwarsa), `waiting_approval`,
atau `confirmed` dianggap **terisi** dan tidak bisa dibooking user lain. Begitu
booking dibatalkan/ditolak/kadaluarsa, slot otomatis terbuka kembali.

---

## 1. Setup Backend (server)

```bash
cd server
npm install
cp .env.example .env
```

Edit file `.env` dan isi:

- `MONGO_URI` -> connection string MongoDB Anda (lokal atau MongoDB Atlas)
- `JWT_SECRET` & `SESSION_SECRET` -> string acak yang aman
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` -> lihat langkah Google OAuth di bawah
- `MIDTRANS_SERVER_KEY` / `MIDTRANS_CLIENT_KEY` -> lihat langkah Midtrans di bawah

Jalankan seed untuk membuat akun admin default & 3 contoh lapangan:

```bash
node seed.js
```

Ini akan membuat akun admin:

- Email: `admin@badminton.com`
- Password: `admin123`

**Segera ganti password ini setelah login pertama kali** (lewat MongoDB langsung
atau tambahkan fitur ganti password bila diperlukan).

Jalankan server:

```bash
npm run dev     # dengan nodemon (auto-reload)
# atau
npm start
```

Server berjalan di `http://localhost:5001`.

---

## 2. Setup Frontend (client)

```bash
cd client
npm install
cp .env.example .env
```

Isi `.env` sesuai kebutuhan (default sudah cocok untuk development lokal).

Jalankan:

```bash
npm run dev
```

Client berjalan di `http://localhost:5173`.

### Penting: Client Key Midtrans

Buka `client/index.html`, cari baris:

```html
<script
  type="text/javascript"
  src="https://app.sandbox.midtrans.com/snap/snap.js"
  data-client-key="SB-Mid-client-xxxxxxxxxxxxxxxxxxxxx"
></script>
```

Ganti `data-client-key` dengan **Client Key** Midtrans sandbox/production Anda
(harus sama dengan `MIDTRANS_CLIENT_KEY` di server `.env`).

Untuk mode production, ganti juga URL script menjadi:
`https://app.midtrans.com/snap/snap.js`

---

## 3. Setup Google OAuth Login

1. Buka [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Buat project baru (atau gunakan yang sudah ada)
3. Buat **OAuth 2.0 Client ID** dengan tipe "Web application"
4. Tambahkan **Authorized redirect URI**:
   `http://localhost:5001/api/auth/google/callback`
5. Copy **Client ID** dan **Client Secret** ke file `server/.env`:
   ```
   GOOGLE_CLIENT_ID=xxxxx
   GOOGLE_CLIENT_SECRET=xxxxx
   GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback
   ```

---

## 4. Setup Payment Gateway (Midtrans)

1. Daftar akun sandbox gratis di [Midtrans Dashboard](https://dashboard.sandbox.midtrans.com/)
2. Masuk ke menu **Settings > Access Keys**
3. Copy **Server Key** dan **Client Key** ke `server/.env`
4. (Opsional untuk testing webhook) Gunakan tool seperti [ngrok](https://ngrok.com)
   agar Midtrans bisa mengirim notifikasi ke server lokal Anda:
   ```bash
   ngrok http 5001
   ```
   Lalu daftarkan URL notifikasi di Midtrans Dashboard > Settings > Configuration:
   `https://<ngrok-url>/api/payment/notification`
5. Untuk testing pembayaran di sandbox, gunakan data dummy dari dokumentasi
   Midtrans (nomor kartu simulasi, dsb): https://docs.midtrans.com/docs/testing-payment-on-sandbox

---

## 5. Setup MongoDB

**Opsi A - Lokal:**

```bash
# pastikan MongoDB sudah terinstall & berjalan
mongod
```

Gunakan `MONGO_URI=mongodb://127.0.0.1:27017/badminton_booking`

**Opsi B - MongoDB Atlas (cloud, gratis):**

1. Buat cluster gratis di https://www.mongodb.com/cloud/atlas
2. Buat database user & whitelist IP (atau izinkan semua IP untuk testing: `0.0.0.0/0`)
3. Copy connection string ke `MONGO_URI`, contoh:
   `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/badminton_booking`

---

## Teknologi yang Digunakan

| Layer    | Teknologi                                                 |
| -------- | --------------------------------------------------------- |
| Frontend | React 18, Vite, Ant Design 5, React Router, Axios, Day.js |
| Backend  | Node.js, Express, Mongoose                                |
| Database | MongoDB                                                   |
| Auth     | JWT + Passport.js (Google OAuth 2.0)                      |
| Payment  | Midtrans Snap (Payment Gateway)                           |

## Pengembangan Lanjutan (Saran)

- Tambahkan halaman "Lupa Password" (reset via email)
- Tambahkan notifikasi email/WhatsApp saat booking di-approve/ditolak
- Tambahkan upload gambar lapangan (misal ke Cloudinary) alih-alih URL manual
- Tambahkan laporan pendapatan per periode (harian/mingguan/bulanan) di admin
- Tambahkan rating & ulasan lapangan dari user
- Gunakan MongoDB transaction untuk pencegahan race condition double-booking
  yang lebih ketat pada skala tinggi
