import React, { useState, useEffect } from 'react';
import { Select, Typography, Spin, Alert, Table, Tag, Button, Modal, Image } from 'antd';
import { TrophyOutlined, EyeOutlined, FilePdfOutlined, FileOutlined, LinkOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { studentApi, achievementsApi } from '../../api';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

const STATUS_CONFIG = {
  PENDING: { color: '#F59E0B', label: '⏳ Chờ duyệt' },
  APPROVED: { color: '#10B981', label: '✅ Đã duyệt' },
  REJECTED: { color: '#EF4444', label: '❌ Từ chối' },
};

/** Render Cloudinary file: image -> thumbnail with preview, others -> link */
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
            alt={`Minh chứng ${i + 1}`}
            width={130}
            height={100}
            style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)' }}
          />
        ) : (
          <a key={i} href={f.file_url} target="_blank" rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#EFF6FF', border: '1px solid #BFDBFE',
              borderRadius: 8, padding: '10px 14px', color: '#1D4ED8',
              textDecoration: 'none', fontSize: 13,
            }}>
            {f.file_type?.includes('pdf')
              ? <FilePdfOutlined style={{ color: '#EF4444' }} />
              : <FileOutlined />}
            <span>Minh chứng {i + 1}</span>
            <LinkOutlined style={{ fontSize: 10, opacity: 0.6 }} />
          </a>
        );
      })}
    </div>
  );
};

export default function ChildAchievementsPage() {
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [detailItem, setDetailItem] = useState(null);

  // Get parent's children
  const { data: children = [], isLoading: childLoading } = useQuery({
    queryKey: ['my-children'],
    queryFn: () => studentApi.getMyChildren().then(r => r.data.data),
  });

  // Auto-select first child
  useEffect(() => {
    if (children.length > 0 && !selectedStudentId) {
      setSelectedStudentId(children[0].student_id);
    }
  }, [children, selectedStudentId]);

  // Fetch achievements for the selected child
  const { data: achievements = [], isLoading: achievementsLoading, error } = useQuery({
    queryKey: ['child-achievements', selectedStudentId],
    queryFn: () => achievementsApi.getAll({ studentId: selectedStudentId }).then(r => r.data.data),
    enabled: !!selectedStudentId,
  });

  if (childLoading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

  const columns = [
    {
      title: 'Tiêu đề thành tích',
      dataIndex: 'title',
      render: t => <Text strong style={{ color: '#111827' }}>{t}</Text>
    },
    {
      title: 'Thể loại',
      dataIndex: 'category',
      render: v => <Tag color="purple">{v || 'Khác'}</Tag>
    },
    {
      title: 'Ngày gửi',
      render: (_, r) => <Text style={{ color: '#6B7280', fontSize: 12 }}>{dayjs(r.submitted_at).format('DD/MM/YYYY')}</Text>
    },
    {
      title: 'Minh chứng',
      render: (_, r) => r.files?.length > 0
        ? <Tag color="cyan" icon={<FileOutlined />}>{r.files.length} file</Tag>
        : <Text style={{ color: '#6B7280' }}>—</Text>,
    },
    {
      title: 'Trạng thái',
      render: (_, r) => {
        const cfg = STATUS_CONFIG[r.status] || { color: '#6B7280', label: r.status };
        return <span style={{ color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>;
      },
    },
    {
      title: 'Nhận xét',
      render: (_, r) => r.comments?.length > 0
        ? <Tag color="blue">{r.comments.length} nhận xét</Tag>
        : <Text style={{ color: '#6B7280' }}>—</Text>,
    },
    {
      title: 'Thao tác',
      align: 'center',
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailItem(r)}
          style={{ borderRadius: 6, borderColor: '#4F46E5', color: '#4F46E5' }}>
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>🏆 Thành tích của con</h1>
        <p>Theo dõi và xem các thành tích, khen thưởng đã đạt được của con em</p>
      </div>

      {children.length === 0 ? (
        <Alert message="Chưa có thông tin con em được liên kết với tài khoản này" type="info" showIcon />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <Select
              placeholder="Chọn con em"
              style={{ width: 280 }}
              value={selectedStudentId}
              onChange={setSelectedStudentId}
              options={children.map(c => ({
                value: c.student_id,
                label: `${c.user?.full_name} (${c.student_code || 'HS'})`,
              }))}
            />
          </div>

          {!selectedStudentId ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>
              <div style={{ fontSize: 48 }}>🧑‍🎓</div>
              <div style={{ marginTop: 12 }}>Chọn con em để xem thành tích</div>
            </div>
          ) : achievementsLoading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
          ) : error ? (
            <Alert message="Không thể tải danh sách thành tích" type="error" showIcon />
          ) : (
            <div style={{ background: '#fff', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text strong style={{ color: '#4F46E5', fontSize: 16 }}>
                  📋 Danh sách thành tích ({achievements.length})
                </Text>
              </div>

              {achievements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
                  <div>Chưa có thành tích nào được gửi hoặc phê duyệt</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <Table
                    dataSource={achievements}
                    columns={columns}
                    rowKey="achievement_id"
                    pagination={{ pageSize: 10 }}
                    size="middle"
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!detailItem}
        onCancel={() => setDetailItem(null)}
        title={<span style={{ color: '#111827', fontSize: 16, fontWeight: 700 }}>🏆 Chi tiết thành tích</span>}
        footer={null}
        width={600}
        destroyOnClose
      >
        {detailItem && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                {detailItem.title}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Tag color="purple">{detailItem.category || 'Khác'}</Tag>
                <span style={{ color: STATUS_CONFIG[detailItem.status]?.color, fontWeight: 600 }}>
                  {STATUS_CONFIG[detailItem.status]?.label}
                </span>
                <span style={{ color: '#6B7280', fontSize: 12, marginLeft: 'auto' }}>
                  Gửi ngày: {dayjs(detailItem.submitted_at).format('DD/MM/YYYY')}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ color: '#4F46E5', display: 'block', marginBottom: 6 }}>Mô tả:</Text>
              <Paragraph style={{ color: '#374151', background: '#F3F4F6', border: '1px solid #E5E7EB', padding: 12, borderRadius: 8 }}>
                {detailItem.description || 'Không có mô tả chi tiết'}
              </Paragraph>
            </div>

            {detailItem.files?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <Text strong style={{ color: '#4F46E5', display: 'block', marginBottom: 6 }}>
                  ☁️ Tài liệu minh chứng ({detailItem.files.length}):
                </Text>
                <CloudinaryFilePreview files={detailItem.files} />
              </div>
            )}

            {detailItem.comments?.length > 0 && (
              <div>
                <Text strong style={{ color: '#4F46E5', display: 'block', marginBottom: 8 }}>💬 Nhận xét từ giáo viên:</Text>
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
