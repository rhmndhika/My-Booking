import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Input, Button, Alert, Spin, message } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, EnvironmentOutlined, InfoCircleOutlined } from "@ant-design/icons";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { formatIDR, formatDateLong, dateKey, nextDays } from "../utils/format";
import CourtGallery from "../components/CourtGallery";

const DOW = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const SPORT_TYPE_LABELS = {
  badminton: "Badminton",
  futsal: "Futsal",
  basketball: "Basket",
  padel: "Padel",
};

const SPORT_TYPE_ICONS = {
  badminton: "🏸",
  futsal: "⚽",
  basketball: "🏀",
  padel: "🎾",
};

const BookingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const days = useMemo(() => nextDays(14), []);
  const [selectedDate, setSelectedDate] = useState(dateKey(days[0]));

  const [court, setCourt] = useState(null);
  const [loadingCourt, setLoadingCourt] = useState(true);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [isClosed, setIsClosed] = useState(false);
  const [closedReason, setClosedReason] = useState("");

  useEffect(() => {
    const loadCourt = async () => {
      try {
        const { data } = await api.get(`/courts/${id}`);
        setCourt(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCourt(false);
      }
    };
    loadCourt();
  }, [id]);

  useEffect(() => {
    if (user) {
      setCustomerName(user.name || "");
      setCustomerPhone(user.phone || "");
    }
  }, [user]);

  useEffect(() => {
    const loadAvailability = async () => {
      setLoadingSlots(true);
      setSelectedSlots([]);
      setIsClosed(false);
      setClosedReason("");
      try {
        const { data } = await api.get(`/courts/${id}/availability`, { params: { date: selectedDate } });
        if (data.closed) {
          setIsClosed(true);
          setClosedReason(data.closedReason || "");
          setSlots([]);
        } else {
          setSlots(data.slots || []);
        }
      } catch (err) {
        console.error(err);
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    loadAvailability();
  }, [id, selectedDate]);

  const isToday = selectedDate === dateKey(new Date());
  const currentHour = new Date().getHours();
  const isAdmin = user?.role === "admin";

  const toggleSlot = (hour, available) => {
    const past = isToday && hour <= currentHour;
    if (!available || past) return;
    setSelectedSlots((prev) =>
      prev.includes(hour) ? prev.filter((h) => h !== hour) : [...prev, hour].sort((a, b) => a - b)
    );
  };

  const total = selectedSlots.length * (court?.pricePerHour || 0);

  const closedDateSet = useMemo(() => {
    const set = new Set();
    (court?.closedDates || []).forEach((c) => set.add(c.date));
    return set;
  }, [court]);

  const mapQuery = useMemo(() => {
    if (!court) return "";
    if (court.mapsLink) {
      const match = court.mapsLink.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (match) return `${match[1]},${match[2]}`;
      const qMatch = court.mapsLink.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (qMatch) return `${qMatch[1]},${qMatch[2]}`;
    }
    return encodeURIComponent(court.location || court.name);
  }, [court]);

  const externalMapUrl = useMemo(() => {
    if (!court) return "#";
    if (court.mapsLink) return court.mapsLink;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(court.location || court.name)}`;
  }, [court]);

  const handleSubmit = async () => {
    setFormError("");
    if (!user) {
      navigate("/login");
      return;
    }
    if (isAdmin) {
      setFormError("Akun admin tidak dapat melakukan booking.");
      return;
    }
    if (selectedSlots.length === 0) {
      setFormError("Pilih minimal satu jam terlebih dahulu.");
      return;
    }
    if (!customerName || !customerPhone) {
      setFormError("Nama dan nomor HP wajib diisi untuk konfirmasi booking.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/bookings", {
        courtId: id,
        date: selectedDate,
        slots: selectedSlots,
        customerName,
        customerPhone,
        notes,
      });

      if (window.snap && data.snapToken) {
        window.snap.pay(data.snapToken, {
          onSuccess: () => navigate("/my-bookings"),
          onPending: () => navigate("/my-bookings"),
          onError: () => message.error("Pembayaran gagal diproses. Coba lagi dari Booking Saya."),
          onClose: () => navigate("/my-bookings"),
        });
      } else {
        navigate("/my-bookings");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal membuat booking, coba lagi.";
      setFormError(msg);
      if (err.response?.status === 409) {
        const { data } = await api.get(`/courts/${id}/availability`, { params: { date: selectedDate } });
        setSlots(data.slots || []);
        setSelectedSlots([]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCourt) {
    return (
      <div className="auth-shell">
        <Spin size="large" />
      </div>
    );
  }

  if (!court) {
    return (
      <div className="page-container" style={{ textAlign: "center" }}>
        <h2>Lapangan tidak ditemukan</h2>
        <Link to="/" style={{ color: "#12362b", fontWeight: 600 }}>Kembali ke daftar lapangan</Link>
      </div>
    );
  }

  const galleryImages = court.images || [];

  return (
    <div>
      <section className="court-hero">
        <div className="court-hero-inner">
          <Link to="/" className="back-link">
            <ArrowLeftOutlined /> Kembali ke daftar lapangan
          </Link>
          <h1>{court.name}</h1>
          <div className="meta">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {SPORT_TYPE_ICONS[court.sportType]} {SPORT_TYPE_LABELS[court.sportType]}
            </span>
            <span>
              <EnvironmentOutlined /> {court.location}
            </span>
            <span className="mono" style={{ color: "#e8a832", fontWeight: 600 }}>
              {formatIDR(court.pricePerHour)} / jam
            </span>
          </div>
        </div>
      </section>

      <div className="booking-shell">
        <div>
          {/* Gallery */}
          {galleryImages.length > 0 && <CourtGallery images={galleryImages} />}

          {/* Admin banner */}
          {isAdmin && (
            <div className="admin-banner">
              <InfoCircleOutlined />
              Mode admin: Anda hanya dapat melihat jadwal, tidak bisa melakukan booking.
            </div>
          )}

          <div className="panel">
            <h3>Pilih tanggal</h3>
            <div className="date-strip">
              {days.map((d) => {
                const key = dateKey(d);
                const isClosedDate = closedDateSet.has(key);
                return (
                  <div
                    key={key}
                    className={`date-pill ${key === selectedDate ? "active" : ""} ${isClosedDate ? "closed" : ""}`}
                    onClick={() => setSelectedDate(key)}
                  >
                    <span className="dow">{DOW[d.getDay()]}</span>
                    <span className="dom">{d.getDate()}</span>
                    {isClosedDate && <span className="closed-dot" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <h3>{formatDateLong(selectedDate)}</h3>
            {loadingSlots ? (
              <div style={{ padding: "20px 0" }}><Spin /></div>
            ) : isClosed ? (
              <div className="closed-banner">
                <span className="closed-banner-icon">🔴</span>
                <div>
                  <div style={{ fontWeight: 600 }}>Lapangan tutup pada tanggal ini</div>
                  {closedReason && <div style={{ fontSize: 13, opacity: 0.85 }}>{closedReason}</div>}
                </div>
              </div>
            ) : slots.length === 0 ? (
              <p style={{ color: "#6b8578", padding: "8px 0" }}>Tidak ada slot jam untuk tanggal ini.</p>
            ) : (
              <>
                <div className="slot-grid">
                  {slots.map((s) => {
                    const past = isToday && s.hour <= currentHour;
                    const disabled = !s.available || past;
                    const selected = selectedSlots.includes(s.hour);
                    return (
                      <div
                        key={s.hour}
                        className={`slot-btn ${disabled ? "disabled" : ""} ${selected ? "selected" : ""}`}
                        onClick={() => !isAdmin && toggleSlot(s.hour, s.available)}
                        style={isAdmin ? { cursor: "default", opacity: 0.6 } : undefined}
                      >
                        <span className="t">{s.label}</span>
                        <span className="p">
                          {disabled ? (past ? "sudah lewat" : "penuh") : formatIDR(court.pricePerHour)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="slot-legend">
                  <span>
                    <i className="legend-dot" style={{ background: "#fff", border: "1.5px solid #dce5d4" }} /> Tersedia
                  </span>
                  <span>
                    <i className="legend-dot" style={{ background: "#12362b" }} /> Dipilih
                  </span>
                  <span>
                    <i className="legend-dot" style={{ background: "#eef1e8" }} /> Penuh / lewat jam
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="panel">
            <h3>Lokasi</h3>
            <div className="map-frame">
              <iframe
                title={`Peta lokasi ${court.name}`}
                src={`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <a
              className="map-link"
              href={externalMapUrl}
              target="_blank"
              rel="noreferrer"
            >
              Buka di Google Maps <ArrowRightOutlined style={{ fontSize: 11 }} />
            </a>
          </div>

          <div className="panel">
            <h3>Fasilitas</h3>
            <div className="facility-list">
              {(court.facilities || []).length === 0 && (
                <span style={{ color: "#6b8578" }}>Belum ada info fasilitas.</span>
              )}
              {(court.facilities || []).map((f) => (
                <span key={f} className="facility-chip">{f}</span>
              ))}
            </div>
            {court.description && (
              <p style={{ marginTop: 16, color: "#6b8578", lineHeight: 1.65, fontSize: 14 }}>
                {court.description}
              </p>
            )}
          </div>
        </div>

        <div className="summary-panel">
          <div className="panel">
            <h3>Ringkasan booking</h3>

            {isAdmin ? (
              <p style={{ color: "#6b8578", fontSize: 14, padding: "4px 0" }}>
                Akun admin tidak dapat melakukan booking. Gunakan akun user untuk memesan.
              </p>
            ) : selectedSlots.length === 0 ? (
              <p style={{ color: "#6b8578", fontSize: 14, padding: "4px 0" }}>
                Pilih jam bermain di sebelah kiri.
              </p>
            ) : (
              <div style={{ marginBottom: 16 }}>
                {selectedSlots.map((h) => (
                  <div key={h} className="summary-row">
                    <span>{String(h).padStart(2, "0")}:00 – {String(h + 1).padStart(2, "0")}:00</span>
                    <span>{formatIDR(court.pricePerHour)}</span>
                  </div>
                ))}
                <div className="summary-total">
                  <span>Total</span>
                  <span>{formatIDR(total)}</span>
                </div>
              </div>
            )}

            {!isAdmin && (
              <>
                <Input
                  placeholder="Nama pemesan"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{ marginBottom: 10, borderRadius: 10 }}
                />
                <Input
                  placeholder="Nomor HP (untuk konfirmasi)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  style={{ marginBottom: 10, borderRadius: 10 }}
                />
                <Input.TextArea
                  placeholder="Catatan untuk venue (opsional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  style={{ marginBottom: 16, borderRadius: 10 }}
                />
              </>
            )}

            {formError && <Alert type="error" showIcon message={formError} style={{ marginBottom: 14 }} />}

            {!isAdmin && (
              <Button block size="large" className="btn-gold" loading={submitting} onClick={handleSubmit}>
                {user ? "Lanjutkan ke Pembayaran" : "Masuk untuk memesan"}
              </Button>
            )}
            <p style={{ fontSize: 12, color: "#6b8578", marginTop: 12, lineHeight: 1.5 }}>
              {isAdmin
                ? "Untuk melakukan booking, silakan login dengan akun user."
                : "Booking akan ditahan selama 15 menit menunggu pembayaran. Setelah dibayar, venue akan mengonfirmasi jadwalmu."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
