import { STATUS_META } from "../utils/format";

const StatusTag = ({ status }) => {
  const meta = STATUS_META[status] || { label: status, color: "#6b8578", bg: "#eef1e8" };
  return (
    <span
      className="status-badge"
      style={{
        color: meta.color,
        background: meta.bg,
        fontWeight: 600,
      }}
    >
      {meta.label}
    </span>
  );
};

export default StatusTag;
