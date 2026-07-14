import { Layout, Menu } from "antd";
import { DashboardOutlined, AppstoreOutlined, CalendarOutlined, TeamOutlined } from "@ant-design/icons";
import { Link, Outlet, useLocation } from "react-router-dom";

const { Sider, Content } = Layout;

const items = [
  { key: "/admin", icon: <DashboardOutlined />, label: <Link to="/admin">Dashboard</Link> },
  { key: "/admin/courts", icon: <AppstoreOutlined />, label: <Link to="/admin/courts">Lapangan</Link> },
  { key: "/admin/bookings", icon: <CalendarOutlined />, label: <Link to="/admin/bookings">Booking</Link> },
  { key: "/admin/users", icon: <TeamOutlined />, label: <Link to="/admin/users">Pengguna</Link> },
];

const AdminLayout = () => {
  const location = useLocation();

  return (
    <Layout className="admin-shell">
      <Sider
        width={230}
        style={{
          background: "linear-gradient(180deg, #0f2a21 0%, #12362b 40%, #1e5b45 100%)",
          borderRight: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div className="admin-sidebar-brand">
          <span style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "rgba(232, 168, 50, 0.15)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}>🏟️</span>
          <span>SportBook</span>
          <span style={{
            fontSize: 10,
            background: "rgba(232, 168, 50, 0.2)",
            color: "#e8a832",
            padding: "2px 8px",
            borderRadius: 999,
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}>Admin</span>
        </div>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[location.pathname]}
          items={items}
          style={{
            background: "transparent",
            borderRight: "none",
            padding: "8px 10px",
          }}
        />
      </Sider>
      <Content className="admin-content">
        <Outlet />
      </Content>
    </Layout>
  );
};

export default AdminLayout;
