export const formatIDR = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export const formatDateLong = (isoDate) => {
  if (!isoDate) return "-";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const formatDateShort = (isoDate) => {
  if (!isoDate) return "-";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};

export const dateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const nextDays = (count = 14) => {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
};

export const STATUS_META = {
  pending_payment: { label: "Menunggu pembayaran", color: "#C98A28", bg: "#FBF0DB" },
  waiting_approval: { label: "Menunggu konfirmasi", color: "#3E6FB0", bg: "#E4EDF9" },
  confirmed: { label: "Terkonfirmasi", color: "#2C7A4B", bg: "#E1F1E6" },
  rejected: { label: "Ditolak", color: "#B23B3B", bg: "#FBE6E4" },
  cancelled: { label: "Dibatalkan", color: "#6B7A70", bg: "#EBEDE8" },
  expired: { label: "Kedaluwarsa", color: "#6B7A70", bg: "#EBEDE8" },
};
