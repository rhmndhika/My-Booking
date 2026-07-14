import { useEffect, useState } from "react";
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Switch, message, Popconfirm, Tag,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import api from "../../api/axios";
import { formatIDR } from "../../utils/format";

const FACILITY_OPTIONS = ["AC", "Toilet", "Parkir", "Kantin", "Mushola", "Wifi", "Ruang Tunggu VIP", "Shower"];

const AdminCourts = () => {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ openHour: 6, closeHour: 23, isActive: true });
    setModalOpen(true);
  };

  const openEdit = (court) => {
    setEditing(court);
    form.setFieldsValue(court);
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

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editing) {
        await api.put(`/courts/${editing._id}`, values);
        message.success("Lapangan diperbarui.");
      } else {
        await api.post("/courts", values);
        message.success("Lapangan ditambahkan.");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || "Gagal menyimpan lapangan.");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: "Nama", dataIndex: "name", render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: "Lokasi", dataIndex: "location", ellipsis: true },
    {
      title: "Harga/jam",
      dataIndex: "pricePerHour",
      render: (v) => <span className="mono" style={{ fontWeight: 600, color: "#12362b" }}>{formatIDR(v)}</span>,
    },
    {
      title: "Jam operasi",
      render: (_, r) => (
        <span className="mono" style={{ fontSize: 12 }}>{r.openHour}:00 – {r.closeHour}:00</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      render: (v) => (
        <Tag color={v ? "success" : "default"} style={{ borderRadius: 999, fontWeight: 500 }}>
          {v ? "Aktif" : "Nonaktif"}
        </Tag>
      ),
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

      <Modal
        title={editing ? "Edit Lapangan" : "Tambah Lapangan"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText="Simpan"
        confirmLoading={saving}
        width={600}
      >
        <Form layout="vertical" form={form} requiredMark={false}>
          <Form.Item name="name" label="Nama lapangan" rules={[{ required: true }]}>
            <Input placeholder="contoh: Lapangan A - GOR Sejahtera" />
          </Form.Item>
          <Form.Item
            name="location"
            label="Lokasi"
            rules={[{ required: true }]}
            extra="Dipakai sebagai alamat yang tampil di halaman lapangan."
          >
            <Input placeholder="Alamat lengkap" />
          </Form.Item>
          <Form.Item
            name="mapsLink"
            label="Link Google Maps (opsional)"
            extra="Tempel link Google Maps agar peta lokasi muncul di halaman booking. Buka Google Maps > cari lokasi > Copy link."
          >
            <Input placeholder="https://maps.app.goo.gl/... atau https://www.google.com/maps/..." />
          </Form.Item>
          <Form.Item name="description" label="Deskripsi">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="image" label="URL foto">
            <Input placeholder="https://..." />
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
            <Select mode="tags" options={FACILITY_OPTIONS.map((f) => ({ value: f, label: f }))} placeholder="Pilih atau tulis fasilitas" />
          </Form.Item>
          <Form.Item name="isActive" label="Aktif" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminCourts;
