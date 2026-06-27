import React, { useState } from 'react';
import { Form, Input, Select, Button, Upload, Table, Tag, Typography, Modal, Image } from 'antd';
import { UploadOutlined, TrophyOutlined, EyeOutlined, FilePdfOutlined, FileOutlined, LinkOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { achievementsApi } from '../../api';
import { App } from 'antd';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const STATUS_CONFIG = {
  PENDING: { color: '#F59E0B', label: '⏳ Chờ duyệt' },
  APPROVED: { color: '#10B981', label: '✅ Đã duyệt' },
  REJECTED: { color: '#EF4444', label: '❌ Từ chối' },
};

const CATEGORIES = ['Học thuật', 'Thể thao', 'Văn nghệ', 'Kỹ năng sống', 'Tình nguyện', 'Khác'];

/** Render Cloudinary file: image → thumbnail with preview, others → link */
const CloudinaryFilePreview = ({ files }) => {
  if (!files || files.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
      {files.map((f, i) => {
        const isImage = f.file_type?.startsWith('image/')
          || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(f.file_url);
        return isImage ? (
          <Image
            key={i}
            src={f.file_url}
            alt={`File ${i + 1}`}
            width={130}
            height={100}
            style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)' }}
          />
        ) : (
          <a key={i} href={f.file_url} target="_blank" rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.3)',
              borderRadius: 8, padding: '10px 14px', color: '#4F46E5',
              textDecoration: 'none', fontSize: 13,
            }}>
            {f.file_type?.includes('pdf')
              ? <FilePdfOutlined style={{ color: '#EF4444' }} />
              : <FileOutlined />}
            <span>File {i + 1}</span>
            <LinkOutlined style={{ fontSize: 10, opacity: 0.6 }} />
          </a>
        );
      })}
    </div>
  );
};

export default function AchievementSubmitPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [detailItem, setDetailItem] = useState(null);

  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ['my-achievements'],
    queryFn: () => achievementsApi.getAll().then(r => r.data.data),
  });

  const submitMut = useMutation({
    mutationFn: (formData) => achievementsApi.create(formData),
    onSuccess: () => {
      qc.invalidateQueries(['my-achievements']);
      form.resetFields();
      setFileList([]);
      message.success('🏆 Gửi thành tích thành công! Đang chờ GVCN duyệt.');
    },
    onError: (e) => message.error(e.response?.data?.message || 'Lỗi gửi thành tích'),
  });

  const handleSubmit = (values) => {
    const formData = new FormData();
    formData.append('title', values.title);
    formData.append('description', values.description || '');
    formData.append('category', values.category || '');
    fileList.forEach(f => { if (f.originFileObj) formData.append('files', f.originFileObj); });
    submitMut.mutate(formData);
  };

  const columns = [
    { title: 'Tiêu đề', dataIndex: 'title', render: t => <Text strong style={{ color: '#111827' }}>{t}</Text> },
    { title: 'Thể loại', dataIndex: 'category', render: v => <Tag color="purple">{v}</Tag> },
    { title: 'Ngày gửi', render: (_, r) => <Text style={{ color: '#6B7280', fontSize: 12 }}>{dayjs(r.submitted_at).format('DD/MM/YYYY')}</Text> },
    {
      title: 'Files', render: (_, r) => r.files?.length > 0
        ? <Tag color="cyan" icon={<FileOutlined />}>{r.files.length} file (Cloudinary)</Tag>
        : <Text style={{ color: '#475569' }}>—</Text>,
    },
    {
      title: 'Trạng thái', render: (_, r) => {
        const cfg = STATUS_CONFIG[r.status];
        return <span style={{ color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>;
      },
    },
    {
      title: 'Nhận xét', render: (_, r) => r.comments?.length > 0
        ? <Tag color="blue">{r.comments.length} nhận xét</Tag>
        : <Text style={{ color: '#475569' }}>—</Text>,
    },
    {
      title: '', render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailItem(r)}
          style={{ borderRadius: 6, borderColor: '#4F46E5', color: '#4F46E5' }}>
          Chi tiết
        </Button>
      ),
    },
  ];

  const approvedAchievements = achievements.filter(a => a.status === 'APPROVED');

  const approvedColumns = [
    { title: 'Tiêu đề', dataIndex: 'title', render: t => <Text strong style={{ color: '#111827' }}>{t}</Text> },
    { title: 'Thể loại', dataIndex: 'category', render: v => <Tag color="purple">{v}</Tag> },
    { title: 'Ngày duyệt', render: (_, r) => <Text style={{ color: '#6B7280', fontSize: 12 }}>{r.reviewed_at ? dayjs(r.reviewed_at).format('DD/MM/YYYY') : '—'}</Text> },
    { title: 'Người duyệt', render: (_, r) => <Text style={{ color: '#111827', fontSize: 13 }}>{r.reviewer?.full_name || 'GVCN'}</Text> },
    {
      title: 'Minh chứng', render: (_, r) => r.files?.length > 0
        ? <Tag color="cyan" icon={<FileOutlined />}>{r.files.length} file</Tag>
        : <Text style={{ color: '#475569' }}>—</Text>,
    },
    {
      title: '', render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailItem(r)}
          style={{ borderRadius: 6, borderColor: '#10B981', color: '#10B981' }}>
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>🏆 Thành tích học sinh</h1>
        <p>Gửi thành tích để GVCN xem xét và phê duyệt · File lưu trên ☁️ Cloudinary</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 20 }}>
        {/* Form gửi */}
        <div style={{ background: '#fff', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 24 }}>
          <Text strong style={{ color: '#4F46E5', fontSize: 16, display: 'block', marginBottom: 20 }}>
            ➕ Gửi thành tích mới
          </Text>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="title" label="Tiêu đề thành tích" rules={[{ required: true }]}>
              <Input placeholder="VD: Giải Nhất Toán cấp huyện" />
            </Form.Item>
            <Form.Item name="category" label="Thể loại">
              <Select placeholder="Chọn thể loại" options={CATEGORIES.map(c => ({ value: c, label: c }))} />
            </Form.Item>
            <Form.Item name="description" label="Mô tả chi tiết">
              <TextArea rows={4} placeholder="Mô tả chi tiết về thành tích..." />
            </Form.Item>
            <Form.Item label="File chứng minh">
              <Upload
                fileList={fileList}
                onChange={({ fileList }) => setFileList(fileList)}
                beforeUpload={() => false}
                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                multiple
                maxCount={5}
              >
                <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>
                  Tải lên (tối đa 5 file)
                </Button>
              </Upload>
              <div style={{
                marginTop: 8, padding: '6px 10px', borderRadius: 6,
                background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)',
              }}>
                <Text style={{ color: '#6B7280', fontSize: 11 }}>
                  ☁️ File tự động tải lên <strong style={{ color: '#4F46E5' }}>Cloudinary</strong> · JPG, PNG, PDF, DOC · Max 10MB/file
                </Text>
              </div>
            </Form.Item>
            <Button type="primary" htmlType="submit" block icon={<TrophyOutlined />}
              loading={submitMut.isPending}
              style={{ height: 42, borderRadius: 10, fontWeight: 700 }}>
              Gửi thành tích
            </Button>
          </Form>
        </div>

        {/* Lịch sử & Thành tích đã được duyệt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Lịch sử gửi */}
          <div style={{ background: '#fff', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 24 }}>
            <Text strong style={{ color: '#4F46E5', fontSize: 16, display: 'block', marginBottom: 16 }}>
              📋 Lịch sử gửi ({achievements.length})
            </Text>
            <Table dataSource={achievements} columns={columns} rowKey="achievement_id"
              loading={isLoading} pagination={{ pageSize: 5 }} size="middle" />
          </div>

          {/* Thành tích đã được duyệt */}
          <div style={{ background: '#fff', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 24 }}>
            <Text strong style={{ color: '#10B981', fontSize: 16, display: 'block', marginBottom: 16 }}>
              🏆 Thành tích đã được duyệt ({approvedAchievements.length})
            </Text>
            <Table dataSource={approvedAchievements} columns={approvedColumns} rowKey="achievement_id"
              loading={isLoading} pagination={{ pageSize: 5 }} size="middle" />
          </div>
        </div>
      </div>

      {/* Modal chi tiết – hiển thị preview ảnh Cloudinary */}
      <Modal
        open={!!detailItem}
        onCancel={() => setDetailItem(null)}
        title={<span style={{ color: '#111827' }}>🏆 {detailItem?.title}</span>}
        footer={null} width={600} destroyOnClose
      >
        {detailItem && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <Tag color="purple">{detailItem.category}</Tag>
              <span style={{ color: STATUS_CONFIG[detailItem.status]?.color, fontWeight: 600, marginLeft: 8 }}>
                {STATUS_CONFIG[detailItem.status]?.label}
              </span>
            </div>
            <Paragraph style={{ color: '#374151', background: '#F3F4F6', border: '1px solid #E5E7EB', padding: 12, borderRadius: 8 }}>
              {detailItem.description || 'Không có mô tả'}
            </Paragraph>

            {detailItem.files?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: '#4F46E5', display: 'block', marginBottom: 6 }}>
                  ☁️ File Cloudinary ({detailItem.files.length}):
                </Text>
                <CloudinaryFilePreview files={detailItem.files} />
              </div>
            )}

            {detailItem.comments?.length > 0 && (
              <div>
                <Text style={{ color: '#4F46E5', display: 'block', marginBottom: 8 }}>💬 Nhận xét từ GVCN:</Text>
                {detailItem.comments.map((c, i) => (
                  <div key={i} style={{ background: '#EEF2FF', border: '1px solid #E0E7FF', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                    <Text strong style={{ color: '#4F46E5', fontSize: 13 }}>{c.teacher?.full_name}</Text>
                    <Paragraph style={{ color: '#374151', margin: '4px 0 0' }}>{c.comment}</Paragraph>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
