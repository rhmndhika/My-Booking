import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Form, Input, Button, Alert } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const googleFailed = new URLSearchParams(location.search).get("error") === "google_failed";
  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";

  const onFinish = async (values) => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", values);
      login(data, data.token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Gagal masuk, coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h2>Masuk ke SportBook</h2>
        <p className="auth-sub">Lanjutkan booking lapangan yang tertunda atau cari jadwal baru.</p>

        {googleFailed && (
          <Alert
            type="error"
            showIcon
            message="Login dengan Google gagal, silakan coba lagi."
            style={{ marginBottom: 18 }}
            closable
          />
        )}
        {error && (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 18 }} closable onClose={() => setError("")} />
        )}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
          <Form.Item name="email" label="Email" rules={[{ required: true, message: "Email wajib diisi" }]}>
            <Input prefix={<MailOutlined style={{ color: "#6b8578" }} />} placeholder="nama@email.com" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Password wajib diisi" }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: "#6b8578" }} />} placeholder="Masukkan password" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 16 }}>
            <Button htmlType="submit" block className="btn-court" loading={loading}>
              Masuk
            </Button>
          </Form.Item>
        </Form>

        <div className="auth-divider">atau</div>

        <Button
          block
          size="large"
          href={`${serverUrl}/api/auth/google`}
          style={{
            borderColor: "#dce5d4",
            fontWeight: 500,
            height: 44,
          }}
        >
          Lanjutkan dengan Google
        </Button>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "#6b8578" }}>
          Belum punya akun?{" "}
          <Link to="/register" style={{ color: "#12362b", fontWeight: 600 }}>Daftar</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
