import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Table, Button, Select, Space, Typography, Tag, Drawer, Avatar, Empty, Spin } from 'antd';
import { SolutionOutlined, TeamOutlined, UserOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { departmentsApi, usersApi } from '../../api';
import { App } from 'antd';

const { Text, Title } = Typography;

export default function DepartmentsPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();

  // ── State ────────────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [addingMemberId, setAddingMemberId] = useState(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: departments = [], isLoading: deptsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.getAll().then(r => r.data.data),
  });

  // Lấy tất cả giáo viên (bao gồm cả GV bộ môn, Tổ trưởng và Hiệu trưởng) để bổ nhiệm/thêm thành viên
  const { data: allTeachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ['users', { role: ['TEACHER', 'HEAD_OF_DEPARTMENT', 'PRINCIPAL'] }],
    queryFn: () => usersApi.getAll({ role: ['TEACHER', 'HEAD_OF_DEPARTMENT', 'PRINCIPAL'] }).then(r => r.data.data),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const assignHeadMut = useMutation({
    mutationFn: ({ deptId, teacherId }) => departmentsApi.assignHead(deptId, teacherId),
    onSuccess: () => {
      qc.invalidateQueries(['departments']);
      qc.invalidateQueries(['users']);
      message.success('Cập nhật tổ trưởng chuyên môn thành công');
    },
    onError: (e) => message.error(e.response?.data?.message || 'Lỗi cập nhật tổ trưởng'),
  });

  const addMemberMut = useMutation({
    mutationFn: ({ deptId, teacherId }) => departmentsApi.addMember(deptId, teacherId),
    onSuccess: () => {
      qc.invalidateQueries(['departments']);
      setAddingMemberId(null);
      message.success('Thêm thành viên thành công');
    },
    onError: (e) => message.error(e.response?.data?.message || 'Lỗi thêm thành viên'),
  });

  const removeMemberMut = useMutation({
    mutationFn: ({ deptId, teacherId }) => departmentsApi.removeMember(deptId, teacherId),
    onSuccess: () => {
      qc.invalidateQueries(['departments']);
      qc.invalidateQueries(['users']);
      message.success('Đã xóa thành viên khỏi tổ chuyên môn');
    },
    onError: (e) => message.error(e.response?.data?.message || 'Lỗi xóa thành viên'),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openDeptDrawer = (dept) => {
    setSelectedDept(dept);
    setDrawerOpen(true);
  };

  const handleHeadChange = (teacherId) => {
    assignHeadMut.mutate({ deptId: selectedDept.department_id, teacherId });
    // Cập nhật local state để UI đồng bộ tức thời
    setSelectedDept(prev => ({
      ...prev,
      head_teacher_id: teacherId,
      head_teacher: teacherId ? allTeachers.find(t => t.user_id === teacherId) : null,
    }));
  };

  const handleAddMember = () => {
    if (!addingMemberId) return;
    addMemberMut.mutate({ deptId: selectedDept.department_id, teacherId: addingMemberId });
    
    // Cập nhật local state
    const newMemberUser = allTeachers.find(t => t.user_id === addingMemberId);
    if (newMemberUser) {
      setSelectedDept(prev => ({
        ...prev,
        members: [...prev.members, { department_id: prev.department_id, teacher_id: addingMemberId, teacher: newMemberUser }],
      }));
    }
  };

  const handleRemoveMember = (teacherId) => {
    removeMemberMut.mutate({ deptId: selectedDept.department_id, teacherId });
    
    // Cập nhật local state
    setSelectedDept(prev => {
      const updatedMembers = prev.members.filter(m => m.teacher_id !== teacherId);
      const isRemovingHead = prev.head_teacher_id === teacherId;
      return {
        ...prev,
        members: updatedMembers,
        head_teacher_id: isRemovingHead ? null : prev.head_teacher_id,
        head_teacher: isRemovingHead ? null : prev.head_teacher,
      };
    });
  };

  // Lấy các giáo viên chưa thuộc tổ hiện tại
  const currentMemberIds = selectedDept?.members.map(m => m.teacher_id) || [];
  const candidateMembers = allTeachers.filter(t => !currentMemberIds.includes(t.user_id));

  // Giao diện
  if (deptsLoading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>💼 Quản lý Tổ chuyên môn</h1>
        <p>Phân công tổ trưởng và quản lý danh sách thành viên các tổ bộ môn</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {departments.map(dept => {
          const membersCount = dept.members?.length || 0;
          return (
            <Card
              key={dept.department_id}
              hoverable
              title={<span style={{ color: '#0F766E', fontWeight: 800, fontSize: 16 }}>{dept.department_name}</span>}
              extra={<Tag color="cyan">{dept.subject?.subject_name}</Tag>}
              style={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}
              bodyStyle={{ padding: 20 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <Text style={{ color: '#94A3B8', fontSize: 12, display: 'block', marginBottom: 4 }}>Tổ trưởng chuyên môn</Text>
                  {dept.head_teacher ? (
                    <Space>
                      <Avatar style={{ background: '#0F766E' }} size="small" icon={<UserOutlined />} />
                      <Text strong style={{ color: '#1E293B' }}>{dept.head_teacher.full_name}</Text>
                    </Space>
                  ) : (
                    <Text italic style={{ color: '#94A3B8' }}>Chưa bổ nhiệm</Text>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: 12 }}>
                  <Space style={{ color: '#64748B' }}>
                    <TeamOutlined />
                    <Text>{membersCount} thành viên</Text>
                  </Space>
                  
                  <Button
                    type="primary"
                    size="small"
                    icon={<SolutionOutlined />}
                    onClick={() => openDeptDrawer(dept)}
                    style={{ background: '#0F766E', borderColor: '#0F766E', borderRadius: 6 }}
                  >
                    Quản lý tổ
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Drawer Quản lý chi tiết Tổ chuyên môn */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedDept(null); }}
        width={580}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #0F766E, #14B8A6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 18,
            }}>💼</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#1E293B' }}>
                {selectedDept?.department_name}
              </div>
              <div style={{ fontSize: 12, color: '#0F766E', fontWeight: 600 }}>
                Môn học: {selectedDept?.subject?.subject_name}
              </div>
            </div>
          </div>
        }
        styles={{
          header: { borderBottom: '1px solid #E2E8F0' },
          body: { background: '#F8FAFF', padding: 24 },
        }}
      >
        {selectedDept && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* 1. Bổ nhiệm Tổ trưởng */}
            <Card title={<span style={{ fontSize: 14, fontWeight: 700 }}>👑 Bổ nhiệm Tổ trưởng</span>} size="small" style={{ borderRadius: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Text style={{ color: '#64748B', fontSize: 12 }}>
                  Chọn giáo viên trong tổ bộ môn làm Tổ trưởng chuyên môn
                </Text>
                <Select
                  placeholder="Chọn tổ trưởng..."
                  style={{ width: '100%' }}
                  allowClear
                  value={selectedDept.head_teacher_id}
                  onChange={handleHeadChange}
                  loading={assignHeadMut.isPending}
                  options={selectedDept.members.map(m => ({
                    value: m.teacher.user_id,
                    label: m.teacher.full_name,
                  }))}
                />
              </div>
            </Card>

            {/* 2. Thêm giáo viên vào tổ */}
            <Card title={<span style={{ fontSize: 14, fontWeight: 700 }}>➕ Thêm giáo viên vào tổ</span>} size="small" style={{ borderRadius: 10 }}>
              <Space style={{ width: '100%' }}>
                <Select
                  placeholder="Chọn giáo viên tự do..."
                  style={{ width: 340 }}
                  value={addingMemberId}
                  onChange={setAddingMemberId}
                  options={candidateMembers.map(t => ({
                    value: t.user_id,
                    label: `${t.full_name} (@${t.username})`,
                  }))}
                  showSearch
                  filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddMember}
                  disabled={!addingMemberId}
                  loading={addMemberMut.isPending}
                  style={{ background: '#0F766E', borderColor: '#0F766E' }}
                >
                  Thêm
                </Button>
              </Space>
            </Card>

            {/* 3. Danh sách thành viên */}
            <Card title={<span style={{ fontSize: 14, fontWeight: 700 }}>👥 Danh sách thành viên ({selectedDept.members?.length || 0})</span>} size="small" style={{ borderRadius: 10 }}>
              <Table
                dataSource={selectedDept.members}
                rowKey="teacher_id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Họ tên',
                    render: (_, r) => (
                      <Space>
                        <Avatar size="small" style={{ background: '#E2E8F0', color: '#475569' }}>
                          {r.teacher?.full_name?.[0]?.toUpperCase()}
                        </Avatar>
                        <div>
                          <Text strong style={{ fontSize: 13 }}>{r.teacher?.full_name}</Text>
                          {selectedDept.head_teacher_id === r.teacher_id && (
                            <Tag color="gold" style={{ marginLeft: 6, fontSize: 10, borderRadius: 4 }}>Tổ trưởng</Tag>
                          )}
                        </div>
                      </Space>
                    ),
                  },
                  {
                    title: 'Số điện thoại',
                    dataIndex: ['teacher', 'phone'],
                    render: v => <Text style={{ color: '#64748B', fontSize: 12 }}>{v || '—'}</Text>,
                  },
                  {
                    title: 'Hành động',
                    width: 70,
                    render: (_, r) => (
                      <Button
                        size="small"
                        danger
                        type="text"
                        icon={<DeleteOutlined />}
                        loading={removeMemberMut.isPending}
                        onClick={() => handleRemoveMember(r.teacher_id)}
                      />
                    ),
                  },
                ]}
              />
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
}
