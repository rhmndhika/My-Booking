import { useState, useEffect } from "react";
import { Layout, Menu, Avatar, Dropdown, Space, Button } from "antd";
import { UserOutlined, LogoutOutlined, DashboardOutlined, CalendarOutlined } from "@ant-design/icons";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const { Header } = Layout;

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    ...(user
      ? [{ key: "/my-bookings", label: <Link to="/my-bookings">Booking Saya</Link>, icon: <CalendarOutlined /> }]
      : []),
    ...(user?.role === "admin"
      ? [{ key: "/admin", label: <Link to="/admin">Dashboard Admin</Link>, icon: <DashboardOutlined /> }]
      : []),
  ];

  const dropdownItems = [
    { key: "profile", label: <span style={{ fontWeight: 600, fontSize: 13 }}>{user?.name}</span>, disabled: true },
    { type: "divider" },
    { key: "logout", label: "Keluar", icon: <LogoutOutlined />, onClick: handleLogout },
  ];

  const isHome = location.pathname === "/";

  return (
    <Header
      style={{
        display: "flex",
        alignItems: "center",
        background: isHome && !scrolled ? "transparent" : "rgba(255, 255, 255, 0.92)",
        backdropFilter: isHome && !scrolled ? "none" : "blur(16px) saturate(1.8)",
        WebkitBackdropFilter: isHome && !scrolled ? "none" : "blur(16px) saturate(1.8)",
        borderBottom: isHome && !scrolled ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(214, 228, 208, 0.6)",
        boxShadow: scrolled ? "0 1px 16px rgba(10, 31, 22, 0.06)" : "none",
        padding: "0 28px",
        gap: 24,
        position: "sticky",
        top: 0,
        zIndex: 100,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <Link to="/" className="brand-logo" style={isHome && !scrolled ? { color: "#fff" } : undefined}>
        <span className="brand-mark">🏸</span>
        BadmintonKu
      </Link>
      <Menu
        mode="horizontal"
        selectedKeys={[location.pathname]}
        items={menuItems}
        style={{
          flex: 1,
          borderBottom: "none",
          background: "transparent",
          ...(isHome && !scrolled ? { color: "rgba(255,255,255,0.8)" } : {}),
        }}
      />
      {user ? (
        <Dropdown menu={{ items: dropdownItems }} placement="bottomRight" trigger={["click"]}>
          <Space
            style={{
              cursor: "pointer",
              padding: "4px 10px",
              borderRadius: 12,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = isHome && !scrolled ? "rgba(255,255,255,0.1)" : "#f0f5ed")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Avatar
              size={34}
              src={user.avatar}
              icon={<UserOutlined />}
              style={{
                background: "linear-gradient(135deg, #e8f5ec 0%, #d6e4d0 100%)",
                color: "#0d3026",
                fontWeight: 600,
                border: isHome && !scrolled ? "2px solid rgba(255,255,255,0.2)" : "2px solid #fff",
                boxShadow: "0 1px 4px rgba(10, 31, 22, 0.12)",
              }}
            />
            <span style={{
              fontSize: 13,
              fontWeight: 500,
              color: isHome && !scrolled ? "rgba(255,255,255,0.9)" : "#173829",
            }}>{user.name}</span>
          </Space>
        </Dropdown>
      ) : (
        <Space size={10}>
          <Link to="/login">
            <Button
              type="text"
              style={{
                fontWeight: 500,
                color: isHome && !scrolled ? "rgba(255,255,255,0.85)" : "#173829",
              }}
            >
              Masuk
            </Button>
          </Link>
          <Link to="/register">
            <Button
              className={isHome && !scrolled ? "" : "btn-court"}
              style={isHome && !scrolled ? {
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                borderRadius: 12,
                fontWeight: 600,
                backdropFilter: "blur(8px)",
              } : { borderRadius: 12 }}
            >
              Daftar
            </Button>
          </Link>
        </Space>
      )}
    </Header>
  );
};

export default Navbar;
