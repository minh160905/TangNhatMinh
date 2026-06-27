import React, { useState, useEffect } from 'react';
import {
  Table, Tag, Typography, Space, Drawer, Spin, Empty,
  Avatar, Badge, Tabs, Select,
} from 'antd';
import {
  TeamOutlined, UserOutlined, ManOutlined, WomanOutlined,
  MailOutlined, PhoneOutlined, EnvironmentOutlined,
  IdcardOutlined, CalendarOutlined, HomeOutlined,
  TrophyOutlined, BookOutlined, CommentOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { classesApi, studentApi, achievementsApi, commentsApi, conductsApi } from '../../api';
import dayjs from 'dayjs';

const { Text } = Typography;

// ── Small info row ──────────────────────────────────────────────────────────
const InfoRow = ({ icon, label, value }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '8px 0', borderBottom: '1px solid #F3F4F6',
  }}>
    <span style={{ color: '#4F46E5', width: 16, flexShrink: 0, marginTop: 2 }}>{icon}</span>
    <div style={{ flex: 1 }}>
      <div style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 1 }}>{label}</div>
      <div style={{ color: '#111827', fontWeight: 500, fontSize: 13 }}>{value || '—'}</div>
    </div>
  </div>
);

// ── Parent card ─────────────────────────────────────────────────────────────
const ParentCard = ({ parent }) => {
  const u = parent?.user;
  if (!u) return null;
  return (
    <div style={{
      background: '#F8FAFF', border: '1px solid #E0E7FF',
      borderRadius: 10, padding: '12px 14px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, #2563EB, #4F46E5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
        }}>
          {u.full_name?.[0]}
        </div>
        <div>
          <div style={{ color: '#111827', fontWeight: 700, fontSize: 14 }}>{u.full_name}</div>
          <div style={{ color: '#6B7280', fontSize: 12 }}>@{u.username}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {u.email && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4F46E5', fontSize: 12 }}>
            <MailOutlined /> {u.email}
          </span>
        )}
        {u.phone && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#059669', fontSize: 12 }}>
            <PhoneOutlined /> {u.phone}
          </span>
        )}
      </div>
    </div>
  );
};

// ── Tab 1: Scores ───────────────────────────────────────────────────────────
function StudentScoresTab({ studentId, yearId: initialYearId }) {
  const [semester, setSemester] = useState(1);
  const [selectedYearId, setSelectedYearId] = useState(initialYearId);

  useEffect(() => {
    if (initialYearId) {
      setSelectedYearId(initialYearId);
    }
  }, [initialYearId]);

  const { data: years = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => classesApi.getYears().then(r => r.data.data),
  });

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['student-report-gvcn', studentId, semester, selectedYearId],
    queryFn: () => studentApi.getReport({ semester, studentId, yearId: selectedYearId }).then(r => r.data.data),
    enabled: !!studentId && !!selectedYearId,
  });

  if (isLoading) return <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>;
  if (error || !report) return <div style={{ color: '#EF4444', padding: 10, textAlign: 'center' }}>Không thể tải bảng điểm</div>;

  const ScoreCell = ({ value }) => {
    if (value === null || value === undefined) return <span style={{ color: '#9CA3AF' }}>—</span>;
    let color = '#111827';
    if (value >= 8) color = '#10B981';
    else if (value < 5) color = '#EF4444';
    return <span style={{ color, fontWeight: value >= 8 || value < 5 ? 700 : 400 }}>{value.toFixed(1)}</span>;
  };

  const columns = [
    { title: 'Môn học', dataIndex: 'subject_name', render: v => <Text strong style={{ color: '#111827' }}>{v}</Text> },
    ...[1, 2, 3, 4, 5].map(i => ({
      title: `TX${i}`,
      dataIndex: `tx${i}`, width: 60, align: 'center',
      render: v => <ScoreCell value={v} />,
    })),
    { title: 'GK', dataIndex: 'gk', width: 60, align: 'center', render: v => <ScoreCell value={v} /> },
    { title: 'CK', dataIndex: 'ck', width: 60, align: 'center', render: v => <ScoreCell value={v} /> },
    {
      title: <span style={{ fontWeight: 800 }}>ĐTB</span>,
      dataIndex: 'dtb', width: 70, align: 'center',
      render: v => v != null
        ? <strong style={{ color: v >= 8 ? '#10B981' : v < 5 ? '#EF4444' : '#F59E0B', fontSize: 13 }}>{v.toFixed(2)}</strong>
        : <span style={{ color: '#9CA3AF' }}>—</span>,
    },
  ];

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <Select
            value={semester}
            onChange={setSemester}
            style={{ width: 140 }}
            options={[{ value: 1, label: 'Học kỳ I' }, { value: 2, label: 'Học kỳ II' }]}
          />
          <Select
            value={selectedYearId}
            onChange={setSelectedYearId}
            style={{ width: 180 }}
            options={years.map(y => ({ value: y.year_id, label: y.name }))}
            placeholder="Chọn năm học"
          />
        </div>
        {report.overall_avg !== null && (
          <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 8, padding: '4px 12px' }}>
            <span style={{ color: '#6B7280', fontSize: 11, marginRight: 6 }}>ĐTB Tổng kết:</span>
            <strong style={{
              color: report.overall_avg >= 8 ? '#10B981' : report.overall_avg < 5 ? '#EF4444' : '#F59E0B',
              fontSize: 15
            }}>
              {report.overall_avg.toFixed(2)}
            </strong>
          </div>
        )}
      </div>

      {(!report.subjects || report.subjects.length === 0) ? (
        <Empty description="Chưa có điểm học kỳ này" style={{ padding: 20 }} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <Table
            dataSource={report.subjects}
            columns={columns}
            rowKey="subject_id"
            pagination={false}
            size="small"
            bordered
          />
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Achievements ──────────────────────────────────────────────────────
function StudentAchievementsTab({ studentId }) {
  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ['student-achievements-gvcn', studentId],
    queryFn: () => achievementsApi.getAll({ studentId }).then(r => r.data.data),
    enabled: !!studentId,
  });

  if (isLoading) return <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>;

  const getStatusTag = (status) => {
    const configs = {
      PENDING: { color: 'warning', label: 'Chờ duyệt' },
      APPROVED: { color: 'success', label: 'Đã duyệt' },
      REJECTED: { color: 'error', label: 'Từ chối' },
    };
    const cfg = configs[status] || { color: 'default', label: status };
    return <Tag color={cfg.color} style={{ borderRadius: 6 }}>{cfg.label}</Tag>;
  };

  return (
    <div style={{ marginTop: 10 }}>
      {achievements.length === 0 ? (
        <Empty description="Học sinh chưa có thành tích nào" style={{ padding: 20 }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 500, overflowY: 'auto', paddingRight: 4 }}>
          {achievements.map((ach) => (
            <div key={ach.achievement_id} style={{
              background: '#fff', border: '1px solid #E5E7EB',
              borderRadius: 10, padding: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <Text strong style={{ color: '#111827', fontSize: 14 }}>{ach.title}</Text>
                {getStatusTag(ach.status)}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {ach.category && <Tag color="blue" style={{ borderRadius: 6, margin: 0 }}>{ach.category}</Tag>}
                <Text style={{ color: '#9CA3AF', fontSize: 11 }}>
                  Nộp ngày: {dayjs(ach.submitted_at).format('DD/MM/YYYY')}
                </Text>
              </div>
              {ach.description && (
                <div style={{ color: '#4B5563', fontSize: 13, marginBottom: 8, background: '#F9FAFB', padding: '6px 10px', borderRadius: 6 }}>
                  {ach.description}
                </div>
              )}
              {ach.files && ach.files.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <Text style={{ color: '#6B7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Minh chứng đính kèm:</Text>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {ach.files.map((f, fi) => (
                      <a key={fi} href={f.file_url} target="_blank" rel="noopener noreferrer" style={{
                        fontSize: 12, color: '#4F46E5', textDecoration: 'underline'
                      }}>
                        Tài liệu {fi + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {ach.status !== 'PENDING' && ach.reviewer && (
                <div style={{ marginTop: 8, borderTop: '1px solid #F3F4F6', paddingTop: 6, fontSize: 11, color: '#9CA3AF' }}>
                  Người duyệt: <strong>{ach.reviewer.full_name}</strong> {ach.reviewed_at && `vào ${dayjs(ach.reviewed_at).format('DD/MM/YYYY HH:mm')}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CONDUCT_OPTIONS = [
  { value: 'EXCELLENT', label: 'Tốt',        color: '#10B981', bg: '#ECFDF5', border: '#6EE7B7' },
  { value: 'GOOD',      label: 'Khá',        color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD' },
  { value: 'AVERAGE',   label: 'Trung bình', color: '#D97706', bg: '#FFFBEB', border: '#FCD34D' },
  { value: 'WEAK',      label: 'Yếu',        color: '#EF4444', bg: '#FEF2F2', border: '#FCA5A5' },
];

// ── Tab 3: Comments ──────────────────────────────────────────────────────────
function StudentCommentsTab({ studentId, yearId: initialYearId }) {
  const [semester, setSemester] = useState(1);
  const [selectedYearId, setSelectedYearId] = useState(initialYearId);

  useEffect(() => {
    if (initialYearId) {
      setSelectedYearId(initialYearId);
    }
  }, [initialYearId]);

  const { data: years = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => classesApi.getYears().then(r => r.data.data),
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['student-comments-gvcn', studentId, semester, selectedYearId],
    queryFn: () => commentsApi.getAll({ student_id: studentId, semester, all: true }).then(r => r.data.data),
    enabled: !!studentId,
  });

  const { data: conducts = [], isLoading: conductsLoading } = useQuery({
    queryKey: ['student-conduct-gvcn', studentId, semester, selectedYearId],
    queryFn: () => conductsApi.getByClass({ student_id: studentId, semester, year_id: selectedYearId }).then(r => r.data.data),
    enabled: !!studentId && !!selectedYearId,
  });

  const isLoading = commentsLoading || conductsLoading;

  if (isLoading) return <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>;

  const activeConduct = conducts?.[0];
  const activeConductConfig = activeConduct ? CONDUCT_OPTIONS.find(o => o.value === activeConduct.rating) : null;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <Select
            value={semester}
            onChange={setSemester}
            style={{ width: 140 }}
            options={[{ value: 1, label: 'Học kỳ I' }, { value: 2, label: 'Học kỳ II' }]}
          />
          <Select
            value={selectedYearId}
            onChange={setSelectedYearId}
            style={{ width: 180 }}
            options={years.map(y => ({ value: y.year_id, label: y.name }))}
            placeholder="Chọn năm học"
          />
        </div>
        {/* Banner hiển thị Hạnh kiểm */}
        <div style={{
          background: activeConduct ? activeConductConfig?.bg || '#EEF2FF' : '#F3F4F6',
          border: `1px solid ${activeConduct ? activeConductConfig?.border || '#C7D2FE' : '#E5E7EB'}`,
          borderRadius: 8,
          padding: '4px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <span style={{ color: '#6B7280', fontSize: 11 }}>Hạnh kiểm:</span>
          {activeConduct ? (
            <strong style={{
              color: activeConductConfig?.color || '#4F46E5',
              fontSize: 14,
              fontWeight: 800
            }}>
              {activeConductConfig?.label}
            </strong>
          ) : (
            <strong style={{ color: '#9CA3AF', fontSize: 14 }}>-</strong>
          )}
        </div>
      </div>

      {comments.length === 0 ? (
        <Empty description="Chưa có nhận xét nào trong học kỳ này" style={{ padding: 20 }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 500, overflowY: 'auto', paddingRight: 4 }}>
          {comments.map((c) => (
            <div key={c.comment_id} style={{
              background: '#F8FAFF', borderRadius: 10, padding: '10px 14px',
              border: '1px solid #E5E7EB',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text strong style={{ color: '#4F46E5', fontSize: 12 }}>{c.teacher?.full_name}</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 11 }}>{dayjs(c.created_at).format('DD/MM/YYYY HH:mm')}</Text>
              </div>
              <Text style={{ color: '#111827', fontSize: 13 }}>{c.content}</Text>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeacherClassPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // ── Fetch the single homeroom class of this teacher ─────────────────────
  const { data: homeroomClass, isLoading: classLoading } = useQuery({
    queryKey: ['my-homeroom-class'],
    queryFn: () => classesApi.getMyHomeroomClass().then(r => r.data.data),
  });

  // ── Fetch students + parents once we have the class id ──────────────────
  const { data: classDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['homeroom-detail', homeroomClass?.class_instance_id],
    queryFn: () => classesApi.getHomeroomClassDetail(homeroomClass.class_instance_id).then(r => r.data.data),
    enabled: !!homeroomClass?.class_instance_id,
  });

  const instance = classDetail?.instance ?? homeroomClass;
  const yearId = instance?.year_id;
  const students = classDetail?.students || [];
  const isLoading = classLoading || detailLoading;

  const classLabel = instance
    ? `Lớp ${instance.grade}${instance.class?.class_code} – ${instance.year?.name}`
    : '';

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      title: '#', width: 50,
      render: (_, __, i) => <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{i + 1}</Text>,
    },
    {
      title: 'Học sinh',
      render: (_, r) => (
        <Space>
          <Avatar
            size={36}
            style={{
              background: r.gender === 'Nữ'
                ? 'linear-gradient(135deg, #EC4899, #F472B6)'
                : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}
          >
            {r.user?.full_name?.[0] || '?'}
          </Avatar>
          <div>
            <div style={{ color: '#111827', fontWeight: 700, fontSize: 14 }}>{r.user?.full_name}</div>
            <div style={{ color: '#6B7280', fontSize: 12 }}>@{r.user?.username}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Mã HS', dataIndex: 'student_code', width: 100,
      render: v => <Tag color="purple" style={{ borderRadius: 6, fontWeight: 600 }}>{v || '—'}</Tag>,
    },
    {
      title: 'Giới tính', dataIndex: 'gender', width: 90,
      render: v => v ? (
        <Tag
          color={v === 'Nữ' ? 'pink' : 'blue'}
          icon={v === 'Nữ' ? <WomanOutlined /> : <ManOutlined />}
          style={{ borderRadius: 6 }}
        >{v}</Tag>
      ) : <Text style={{ color: '#D1D5DB' }}>—</Text>,
    },
    {
      title: 'Ngày sinh', dataIndex: 'date_of_birth', width: 120,
      render: v => <Text style={{ color: '#374151', fontSize: 13 }}>{v ? dayjs(v).format('DD/MM/YYYY') : '—'}</Text>,
    },
    {
      title: 'Email', dataIndex: ['user', 'email'],
      render: v => <Text style={{ color: '#6B7280', fontSize: 12 }}>{v || '—'}</Text>,
    },
    {
      title: 'Phụ huynh', width: 100,
      render: (_, r) => {
        const count = r.parents?.length || 0;
        return count > 0
          ? <Badge count={count} color="#4F46E5" style={{ fontWeight: 600 }}>
              <Tag icon={<TeamOutlined />} color="geekblue" style={{ borderRadius: 6, margin: 0 }}>PH</Tag>
            </Badge>
          : <Text style={{ color: '#D1D5DB' }}>—</Text>;
      },
    },
    {
      title: 'Thao tác', width: 100,
      render: (_, r) => (
        <button
          onClick={() => { setSelectedStudent(r); setDrawerOpen(true); }}
          style={{
            background: '#EEF2FF', border: '1px solid #C7D2FE', color: '#4F46E5',
            borderRadius: 8, padding: '5px 14px', cursor: 'pointer',
            fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#4F46E5'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.color = '#4F46E5'; }}
        >
          Chi tiết
        </button>
      ),
    },
  ];

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <h1>🏫 Lớp chủ nhiệm</h1>
        <p>Xem danh sách học sinh và thông tin chi tiết của lớp bạn chủ nhiệm</p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : !homeroomClass ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div style={{ color: '#6B7280', fontSize: 14 }}>
              Bạn chưa được phân công làm giáo viên chủ nhiệm cho lớp nào
            </div>
          }
          style={{ padding: '80px 0' }}
        />
      ) : (
        <>
          {/* ── Class info banner ── */}
          <div style={{
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            borderRadius: 14, padding: '20px 24px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
            boxShadow: '0 4px 20px rgba(79,70,229,0.25)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, flexShrink: 0,
            }}>🏫</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, lineHeight: 1.2 }}>
                {classLabel}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 }}>
                GVCN: {instance?.homeroom_teacher?.full_name || 'Bạn'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'Học sinh', value: students.length, icon: '👥' },
                { label: 'Nam', value: students.filter(s => s.gender === 'Nam').length, icon: '👦' },
                { label: 'Nữ', value: students.filter(s => s.gender === 'Nữ').length, icon: '👧' },
              ].map((stat, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 12, padding: '10px 18px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>{stat.icon} {stat.label}</div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Student table ── */}
          <div style={{
            background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden',
          }}>
            <div style={{ padding: '0 4px' }}>
              <Table
                dataSource={students}
                columns={columns}
                rowKey="student_id"
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `Tổng ${t} học sinh` }}
                size="middle"
              />
            </div>
          </div>
        </>
      )}

      {/* ── Drawer: Student detail ── */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedStudent(null); }}
        width={720}
        title={
          selectedStudent ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: selectedStudent.gender === 'Nữ'
                  ? 'linear-gradient(135deg, #EC4899, #F472B6)'
                  : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0,
              }}>{selectedStudent.user?.full_name?.[0]}</div>
              <div>
                <div style={{ color: '#111827', fontWeight: 700, fontSize: 15 }}>{selectedStudent.user?.full_name}</div>
                <div style={{ color: '#6B7280', fontSize: 12 }}>@{selectedStudent.user?.username}</div>
              </div>
            </div>
          ) : 'Chi tiết học sinh'
        }
        styles={{
          header: { background: '#fff', borderBottom: '1px solid #E5E7EB' },
          body: { background: '#F8FAFF', padding: '20px' },
        }}
      >
        {selectedStudent && (
          <Tabs defaultActiveKey="info" type="card" style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #E5E7EB' }}>
            <Tabs.TabPane tab={<span><UserOutlined /> Thông tin</span>} key="info">
              {/* Status + gender badges */}
              <div style={{ marginBottom: 16 }}>
                <Tag
                  color={selectedStudent.user?.status === 'ACTIVE' ? 'success' : 'error'}
                  style={{ borderRadius: 20, fontWeight: 600, fontSize: 12 }}
                >
                  {selectedStudent.user?.status === 'ACTIVE' ? '● Hoạt động' : '● Đã khóa'}
                </Tag>
                {selectedStudent.gender && (
                  <Tag
                    color={selectedStudent.gender === 'Nữ' ? 'pink' : 'blue'}
                    icon={selectedStudent.gender === 'Nữ' ? <WomanOutlined /> : <ManOutlined />}
                    style={{ borderRadius: 20 }}
                  >
                    {selectedStudent.gender}
                  </Tag>
                )}
              </div>

              {/* Personal info */}
              <div style={{
                background: '#fff', border: '1px solid #F3F4F6',
                borderRadius: 12, padding: '14px 16px', marginBottom: 16,
              }}>
                <div style={{ color: '#4F46E5', fontWeight: 700, fontSize: 12, letterSpacing: 0.5, marginBottom: 10 }}>
                  👤 THÔNG TIN CÁ NHÂN
                </div>
                <InfoRow icon={<IdcardOutlined />} label="Mã học sinh" value={selectedStudent.student_code} />
                <InfoRow icon={<UserOutlined />} label="Họ và tên" value={selectedStudent.user?.full_name} />
                <InfoRow icon={<CalendarOutlined />} label="Ngày sinh"
                  value={selectedStudent.date_of_birth ? dayjs(selectedStudent.date_of_birth).format('DD/MM/YYYY') : null} />
                <InfoRow icon={<EnvironmentOutlined />} label="Quê quán" value={selectedStudent.hometown} />
                <InfoRow icon={<MailOutlined />} label="Email" value={selectedStudent.user?.email} />
                <InfoRow icon={<PhoneOutlined />} label="Số điện thoại" value={selectedStudent.user?.phone} />
              </div>

              {/* Parents */}
              <div style={{
                background: '#fff', border: '1px solid #F3F4F6',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <div style={{
                  color: '#4F46E5', fontWeight: 700, fontSize: 12, letterSpacing: 0.5, marginBottom: 12,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <HomeOutlined /> THÔNG TIN PHỤ HUYNH
                  <span style={{
                    background: '#EEF2FF', color: '#4F46E5',
                    borderRadius: 20, padding: '1px 8px', fontSize: 11,
                  }}>
                    {selectedStudent.parents?.length || 0} người
                  </span>
                </div>

                {selectedStudent.parents?.length > 0 ? (
                  selectedStudent.parents.map((sp, i) => (
                    <ParentCard key={i} parent={sp.parent} />
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: 13 }}>
                    <TeamOutlined style={{ fontSize: 24, marginBottom: 6, display: 'block' }} />
                    Chưa có thông tin phụ huynh
                  </div>
                )}
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab={<span><BookOutlined /> Bảng điểm</span>} key="scores">
              <StudentScoresTab studentId={selectedStudent.student_id} yearId={yearId} />
            </Tabs.TabPane>

            <Tabs.TabPane tab={<span><TrophyOutlined /> Thành tích</span>} key="achievements">
              <StudentAchievementsTab studentId={selectedStudent.student_id} />
            </Tabs.TabPane>

            <Tabs.TabPane tab={<span><CommentOutlined /> Nhận xét</span>} key="comments">
              <StudentCommentsTab studentId={selectedStudent.student_id} yearId={yearId} />
            </Tabs.TabPane>
          </Tabs>
        )}
      </Drawer>
    </div>
  );
}
