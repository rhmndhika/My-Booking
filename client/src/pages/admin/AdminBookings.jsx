import { useEffect, useState } from "react";
import { Table, Select, Input, Button, message, Popconfirm, DatePicker } from "antd";
import dayjs from "dayjs";
import api from "../../api/axios";
import StatusTag from "../../components/StatusTag";
import { formatIDR } from "../../utils/format";

const STATUS_OPTIONS = [
  { value: "", label: "Semua status" },
  { value: "pending_payment", label: "Menunggu pembayaran" },
  { value: "waiting_approval", label: "Menunggu konfirmasi" },
  { value: "confirmed", label: "Terkonfirmasi" },
  { value: "rejected", label: "Ditolak" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "expired", label: "Kedaluwarsa" },
];

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [date, setDate] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (q) params.q = q;
      if (date) params.date = date.format("YYYY-MM-DD");
      const { data } = await api.get("/admin/bookings", { params });
      setBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, date]);

  const act = async (id, action) => {
    setBusyId(id);
    try {
      await api.put(`/admin/bookings/${id}/${action}`);
      message.success("Booking diperbarui.");
      load();
    } catch (err) {
      message.error(err.response?.data?.message || "Gagal memperbarui booking.");
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    {
      title: "Pemesan",
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.user?.name || r.customerName}</div>
          <div style={{ fontSize: 12, color: "#6b8578" }}>{r.user?.email}</div>
        </div>
      ),
    },
    { title: "Lapangan", render: (_, r) => <span style={{ fontWeight: 500 }}>{r.court?.name || "-"}</span> },
    {
      title: "Tanggal",
      dataIndex: "date",
      render: (v) => <span className="mono" style={{ fontSize: 12 }}>{v}</span>,
    },
    {
      title: "Jam",
      render: (_, r) => (
        <span className="mono" style={{ fontSize: 12 }}>
          {r.slots.map((h) => `${String(h).padStart(2, "0")}:00`).join(", ")}
        </span>
      ),
    },
    {
      title: "Total",
      dataIndex: "totalPrice",
      render: (v) => <span className="mono" style={{ fontWeight: 600, color: "#12362b" }}>{formatIDR(v)}</span>,
    },
    { title: "Status", dataIndex: "status", render: (v) => <StatusTag status={v} /> },
    {
      title: "Aksi",
      render: (_, r) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {r.status === "waiting_approval" && (
            <>
              <Button
                size="small"
                className="btn-court"
                loading={busyId === r._id}
                onClick={() => act(r._id, "approve")}
                style={{ borderRadius: 8 }}
              >
                Setujui
              </Button>
              <Popconfirm title="Tolak booking ini?" onConfirm={() => act(r._id, "reject")}>
                <Button size="small" danger style={{ borderRadius: 8 }}>Tolak</Button>
              </Popconfirm>
            </>
          )}
          {["pending_payment", "waiting_approval", "confirmed"].includes(r.status) && (
            <Popconfirm title="Batalkan booking ini?" onConfirm={() => act(r._id, "cancel")}>
              <Button size="small" style={{ borderRadius: 8 }}>Batalkan</Button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <span className="eyebrow">Kelola</span>
      <h2 style={{ marginTop: 4, marginBottom: 20 }}>Booking</h2>

      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <Input.Search
          placeholder="Cari nama, email, atau lapangan"
          onSearch={(v) => { setQ(v); load(); }}
          style={{ width: 280 }}
          allowClear
        />
        <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} style={{ width: 220 }} />
        <DatePicker value={date} onChange={setDate} placeholder="Filter tanggal" format="YYYY-MM-DD" />
        {(status || q || date) && (
          <Button
            type="text"
            size="small"
            onClick={() => { setStatus(""); setQ(""); setDate(null); }}
            style={{ color: "#6b8578" }}
          >
            Reset filter
          </Button>
        )}
      </div>

      <Table rowKey="_id" columns={columns} dataSource={bookings} loading={loading} />
    </div>
  );
};

export default AdminBookings;
