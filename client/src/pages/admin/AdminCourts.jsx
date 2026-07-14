import { useEffect, useState } from "react";
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Switch, message, Popconfirm, Tag, Upload, DatePicker,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, CalendarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../api/axios";
import { formatIDR } from "../../utils/format";

const FACILITY_OPTIONS = ["AC", "Toilet", "Parkir", "Kantin", "Mushola", "Wifi", "Ruang Tunggu VIP", "Shower"];

const SPORT_TYPE_OPTIONS = [
  { value: "badminton", label: "Badminton" },
  { value: "futsal", label: "Futsal" },
  { value: "basketball", label: "Basket" },
  { value: "padel", label: "Padel" },
];

const SPORT_TYPE_LABELS = {
  badminton: "Badminton",
  futsal: "Futsal",
  basketball: "Basket",
  padel: "Padel",
};

const SPORT_TYPE_COLORS = {
  badminton: "#2c7a4b",
  futsal: "#1769aa",
  basketball: "#c9520a",
  padel: "#7c3aed",
};

const apiUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5001";
const resolveSrc = (img) => (img && !img.startsWith("http")) ? `${apiUrl}${img}` : img;

const AdminCourts = () => {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [pendingThumbnail, setPendingThumbnail] = useState(null);
  const [pendingGallery, setPendingGallery] = useState([]);
  const [addingFacility, setAddingFacility] = useState(false);
  const [newFacilityInput, setNewFacilityInput] = useState("");
  const [facilityOptions, setFacilityOptions] = useState(FACILITY_OPTIONS.map((f) => ({ value: f, label: f })));
  const [closedDateInput, setClosedDateInput] = useState(null);
  const [closedReasonInput, setClosedReasonInput] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/courts", { params: { all: true } });
      setCourts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setPendingThumbnail(null);
    setPendingGallery([]);
    form.resetFields();
    form.setFieldsValue({ sportType: "badminton", openHour: 6, closeHour: 23, isActive: true, images: [] });
    setModalOpen(true);
  };

  const openEdit = (court) => {
    setEditing(court);
    setPendingThumbnail(null);
    setPendingGallery([]);
    form.setFieldsValue({ ...court, images: court.images || [] });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/courts/${id}`);
      message.success("Lapangan dihapus.");
      load();
    } catch (err) {
      message.error(err.response?.data?.message || "Gagal menghapus lapangan.");
    }
  };

  const uploadThumbnail = async (courtId, file) => {
    const formData = new FormData();
    formData.append("image", file);
    const { data } = await api.post(`/courts/${courtId}/thumbnail`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  };

  const uploadGallery = async (courtId, files) => {
    if (!files || files.length === 0) return null;
    const formData = new FormData();
    files.forEach((f) => formData.append("images", f));
    const { data } = await api.post(`/courts/${courtId}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (editing) {
        await api.put(`/courts/${editing._id}`, values);
        message.success("Lapangan diperbarui.");
        setModalOpen(false);
      } else {
        const { data: newCourt } = await api.post("/courts", values);

        if (pendingThumbnail) {
          try {
            const updated = await uploadThumbnail(newCourt._id, pendingThumbnail);
            Object.assign(newCourt, updated);
          } catch {}
        }
        if (pendingGallery.length > 0) {
          try {
            const updated = await uploadGallery(newCourt._id, pendingGallery);
            if (updated) Object.assign(newCourt, updated);
          } catch {}
        }

        message.success("Lapangan dan foto berhasil disimpan.");
        setModalOpen(false);
      }

      load();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || "Gagal menyimpan lapangan.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadThumbnail = async (courtId, file) => {
    setUploading(true);
    try {
      const data = await uploadThumbnail(courtId, file);
      setCourts((prev) => prev.map((c) => (c._id === courtId ? data : c)));
      setEditing(data);
      message.success("Foto thumbnail berhasil diunggah.");
    } catch (err) {
      message.error(err.response?.data?.message || "Gagal mengunggah thumbnail.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteThumbnail = async (courtId) => {
    try {
      const { data } = await api.delete(`/courts/${courtId}/thumbnail`);
      setCourts((prev) => prev.map((c) => (c._id === courtId ? data : c)));
      setEditing(data);
      message.success("Thumbnail dihapus.");
    } catch (err) {
      message.error("Gagal menghapus thumbnail.");
    }
  };

  const handleUploadGallery = async (courtId, fileList) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const data = await uploadGallery(courtId, fileList.map((f) => f.originFileObj));
      setCourts((prev) => prev.map((c) => (c._id === courtId ? data : c)));
      setEditing(data);
      message.success("Foto gallery berhasil diunggah.");
    } catch (err) {
      message.error(err.response?.data?.message || "Gagal mengunggah foto gallery.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteGalleryImage = async (courtId, imageUrl) => {
    try {
      const { data } = await api.delete(`/courts/${courtId}/images`, { data: { imageUrl } });
      setCourts((prev) => prev.map((c) => (c._id === courtId ? data : c)));
      setEditing(data);
      message.success("Foto gallery dihapus.");
    } catch (err) {
      message.error("Gagal menghapus foto.");
    }
  };

  const handleAddFacility = () => {
    const val = newFacilityInput.trim();
    if (!val) return;
    const exists = facilityOptions.some((o) => o.value.toLowerCase() === val.toLowerCase());
    if (exists) {
      message.warning("Fasilitas sudah ada.");
      setNewFacilityInput("");
      setAddingFacility(false);
      return;
    }
    setFacilityOptions((prev) => [...prev, { value: val, label: val }]);
    const current = form.getFieldValue("facilities") || [];
    if (!current.some((f) => f.toLowerCase() === val.toLowerCase())) {
      form.setFieldsValue({ facilities: [...current, val] });
    }
    setNewFacilityInput("");
    setAddingFacility(false);
  };

  const handleAddClosedDate = async () => {
    if (!closedDateInput) return;
    if (!editing) return;
    const dateStr = closedDateInput.format("YYYY-MM-DD");
    const exists = (editing.closedDates || []).some((c) => c.date === dateStr);
    if (exists) { message.warning("Tanggal sudah ada di jadwal libur."); return; }
    try {
      const { data } = await api.post(`/courts/${editing._id}/closed-dates`, { date: dateStr, reason: closedReasonInput });
      setCourts((prev) => prev.map((c) => (c._id === editing._id ? data : c)));
      setEditing(data);
      setClosedDateInput(null);
      setClosedReasonInput("");
      message.success("Tanggal libur ditambahkan.");
    } catch (err) {
      message.error(err.response?.data?.message || "Gagal menambah jadwal libur.");
    }
  };

  const handleDeleteClosedDate = async (dateStr) => {
    if (!editing) return;
    try {
      const { data } = await api.delete(`/courts/${editing._id}/closed-dates`, { data: { date: dateStr } });
      setCourts((prev) => prev.map((c) => (c._id === editing._id ? data : c)));
      setEditing(data);
      message.success("Tanggal libur dihapus.");
    } catch (err) {
      message.error("Gagal menghapus jadwal libur.");
    }
  };

  const isAdd = !editing;

  const columns = [
    { title: "Nama", dataIndex: "name", render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    {
      title: "Jenis",
      dataIndex: "sportType",
      render: (v) => <Tag color={SPORT_TYPE_COLORS[v] || "default"} style={{ borderRadius: 999, fontWeight: 500 }}>{SPORT_TYPE_LABELS[v] || v}</Tag>,
    },
    {
      title: "Thumbnail",
      render: (_, r) => r.image ? (
        <img
          src={resolveSrc(r.image)}
          alt=""
          style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 6, border: "1px solid #e8efe2", cursor: "pointer" }}
          onClick={() => setImagePreview(resolveSrc(r.image))}
        />
      ) : <span style={{ fontSize: 12, color: "#999" }}>Kosong</span>,
    },
    {
      title: "Gallery",
      render: (_, r) => {
        const count = (r.images || []).length;
        return count > 0 ? (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {r.images.slice(0, 3).map((img, i) => (
              <img
                key={i}
                src={resolveSrc(img)}
                alt=""
                style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, border: "1px solid #e8efe2" }}
              />
            ))}
            {count > 3 && <span style={{ fontSize: 11, color: "#6b8578" }}>+{count - 3}</span>}
          </div>
        ) : <span style={{ fontSize: 12, color: "#999" }}>Kosong</span>;
      },
    },
    { title: "Lokasi", dataIndex: "location", ellipsis: true },
    {
      title: "Harga/jam",
      dataIndex: "pricePerHour",
      render: (v) => <span className="mono" style={{ fontWeight: 600, color: "#12362b" }}>{formatIDR(v)}</span>,
    },
    {
      title: "Jam operasi",
      render: (_, r) => <span className="mono" style={{ fontSize: 12 }}>{r.openHour}:00 – {r.closeHour}:00</span>,
    },
    {
      title: "Status",
      dataIndex: "isActive",
      render: (v) => <Tag color={v ? "success" : "default"} style={{ borderRadius: 999, fontWeight: 500 }}>{v ? "Aktif" : "Nonaktif"}</Tag>,
    },
    {
      title: "Aksi",
      render: (_, r) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} style={{ borderRadius: 8 }} />
          <Popconfirm title="Hapus lapangan ini?" onConfirm={() => handleDelete(r._id)}>
            <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <span className="eyebrow">Kelola</span>
          <h2 style={{ marginTop: 4, marginBottom: 0 }}>Lapangan</h2>
        </div>
        <Button className="btn-court" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 10 }}>
          Tambah Lapangan
        </Button>
      </div>

      <Table rowKey="_id" columns={columns} dataSource={courts} loading={loading} />

      <Modal open={!!imagePreview} onCancel={() => setImagePreview(null)} footer={null} width={700} styles={{ body: { padding: 0 } }}>
        <img src={imagePreview} alt="Preview" style={{ width: "100%", borderRadius: 8 }} />
      </Modal>

      <Modal
        title={editing ? "Edit Lapangan" : "Tambah Lapangan"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText="Simpan"
        confirmLoading={saving}
        width={650}
      >
        <Form layout="vertical" form={form} requiredMark={false}>
          <Form.Item name="name" label="Nama lapangan" rules={[{ required: true }]}>
            <Input placeholder="contoh: Lapangan A - GOR Sejahtera" />
          </Form.Item>
          <Form.Item name="sportType" label="Jenis Olahraga" rules={[{ required: true }]}>
            <Select options={SPORT_TYPE_OPTIONS} placeholder="Pilih jenis olahraga" />
          </Form.Item>
          <Form.Item name="location" label="Lokasi" rules={[{ required: true }]} extra="Alamat yang tampil di halaman lapangan.">
            <Input placeholder="Alamat lengkap" />
          </Form.Item>
          <Form.Item name="mapsLink" label="Link Google Maps (opsional)">
            <Input placeholder="https://maps.app.goo.gl/..." />
          </Form.Item>
          <Form.Item name="description" label="Deskripsi">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="pricePerHour" label="Harga per jam (Rp)" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <div style={{ display: "flex", gap: 12 }}>
            <Form.Item name="openHour" label="Jam buka" style={{ flex: 1 }}>
              <InputNumber min={0} max={23} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="closeHour" label="Jam tutup" style={{ flex: 1 }}>
              <InputNumber min={1} max={24} style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <Form.Item name="facilities" label="Fasilitas">
            <Select
              mode="multiple"
              placeholder="Pilih fasilitas"
              options={facilityOptions}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <div style={{ borderTop: "1px solid #e8efe2", marginTop: 4, padding: "6px 8px" }}>
                    {addingFacility ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <Input
                          size="small"
                          placeholder="Nama fasilitas baru"
                          value={newFacilityInput}
                          onChange={(e) => setNewFacilityInput(e.target.value)}
                          onPressEnter={handleAddFacility}
                          autoFocus
                        />
                        <Button size="small" type="primary" onClick={handleAddFacility}>Tambah</Button>
                        <Button size="small" onClick={() => { setAddingFacility(false); setNewFacilityInput(""); }}>Batal</Button>
                      </div>
                    ) : (
                      <div
                        style={{ cursor: "pointer", color: "#12362b", fontWeight: 500, fontSize: 13, padding: "4px 0" }}
                        onMouseDown={(e) => { e.preventDefault(); setAddingFacility(true); }}
                      >
                        + Tambah Fasilitas Baru
                      </div>
                    )}
                  </div>
                </>
              )}
            />
          </Form.Item>
          <Form.Item name="isActive" label="Aktif" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>

        {/* ── Upload section ── */}
        <div style={{ marginTop: 8, borderTop: "1px solid #e8efe2", paddingTop: 16, display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Thumbnail */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Foto Thumbnail</span>
                <span style={{ fontSize: 12, color: "#6b8578", marginLeft: 8 }}>Untuk kartu di halaman utama</span>
              </div>
              <Upload
                beforeUpload={(file) => {
                  if (file.size > 5 * 1024 * 1024) { message.warning("Maksimal 5MB."); return false; }
                  if (isAdd) {
                    setPendingThumbnail(file);
                  } else {
                    handleUploadThumbnail(editing._id, file);
                  }
                  return false;
                }}
                showUploadList={false}
                accept="image/*"
              >
                <Button size="small" icon={<UploadOutlined />} loading={uploading}>
                  {isAdd ? "Pilih Foto" : "Ganti Foto"}
                </Button>
              </Upload>
            </div>
            {(isAdd ? pendingThumbnail : editing?.image) ? (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img
                  src={isAdd ? URL.createObjectURL(pendingThumbnail) : resolveSrc(editing.image)}
                  alt="Thumbnail"
                  style={{ width: 160, height: 110, objectFit: "cover", borderRadius: 8, border: "1px solid #e8efe2", cursor: "pointer" }}
                  onClick={() => setImagePreview(isAdd ? URL.createObjectURL(pendingThumbnail) : resolveSrc(editing.image))}
                />
                <Button
                  size="small" danger icon={<DeleteOutlined />}
                  onClick={() => isAdd ? setPendingThumbnail(null) : handleDeleteThumbnail(editing._id)}
                  style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", minWidth: 0, fontSize: 10 }}
                />
              </div>
            ) : (
              <div style={{ width: 160, height: 110, border: "2px dashed #d6e4d0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 12 }}>
                Belum ada foto
              </div>
            )}
          </div>

          {/* Gallery */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Foto Gallery</span>
                <span style={{ fontSize: 12, color: "#6b8578", marginLeft: 8 }}>Untuk galeri di halaman detail (bisa banyak)</span>
              </div>
              <Upload
                multiple
                beforeUpload={() => false}
                accept="image/*"
                showUploadList={false}
                onChange={async ({ fileList }) => {
                  const valid = fileList.filter((f) => f.size < 5 * 1024 * 1024);
                  if (valid.length !== fileList.length) message.warning("Maksimal 5MB per foto.");
                  if (isAdd) {
                    setPendingGallery((prev) => [...prev, ...valid.map((f) => f.originFileObj)]);
                  } else {
                    await handleUploadGallery(editing._id, valid);
                  }
                }}
              >
                <Button size="small" icon={<UploadOutlined />} loading={uploading}>Upload Foto</Button>
              </Upload>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(isAdd ? pendingGallery : (editing?.images || [])).map((item, i) => {
                const src = isAdd ? URL.createObjectURL(item) : resolveSrc(item);
                return (
                  <div key={i} style={{ position: "relative" }}>
                    <img
                      src={src}
                      alt=""
                      style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #e8efe2", cursor: "pointer" }}
                      onClick={() => setImagePreview(src)}
                    />
                    <Button
                      size="small" danger icon={<DeleteOutlined />}
                      onClick={() => {
                        if (isAdd) {
                          setPendingGallery((prev) => prev.filter((_, idx) => idx !== i));
                        } else {
                          handleDeleteGalleryImage(editing._id, item);
                        }
                      }}
                      style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", minWidth: 0, fontSize: 10 }}
                    />
                  </div>
                );
              })}
              {(isAdd ? pendingGallery.length === 0 : (!editing?.images || editing.images.length === 0)) && (
                <div style={{ color: "#999", fontSize: 13, padding: "20px 0" }}>Belum ada foto gallery. Klik "Upload Foto" untuk menambahkan.</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Jadwal Libur (hanya saat edit) ── */}
        {editing && (
          <div style={{ marginTop: 16, borderTop: "1px solid #e8efe2", paddingTop: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <CalendarOutlined /> Jadwal Libur
            </div>
            <span style={{ fontSize: 12, color: "#6b8578", display: "block", marginBottom: 12 }}>
              Tanggal yang dipilih tidak bisa dipesan oleh user
            </span>

            <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
              <DatePicker
                size="small"
                placeholder="Pilih tanggal"
                value={closedDateInput}
                onChange={(d) => setClosedDateInput(d)}
                disabledDate={(current) => current && current.isBefore(dayjs().startOf("day"))}
                style={{ width: 160 }}
              />
              <Input
                size="small"
                placeholder="Alasan (opsional)"
                value={closedReasonInput}
                onChange={(e) => setClosedReasonInput(e.target.value)}
                style={{ flex: 1 }}
                onPressEnter={handleAddClosedDate}
              />
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={handleAddClosedDate}>
                Tambah
              </Button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(editing.closedDates || []).length === 0 && (
                <div style={{ color: "#999", fontSize: 13 }}>Belum ada jadwal libur.</div>
              )}
              {(editing.closedDates || []).map((c) => (
                <div key={c.date} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fef3f3", borderRadius: 8, padding: "8px 12px", border: "1px solid #fdd" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {dayjs(c.date).format("DD MMM YYYY")}
                    </span>
                    {c.reason && <span style={{ fontSize: 12, color: "#999" }}>- {c.reason}</span>}
                  </div>
                  <Popconfirm title="Hapus tanggal libur ini?" onConfirm={() => handleDeleteClosedDate(c.date)}>
                    <Button size="small" danger icon={<DeleteOutlined />} style={{ width: 22, height: 22, minWidth: 0, borderRadius: "50%" }} />
                  </Popconfirm>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminCourts;
