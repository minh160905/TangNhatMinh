import React, { useState } from 'react';
import {
  Button, Modal, Form, Input, Drawer, Table, Tag, Typography,
  Avatar, Spin, Empty, Select, Tabs, Popconfirm, Divider, Space,
} from 'antd';
import {
  PlusOutlined, EditOutlined, UserOutlined, MailOutlined,
  PhoneOutlined, TeamOutlined, DeleteOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectsApi, assignmentsApi, classesApi, usersApi } from '../../api';
import { App } from 'antd';

const { Text } = Typography;

// Màu gradient cho từng card theo index
const CARD_GRADIENTS = [
  ['#4F46E5', '#7C3AED'],
  ['#0EA5E9', '#6366F1'],
  ['#10B981', '#059669'],
  ['#F59E0B', '#D97706'],
  ['#EF4444', '#DC2626'],
  ['#8B5CF6', '#7C3AED'],
  ['#14B8A6', '#0D9488'],
  ['#F97316', '#EA580C'],
];

export default function SubjectsPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSubject, setActiveSubject] = useState(null);
  const [drawerTab, setDrawerTab] = useState('teachers');

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

  // Lấy danh sách phân công hiện tại cho môn này (để hiển thị + xóa)
  const { data: subjectAssignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignments', { subject_id: activeSubject?.subject_id }],
    queryFn: () => assignmentsApi.getAll({ subject_id: activeSubject.subject_id }).then(r => r.data.data),
    enabled: !!activeSubject,
  });

  // Danh sách giáo viên & lớp cho form phân công
  const { data: teachers = [] } = useQuery({
    queryKey: ['users', { role: 'TEACHER' }],
    queryFn: () => usersApi.getAll({ role: 'TEACHER' }).then(r => r.data.data),
  });

  const { data: instances = [] } = useQuery({
    queryKey: ['instances'],
    queryFn: () => classesApi.getInstances().then(r => r.data.data),
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

  const assignMut = useMutation({
    mutationFn: (d) => assignmentsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries(['assignments']);
      qc.invalidateQueries(['subject-teachers', activeSubject?.subject_id]);
      qc.invalidateQueries(['assignments-workload']);
      qc.invalidateQueries(['assignments-matrix']);
      assignForm.resetFields();
      message.success('Phân công thành công!');
    },
    onError: (e) => message.error(e.response?.data?.message || 'Lỗi phân công (có thể đã tồn tại)'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => assignmentsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries(['assignments']);
      qc.invalidateQueries(['subject-teachers', activeSubject?.subject_id]);
      qc.invalidateQueries(['assignments-workload']);
      qc.invalidateQueries(['assignments-matrix']);
      message.success('Đã xóa phân công');
    },
  });

  const openModal = (sub = null) => {
    setEdit(sub);
    sub ? form.setFieldsValue(sub) : form.resetFields();
    setModalOpen(true);
  };

  const openDrawer = (subject) => {
    setActiveSubject(subject);
    setDrawerTab('teachers');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setActiveSubject(null);
    assignForm.resetFields();
  };

  // ── Assignment columns ─────────────────────────────────────────────────────
  const assignmentColumns = [
    {
      title: 'Giáo viên',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#4F46E5', fontWeight: 700, fontSize: 15,
          }}>{r.teacher?.full_name?.[0]}</div>
          <div>
            <div style={{ color: '#111827', fontWeight: 600 }}>{r.teacher?.full_name}</div>
            <div style={{ color: '#94A3B8', fontSize: 12 }}>@{r.teacher?.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Lớp học',
      render: (_, r) => (
        <Tag color="purple" style={{ fontSize: 13, fontWeight: 700, borderRadius: 8, padding: '2px 10px' }}>
          {r.class_instance?.grade}{r.class_instance?.class?.class_code}
        </Tag>
      ),
    },
    {
      title: 'Năm học',
      render: (_, r) => (
        <Text style={{ color: '#6B7280', fontSize: 13 }}>{r.class_instance?.year?.name}</Text>
      ),
    },
    {
      title: '',
      width: 70,
      render: (_, r) => (
        <Popconfirm
          title="Xóa phân công này?"
          onConfirm={() => deleteMut.mutate(r.assignment_id)}
          okText="Xóa" cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <Button
            type="text" danger size="small" icon={<DeleteOutlined />}
            loading={deleteMut.isPending}
          />
        </Popconfirm>
      ),
    },
  ];

  // ── Teacher (view) columns ──────────────────────────────────────────────────
  const teacherViewColumns = [
    {
      title: 'Giáo viên', render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', fontWeight: 700, flexShrink: 0 }}
            icon={<UserOutlined />}
          />
          <div>
            <div style={{ color: '#111827', fontWeight: 600 }}>{r.full_name}</div>
            {r.email && (
              <div style={{ color: '#6B7280', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MailOutlined style={{ fontSize: 10 }} />{r.email}
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

  const [c1Active] = activeSubject
    ? CARD_GRADIENTS[subjects.findIndex(s => s.subject_id === activeSubject.subject_id) % CARD_GRADIENTS.length]
    : ['#4F46E5', '#7C3AED'];

  return (
    <div>
      <div className="page-header">
        <h1>📖 Quản lý môn học</h1>
        <p>Thêm, sửa các môn học · Nhấn vào card để xem giáo viên và phân công</p>
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
                <div style={{ color: '#111827', fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
                  {s.subject_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: c1, fontSize: 12, fontWeight: 500 }}>
                  <TeamOutlined style={{ fontSize: 11 }} />
                  <span>Xem GV · Phân công</span>
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

      {/* ── Drawer: Chi tiết môn học ── */}
      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        width={700}
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
                Giáo viên phụ trách · Phân công
              </div>
            </div>
          </div>
        }
        styles={{
          header: { background: '#fff', borderBottom: '1px solid #E5E7EB' },
          body: { background: '#F8FAFF', padding: 0 },
          mask: { backdropFilter: 'blur(4px)' },
        }}
      >
        <Tabs
          activeKey={drawerTab}
          onChange={setDrawerTab}
          style={{ padding: '0 20px' }}
          tabBarStyle={{ paddingTop: 12, marginBottom: 0 }}
          items={[
            // ── Tab 1: Danh sách GV ─────────────────────────────────────────
            {
              key: 'teachers',
              label: <span><UserOutlined /> Giáo viên phụ trách</span>,
              children: (
                <div style={{ padding: '16px 0' }}>
                  {teachersLoading ? (
                    <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
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
                      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                        <div style={{
                          background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.3)',
                          borderRadius: 12, padding: '12px 20px', textAlign: 'center', flex: 1,
                        }}>
                          <div style={{ color: '#4F46E5', fontSize: 28, fontWeight: 800 }}>{subjectTeachers.length}</div>
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
                      <Table
                        dataSource={subjectTeachers}
                        columns={teacherViewColumns}
                        rowKey="user_id"
                        pagination={false}
                        size="middle"
                        style={{ borderRadius: 12, overflow: 'hidden' }}
                      />
                    </>
                  )}
                </div>
              ),
            },

            // ── Tab 2: Phân công môn học ─────────────────────────────────────
            {
              key: 'assign',
              label: <span><CheckCircleOutlined /> Phân công</span>,
              children: (
                <div style={{ padding: '16px 0' }}>
                  {/* Form thêm phân công mới */}
                  <div style={{
                    background: '#fff',
                    border: '1px solid rgba(79,70,229,0.2)',
                    borderRadius: 14,
                    padding: '20px',
                    marginBottom: 20,
                    boxShadow: '0 2px 8px rgba(79,70,229,0.06)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13,
                      }}>➕</div>
                      <Text strong style={{ color: '#4F46E5', fontSize: 14 }}>
                        Thêm phân công mới — Môn: <span style={{ color: '#111827' }}>{activeSubject?.subject_name}</span>
                      </Text>
                    </div>

                    <Form
                      form={assignForm}
                      layout="vertical"
                      onFinish={(values) =>
                        assignMut.mutate({
                          teacher_id: values.teacher_id,
                          class_instance_id: values.class_instance_id,
                          subject_id: activeSubject.subject_id,
                        })
                      }
                    >
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <Form.Item
                          name="teacher_id"
                          label="Giáo viên"
                          rules={[{ required: true, message: 'Vui lòng chọn giáo viên' }]}
                          style={{ flex: 1, minWidth: 200, marginBottom: 8 }}
                        >
                          <Select
                            placeholder="Chọn giáo viên..."
                            showSearch
                            filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
                            options={teachers.map(t => ({
                              value: t.user_id,
                              label: t.full_name,
                            }))}
                            optionRender={(opt) => (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                  width: 26, height: 26, borderRadius: 6,
                                  background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: '#4F46E5', fontWeight: 700, fontSize: 12, flexShrink: 0,
                                }}>{opt.label?.[0]}</div>
                                <span style={{ color: '#111827' }}>{opt.label}</span>
                              </div>
                            )}
                          />
                        </Form.Item>

                        <Form.Item
                          name="class_instance_id"
                          label="Lớp học"
                          rules={[{ required: true, message: 'Vui lòng chọn lớp' }]}
                          style={{ flex: 1, minWidth: 200, marginBottom: 8 }}
                        >
                          <Select
                            placeholder="Chọn lớp..."
                            showSearch
                            filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
                            options={instances.map(inst => ({
                              value: inst.class_instance_id,
                              label: `${inst.grade}${inst.class?.class_code} – ${inst.year?.name}`,
                            }))}
                          />
                        </Form.Item>
                      </div>

                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<PlusOutlined />}
                        loading={assignMut.isPending}
                        style={{
                          background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                          border: 'none', borderRadius: 8,
                          height: 38, paddingInline: 24,
                        }}
                      >
                        Xác nhận phân công
                      </Button>
                    </Form>
                  </div>

                  {/* Danh sách phân công hiện tại */}
                  <div>
                    <Text strong style={{ color: '#374151', fontSize: 13, marginBottom: 10, display: 'block' }}>
                      📋 Các phân công hiện tại ({subjectAssignments.length})
                    </Text>

                    {assignmentsLoading ? (
                      <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    ) : subjectAssignments.length === 0 ? (
                      <Empty
                        description={<span style={{ color: '#9CA3AF', fontSize: 13 }}>Chưa có phân công nào cho môn này</span>}
                        style={{ padding: '24px 0' }}
                      />
                    ) : (
                      <Table
                        dataSource={subjectAssignments}
                        columns={assignmentColumns}
                        rowKey="assignment_id"
                        pagination={false}
                        size="small"
                        style={{ borderRadius: 12, overflow: 'hidden', background: '#fff' }}
                        locale={{ emptyText: 'Chưa có phân công' }}
                      />
                    )}
                  </div>
                </div>
              ),
            },
          ]}
        />
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
