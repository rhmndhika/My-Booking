import { useEffect, useState } from "react";
import { Button, Empty, Spin, message, Popconfirm } from "antd";
import api from "../api/axios";
import StatusTag from "../components/StatusTag";
import { formatIDR, formatDateLong } from "../utils/format";

const CANCELLABLE = ["pending_payment", "waiting_approval", "confirmed"];

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/bookings/my");
      setBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handlePay = (booking) => {
    if (!window.snap || !booking.snapToken) {
      message.error("Sesi pembayaran sudah kedaluwarsa, silakan booking ulang.");
      return;
    }
    window.snap.pay(booking.snapToken, {
      onSuccess: load,
      onPending: load,
      onError: () => message.error("Pembayaran gagal diproses."),
      onClose: load,
    });
  };

  const handleCancel = async (id) => {
    setBusyId(id);
    try {
      await api.put(`/bookings/${id}/cancel`);
      message.success("Booking dibatalkan.");
      load();
    } catch (err) {
      message.error(err.response?.data?.message || "Gagal membatalkan booking.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-container">
      <span className="eyebrow">Riwayat</span>
      <h2 style={{ marginTop: 4, marginBottom: 24 }}>Booking Saya</h2>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <Spin size="large" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <Empty description="Belum ada booking. Yuk cari lapangan dulu!" />
        </div>
      ) : (
        bookings.map((b) => (
          <div key={b._id} className="booking-item">
            <div>
              <h4>{b.court?.name || "Lapangan"}</h4>
              <div className="slots">
                {formatDateLong(b.date)} ·{" "}
                {b.slots.map((h) => `${String(h).padStart(2, "0")}:00`).join(", ")}
              </div>
              <div style={{ marginTop: 10 }}>
                <StatusTag status={b.status} />
              </div>
            </div>
            <div style={{
              textAlign: "right",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
              minWidth: 140,
            }}>
              <div className="mono" style={{ fontWeight: 700, fontSize: 17, color: "#12362b" }}>
                {formatIDR(b.totalPrice)}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                {b.status === "pending_payment" && (
                  <Button size="small" className="btn-gold" onClick={() => handlePay(b)}>
                    Bayar sekarang
                  </Button>
                )}
                {CANCELLABLE.includes(b.status) && (
                  <Popconfirm
                    title="Batalkan booking ini?"
                    onConfirm={() => handleCancel(b._id)}
                    okText="Batalkan"
                    cancelText="Tidak"
                  >
                    <Button size="small" danger loading={busyId === b._id}>
                      Batalkan
                    </Button>
                  </Popconfirm>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MyBookings;
