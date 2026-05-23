import React, { useState } from 'react';
import { Select, Typography, Modal, Form, Button, Popconfirm, Tag, Spin, Space, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ClearOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulesApi, classesApi, subjectsApi, usersApi } from '../../api';
import TimetableGrid from '../../components/common/TimetableGrid';
import { App } from 'antd';

const { Title, Text } = Typography;

const DAY_NAMES = { 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7' };

export default function AdminSchedulePage() {
  const { message, modal } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [selectedClass, setSelectedClass] = useState(null);
  const [editModal, setEditModal] = useState({ open: false, day: null, period: null, existing: null });

  // Queries
  const { data: instances = [] } = useQuery({ queryKey: ['instances'], queryFn: () => classesApi.getInstances().then(r => r.data.data) });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => subjectsApi.getAll().then(r => r.data.data) });
  const { data: teachers = [] } = useQuery({ queryKey: ['users', { role: 'TEACHER' }], queryFn: () => usersApi.getAll({ role: 'TEACHER' }).then(r => r.data.data) });
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['schedules', selectedClass],
    queryFn: () => schedulesApi.getByClass(selectedClass).then(r => r.data.data),
    enabled: !!selectedClass,
  });

  // Mutations
  const upsertMut = useMutation({
    mutationFn: (data) => schedulesApi.upsert(data),
    onSuccess: () => { qc.invalidateQueries(['schedules', selectedClass]); setEditModal({ open: false }); message.success('Đã lưu!'); },
    onError: (e) => message.error(e.response?.data?.message || 'Lỗi lưu TKB'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => schedulesApi.remove(id),
    onSuccess: () => { qc.invalidateQueries(['schedules', selectedClass]); message.success('Đã xóa tiết học'); },
  });

  const clearMut = useMutation({
    mutationFn: () => schedulesApi.clearClass(selectedClass),
    onSuccess: () => { qc.invalidateQueries(['schedules', selectedClass]); message.success('Đã xóa toàn bộ TKB lớp này'); },
  });

  // Open edit modal on cell click
  const handleCellClick = (day, period, existing) => {
    setEditModal({ open: true, day, period, existing });
    form.setFieldsValue({
      subject_id: existing?.subject_id || undefined,
      teacher_id: existing?.teacher_id || undefined,
      room: existing?.room || '',
    });
  };

  const handleSave = (values) => {
    upsertMut.mutate({
      class_instance_id: selectedClass,
      day_of_week: editModal.day,
      period: editModal.period,
      ...values,
    });
  };

  const selectedInstance = instances.find(i => i.class_instance_id === selectedClass);

  return (
    <div>
      <div className="page-header">
        <h1>📅 Thời khoá biểu</h1>
        <p>Quản lý và chỉnh sửa thời khoá biểu cho các lớp học</p>
      </div>

      {/* Class selector + actions */}
      <div style={{
        background: '#fff', border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 12, padding: '16px 20px', marginBottom: 20,
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <Text style={{ color: '#94A3B8', flexShrink: 0 }}>Chọn lớp:</Text>
        <Select
          placeholder="Chọn lớp học..." style={{ width: 280 }}
          value={selectedClass}
          onChange={setSelectedClass}
          options={instances.map(i => ({
            value: i.class_instance_id,
            label: `Lớp ${i.grade}${i.class?.class_code} – ${i.year?.name}`,
          }))}
          showSearch filterOption={(i, o) => o.label.toLowerCase().includes(i.toLowerCase())}
        />
        {selectedClass && (
          <>
            <Tag color="purple" style={{ fontSize: 13, borderRadius: 8 }}>
              {schedules.length} tiết đã có TKB
            </Tag>
            <Popconfirm
              title="Xóa toàn bộ TKB của lớp này?" okText="Xóa hết" cancelText="Hủy"
              okButtonProps={{ danger: true }} onConfirm={() => clearMut.mutate()}
            >
              <Button danger icon={<ClearOutlined />} loading={clearMut.isPending}>Xóa toàn bộ TKB</Button>
            </Popconfirm>
          </>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <Text style={{ color: '#6B7280', fontSize: 12 }}>💡 Click vào ô trống để thêm · Click ô đã có để sửa/xóa</Text>
      </div>

      {/* Timetable grid */}
      <div style={{ background: 'rgba(30,27,75,0.4)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: 16 }}>
        {!selectedClass ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
            <div>Vui lòng chọn lớp để xem và chỉnh sửa thời khoá biểu</div>
          </div>
        ) : (
          <TimetableGrid
            schedules={schedules} loading={isLoading}
            showTeacher onCellClick={handleCellClick}
          />
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        open={editModal.open}
        onCancel={() => setEditModal({ open: false })}
        title={
          <span style={{ color: '#111827' }}>
            {editModal.existing ? '✏️ Chỉnh sửa tiết học' : '➕ Thêm tiết học'} —{' '}
            <span style={{ color: '#4F46E5' }}>{DAY_NAMES[editModal.day]}, Tiết {editModal.period}</span>
          </span>
        }
        footer={null} width={460} destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Form.Item name="subject_id" label="Môn học" rules={[{ required: true, message: 'Chọn môn' }]}>
            <Select
              placeholder="Chọn môn học"
              options={subjects.map(s => ({ value: s.subject_id, label: s.subject_name }))}
              showSearch filterOption={(i, o) => o.label.toLowerCase().includes(i.toLowerCase())}
            />
          </Form.Item>
          <Form.Item name="teacher_id" label="Giáo viên" rules={[{ required: true, message: 'Chọn GV' }]}>
            <Select
              placeholder="Chọn giáo viên"
              options={teachers.map(t => ({ value: t.user_id, label: t.full_name }))}
              showSearch filterOption={(i, o) => o.label.toLowerCase().includes(i.toLowerCase())}
            />
          </Form.Item>
          <Form.Item name="room" label="Phòng học">
            <Select placeholder="Chọn phòng" allowClear
              options={['A101','A102','A103','B201','B202','B203','C301','C302'].map(r => ({ value: r, label: r }))}
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            {editModal.existing && (
              <Popconfirm title="Xóa tiết học này?" okText="Xóa" cancelText="Hủy" onConfirm={() => { deleteMut.mutate(editModal.existing.schedule_id); setEditModal({ open: false }); }}>
                <Button danger icon={<DeleteOutlined />} loading={deleteMut.isPending}>Xóa tiết</Button>
              </Popconfirm>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <Button onClick={() => setEditModal({ open: false })}>Hủy</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={upsertMut.isPending}>Lưu</Button>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
