import React, { useState } from 'react';
import { Select, Typography, Spin, Alert, Card, Avatar, Empty, Timeline } from 'antd';
import { CommentOutlined, StarOutlined, UserOutlined, CalendarOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { studentApi, commentsApi, conductsApi } from '../../api';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;

const CONDUCT_OPTIONS = [
  { value: 'EXCELLENT', label: 'Tốt',        color: '#10B981', bg: '#ECFDF5', border: '#6EE7B7' },
  { value: 'GOOD',      label: 'Khá',        color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD' },
  { value: 'AVERAGE',   label: 'Trung bình', color: '#D97706', bg: '#FFFBEB', border: '#FCD34D' },
  { value: 'WEAK',      label: 'Yếu',        color: '#EF4444', bg: '#FEF2F2', border: '#FCA5A5' },
];

const ConductBadge = ({ rating }) => {
  if (!rating) return <span style={{ color: '#D1D5DB' }}>—</span>;
  const cfg = CONDUCT_OPTIONS.find(o => o.value === rating);
  if (!cfg) return null;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      borderRadius: 20, padding: '4px 16px', fontWeight: 800, fontSize: 13,
      display: 'inline-block'
    }}>
      {cfg.label}
    </span>
  );
};

export default function StudentCommentsPage() {
  const [semester, setSemester] = useState(1);

  // Get student info from report
  const { data: report } = useQuery({
    queryKey: ['student-report', semester],
    queryFn: () => studentApi.getReport({ semester }).then(r => r.data.data),
  });

  // Get comments
  const { data: comments = [], isLoading: commentsLoading, error: commentsError } = useQuery({
    queryKey: ['student-comments', semester],
    queryFn: () => commentsApi.getAll({ semester }).then(r => r.data.data),
  });

  // Get conducts
  const { data: conducts = [], isLoading: conductsLoading, error: conductsError } = useQuery({
    queryKey: ['student-conducts', semester],
    queryFn: () => conductsApi.getByClass({ semester }).then(r => r.data.data),
  });

  const studentInfo = report?.student;
  const activeConduct = conducts?.[0]; // Get the conduct for this semester

  const isLoading = commentsLoading || conductsLoading;
  const hasError = commentsError || conductsError;

  return (
    <div>
      <div className="page-header">
        <h1>💬 Nhận xét từ Giáo viên</h1>
        <p>Xem nhận xét chi tiết và đánh giá hạnh kiểm từ giáo viên bộ môn và giáo viên chủ nhiệm</p>
      </div>

      {/* Student info */}
      {studentInfo && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20,
        }}>
          {[
            { label: 'Họ tên', value: studentInfo.full_name, color: '#4F46E5' },
            { label: 'Mã học sinh', value: studentInfo.student_code, color: '#60A5FA' },
            { label: 'Lớp', value: studentInfo.class, color: '#A78BFA' },
            { label: 'Năm học', value: studentInfo.year, color: '#34D399' },
          ].map(item => (
            <div key={item.label} style={{ background: '#fff', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ color: '#6B7280', fontSize: 11, marginBottom: 4 }}>{item.label}</div>
              <div style={{ color: item.color, fontWeight: 700, fontSize: 15 }}>{item.value || '—'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Semester select */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <Select value={semester} onChange={setSemester} style={{ width: 160 }}
          options={[{ value: 1, label: 'Học kỳ I' }, { value: 2, label: 'Học kỳ II' }]} />
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : hasError ? (
        <Alert message="Không thể tải thông tin nhận xét và hạnh kiểm" type="error" showIcon />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
          {/* Conduct / Hạnh kiểm Card */}
          <Card
            title={
              <span style={{ color: '#4F46E5', fontWeight: 800, fontSize: 16 }}>
                <StarOutlined style={{ marginRight: 8 }} /> Đánh giá Hạnh kiểm (GV Chủ nhiệm)
              </span>
            }
            style={{
              borderRadius: 12,
              border: '1px solid rgba(99,102,241,0.2)',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            {activeConduct ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Text strong style={{ fontSize: 14, color: '#4B5563' }}>Xếp loại:</Text>
                  <ConductBadge rating={activeConduct.rating} />
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>
                    Cập nhật lúc: {dayjs(activeConduct.updated_at).format('DD/MM/YYYY HH:mm')}
                  </Text>
                </div>
                {activeConduct.note && (
                  <div style={{ background: '#F8FAFF', border: '1px solid #E0E7FF', borderRadius: 8, padding: 14 }}>
                    <Text strong style={{ color: '#4F46E5', display: 'block', marginBottom: 4, fontSize: 13 }}>Ghi chú của giáo viên:</Text>
                    <Paragraph style={{ color: '#374151', margin: 0, fontSize: 14, fontStyle: 'italic' }}>
                      " {activeConduct.note} "
                    </Paragraph>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#4F46E5' }} />
                  <Text style={{ fontSize: 12, color: '#4B5563' }}>
                    Người đánh giá: <Text strong>{activeConduct.teacher?.full_name}</Text>
                  </Text>
                </div>
              </div>
            ) : (
              <Empty description="Chưa có đánh giá hạnh kiểm trong học kỳ này" />
            )}
          </Card>

          {/* Comments Timeline */}
          <Card
            title={
              <span style={{ color: '#4F46E5', fontWeight: 800, fontSize: 16 }}>
                <CommentOutlined style={{ marginRight: 8 }} /> Nhận xét từ Giáo viên
              </span>
            }
            style={{
              borderRadius: 12,
              border: '1px solid rgba(99,102,241,0.2)',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            {comments.length === 0 ? (
              <Empty description="Chưa có nhận xét nào trong học kỳ này" />
            ) : (
              <Timeline
                mode="left"
                style={{ marginTop: 16 }}
                items={comments.map(c => ({
                  color: '#4F46E5',
                  label: <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{dayjs(c.created_at).format('DD/MM/YYYY HH:mm')}</Text>,
                  children: (
                    <div style={{
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: 10,
                      padding: '12px 16px',
                      marginBottom: 16,
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Avatar size="small" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }} icon={<UserOutlined />} />
                        <Text strong style={{ color: '#111827', fontSize: 13 }}>
                          GV. {c.teacher?.full_name}
                        </Text>
                      </div>
                      <Text style={{ color: '#374151', fontSize: 14, whiteSpace: 'pre-line' }}>{c.content}</Text>
                    </div>
                  )
                }))}
              />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
