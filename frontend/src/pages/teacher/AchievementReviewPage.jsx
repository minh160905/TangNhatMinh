import React, { useState } from 'react';
import { Table, Button, Tag, Typography, Space, Modal, Input, Select, Alert, Spin, Image } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined, FileOutlined, FilePdfOutlined, LinkOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { achievementsApi } from '../../api';
import { App } from 'antd';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const CloudinaryFilePreview = ({ files }) => {
  if (!files || files.length === 0) return null;

  const images = files.filter(f =>
    f.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(f.file_url)
  );
  const otherFiles = files.filter(f =>
    !(f.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(f.file_url))
  );

  return (
    <div style={{ marginTop: 12 }}>
      {images.length > 0 && (
        <>
          {/* Image Grid */}
          <Image.PreviewGroup>
            <div style={{
              display: 'grid',
              gridTemplateColumns: images.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 10,
            }}>
              {images.map((f, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '2px solid #E5E7EB', aspectRatio: '16/10', background: '#F3F4F6' }}>
                  <Image
                    src={f.file_url}
                    alt={`Ảnh minh chứng ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    preview={{
                      mask: (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#fff', fontSize: 13 }}>
                          <EyeOutlined style={{ fontSize: 20 }} />
                          <span>Xem ảnh</span>
                        </div>
                      ),
                    }}
                  />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
                    padding: '4px 8px', color: '#fff', fontSize: 11,
                  }}>
                    Ảnh {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </Image.PreviewGroup>
        </>
      )}

      {otherFiles.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: images.length > 0 ? 10 : 0 }}>
          {otherFiles.map((f, i) => (
            <a key={i} href={f.file_url} target="_blank" rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#EEF2FF', border: '1px solid #C7D2FE',
                borderRadius: 8, padding: '8px 14px', color: '#4F46E5',
                textDecoration: 'none', fontSize: 13, fontWeight: 500,
              }}
            >
              {f.file_type?.includes('pdf') ? <FilePdfOutlined style={{ color: '#EF4444' }} /> : <FileOutlined />}
              <span>File {i + 1}</span><LinkOutlined style={{ fontSize: 10, opacity: 0.6 }} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};


const STATUS_CONFIG = {
  PENDING: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: '⏳ Chờ duyệt' },
  APPROVED: { color: '#10B981', bg: 'rgba(16,185,129,0.1)', label: '✅ Đã duyệt' },
  REJECTED: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: '❌ Từ chối' },
};

export default function AchievementReviewPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [detailModal, setDetailModal] = useState(false);

  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ['achievements', filterStatus],
    queryFn: () => achievementsApi.getAll(filterStatus ? { status: filterStatus } : {}).then(r => r.data.data),
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, status, comment }) => achievementsApi.review(id, { status, comment }),
    onSuccess: () => {
      qc.invalidateQueries(['achievements']);
      setDetailModal(false);
      setSelectedAchievement(null);
      setReviewComment('');
      message.success('Đã cập nhật trạng thái thành tích');
    },
    onError: (e) => message.error(e.response?.data?.message || 'Lỗi duyệt thành tích'),
  });

  const columns = [
    {
      title: 'Tiêu đề', dataIndex: 'title', render: (t, row) => (
        <div>
          <div style={{ color: '#111827', fontWeight: 600 }}>{t}</div>
          <div style={{ color: '#6B7280', fontSize: 12 }}>{row.category}</div>
        </div>
      ),
    },
    {
      title: 'Học sinh', render: (_, r) => (
        <Text style={{ color: '#94A3B8' }}>{r.student?.user?.full_name}</Text>
      ),
    },
    {
      title: 'Ngày gửi', render: (_, r) => (
        <Text style={{ color: '#6B7280', fontSize: 12 }}>{dayjs(r.submitted_at).format('DD/MM/YYYY HH:mm')}</Text>
      ),
    },
    {
      title: 'File đính kèm', render: (_, r) => (
        r.files?.length > 0
          ? <Tag icon={<FileOutlined />} color="blue">{r.files.length} file</Tag>
          : <Text style={{ color: '#6B7280' }}>—</Text>
      ),
    },
    {
      title: 'Trạng thái', render: (_, r) => {
        const cfg = STATUS_CONFIG[r.status];
        return (
          <span style={{ background: cfg.bg, color: cfg.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1px solid ${cfg.color}30` }}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      title: 'Thao tác', render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedAchievement(r); setDetailModal(true); }}
            style={{ borderRadius: 6, borderColor: '#4F46E5', color: '#4F46E5' }}>
            Chi tiết
          </Button>
          {r.status === 'PENDING' && (
            <>
              <Button size="small" icon={<CheckOutlined />} type="primary"
                onClick={() => reviewMut.mutate({ id: r.achievement_id, status: 'APPROVED', comment: '' })}
                style={{ background: '#10B981', border: 'none', borderRadius: 6 }}>
                Duyệt
              </Button>
              <Button size="small" icon={<CloseOutlined />} danger
                onClick={() => reviewMut.mutate({ id: r.achievement_id, status: 'REJECTED', comment: '' })}>
                Từ chối
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>🏆 Duyệt thành tích học sinh</h1>
        <p>Xem xét và phê duyệt thành tích do học sinh trong lớp chủ nhiệm gửi lên</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <button key={k} onClick={() => setFilterStatus(k === filterStatus ? null : k)} style={{
            background: filterStatus === k ? v.bg : '#fff',
            border: `1px solid ${filterStatus === k ? v.color : '#E5E7EB'}`,
            color: filterStatus === k ? v.color : '#94A3B8',
            borderRadius: 20, padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            transition: 'all 0.2s',
          }}>
            {v.label}
            <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '0 6px', fontSize: 11 }}>
              {achievements.filter(a => a.status === k).length}
            </span>
          </button>
        ))}
        <button onClick={() => setFilterStatus(null)} style={{
          background: !filterStatus ? 'rgba(79,70,229,0.2)' : '#fff',
          border: `1px solid ${!filterStatus ? '#4F46E5' : '#E5E7EB'}`,
          color: !filterStatus ? '#4F46E5' : '#94A3B8',
          borderRadius: 20, padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
        }}>Tất cả</button>
      </div>

      <Table dataSource={achievements} columns={columns} rowKey="achievement_id" loading={isLoading} pagination={{ pageSize: 15 }} size="middle" />

      {/* Detail Modal */}
      <Modal
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        title={<span style={{ color: '#111827' }}>🏆 Chi tiết thành tích</span>}
        footer={null}
        width={680}
      >
        {selectedAchievement && (
          <div style={{ marginTop: 8 }}>

            {/* ── Header: title + tags ── */}
            <div style={{ marginBottom: 18 }}>
              <Text strong style={{ color: '#4F46E5', fontSize: 18, lineHeight: 1.4 }}>{selectedAchievement.title}</Text>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Tag color="purple" style={{ borderRadius: 20, fontWeight: 600 }}>{selectedAchievement.category}</Tag>
                <Tag
                  color={selectedAchievement.status === 'APPROVED' ? 'success' : selectedAchievement.status === 'REJECTED' ? 'error' : 'warning'}
                  style={{ borderRadius: 20, fontWeight: 600 }}
                >
                  {STATUS_CONFIG[selectedAchievement.status]?.label}
                </Tag>
                <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                  Ngày gửi: {dayjs(selectedAchievement.submitted_at).format('DD/MM/YYYY HH:mm')}
                </Text>
              </div>
            </div>

            {/* ── Student info ── */}
            {selectedAchievement.student?.user && (
              <div style={{
                background: '#F8FAFF', border: '1px solid #E5E7EB',
                borderRadius: 12, padding: '14px 16px', marginBottom: 16,
              }}>
                {/* Name row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0,
                  }}>
                    {selectedAchievement.student.user.full_name?.[0]}
                  </div>
                  <div>
                    <div style={{ color: '#111827', fontWeight: 700, fontSize: 15 }}>{selectedAchievement.student.user.full_name}</div>
                    <div style={{ color: '#6B7280', fontSize: 12 }}>@{selectedAchievement.student.user.username}</div>
                  </div>
                </div>

                {/* Detail chips */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {/* Student ID */}
                  {selectedAchievement.student.student_code && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: '#EEF2FF', border: '1px solid #C7D2FE',
                      borderRadius: 8, padding: '5px 12px',
                    }}>
                      <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>🪪 Mã HS:</span>
                      <span style={{ color: '#4F46E5', fontWeight: 700, fontSize: 13 }}>{selectedAchievement.student.student_code}</span>
                    </div>
                  )}

                  {/* Class */}
                  {selectedAchievement.student.class_instance && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: '#F0FDF4', border: '1px solid #BBF7D0',
                      borderRadius: 8, padding: '5px 12px',
                    }}>
                      <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>🏫 Lớp:</span>
                      <span style={{ color: '#16A34A', fontWeight: 700, fontSize: 13 }}>
                        {selectedAchievement.student.class_instance.grade}{selectedAchievement.student.class_instance.class?.class_code}
                        {selectedAchievement.student.class_instance.year?.name && (
                          <span style={{ fontWeight: 400, color: '#6B7280', fontSize: 12 }}> – {selectedAchievement.student.class_instance.year.name}</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Date of birth */}
                  {selectedAchievement.student.date_of_birth && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: '#FFF7ED', border: '1px solid #FED7AA',
                      borderRadius: 8, padding: '5px 12px',
                    }}>
                      <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>🎂 Ngày sinh:</span>
                      <span style={{ color: '#D97706', fontWeight: 700, fontSize: 13 }}>{dayjs(selectedAchievement.student.date_of_birth).format('DD/MM/YYYY')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Description ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                color: '#4F46E5', fontWeight: 700, fontSize: 13,
                marginBottom: 8, letterSpacing: 0.3,
              }}>
                📝 MÔ TẢ THÀNH TÍCH
              </div>
              <div style={{
                background: '#F8FAFF', border: '1px solid #E5E7EB',
                borderRadius: 10, padding: '12px 14px',
                color: '#374151', fontSize: 14, lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
              }}>
                {selectedAchievement.description || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Không có mô tả</span>}
              </div>
            </div>

            {/* ── Evidence files ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                color: '#4F46E5', fontWeight: 700, fontSize: 13,
                marginBottom: 8, letterSpacing: 0.3,
              }}>
                🖼️ ẢNH / FILE MINH CHỨNG
                {selectedAchievement.files?.length > 0 && (
                  <span style={{
                    background: '#EEF2FF', color: '#4F46E5',
                    fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 20,
                  }}>
                    {selectedAchievement.files.length} file
                  </span>
                )}
              </div>
              {selectedAchievement.files?.length > 0 ? (
                <CloudinaryFilePreview files={selectedAchievement.files} />
              ) : (
                <div style={{
                  background: '#F9FAFB', border: '2px dashed #E5E7EB',
                  borderRadius: 10, padding: '24px 14px', textAlign: 'center',
                  color: '#9CA3AF', fontSize: 13,
                }}>
                  <FileOutlined style={{ fontSize: 24, marginBottom: 6, display: 'block' }} />
                  Học sinh không đính kèm file minh chứng
                </div>
              )}
            </div>

            {/* ── Review form (PENDING only) ── */}
            {selectedAchievement.status === 'PENDING' && (
              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16, marginTop: 4 }}>
                <div style={{ color: '#4F46E5', fontWeight: 700, fontSize: 13, marginBottom: 8, letterSpacing: 0.3 }}>✍️ NHẬN XÉT & QUYẾT ĐỊNH</div>
                <TextArea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="Nhập nhận xét về thành tích này (tùy chọn)..."
                  rows={3}
                  style={{ marginBottom: 12, borderRadius: 8 }}
                />
                <Space>
                  <Button type="primary" icon={<CheckOutlined />}
                    style={{ background: '#10B981', border: 'none', borderRadius: 8, fontWeight: 600 }}
                    loading={reviewMut.isPending}
                    onClick={() => reviewMut.mutate({ id: selectedAchievement.achievement_id, status: 'APPROVED', comment: reviewComment })}>
                    ✅ Duyệt thành tích
                  </Button>
                  <Button danger icon={<CloseOutlined />}
                    style={{ borderRadius: 8, fontWeight: 600 }}
                    loading={reviewMut.isPending}
                    onClick={() => reviewMut.mutate({ id: selectedAchievement.achievement_id, status: 'REJECTED', comment: reviewComment })}>
                    ❌ Từ chối
                  </Button>
                </Space>
              </div>
            )}

            {/* ── Past comments ── */}
            {selectedAchievement.comments?.length > 0 && (
              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16, marginTop: 16 }}>
                <div style={{ color: '#4F46E5', fontWeight: 700, fontSize: 13, marginBottom: 10, letterSpacing: 0.3 }}>💬 NHẬN XÉT TRƯỚC ĐÓ</div>
                {selectedAchievement.comments.map(c => (
                  <div key={c.id} style={{ marginBottom: 10, background: '#F8FAFF', border: '1px solid #E5E7EB', padding: '10px 14px', borderRadius: 8 }}>
                    <Text strong style={{ color: '#4F46E5', fontSize: 12 }}>{c.teacher?.full_name} · {dayjs(c.created_at).format('DD/MM HH:mm')}</Text>
                    <Paragraph style={{ color: '#111827', margin: '4px 0 0', fontSize: 14 }}>{c.comment}</Paragraph>
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
