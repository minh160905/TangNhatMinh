import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, Typography,
  Popconfirm, Drawer, Avatar, Spin, DatePicker, Divider,
} from 'antd';
import {
  PlusOutlined, EditOutlined, LockOutlined, UnlockOutlined, SearchOutlined,
  UserOutlined, EyeOutlined, BookOutlined, TeamOutlined, EnvironmentOutlined,
  ManOutlined, WomanOutlined, CalendarOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, classesApi } from '../../api';
import { App } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

const ROLE_CONFIG = {
  ADMIN:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',   label: 'Quản trị viên' },
  TEACHER: { color: '#4F46E5', bg: 'rgba(129,140,248,0.1)', label: 'Giáo viên'     },
  STUDENT: { color: '#10B981', bg: 'rgba(16,185,129,0.1)',  label: 'Học sinh'      },
  PARENT:  { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  label: 'Phụ huynh'    },
};

const InfoRow = ({ icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
    <span style={{ color: '#4F46E5', fontSize: 14, marginTop: 1, width: 16, flexShrink: 0 }}>{icon}</span>
    <div style={{ flex: 1 }}>
      <div style={{ color: '#6B7280', fontSize: 11, marginBottom: 2 }}>{label}</div>
      <div style={{ color: '#111827', fontWeight: 500, fontSize: 14 }}>{value || '—'}</div>
    </div>
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{ color: '#4F46E5', fontWeight: 700, fontSize: 11, letterSpacing: 1, margin: '18px 0 6px' }}>
    {children}
  </div>
);

export default function UsersPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);      // basic user object (from list)
  const [editDetail, setEditDetail] = useState(null);  // full detail (from getById)
  const [filters, setFilters] = useState({});
  const [form] = Form.useForm();

  // Drawer state (view)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: usersRes, isLoading } = useQuery({
    queryKey: ['users', filters],
    queryFn: () => usersApi.getAll(filters).then(r => r.data.data),
  });

  const { data: rolesRes } = useQuery({
    queryKey: ['roles'],
    queryFn: () => usersApi.getRoles().then(r => r.data.data),
  });

  // View drawer - fetch full detail
  const { data: detailUser, isLoading: detailLoading } = useQuery({
    queryKey: ['user-detail', detailUserId],
    queryFn: () => usersApi.getById(detailUserId).then(r => r.data.data),
    enabled: !!detailUserId,
  });

  // Edit modal - fetch full detail when editing
  const { data: editDetailData, isLoading: editDetailLoading } = useQuery({
    queryKey: ['user-edit-detail', editUser?.user_id],
    queryFn: () => usersApi.getById(editUser.user_id).then(r => r.data.data),
    enabled: !!editUser?.user_id && modalOpen,
  });

  // Class instances for student class picker
  const { data: instances = [] } = useQuery({
    queryKey: ['instances'],
    queryFn: () => classesApi.getInstances().then(r => r.data.data),
    enabled: modalOpen && editUser?.role?.role_name === 'STUDENT',
  });

  // When editDetailData loads, populate form with extended fields
  useEffect(() => {
    if (editDetailData && modalOpen && editUser) {
      const role = editDetailData.role?.role_name;
      const base = {
        full_name: editDetailData.full_name,
        email: editDetailData.email,
        phone: editDetailData.phone,
        password: '',
      };
      if (role === 'STUDENT' && editDetailData.student) {
        const s = editDetailData.student;
        Object.assign(base, {
          student_code: s.student_code,
          date_of_birth: s.date_of_birth ? dayjs(s.date_of_birth) : null,
          gender: s.gender,
          hometown: s.hometown,
          class_instance_id: s.class_instance?.class_instance_id || null,
        });
      }
      form.setFieldsValue(base);
      setEditDetail(editDetailData);
    }
  }, [editDetailData, modalOpen]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data) => usersApi.create(data),
    onSuccess: () => { qc.invalidateQueries(['users']); setModalOpen(false); message.success('Tạo tài khoản thành công!'); },
    onError: (e) => message.error(e.response?.data?.message || 'Lỗi tạo tài khoản'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['users']);
      qc.invalidateQueries(['user-detail', editUser?.user_id]);
      qc.invalidateQueries(['user-edit-detail', editUser?.user_id]);
      setModalOpen(false);
      message.success('Cập nhật thành công!');
    },
    onError: (e) => message.error(e.response?.data?.message || 'Lỗi cập nhật'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => usersApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries(['users']); message.success('Cập nhật trạng thái thành công'); },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditUser(null);
    setEditDetail(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditUser(user);
    setEditDetail(null);
    form.resetFields();
    // basic fields populated immediately
    form.setFieldsValue({ full_name: user.full_name, email: user.email, phone: user.phone, password: '' });
    setModalOpen(true);
  };

  const handleSubmit = (values) => {
    if (editUser) {
      // Flatten date_of_birth from dayjs → ISO string
      const payload = { ...values };
      if (payload.date_of_birth && payload.date_of_birth?.toISOString) {
        payload.date_of_birth = payload.date_of_birth.toISOString();
      }
      // Remove empty password
      if (!payload.password) delete payload.password;
      updateMutation.mutate({ id: editUser.user_id, data: payload });
    } else {
      createMutation.mutate(values);
    }
  };

  const openDetail = (userId) => {
    setDetailUserId(userId);
    setDrawerOpen(true);
  };

  const users = usersRes || [];
  const roles = rolesRes || [];
  const role = detailUser?.role?.role_name;
  const roleColor = ROLE_CONFIG[role]?.color || '#4F46E5';
  const editRole = editUser?.role?.role_name;

  // ── Render extended info in view Drawer ────────────────────────────────────
  const renderExtendedInfo = () => {
    if (!detailUser) return null;
    if (role === 'TEACHER') {
      const subjects = detailUser.teacher_assignments?.map(a => a.subject?.subject_name).filter(Boolean) || [];
      return (
        <div style={{ marginTop: 16 }}>
          <div style={{ color: '#4F46E5', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOutlined /> Môn học phụ trách ({subjects.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {subjects.length > 0 ? subjects.map((s, i) => (
              <Tag key={i} color="purple" style={{ borderRadius: 8, padding: '4px 12px', fontSize: 13 }}>{s}</Tag>
            )) : <Text style={{ color: '#6B7280' }}>Chưa được phân công</Text>}
          </div>
        </div>
      );
    }
    if (role === 'STUDENT') {
      const s = detailUser.student;
      if (!s) return null;
      const ci = s.class_instance;
      const classLabel = ci ? `${ci.grade}${ci.class?.class_code} – Năm học ${ci.year?.name}` : '—';
      return (
        <div style={{ marginTop: 8 }}>
          <InfoRow icon={<CalendarOutlined />} label="Ngày sinh" value={s.date_of_birth ? dayjs(s.date_of_birth).format('DD/MM/YYYY') : null} />
          <InfoRow icon={s.gender === 'Nữ' ? <WomanOutlined /> : <ManOutlined />} label="Giới tính"
            value={<Tag color={s.gender === 'Nữ' ? 'pink' : 'blue'} style={{ borderRadius: 6 }}>{s.gender || '—'}</Tag>} />
          <InfoRow icon={<EnvironmentOutlined />} label="Quê quán" value={s.hometown} />
          <InfoRow icon={<BookOutlined />} label="Lớp học" value={classLabel} />
          <InfoRow icon={<UserOutlined />} label="Mã học sinh" value={s.student_code} />
        </div>
      );
    }
    if (role === 'PARENT') {
      const children = detailUser.parent?.students || [];
      return (
        <div style={{ marginTop: 16 }}>
          <div style={{ color: '#4F46E5', fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TeamOutlined /> Con em ({children.length})
          </div>
          {children.length === 0
            ? <Text style={{ color: '#6B7280' }}>Chưa liên kết học sinh nào</Text>
            : children.map((sp, i) => {
              const child = sp.student;
              const ci = child?.class_instance;
              const classLabel = ci ? `Lớp ${ci.grade}${ci.class?.class_code} – ${ci.year?.name}` : '—';
              return (
                <div key={i} style={{
                  background: '#EEF2FF', border: '1px solid #C7D2FE',
                  borderRadius: 10, padding: '12px 14px', marginBottom: 10,
                }}>
                  <div style={{ color: '#111827', fontWeight: 700, fontSize: 15 }}>{child?.user?.full_name || '—'}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <Tag color="green" style={{ borderRadius: 6 }}>{classLabel}</Tag>
                    {child?.student_code && <Tag color="default" style={{ borderRadius: 6 }}>{child.student_code}</Tag>}
                  </div>
                </div>
              );
            })}
        </div>
      );
    }
    return null;
  };

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      title: '#', dataIndex: 'user_id', width: 60,
      render: (v) => <Text style={{ color: '#6B7280' }}>{v}</Text>,
    },
    {
      title: 'Họ tên', dataIndex: 'full_name',
      render: (name, row) => (
        <Space>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: `linear-gradient(135deg, ${ROLE_CONFIG[row.role?.role_name]?.color || '#4F46E5'}40, ${ROLE_CONFIG[row.role?.role_name]?.color || '#7C3AED'}20)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: ROLE_CONFIG[row.role?.role_name]?.color || '#4F46E5', fontWeight: 700, fontSize: 14,
          }}>
            {name?.[0] || '?'}
          </div>
          <div>
            <div style={{ color: '#111827', fontWeight: 600 }}>{name}</div>
            <div style={{ color: '#6B7280', fontSize: 12 }}>@{row.username}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Email', dataIndex: 'email',
      render: v => <Text style={{ color: '#94A3B8' }}>{v || '—'}</Text>,
    },
    {
      title: 'Vai trò', dataIndex: ['role', 'role_name'],
      render: (role) => {
        const cfg = ROLE_CONFIG[role] || {};
        return (
          <span style={{
            background: cfg.bg, color: cfg.color,
            padding: '2px 10px', borderRadius: 20,
            fontSize: 12, fontWeight: 600, border: `1px solid ${cfg.color}30`,
          }}>{cfg.label || role}</span>
        );
      },
    },
    {
      title: 'Trạng thái', dataIndex: 'status',
      render: (status, row) => (
        <Popconfirm
          title={`${status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'} tài khoản này?`}
          onConfirm={() => statusMutation.mutate({ id: row.user_id, status: status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE' })}
          okText="Xác nhận" cancelText="Hủy"
        >
          <Tag icon={status === 'ACTIVE' ? <UnlockOutlined /> : <LockOutlined />}
            color={status === 'ACTIVE' ? 'success' : 'error'}
            style={{ cursor: 'pointer', borderRadius: 6 }}>
            {status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
          </Tag>
        </Popconfirm>
      ),
    },
    {
      title: 'Thao tác',
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(row.user_id)}
            style={{ borderRadius: 6, borderColor: '#10B981', color: '#10B981' }}>Xem</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(row)}
            style={{ borderRadius: 6, borderColor: '#4F46E5', color: '#4F46E5' }}>Sửa</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>👥 Quản lý người dùng</h1>
        <p>Tạo và quản lý tài khoản cho tất cả vai trò trong hệ thống</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
          <div key={role} className="stat-card" style={{ background: cfg.bg, borderColor: `${cfg.color}30` }}>
            <div className="stat-value" style={{ color: cfg.color }}>
              {users.filter(u => u.role?.role_name === role).length}
            </div>
            <div className="stat-label">{cfg.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#6B7280' }} />}
          placeholder="Tìm kiếm tên, username, email..."
          style={{ maxWidth: 300, flex: 1 }}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          allowClear
        />
        <Select
          placeholder="Lọc vai trò" allowClear style={{ width: 160 }}
          onChange={v => setFilters(f => ({ ...f, role: v }))}
          options={Object.entries(ROLE_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
        />
        <Select
          placeholder="Trạng thái" allowClear style={{ width: 140 }}
          onChange={v => setFilters(f => ({ ...f, status: v }))}
          options={[{ value: 'ACTIVE', label: 'Hoạt động' }, { value: 'LOCKED', label: 'Đã khóa' }]}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}
          style={{ borderRadius: 8, fontWeight: 600 }}>
          Tạo tài khoản
        </Button>
      </div>

      <Table dataSource={users} columns={columns} loading={isLoading} rowKey="user_id"
        pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `Tổng ${t} người dùng` }}
        size="middle" />

      {/* ── Drawer: Xem chi tiết ── */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDetailUserId(null); }}
        width={480}
        title={
          detailUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar size={42}
                style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)`, fontWeight: 700, fontSize: 18 }}>
                {detailUser.full_name?.[0] || '?'}
              </Avatar>
              <div>
                <div style={{ color: '#111827', fontWeight: 700, fontSize: 15 }}>{detailUser.full_name}</div>
                <div style={{ color: '#6B7280', fontSize: 12 }}>@{detailUser.username}</div>
              </div>
            </div>
          ) : 'Chi tiết người dùng'
        }
        styles={{
          header: { background: '#fff', borderBottom: '1px solid #E5E7EB' },
          body: { background: '#F8FAFF', padding: '20px' },
        }}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : detailUser && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <span style={{
                background: ROLE_CONFIG[role]?.bg, color: ROLE_CONFIG[role]?.color,
                padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                border: `1px solid ${ROLE_CONFIG[role]?.color}40`,
              }}>{ROLE_CONFIG[role]?.label || role}</span>
              <span style={{ marginLeft: 8, color: detailUser.status === 'ACTIVE' ? '#10B981' : '#EF4444', fontSize: 13 }}>
                {detailUser.status === 'ACTIVE' ? '● Hoạt động' : '● Đã khóa'}
              </span>
            </div>
            <SectionTitle>THÔNG TIN CƠ BẢN</SectionTitle>
            <InfoRow icon={<UserOutlined />} label="Họ và tên" value={detailUser.full_name} />
            <InfoRow icon="📧" label="Email" value={detailUser.email} />
            <InfoRow icon="📞" label="Số điện thoại" value={detailUser.phone} />
            <InfoRow icon="🔑" label="Tên đăng nhập" value={detailUser.username} />
            <InfoRow icon="📅" label="Ngày tạo" value={dayjs(detailUser.created_at).format('DD/MM/YYYY HH:mm')} />
            {(role === 'TEACHER' || role === 'STUDENT' || role === 'PARENT') && (
              <div style={{ marginTop: 20, borderTop: '1px solid rgba(99,102,241,0.2)', paddingTop: 16 }}>
                <SectionTitle>
                  {role === 'TEACHER' ? 'THÔNG TIN GIÁO VIÊN' : role === 'STUDENT' ? 'THÔNG TIN HỌC SINH' : 'THÔNG TIN PHỤ HUYNH'}
                </SectionTitle>
                {renderExtendedInfo()}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ── Modal Tạo / Chỉnh sửa ── */}
      <Modal
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditUser(null); setEditDetail(null); }}
        title={
          <span style={{ color: '#111827' }}>
            {editUser ? `✏️ Chỉnh sửa – ${editUser.full_name}` : '➕ Tạo tài khoản mới'}
          </span>
        }
        footer={null}
        width={editRole === 'STUDENT' ? 620 : 520}
        destroyOnClose
      >
        {/* Show spinner while loading edit detail */}
        {editUser && editDetailLoading && (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}
          // hide form until detail loaded (for edit mode)
          hidden={!!editUser && editDetailLoading}
        >
          {/* ── THÔNG TIN TÀI KHOẢN ── */}
          <SectionTitle>THÔNG TIN TÀI KHOẢN</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="username" label="Tên đăng nhập"
              rules={[{ required: !editUser, message: 'Bắt buộc' }]}>
              <Input disabled={!!editUser} placeholder="username" />
            </Form.Item>
            <Form.Item name="password"
              label={editUser ? 'Mật khẩu mới (để trống = giữ nguyên)' : 'Mật khẩu'}
              rules={editUser ? [] : [{ required: true, message: 'Bắt buộc' }]}>
              <Input.Password placeholder="••••••••" />
            </Form.Item>
          </div>

          {/* ── THÔNG TIN CÁ NHÂN ── */}
          <SectionTitle>THÔNG TIN CÁ NHÂN</SectionTitle>
          <Form.Item name="full_name" label="Họ và tên">
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="email" label="Email">
              <Input placeholder="email@example.com" />
            </Form.Item>
            <Form.Item name="phone" label="Số điện thoại">
              <Input placeholder="0901234567" />
            </Form.Item>
          </div>

          {/* ── VAI TRÒ (chỉ hiện khi tạo mới) ── */}
          {!editUser && (
            <>
              <SectionTitle>VAI TRÒ</SectionTitle>
              <Form.Item name="role_id" label="Vai trò" rules={[{ required: true, message: 'Chọn vai trò' }]}>
                <Select placeholder="Chọn vai trò"
                  options={roles.map(r => ({ value: r.role_id, label: ROLE_CONFIG[r.role_name]?.label || r.role_name }))} />
              </Form.Item>
            </>
          )}

          {/* ── THÔNG TIN HỌC SINH (chỉ hiện khi edit STUDENT) ── */}
          {editRole === 'STUDENT' && (
            <>
              <Divider style={{ borderColor: '#E5E7EB', margin: '16px 0 8px' }} />
              <SectionTitle>THÔNG TIN HỌC SINH</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Form.Item name="student_code" label="Mã học sinh">
                  <Input placeholder="HS0101" />
                </Form.Item>
                <Form.Item name="gender" label="Giới tính">
                  <Select placeholder="Chọn giới tính" allowClear
                    options={[{ value: 'Nam', label: '♂ Nam' }, { value: 'Nữ', label: '♀ Nữ' }]} />
                </Form.Item>
                <Form.Item name="date_of_birth" label="Ngày sinh">
                  <DatePicker
                    placeholder="Chọn ngày sinh"
                    format="DD/MM/YYYY"
                    style={{ width: '100%' }}
                    disabledDate={d => d && d > dayjs()}
                  />
                </Form.Item>
                <Form.Item name="class_instance_id" label="Lớp học">
                  <Select placeholder="Chọn lớp" allowClear
                    options={instances.map(i => ({
                      value: i.class_instance_id,
                      label: `${i.grade}${i.class?.class_code} – ${i.year?.name}`,
                    }))} />
                </Form.Item>
              </div>
              <Form.Item name="hometown" label="Quê quán">
                <Input placeholder="Hà Nội, Đà Nẵng..." prefix={<EnvironmentOutlined style={{ color: '#4F46E5' }} />} />
              </Form.Item>
            </>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button onClick={() => { setModalOpen(false); setEditUser(null); }}>Hủy</Button>
            <Button type="primary" htmlType="submit"
              loading={createMutation.isPending || updateMutation.isPending}>
              {editUser ? 'Cập nhật' : 'Tạo tài khoản'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
