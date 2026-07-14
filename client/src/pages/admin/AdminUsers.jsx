import { useEffect, useState } from "react";
import { Table, Switch, Select, message, Tag } from "antd";
import api from "../../api/axios";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleActive = async (id) => {
    setBusyId(id);
    try {
      await api.put(`/admin/users/${id}/toggle-active`);
      load();
    } catch (err) {
      message.error(err.response?.data?.message || "Gagal memperbarui status pengguna.");
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = async (id, role) => {
    setBusyId(id);
    try {
      await api.put(`/admin/users/${id}/role`, { role });
      message.success("Role diperbarui.");
      load();
    } catch (err) {
      message.error(err.response?.data?.message || "Gagal memperbarui role.");
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    {
      title: "Nama",
      dataIndex: "name",
      render: (v) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      title: "Email",
      dataIndex: "email",
      render: (v) => <span style={{ color: "#6b8578" }}>{v}</span>,
    },
    {
      title: "Telepon",
      dataIndex: "phone",
      render: (v) => v || <span style={{ color: "#b5bfb8" }}>—</span>,
    },
    {
      title: "Role",
      dataIndex: "role",
      render: (v, r) => (
        <Select
          size="small"
          value={v}
          style={{ width: 110 }}
          loading={busyId === r._id}
          onChange={(role) => changeRole(r._id, role)}
          options={[
            { value: "user", label: "User" },
            { value: "admin", label: "Admin" },
          ]}
        />
      ),
    },
    {
      title: "Terverifikasi",
      dataIndex: "isVerified",
      render: (v) => (
        <Tag color={v ? "success" : "default"} style={{ borderRadius: 999, fontWeight: 500 }}>
          {v ? "Ya" : "Belum"}
        </Tag>
      ),
    },
    {
      title: "Aktif",
      dataIndex: "isActive",
      render: (v, r) => (
        <Switch checked={v} loading={busyId === r._id} onChange={() => toggleActive(r._id)} />
      ),
    },
  ];

  return (
    <div>
      <span className="eyebrow">Kelola</span>
      <h2 style={{ marginTop: 4, marginBottom: 20 }}>Pengguna</h2>
      <Table rowKey="_id" columns={columns} dataSource={users} loading={loading} />
    </div>
  );
};

export default AdminUsers;
