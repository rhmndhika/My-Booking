import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Input, Button, Alert } from "antd";
import { UserOutlined, MailOutlined, LockOutlined, PhoneOutlined } from "@ant-design/icons";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", values);
      login(data, data.token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Gagal mendaftar, coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h2>Buat akun baru</h2>
        <p className="auth-sub">Daftar untuk booking lapangan dan menyimpan riwayat mainmu.</p>

        {error && (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 18 }} closable onClose={() => setError("")} />
        )}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
          <Form.Item name="name" label="Nama lengkap" rules={[{ required: true, message: "Nama wajib diisi" }]}>
            <Input prefix={<UserOutlined style={{ color: "#6b8578" }} />} placeholder="Nama kamu" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, message: "Email wajib diisi" }]}>
            <Input prefix={<MailOutlined style={{ color: "#6b8578" }} />} placeholder="nama@email.com" />
          </Form.Item>
          <Form.Item name="phone" label="Nomor HP (opsional)">
            <Input prefix={<PhoneOutlined style={{ color: "#6b8578" }} />} placeholder="08xx-xxxx-xxxx" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: "Password wajib diisi" },
              { min: 6, message: "Password minimal 6 karakter" },
            ]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: "#6b8578" }} />} placeholder="Minimal 6 karakter" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 16 }}>
            <Button htmlType="submit" block className="btn-court" loading={loading}>
              Daftar
            </Button>
          </Form.Item>
        </Form>

        <p style={{ textAlign: "center", marginTop: 8, fontSize: 14, color: "#6b8578" }}>
          Sudah punya akun?{" "}
          <Link to="/login" style={{ color: "#12362b", fontWeight: 600 }}>Masuk</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
