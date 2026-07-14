import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Select, Skeleton, Empty } from "antd";
import { SearchOutlined, EnvironmentOutlined, RightOutlined, ThunderboltOutlined } from "@ant-design/icons";
import api from "../api/axios";
import CourtThumb from "../components/CourtThumb";
import { formatIDR } from "../utils/format";

const HeroCourtLines = () => (
  <svg
    className="hero-court-lines"
    viewBox="0 0 1200 500"
    preserveAspectRatio="xMaxYMid slice"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="600" y="40" width="500" height="380" rx="8" stroke="#ffffff" strokeWidth="1.2" fill="none" />
    <line x1="850" y1="40" x2="850" y2="420" stroke="#ffffff" strokeWidth="1.2" />
    <line x1="600" y1="230" x2="1100" y2="230" stroke="#ffffff" strokeWidth="0.8" strokeDasharray="6 6" />
    <line x1="650" y1="40" x2="650" y2="420" stroke="#ffffff" strokeWidth="0.8" />
    <line x1="1050" y1="40" x2="1050" y2="420" stroke="#ffffff" strokeWidth="0.8" />
    <circle cx="850" cy="230" r="4" fill="var(--gold, #f0a830)" opacity="0.5" />
    <circle cx="600" cy="40" r="3" fill="#ffffff" opacity="0.3" />
    <circle cx="1100" cy="420" r="3" fill="#ffffff" opacity="0.3" />
  </svg>
);

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

const SPORT_TYPE_COLORS = {
  badminton: "#2c7a4b",
  futsal: "#1769aa",
  basketball: "#c9520a",
  padel: "#7c3aed",
};

const FloatingCard = ({ title, price, meta, className }) => (
  <div className={`hero-visual-card ${className}`}>
    <h4>{title}</h4>
    <div className="card-price">{price}</div>
    <div className="card-meta">{meta}</div>
  </div>
);

const Home = () => {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [sportFilter, setSportFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/courts");
        setCourts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = courts.filter((c) => {
      const q = search.trim().toLowerCase();
      if (q && !c.name.toLowerCase().includes(q) && !c.location.toLowerCase().includes(q)) return false;
      if (sportFilter !== "all" && c.sportType !== sportFilter) return false;
      return true;
    });
    if (sortBy === "price-asc") list = [...list].sort((a, b) => a.pricePerHour - b.pricePerHour);
    if (sortBy === "price-desc") list = [...list].sort((a, b) => b.pricePerHour - a.pricePerHour);
    return list;
  }, [courts, search, sortBy, sportFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    const el = document.getElementById("court-grid");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-bg-gradient" />
          <div className="hero-mesh-1" />
          <div className="hero-mesh-2" />
          <div className="hero-mesh-3" />
          <HeroCourtLines />
        </div>

        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Booking lapangan olahraga real-time
            </div>

            <h1>
              Sewa lapangan <span className="text-gold">gampang.</span>
            </h1>
            <p className="lede">
              Badminton, futsal, basket, padel — pilih lapangan, booking slot, bayar online.
              Nggak perlu telepon admin lagi.
            </p>

            <form className="hero-search" onSubmit={handleSearch}>
              <div className="hero-search-input">
                <span className="search-icon"><SearchOutlined /></span>
                <input
                  type="text"
                  placeholder="Cari nama lapangan atau area..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="hero-search-btn">
                <ThunderboltOutlined /> Cari
              </button>
            </form>

            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-value">{courts.length || "—"}</span>
                <span className="hero-stat-label">Lapangan</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">06–23</span>
                <span className="hero-stat-label">Jam operasional</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">~15 mnt</span>
                <span className="hero-stat-label">Batas bayar</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <span className="hero-visual-shuttle">🏟️</span>
            {courts.length > 0 && (
              <FloatingCard
                title={courts[0].name}
                price={formatIDR(courts[0].pricePerHour)}
                meta={`${SPORT_TYPE_LABELS[courts[0].sportType]} · Buka sekarang`}
                className="hero-visual-card-1"
              />
            )}
            {courts.length > 1 && (
              <FloatingCard
                title={courts[1].name}
                price={formatIDR(courts[1].pricePerHour)}
                meta={`${SPORT_TYPE_LABELS[courts[1].sportType]} · ${courts[1].location?.split(",")[0] || "Tersedia"}`}
                className="hero-visual-card-2"
              />
            )}
            {courts.length === 0 && !loading && (
              <>
                <FloatingCard
                  title="SportBook"
                  price="Mulai dari Rp 50.000"
                  meta="Booking lapangan olahraga"
                  className="hero-visual-card-1"
                />
                <FloatingCard
                  title="Tersedia"
                  price="Badminton · Futsal · Basket · Padel"
                  meta="Pilih lapangan favoritmu"
                  className="hero-visual-card-2"
                />
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Court Grid ── */}
      <div className="page-container" id="court-grid">
        <div className="section-head">
          <div>
            <span className="eyebrow">Venue tersedia</span>
            <h2>{filtered.length} lapangan ditemukan</h2>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Select
              value={sportFilter}
              onChange={setSportFilter}
              style={{ width: 150 }}
              options={[
                { value: "all", label: "Semua Olahraga" },
                { value: "badminton", label: "🏸 Badminton" },
                { value: "futsal", label: "⚽ Futsal" },
                { value: "basketball", label: "🏀 Basket" },
                { value: "padel", label: "🎾 Padel" },
              ]}
            />
            <Select
              value={sortBy}
              onChange={setSortBy}
              style={{ width: 200 }}
              options={[
                { value: "default", label: "Urutan terbaru" },
                { value: "price-asc", label: "Harga terendah" },
                { value: "price-desc", label: "Harga tertinggi" },
              ]}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="court-card" style={{ padding: 0 }}>
                <div style={{
                  height: 200,
                  background: "linear-gradient(135deg, #e8f5ec 0%, #f0f5ed 50%, #e6efe8 100%)",
                  borderRadius: "18px 18px 0 0",
                }} />
                <div style={{ padding: "18px 20px 22px" }}>
                  <Skeleton active paragraph={{ rows: 2 }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Empty description="Belum ada lapangan yang cocok" />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
            {filtered.map((court) => (
              <Link key={court._id} to={`/courts/${court._id}`} style={{ textDecoration: "none" }}>
                <div className="court-card">
                  <CourtThumb image={court.image} images={court.images} alt={court.name}>
                    <span className="court-price-tag">{formatIDR(court.pricePerHour)}/jam</span>
                    <span
                      className="court-sport-tag"
                      style={{
                        background: SPORT_TYPE_COLORS[court.sportType] || "#12362b",
                        color: "#fff",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        position: "absolute",
                        top: 12,
                        left: 12,
                      }}
                    >
                      {SPORT_TYPE_ICONS[court.sportType]} {SPORT_TYPE_LABELS[court.sportType]}
                    </span>
                  </CourtThumb>
                  <div className="court-card-body">
                    <h3>{court.name}</h3>
                    <div className="court-loc">
                      <EnvironmentOutlined />
                      {court.location}
                    </div>
                    <div>
                      {(court.facilities || []).slice(0, 3).map((f) => (
                        <span key={f} className="facility-chip">{f}</span>
                      ))}
                      {(court.facilities || []).length > 3 && (
                        <span className="facility-chip">+{court.facilities.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
