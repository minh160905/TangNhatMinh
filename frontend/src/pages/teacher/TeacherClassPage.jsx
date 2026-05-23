import React, { useState } from 'react';
import {
  Table, Tag, Typography, Space, Drawer, Spin, Empty,
  Avatar, Badge,
} from 'antd';
import {
  TeamOutlined, UserOutlined, ManOutlined, WomanOutlined,
  MailOutlined, PhoneOutlined, EnvironmentOutlined,
  IdcardOutlined, CalendarOutlined, HomeOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { classesApi } from '../../api';
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
        width={500}
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
              }}>
                {selectedStudent.user?.full_name?.[0]}
              </div>
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
          <div>
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

            {/* ── Personal info ── */}
            <div style={{
              background: '#fff', border: '1px solid #E5E7EB',
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

            {/* ── Parents ── */}
            <div style={{
              background: '#fff', border: '1px solid #E5E7EB',
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
          </div>
        )}
      </Drawer>
    </div>
  );
}
