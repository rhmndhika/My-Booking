import { useEffect, useMemo, useState } from "react";
import { Spin } from "antd";
import api from "../../api/axios";
import { formatIDR } from "../../utils/format";

const dayLabel = (d) => d.toLocaleDateString("id-ID", { weekday: "short" });

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/admin/stats");
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const chart = useMemo(() => {
    if (!stats) return [];
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d);
    }
    return days.map((d) => {
      const key = d.toDateString();
      const count = stats.recentBookings.filter(
        (b) => new Date(b.createdAt).toDateString() === key
      ).length;
      return { label: dayLabel(d), count };
    });
  }, [stats]);

  const maxCount = Math.max(1, ...chart.map((c) => c.count));

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!stats) return <p style={{ color: "#6b8578" }}>Gagal memuat statistik.</p>;

  return (
    <div>
      <span className="eyebrow">Ringkasan</span>
      <h2 style={{ marginTop: 4, marginBottom: 24 }}>Dashboard</h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: 18,
        marginBottom: 32,
      }}>
        {[
          { label: "Total lapangan", value: stats.totalCourts },
          { label: "Lapangan aktif", value: stats.activeCourts },
          { label: "Total pengguna", value: stats.totalUsers },
          { label: "Menunggu approval", value: stats.waitingApproval },
          { label: "Booking terkonfirmasi", value: stats.confirmedBookings },
          { label: "Total pendapatan", value: formatIDR(stats.totalRevenue), small: true },
        ].map((item) => (
          <div key={item.label} className="stat-card">
            <div className="stat-label">{item.label}</div>
            <div className="stat-value" style={item.small ? { fontSize: 20 } : undefined}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div className="panel" style={{ maxWidth: 600 }}>
        <h3 style={{ fontSize: 15 }}>Booking masuk — 7 hari terakhir</h3>
        <div className="bar-chart">
          {chart.map((c) => (
            <div key={c.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                className="bar"
                style={{
                  height: `${(c.count / maxCount) * 100}%`,
                  width: "55%",
                  minHeight: c.count > 0 ? 8 : 4,
                }}
                title={`${c.count} booking`}
              />
              <div className="bar-label">{c.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
