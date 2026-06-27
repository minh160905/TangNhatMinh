import React, { useState, useMemo } from 'react';
import { Form, Input, Button, Table, Typography, Tag, Badge, Tabs, Avatar, Checkbox, Empty, Spin, Tooltip } from 'antd';
import {
  SendOutlined, TeamOutlined, UserOutlined, SearchOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ManOutlined, WomanOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, classesApi } from '../../api';
import { App } from 'antd';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { TextArea } = Input;

// ── Recipient Card Component ────────────────────────────────────────────────
const RecipientCard = ({ user, type, sub, selected, onToggle }) => {
  const isStudent = type === 'student';
  const color = isStudent ? '#10B981' : '#60A5FA';
  const bg = isStudent ? 'rgba(16,185,129,0.1)' : 'rgba(96,165,250,0.1)';
  const border = selected
    ? `1px solid ${color}`
    : '1px solid rgba(99,102,241,0.15)';

  return (
    <div
      onClick={() => onToggle(user.user_id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: selected ? (isStudent ? 'rgba(16,185,129,0.08)' : 'rgba(96,165,250,0.08)') : '#F9FAFB',
        border, borderRadius: 10, padding: '10px 14px',
        cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none',
      }}
    >
      <Checkbox checked={selected} style={{ flexShrink: 0 }} />
      <Avatar size={34} style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, fontWeight: 700, flexShrink: 0 }}>
        {user.full_name?.[0] || '?'}
      </Avatar>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#111827', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {user.full_name}
        </div>
        <div style={{ color: '#6B7280', fontSize: 11 }}>{sub}</div>
      </div>
      <Tag style={{ background: bg, color, border: `1px solid ${color}30`, borderRadius: 6, fontSize: 10, flexShrink: 0 }}>
        {isStudent ? 'HS' : 'PH'}
      </Tag>
    </div>
  );
};

export default function NotificationSendPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();

  // ── State ─────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState('class'); // 'class' | 'individual'
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set()); // user_id set
  const [search, setSearch] = useState('');

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: myClasses = [] } = useQuery({
    queryKey: ['my-classes'],
    queryFn: () => classesApi.getMyClasses().then(r => r.data.data),
  });

  const { data: recipients, isLoading: recipientsLoading } = useQuery({
    queryKey: ['notif-recipients'],
    queryFn: () => notificationsApi.getRecipients().then(r => r.data.data),
    enabled: mode === 'individual',
  });

  const { data: classStudents = [], isLoading: classStudentsLoading } = useQuery({
    queryKey: ['class-students', selectedClass],
    queryFn: () => classesApi.getInstanceStudents(selectedClass).then(r => r.data.data),
    enabled: !!selectedClass && mode === 'class',
  });

  const { data: sentNotifs = [] } = useQuery({
    queryKey: ['sent-notifs'],
    queryFn: () => notificationsApi.getSent().then(r => r.data.data),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const sendMut = useMutation({
    mutationFn: (data) => notificationsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['sent-notifs']);
      form.resetFields();
      setSelectedIds(new Set());
      setSelectedClass(null);
      message.success('📢 Gửi thông báo thành công!');
    },
    onError: (e) => message.error(e.response?.data?.message || 'Lỗi gửi thông báo'),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleId = (uid) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const toggleAll = (ids) => {
    const allSelected = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const handleSend = (values) => {
    let receiver_ids = [];
    if (mode === 'class') {
      if (!selectedClass) { message.warning('Vui lòng chọn lớp'); return; }
      receiver_ids = classStudents.map(s => s.user_id);
    } else {
      receiver_ids = Array.from(selectedIds);
    }
    if (receiver_ids.length === 0) { message.warning('Vui lòng chọn người nhận'); return; }
    sendMut.mutate({ title: values.title, content: values.content, receiver_ids });
  };

  // ── Filtered recipients for individual mode ───────────────────────────────
  const filteredStudents = useMemo(() => {
    if (!recipients?.students) return [];
    return recipients.students.filter(s =>
      !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.class?.includes(search)
    );
  }, [recipients?.students, search]);

  const filteredParents = useMemo(() => {
    if (!recipients?.parents) return [];
    return recipients.parents.filter(p =>
      !search || p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.children?.some(c => c.name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [recipients?.parents, search]);

  const allFilteredIds = [...filteredStudents.map(s => s.user_id), ...filteredParents.map(p => p.user_id)];
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id));

  // ── Sent table ────────────────────────────────────────────────────────────
  const sentColumns = [
    {
      title: 'Tiêu đề', dataIndex: 'title',
      render: t => <Text style={{ color: '#111827', fontWeight: 600, fontSize: 13 }}>{t}</Text>,
    },
    {
      title: 'Người nhận', render: (_, r) => (
        <Tag color="blue" style={{ borderRadius: 6 }}>{r._count?.receivers || 0} người</Tag>
      ),
    },
    {
      title: 'Thời gian', render: (_, r) => (
        <Text style={{ color: '#6B7280', fontSize: 12 }}>{dayjs(r.created_at).format('DD/MM HH:mm')}</Text>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>📢 Gửi thông báo</h1>
        <p>Gửi thông báo đến học sinh, phụ huynh hoặc toàn bộ lớp</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 20, alignItems: 'start' }}>
        {/* ── Left: Compose form ─────────────────────────────────────── */}
        <div style={{ background: '#fff', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, padding: 24 }}>
          <Title level={5} style={{ color: '#4F46E5', marginBottom: 20 }}>✉️ Soạn thông báo</Title>

          <Form form={form} layout="vertical" onFinish={handleSend}>
            <Form.Item label={<span style={{ color: '#94A3B8' }}>Tiêu đề</span>} name="title"
              rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
              <Input placeholder="Tiêu đề thông báo..." />
            </Form.Item>
            <Form.Item label={<span style={{ color: '#94A3B8' }}>Nội dung</span>} name="content"
              rules={[{ required: true, message: 'Nhập nội dung' }]}>
              <TextArea rows={4} placeholder="Nội dung thông báo chi tiết..." />
            </Form.Item>

            {/* ── Mode toggle ── */}
            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: '#94A3B8', display: 'block', marginBottom: 8 }}>Gửi đến:</Text>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {[
                  { k: 'class', l: '🏫 Cả lớp', icon: <TeamOutlined /> },
                  { k: 'individual', l: '👤 Cá nhân', icon: <UserOutlined /> },
                ].map(m => (
                  <button key={m.k} type="button" onClick={() => { setMode(m.k); setSelectedIds(new Set()); setSelectedClass(null); }} style={{
                    background: mode === m.k ? 'rgba(79,70,229,0.1)' : '#F3F4F6',
                    border: `1px solid ${mode === m.k ? '#4F46E5' : '#E5E7EB'}`,
                    color: mode === m.k ? '#4F46E5' : '#374151',
                    borderRadius: 8, padding: '7px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  }}>{m.l}</button>
                ))}
              </div>

              {/* ── Class mode ── */}
              {mode === 'class' && (
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {myClasses.map(c => {
                      const label = `${c.grade}${c.class?.class_code}`;
                      const sel = selectedClass === c.class_instance_id;
                      return (
                        <button key={c.class_instance_id} type="button"
                          onClick={() => setSelectedClass(sel ? null : c.class_instance_id)}
                          style={{
                            background: sel ? 'rgba(79,70,229,0.1)' : '#F3F4F6',
                            border: `1px solid ${sel ? '#4F46E5' : '#E5E7EB'}`,
                            color: sel ? '#4F46E5' : '#374151',
                            borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 14,
                            transition: 'all 0.15s',
                          }}
                        >
                          {label}
                          <span style={{ fontSize: 11, marginLeft: 6, opacity: 0.7 }}>{c._count?.students} HS</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedClass && (
                    <div style={{ marginTop: 10, color: '#6B7280', fontSize: 12 }}>
                      {classStudentsLoading ? '...' : `Sẽ gửi đến ${classStudents.length} học sinh`}
                    </div>
                  )}
                </div>
              )}

              {/* ── Individual mode ── */}
              {mode === 'individual' && (
                <div>
                  {/* Search + Select All bar */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <SearchOutlined style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6B7280', zIndex: 1 }} />
                      <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Tìm kiếm tên, lớp..."
                        style={{
                          width: '100%', background: '#fff', border: '1px solid #E5E7EB',
                          borderRadius: 8, padding: '7px 12px 7px 32px', color: '#111827', fontSize: 13, boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <button type="button" onClick={() => toggleAll(allFilteredIds)} style={{
                      background: allSelected ? 'rgba(79,70,229,0.1)' : '#F3F4F6',
                      border: `1px solid ${allSelected ? '#4F46E5' : '#E5E7EB'}`,
                      color: allSelected ? '#4F46E5' : '#374151',
                      borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
                    }}>
                      {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                  </div>

                  {/* Selected count */}
                  {selectedIds.size > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                      background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.3)',
                      borderRadius: 8, padding: '6px 12px',
                    }}>
                      <CheckCircleOutlined style={{ color: '#4F46E5' }} />
                      <Text style={{ color: '#4F46E5', fontSize: 13 }}>
                        Đã chọn <strong>{selectedIds.size}</strong> người nhận
                      </Text>
                      <button type="button" onClick={() => setSelectedIds(new Set())}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 0 }}>
                        <CloseCircleOutlined />
                      </button>
                    </div>
                  )}

                  {recipientsLoading ? (
                    <div style={{ textAlign: 'center', padding: 30 }}><Spin /></div>
                  ) : (
                    <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
                      {/* Students */}
                      {filteredStudents.length > 0 && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0 2px' }}>
                            <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                            <Text style={{ color: '#10B981', fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>
                              HỌC SINH ({filteredStudents.length})
                            </Text>
                            <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                          </div>
                          {filteredStudents.map(s => (
                            <RecipientCard
                              key={s.user_id} user={s} type="student"
                              sub={`Lớp ${s.class}${s.student_code ? ' · ' + s.student_code : ''}`}
                              selected={selectedIds.has(s.user_id)} onToggle={toggleId}
                            />
                          ))}
                        </>
                      )}

                      {/* Parents */}
                      {filteredParents.length > 0 && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 2px' }}>
                            <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                            <Text style={{ color: '#60A5FA', fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>
                              PHỤ HUYNH ({filteredParents.length})
                            </Text>
                            <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                          </div>
                          {filteredParents.map(p => (
                            <RecipientCard
                              key={p.user_id} user={p} type="parent"
                              sub={`PH của: ${p.children?.map(c => `${c.name} (${c.class})`).join(', ')}`}
                              selected={selectedIds.has(p.user_id)} onToggle={toggleId}
                            />
                          ))}
                        </>
                      )}

                      {filteredStudents.length === 0 && filteredParents.length === 0 && (
                        <Empty description={<span style={{ color: '#6B7280' }}>Không tìm thấy kết quả</span>} style={{ padding: 20 }} />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button type="primary" htmlType="submit" block icon={<SendOutlined />}
              loading={sendMut.isPending}
              disabled={mode === 'class' ? !selectedClass : selectedIds.size === 0}
              style={{ height: 46, borderRadius: 10, fontWeight: 700, fontSize: 15, marginTop: 4 }}>
              {sendMut.isPending ? 'Đang gửi...' : `Gửi thông báo${selectedIds.size > 0 && mode === 'individual' ? ` (${selectedIds.size} người)` : ''}`}
            </Button>
          </Form>
        </div>

        {/* ── Right: Sent history ────────────────────────────────────── */}
        <div style={{ background: '#fff', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, padding: 24 }}>
          <Title level={5} style={{ color: '#4F46E5', marginBottom: 16 }}>
            📋 Đã gửi ({sentNotifs.length})
          </Title>
          {sentNotifs.length === 0 ? (
            <Empty description={<span style={{ color: '#6B7280' }}>Chưa gửi thông báo nào</span>} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sentNotifs.map(n => (
                <div key={n.notification_id} style={{
                  background: '#F9FAFB', border: '1px solid #E5E7EB',
                  borderRadius: 10, padding: '12px 14px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <Text style={{ color: '#111827', fontWeight: 600, fontSize: 13, flex: 1 }}>{n.title}</Text>
                    <Tag color="blue" style={{ borderRadius: 6, flexShrink: 0 }}>{n._count?.receivers} người</Tag>
                  </div>
                  <Text style={{ color: '#6B7280', fontSize: 11 }}>{dayjs(n.created_at).format('DD/MM/YYYY HH:mm')}</Text>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
