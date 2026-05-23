import React, { useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, Select, Space, Typography, Tag, Drawer, Avatar, Spin, Empty } from 'antd';
import { PlusOutlined, EditOutlined, CalendarOutlined, EyeOutlined, UserOutlined, ManOutlined, WomanOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classesApi, usersApi } from '../../api';
import { App } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

export default function ClassesPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();

  // ── State ────────────────────────────────────────────────────────────────
  const [instanceModal, setInstanceModal] = useState(false);
  const [editInstance, setEditInstance] = useState(null);
  const [instanceForm] = Form.useForm();
  const [classModal, setClassModal] = useState(false);
  const [classForm] = Form.useForm();
  const [yearModal, setYearModal] = useState(false);
  const [yearForm] = Form.useForm();

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeInstance, setActiveInstance] = useState(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => classesApi.getAll().then(r => r.data.data) });
  const { data: years = [] } = useQuery({ queryKey: ['years'], queryFn: () => classesApi.getYears().then(r => r.data.data) });
  const { data: instances = [], isLoading } = useQuery({ queryKey: ['instances'], queryFn: () => classesApi.getInstances().then(r => r.data.data) });
  const { data: teachers = [] } = useQuery({
    queryKey: ['users', { role: 'TEACHER' }],
    queryFn: () => usersApi.getAll({ role: 'TEACHER' }).then(r => r.data.data),
  });

  // Query danh sách học sinh của lớp đang xem
  const { data: studentsList = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['class-students', activeInstance?.class_instance_id],
    queryFn: () => classesApi.getInstanceStudents(activeInstance.class_instance_id).then(r => r.data.data),
    enabled: !!activeInstance,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createClass = useMutation({ mutationFn: (d) => classesApi.create(d), onSuccess: () => { qc.invalidateQueries(['classes']); setClassModal(false); message.success('Tạo lớp thành công'); } });
  const createYear = useMutation({ mutationFn: (d) => classesApi.createYear(d), onSuccess: () => { qc.invalidateQueries(['years']); setYearModal(false); message.success('Tạo năm học thành công'); } });
  const createInstance = useMutation({ mutationFn: (d) => classesApi.createInstance(d), onSuccess: () => { qc.invalidateQueries(['instances']); setInstanceModal(false); message.success('Tạo lớp học thành công'); } });
  const updateInstance = useMutation({ mutationFn: ({ id, d }) => classesApi.updateInstance(id, d), onSuccess: () => { qc.invalidateQueries(['instances']); setInstanceModal(false); message.success('Cập nhật thành công'); } });

  const openInstanceModal = (inst = null) => {
    setEditInstance(inst);
    if (inst) instanceForm.setFieldsValue({ homeroom_teacher_id: inst.homeroom_teacher_id, grade: inst.grade, class_id: inst.class_id, year_id: inst.year_id });
    else instanceForm.resetFields();
    setInstanceModal(true);
  };

  const submitInstance = (vals) => {
    if (editInstance) updateInstance.mutate({ id: editInstance.class_instance_id, d: vals });
    else createInstance.mutate(vals);
  };

  const openStudentsDrawer = (inst) => {
    setActiveInstance(inst);
    setDrawerOpen(true);
  };

  // ── Student table columns in Drawer ───────────────────────────────────────
  const studentColumns = [
    {
      title: '#', dataIndex: 'student_code', width: 90,
      render: v => <Text style={{ color: '#6B7280', fontSize: 12 }}>{v || '—'}</Text>,
    },
    {
      title: 'Học sinh',
      render: (_, r) => (
        <Space>
          <Avatar
            size={36}
            style={{
              background: r.user?.gender === 'Nữ'
                ? 'linear-gradient(135deg, #EC4899, #F472B6)'
                : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}
          >
            {r.user?.full_name?.[0] || '?'}
          </Avatar>
          <div>
            <div style={{ color: '#111827', fontWeight: 600, fontSize: 14 }}>{r.user?.full_name || '—'}</div>
            <div style={{ color: '#6B7280', fontSize: 12 }}>@{r.user?.username}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Ngày sinh', dataIndex: 'date_of_birth',
      render: v => <Text style={{ color: '#94A3B8', fontSize: 13 }}>{v ? dayjs(v).format('DD/MM/YYYY') : '—'}</Text>,
    },
    {
      title: 'Giới tính', dataIndex: 'gender',
      render: v => v ? (
        <Tag
          color={v === 'Nữ' ? 'pink' : 'blue'}
          icon={v === 'Nữ' ? <WomanOutlined /> : <ManOutlined />}
          style={{ borderRadius: 8 }}
        >
          {v}
        </Tag>
      ) : <Text style={{ color: '#475569' }}>—</Text>,
    },
    {
      title: 'Quê quán', dataIndex: 'hometown',
      render: v => v
        ? <Text style={{ color: '#94A3B8', fontSize: 13 }}><EnvironmentOutlined style={{ marginRight: 4 }} />{v}</Text>
        : <Text style={{ color: '#475569' }}>—</Text>,
    },
  ];

  const instanceColumns = [
    { title: 'Lớp', render: (_, r) => <Text strong style={{ color: '#4F46E5', fontSize: 16 }}>{r.grade}{r.class?.class_code}</Text>, width: 80 },
    { title: 'Năm học', render: (_, r) => <Tag color="purple">{r.year?.name}</Tag> },
    { title: 'Khối', dataIndex: 'grade', render: v => <Tag>{v}</Tag> },
    { title: 'GVCN', render: (_, r) => <Text style={{ color: '#111827' }}>{r.homeroom_teacher?.full_name || '—'}</Text> },
    { title: 'Sĩ số', render: (_, r) => <Tag color="blue">{r._count?.students || 0} học sinh</Tag> },
    {
      title: 'Thao tác', render: (_, r) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => openStudentsDrawer(r)}
            style={{ borderRadius: 6, borderColor: '#10B981', color: '#10B981' }}
          >
            Xem chi tiết
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openInstanceModal(r)}
            style={{ borderRadius: 6, borderColor: '#4F46E5', color: '#4F46E5' }}>Sửa</Button>
        </Space>
      ),
    },
  ];

  const classLabel = activeInstance ? `${activeInstance.grade}${activeInstance.class?.class_code}` : '';

  return (
    <div>
      <div className="page-header">
        <h1>🏫 Quản lý lớp học</h1>
        <p>Quản lý lớp học, năm học và gán giáo viên chủ nhiệm</p>
      </div>

      <Tabs
        defaultActiveKey="instances"
        items={[
          {
            key: 'instances', label: '📚 Lớp học theo năm',
            children: (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openInstanceModal()}>Thêm lớp</Button>
                  <Button icon={<PlusOutlined />} onClick={() => setClassModal(true)}>Thêm mã lớp</Button>
                  <Button icon={<CalendarOutlined />} onClick={() => setYearModal(true)}>Thêm năm học</Button>
                </div>
                <Table dataSource={instances} columns={instanceColumns} rowKey="class_instance_id" loading={isLoading}
                  pagination={{ pageSize: 20 }} size="middle" />
              </div>
            ),
          },
          {
            key: 'classes', label: '🔑 Mã lớp',
            children: (
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {classes.map(c => (
                    <div key={c.class_id} style={{
                      background: '#EEF2FF', border: '1px solid #C7D2FE',
                      borderRadius: 12, padding: '16px 24px', minWidth: 100, textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#4F46E5' }}>{c.class_code}</div>
                      <div style={{ color: '#6B7280', fontSize: 12 }}>Lớp {c.class_code}</div>
                    </div>
                  ))}
                  <button onClick={() => setClassModal(true)} style={{
                    background: '#F8FAFF', border: '2px dashed #C7D2FE',
                    borderRadius: 12, padding: '16px 24px', minWidth: 100, cursor: 'pointer',
                    color: '#4F46E5', fontSize: 24,
                  }}>+</button>
                </div>
              </div>
            ),
          },
          {
            key: 'years', label: '📅 Năm học',
            children: (
              <div>
                {years.map(y => (
                  <div key={y.year_id} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    borderRadius: 10, padding: '14px 20px', marginBottom: 10,
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#4F46E5', minWidth: 120 }}>{y.name}</div>
                    <div style={{ color: '#94A3B8', fontSize: 13 }}>
                      {new Date(y.start_date).toLocaleDateString('vi-VN')} → {new Date(y.end_date).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                ))}
                <Button icon={<PlusOutlined />} onClick={() => setYearModal(true)} style={{ marginTop: 8 }}>Thêm năm học</Button>
              </div>
            ),
          },
        ]}
        style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      />

      {/* ── Drawer: Danh sách học sinh ── */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setActiveInstance(null); }}
        width={780}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
            }}>
              🏫
            </div>
            <div>
              <div style={{ color: '#111827', fontWeight: 700, fontSize: 17 }}>
                Lớp {classLabel} – {activeInstance?.year?.name}
              </div>
              <div style={{ color: '#4F46E5', fontSize: 12, fontWeight: 500 }}>
                GVCN: {activeInstance?.homeroom_teacher?.full_name || 'Chưa phân công'}
              </div>
            </div>
          </div>
        }
        styles={{
          header: { background: '#fff', borderBottom: '1px solid #E5E7EB' },
          body: { background: '#F8FAFF', padding: '20px' },
        }}
      >
        {studentsLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : studentsList.length === 0 ? (
          <Empty
            description={<span style={{ color: '#6B7280' }}>Lớp <strong style={{ color: '#4F46E5' }}>{classLabel}</strong> chưa có học sinh nào</span>}
            style={{ padding: 40 }}
          />
        ) : (
          <>
            {/* Summary stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Tổng học sinh', value: studentsList.length, color: '#4F46E5', bg: 'rgba(79,70,229,0.15)', border: 'rgba(79,70,229,0.3)' },
                { label: 'Học sinh Nam', value: studentsList.filter(s => s.gender === 'Nam').length, color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)' },
                { label: 'Học sinh Nữ', value: studentsList.filter(s => s.gender === 'Nữ').length, color: '#F472B6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.3)' },
              ].map((stat, i) => (
                <div key={i} style={{
                  flex: 1, background: stat.bg, border: `1px solid ${stat.border}`,
                  borderRadius: 12, padding: '14px 16px', textAlign: 'center',
                }}>
                  <div style={{ color: stat.color, fontSize: 28, fontWeight: 800 }}>{stat.value}</div>
                  <div style={{ color: '#94A3B8', fontSize: 12 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Student table */}
            <Table
              dataSource={studentsList}
              columns={studentColumns}
              rowKey="student_id"
              pagination={{ pageSize: 10, showTotal: t => `${t} học sinh` }}
              size="middle"
              style={{ borderRadius: 12, overflow: 'hidden' }}
            />
          </>
        )}
      </Drawer>

      {/* Instance Modal */}
      <Modal open={instanceModal} onCancel={() => setInstanceModal(false)}
        title={<span style={{ color: '#111827' }}>{editInstance ? 'Cập nhật lớp học' : 'Thêm lớp học mới'}</span>}
        footer={null} destroyOnClose>
        <Form form={instanceForm} layout="vertical" onFinish={submitInstance} style={{ marginTop: 16 }}>
          <Form.Item name="grade" label="Khối" rules={[{ required: true }]}>
            <Select options={[{ value: 10, label: 'Khối 10' }, { value: 11, label: 'Khối 11' }, { value: 12, label: 'Khối 12' }]} />
          </Form.Item>
          <Form.Item name="class_id" label="Mã lớp" rules={[{ required: true }]}>
            <Select options={classes.map(c => ({ value: c.class_id, label: `Lớp ${c.class_code}` }))} />
          </Form.Item>
          <Form.Item name="year_id" label="Năm học" rules={[{ required: true }]}>
            <Select options={years.map(y => ({ value: y.year_id, label: y.name }))} />
          </Form.Item>
          <Form.Item name="homeroom_teacher_id" label="GVCN">
            <Select allowClear placeholder="Chọn giáo viên chủ nhiệm"
              options={teachers.map(t => ({ value: t.user_id, label: t.full_name }))} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setInstanceModal(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={createInstance.isPending || updateInstance.isPending}>
              {editInstance ? 'Cập nhật' : 'Thêm'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Class Modal */}
      <Modal open={classModal} onCancel={() => setClassModal(false)} title={<span style={{ color: '#111827' }}>Thêm mã lớp</span>} footer={null} destroyOnClose>
        <Form form={classForm} layout="vertical" onFinish={(v) => createClass.mutate(v)} style={{ marginTop: 16 }}>
          <Form.Item name="class_code" label="Mã lớp (ví dụ: A, B, C)" rules={[{ required: true }]}>
            <Input placeholder="A" maxLength={5} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setClassModal(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={createClass.isPending}>Thêm</Button>
          </div>
        </Form>
      </Modal>

      {/* Year Modal */}
      <Modal open={yearModal} onCancel={() => setYearModal(false)} title={<span style={{ color: '#111827' }}>Thêm năm học</span>} footer={null} destroyOnClose>
        <Form form={yearForm} layout="vertical" onFinish={(v) => createYear.mutate(v)} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Tên năm học (VD: 2024-2025)" rules={[{ required: true }]}>
            <Input placeholder="2024-2025" />
          </Form.Item>
          <Form.Item name="start_date" label="Ngày bắt đầu" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="end_date" label="Ngày kết thúc" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setYearModal(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={createYear.isPending}>Thêm</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
