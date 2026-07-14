import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#12362b",
          colorLink: "#12362b",
          colorInfo: "#12362b",
          colorSuccess: "#2c7a4b",
          colorWarning: "#c98a28",
          colorError: "#c04040",
          borderRadius: 10,
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          colorBgLayout: "#f8faf6",
          colorBgContainer: "#ffffff",
          colorBorderSecondary: "#e8efe2",
          controlHeight: 38,
          controlHeightLG: 44,
          controlHeightSM: 30,
          fontSize: 14,
          fontSizeHeading1: 32,
          fontSizeHeading2: 26,
          fontSizeHeading3: 20,
          fontWeightStrong: 600,
          wireframe: false,
          motion: true,
        },
        components: {
          Menu: {
            itemSelectedBg: "#e6efe8",
            itemSelectedColor: "#12362b",
            itemHoverColor: "#12362b",
            itemBorderRadius: 8,
            itemMarginInline: 4,
            iconSize: 15,
          },
          Button: {
            colorPrimary: "#12362b",
            algorithm: true,
            borderRadius: 10,
            controlHeight: 38,
            controlHeightLG: 44,
            fontWeight: 500,
          },
          Layout: {
            headerBg: "#ffffff",
            siderBg: "#12362b",
            bodyBg: "#f8faf6",
          },
          Table: {
            borderRadius: 16,
            headerBg: "#f8faf6",
            headerColor: "#6b8578",
            headerFontFamily: "'JetBrains Mono', monospace",
            headerFontSize: 11,
            rowHoverBg: "#e6efe8",
            borderColor: "#e8efe2",
          },
          Card: {
            borderRadiusLG: 16,
          },
          Modal: {
            borderRadiusLG: 18,
          },
          Input: {
            borderRadius: 10,
            controlHeight: 38,
            activeShadow: "0 0 0 2px rgba(18, 54, 43, 0.1)",
          },
          Select: {
            borderRadius: 10,
          },
          DatePicker: {
            borderRadius: 10,
          },
          Form: {
            labelFontSize: 13,
          },
          Tag: {
            borderRadiusSM: 8,
          },
        },
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
