import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "../context/AuthContext";

const OAuthSuccess = () => {
  const [params] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = params.get("token");
    if (!token) {
      navigate("/login?error=google_failed");
      return;
    }
    loginWithToken(token)
      .then(() => navigate("/"))
      .catch(() => navigate("/login?error=google_failed"));
  }, [params, loginWithToken, navigate]);

  return (
    <div className="auth-shell">
      <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease-out" }}>
        <Spin size="large" />
        <p style={{ marginTop: 20, color: "#6b8578", fontSize: 15 }}>Menyelesaikan proses masuk...</p>
      </div>
    </div>
  );
};

export default OAuthSuccess;
