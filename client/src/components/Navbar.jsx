import { useState, useEffect } from "react";
import { Layout, Menu, Avatar, Dropdown, Space, Button } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
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
      ? [
          {
            key: "/my-bookings",
            label: <Link to="/my-bookings">Booking Saya</Link>,
            icon: <CalendarOutlined />,
          },
        ]
      : []),
    ...(user?.role === "admin"
      ? [
          {
            key: "/admin",
            label: <Link to="/admin">Dashboard Admin</Link>,
            icon: <DashboardOutlined />,
          },
        ]
      : []),
  ];

  const dropdownItems = [
    {
      key: "profile",
      label: (
        <span style={{ fontWeight: 600, fontSize: 13 }}>{user?.name}</span>
      ),
      disabled: true,
    },
    { type: "divider" },
    {
      key: "logout",
      label: "Keluar",
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  const isHero = location.pathname === "/" && !scrolled;

  return (
    <Header className={isHero ? "" : ""}>
      <Link to="/" className="brand-logo">
        <span className="brand-mark">🏟️</span>
        SportBook
      </Link>
      <Menu
        mode="horizontal"
        selectedKeys={[location.pathname]}
        items={menuItems}
        style={{ flex: 1, borderBottom: "none", background: "transparent" }}
      />
      {user ? (
        <Dropdown
          menu={{ items: dropdownItems }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <Space
            style={{
              cursor: "pointer",
              padding: "4px 10px",
              borderRadius: 12,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = isHero
                ? "rgba(255,255,255,0.1)"
                : "#f0f5ed")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <Avatar
              size={34}
              src={user.avatar}
              icon={<UserOutlined />}
              style={{
                background: "linear-gradient(135deg, #e8f5ec 0%, #d6e4d0 100%)",
                color: "#0d3026",
                fontWeight: 600,
                border: "2px solid #fff",
                boxShadow: "0 1px 4px rgba(10, 31, 22, 0.12)",
              }}
            />
            <span className="user-name">{user.name}</span>
          </Space>
        </Dropdown>
      ) : (
        <Space size={10}>
          <Link to="/login">
            <Button type="text" className="nav-text-btn">
              Masuk
            </Button>
          </Link>
          <Link to="/register">
            <Button className="nav-signup-btn">Daftar</Button>
          </Link>
        </Space>
      )}
    </Header>
  );
};

export default Navbar;
