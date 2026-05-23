import React, { useState } from 'react';
import { Button, Modal, Form, Input, Drawer, Table, Tag, Typography, Avatar, Spin, Empty } from 'antd';
import { PlusOutlined, EditOutlined, UserOutlined, MailOutlined, PhoneOutlined, TeamOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectsApi } from '../../api';
import { App } from 'antd';

const { Text, Title } = Typography;

// Màu gradient cho từng card theo index
const CARD_GRADIENTS = [
  ['#4F46E5', '#7C3AED'], // Indigo → Violet
  ['#0EA5E9', '#6366F1'], // Sky → Indigo
  ['#10B981', '#059669'], // Emerald
  ['#F59E0B', '#D97706'], // Amber
  ['#EF4444', '#DC2626'], // Red
  ['#8B5CF6', '#7C3AED'], // Purple
  ['#14B8A6', '#0D9488'], // Teal
  ['#F97316', '#EA580C'], // Orange
];

export default function SubjectsPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form] = Form.useForm();

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSubject, setActiveSubject] = useState(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.getAll().then(r => r.data.data),
  });

  const { data: subjectTeachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ['subject-teachers', activeSubject?.subject_id],
    queryFn: () => subjectsApi.getTeachersBySubject(activeSubject.subject_id).then(r => r.data.data),
    enabled: !!activeSubject,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (d) => subjectsApi.create(d),
    onSuccess: () => { qc.invalidateQueries(['subjects']); setModalOpen(false); message.success('Thêm môn học thành công'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => subjectsApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries(['subjects']); setModalOpen(false); message.success('Cập nhật thành công'); },
  });

  const openModal = (sub = null) => {
    setEdit(sub);
    sub ? form.setFieldsValue(sub) : form.resetFields();
    setModalOpen(true);
  };

  const openDrawer = (subject) => {
    setActiveSubject(subject);
    setDrawerOpen(true);
  };

  // ── Teacher columns ───────────────────────────────────────────────────────
  const teacherColumns = [
    {
      title: 'Giáo viên', render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar
            style={{
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              fontWeight: 700, flexShrink: 0,
            }}
            icon={<UserOutlined />}
          />
          <div>
            <div style={{ color: '#111827', fontWeight: 600 }}>{r.full_name}</div>
            {r.email && (
              <div style={{ color: '#6B7280', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MailOutlined style={{ fontSize: 10 }} />
                {r.email}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'SĐT', dataIndex: 'phone',
      render: v => v
        ? <span style={{ color: '#94A3B8', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
          <PhoneOutlined style={{ fontSize: 10 }} />{v}
        </span>
        : <Text style={{ color: '#475569' }}>—</Text>,
    },
    {
      title: 'Lớp phụ trách', dataIndex: 'classes',
      render: (classes) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {classes?.map((c, i) => (
            <Tag key={i} color="purple" style={{ borderRadius: 6, fontSize: 12 }}>
              {c.grade}{c.class_code} – {c.year}
            </Tag>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>📖 Quản lý môn học</h1>
        <p>Thêm, sửa các môn học · Nhấn vào card để xem giáo viên phụ trách</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}
          style={{ borderRadius: 8 }}>
          Thêm môn học
        </Button>
      </div>

      {/* Subject cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {subjects.map((s, i) => {
          const [c1, c2] = CARD_GRADIENTS[i % CARD_GRADIENTS.length];
          return (
            <div
              key={s.subject_id}
              onClick={() => openDrawer(s)}
              style={{
                background: `linear-gradient(135deg, ${c1}22, ${c2}15)`,
                border: `1px solid ${c1}40`,
                borderRadius: 14,
                padding: '18px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.25s',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = `0 10px 30px ${c1}30`;
                e.currentTarget.style.borderColor = `${c1}80`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = `${c1}40`;
              }}
            >
              {/* Glow orb */}
              <div style={{
                position: 'absolute', top: -20, right: -20,
                width: 80, height: 80, borderRadius: '50%',
                background: c1, opacity: 0.12, filter: 'blur(20px)',
                pointerEvents: 'none',
              }} />

              <div>
                <div style={{
                  color: '#111827', fontWeight: 800, fontSize: 18, marginBottom: 4,
                }}>
                  {s.subject_name}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  color: c1, fontSize: 12, fontWeight: 500,
                }}>
                  <TeamOutlined style={{ fontSize: 11 }} />
                  <span>Xem GV</span>
                </div>
              </div>

              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => { e.stopPropagation(); openModal(s); }}
                style={{
                  borderRadius: 8, background: `${c1}20`,
                  border: `1px solid ${c1}40`, color: c1,
                  flexShrink: 0,
                }}
              />
            </div>
          );
        })}

        {/* Add new card */}
        <button
          onClick={() => openModal()}
          style={{
            background: 'rgba(79,70,229,0.05)',
            border: '2px dashed rgba(79,70,229,0.3)',
            borderRadius: 14, padding: '18px 20px',
            cursor: 'pointer', color: '#4F46E5', fontSize: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', minHeight: 80,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(79,70,229,0.6)'; e.currentTarget.style.background = 'rgba(79,70,229,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(79,70,229,0.3)'; e.currentTarget.style.background = 'rgba(79,70,229,0.05)'; }}
        >
          +
        </button>
      </div>

      {/* ── Drawer: Giáo viên phụ trách môn học ── */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setActiveSubject(null); }}
        width={640}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}>
              📚
            </div>
            <div>
              <div style={{ color: '#111827', fontWeight: 700, fontSize: 16 }}>
                {activeSubject?.subject_name}
              </div>
              <div style={{ color: '#4F46E5', fontSize: 12, fontWeight: 500 }}>
                Danh sách giáo viên phụ trách
              </div>
            </div>
          </div>
        }
        styles={{
          header: {
            background: '#fff',
            borderBottom: '1px solid #E5E7EB',
          },
          body: {
            background: '#F8FAFF',
            padding: 20,
          },
          mask: { backdropFilter: 'blur(4px)' },
        }}
      >
        {teachersLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : subjectTeachers.length === 0 ? (
          <Empty
            description={
              <span style={{ color: '#6B7280' }}>
                Chưa có giáo viên nào được phân công dạy môn <strong style={{ color: '#4F46E5' }}>{activeSubject?.subject_name}</strong>
              </span>
            }
            style={{ padding: 40 }}
          />
        ) : (
          <>
            {/* Summary */}
            <div style={{
              display: 'flex', gap: 12, marginBottom: 20,
            }}>
              <div style={{
                background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.3)',
                borderRadius: 12, padding: '12px 20px', textAlign: 'center', flex: 1,
              }}>
                <div style={{ color: '#4F46E5', fontSize: 28, fontWeight: 800 }}>
                  {subjectTeachers.length}
                </div>
                <div style={{ color: '#94A3B8', fontSize: 12 }}>Giáo viên</div>
              </div>
              <div style={{
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 12, padding: '12px 20px', textAlign: 'center', flex: 1,
              }}>
                <div style={{ color: '#10B981', fontSize: 28, fontWeight: 800 }}>
                  {subjectTeachers.reduce((sum, t) => sum + (t.classes?.length || 0), 0)}
                </div>
                <div style={{ color: '#94A3B8', fontSize: 12 }}>Lớp phụ trách</div>
              </div>
            </div>

            {/* Teacher list */}
            <Table
              dataSource={subjectTeachers}
              columns={teacherColumns}
              rowKey="user_id"
              pagination={false}
              size="middle"
              style={{ borderRadius: 12, overflow: 'hidden' }}
            />
          </>
        )}
      </Drawer>

      {/* ── Modal thêm/sửa môn học ── */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={<span style={{ color: '#111827' }}>{edit ? '✏️ Sửa môn học' : '➕ Thêm môn học'}</span>}
        footer={null} destroyOnClose
      >
        <Form
          form={form} layout="vertical"
          onFinish={(v) => edit ? updateMut.mutate({ id: edit.subject_id, d: v }) : createMut.mutate(v)}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="subject_name" label="Tên môn học" rules={[{ required: true }]}>
            <Input placeholder="VD: Toán, Văn, Anh..." />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit"
              loading={createMut.isPending || updateMut.isPending}>
              {edit ? 'Cập nhật' : 'Thêm'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
