import React, { useState } from 'react';
import {
  Table, Button, Select, Space, Typography, Tag, Popconfirm,
  Tabs, Tooltip, Progress, Badge, Alert, Spin,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, TableOutlined, UnorderedListOutlined,
  WarningOutlined, CheckCircleOutlined, UserOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi, classesApi, subjectsApi, usersApi } from '../../api';
import { App } from 'antd';

const { Text, Title } = Typography;

// ── Palette ──────────────────────────────────────────────────────────────────
const SUBJECT_COLORS = ['purple', 'blue', 'cyan', 'green', 'orange', 'red', 'geekblue', 'volcano'];
const subjectColor = (name) => SUBJECT_COLORS[Math.abs([...name].reduce((h, c) => h + c.charCodeAt(0), 0)) % SUBJECT_COLORS.length];

export default function AssignmentsPage() {
  const { message, modal } = App.useApp();
  const qc = useQueryClient();

  // ── State ─────────────────────────────────────────────────────────────────
  const [newA, setNewA] = useState({ teacher_id: null, class_instance_id: null, subject_id: null });
  const [filters, setFilters] = useState({ class_instance_id: null, teacher_id: null, subject_id: null });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [matrixYear, setMatrixYear] = useState(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments', filters],
    queryFn: () => assignmentsApi.getAll(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))).then(r => r.data.data),
  });

  const { data: instances = [] } = useQuery({ queryKey: ['instances'], queryFn: () => classesApi.getInstances().then(r => r.data.data) });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => subjectsApi.getAll().then(r => r.data.data) });
  const { data: teachers = [] } = useQuery({
    queryKey: ['users', { role: 'TEACHER' }],
    queryFn: () => usersApi.getAll({ role: 'TEACHER' }).then(r => r.data.data),
  });
  const { data: years = [] } = useQuery({ queryKey: ['years'], queryFn: () => classesApi.getYears().then(r => r.data.data) });

  // Workload
  const { data: workload = [] } = useQuery({
    queryKey: ['assignments-workload'],
    queryFn: () => assignmentsApi.getWorkload().then(r => r.data.data),
  });

  // Matrix
  const { data: matrix, isLoading: matrixLoading } = useQuery({
    queryKey: ['assignments-matrix', matrixYear],
    queryFn: () => assignmentsApi.getMatrix(matrixYear).then(r => r.data.data),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (d) => assignmentsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries(['assignments']);
      qc.invalidateQueries(['assignments-workload']);
      qc.invalidateQueries(['assignments-matrix']);
      setNewA({ teacher_id: null, class_instance_id: null, subject_id: null });
      message.success('Phân công thành công');
    },
    onError: (e) => message.error(e.response?.data?.message || 'Lỗi phân công (có thể đã tồn tại)'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => assignmentsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries(['assignments']); qc.invalidateQueries(['assignments-workload']); qc.invalidateQueries(['assignments-matrix']); message.success('Đã xóa phân công'); },
  });

  const batchDeleteMut = useMutation({
    mutationFn: (ids) => assignmentsApi.batchDelete(ids),
    onSuccess: (_, ids) => {
      qc.invalidateQueries(['assignments']); qc.invalidateQueries(['assignments-workload']); qc.invalidateQueries(['assignments-matrix']);
      setSelectedRowKeys([]);
      message.success(`Đã xóa ${ids.length} phân công`);
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleBatchDelete = () => {
    modal.confirm({
      title: `Xóa ${selectedRowKeys.length} phân công?`,
      content: 'Hành động này không thể hoàn tác.',
      okText: 'Xóa', okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: () => batchDeleteMut.mutate(selectedRowKeys),
    });
  };

  // Coverage: which (class × subject) combos are missing
  const missingPairs = [];
  if (matrix) {
    for (const cls of matrix.classes) {
      for (const sub of matrix.subjects) {
        const key = `${cls.class_instance_id}-${sub.subject_id}`;
        if (!matrix.cells[key]) missingPairs.push({ class: cls.label, subject: sub.subject_name });
      }
    }
  }

  const maxLoad = Math.max(...workload.map(w => w.total_assignments), 1);

  // ── List columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Giáo viên', render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#4F46E5', fontWeight: 700,
          }}>{r.teacher?.full_name?.[0]}</div>
          <div>
            <div style={{ color: '#111827', fontWeight: 600 }}>{r.teacher?.full_name}</div>
            <div style={{ color: '#6B7280', fontSize: 12 }}>@{r.teacher?.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Lớp', render: (_, r) => (
        <Tag color="purple" style={{ fontSize: 14, fontWeight: 700, borderRadius: 8, padding: '2px 10px' }}>
          {r.class_instance?.grade}{r.class_instance?.class?.class_code}
        </Tag>
      ),
    },
    { title: 'Năm học', render: (_, r) => <Text style={{ color: '#6B7280' }}>{r.class_instance?.year?.name}</Text> },
    {
      title: 'Môn học', render: (_, r) => (
        <Tag color={subjectColor(r.subject?.subject_name || '')} style={{ borderRadius: 8 }}>
          {r.subject?.subject_name}
        </Tag>
      ),
    },
    {
      title: 'Thao tác', width: 100, render: (_, r) => (
        <Popconfirm title="Xóa phân công này?" onConfirm={() => deleteMut.mutate(r.assignment_id)} okText="Xóa" cancelText="Hủy">
          <Button size="small" danger icon={<DeleteOutlined />}>Xóa</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>📋 Phân công giáo viên</h1>
        <p>Gán giáo viên dạy môn học cho từng lớp · Xem ma trận phân công · Theo dõi tải giáo viên</p>
      </div>

      {/* ── Form phân công nhanh ─────────────────────────────────────────── */}
      <div style={{
        background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        borderRadius: 14, padding: '18px 20px', marginBottom: 20,
      }}>
        <Text strong style={{ color: '#4F46E5', marginBottom: 12, display: 'block', fontSize: 14 }}>
          ➕ Phân công nhanh
        </Text>
        <Space wrap>
          <Select
            placeholder="Chọn giáo viên" style={{ width: 230 }} value={newA.teacher_id}
            onChange={v => setNewA(p => ({ ...p, teacher_id: v }))}
            options={teachers.map(t => ({ value: t.user_id, label: t.full_name }))}
            showSearch filterOption={(i, o) => o.label.toLowerCase().includes(i.toLowerCase())}
          />
          <Select
            placeholder="Chọn lớp" style={{ width: 210 }} value={newA.class_instance_id}
            onChange={v => setNewA(p => ({ ...p, class_instance_id: v }))}
            options={instances.map(i => ({ value: i.class_instance_id, label: `${i.grade}${i.class?.class_code} – ${i.year?.name}` }))}
            showSearch filterOption={(i, o) => o.label.toLowerCase().includes(i.toLowerCase())}
          />
          <Select
            placeholder="Chọn môn học" style={{ width: 180 }} value={newA.subject_id}
            onChange={v => setNewA(p => ({ ...p, subject_id: v }))}
            options={subjects.map(s => ({ value: s.subject_id, label: s.subject_name }))}
            showSearch filterOption={(i, o) => o.label.toLowerCase().includes(i.toLowerCase())}
          />
          <Button
            type="primary" icon={<PlusOutlined />} loading={createMut.isPending}
            disabled={!newA.teacher_id || !newA.class_instance_id || !newA.subject_id}
            onClick={() => createMut.mutate(newA)}
            style={{ minWidth: 110 }}
          >
            Phân công
          </Button>
        </Space>
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Tổng phân công', value: assignments.length, color: '#4F46E5', bg: 'rgba(79,70,229,0.15)', border: 'rgba(79,70,229,0.3)' },
          { label: 'Giáo viên', value: new Set(assignments.map(a => a.teacher_id)).size, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
          { label: 'Lớp học', value: new Set(assignments.map(a => a.class_instance_id)).size, color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
          { label: 'Môn học', value: new Set(assignments.map(a => a.subject_id)).size, color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)' },
        ].map((s, i) => (
          <div key={i} style={{
            background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12,
            padding: '14px 18px', textAlign: 'center',
          }}>
            <div style={{ color: s.color, fontSize: 28, fontWeight: 800 }}>{s.value}</div>
            <div style={{ color: '#94A3B8', fontSize: 12 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs
        defaultActiveKey="list"
        style={{ background: '#fff', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        items={[

          // ── Tab 1: Danh sách ──────────────────────────────────────────
          {
            key: 'list',
            label: <span><UnorderedListOutlined /> Danh sách</span>,
            children: (
              <div>
                {/* Filter bar */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Select placeholder="Lọc giáo viên" allowClear style={{ width: 200 }}
                    onChange={v => setFilters(f => ({ ...f, teacher_id: v || null }))}
                    options={teachers.map(t => ({ value: t.user_id, label: t.full_name }))}
                    showSearch filterOption={(i, o) => o.label.toLowerCase().includes(i.toLowerCase())}
                  />
                  <Select placeholder="Lọc lớp" allowClear style={{ width: 200 }}
                    onChange={v => setFilters(f => ({ ...f, class_instance_id: v || null }))}
                    options={instances.map(i => ({ value: i.class_instance_id, label: `${i.grade}${i.class?.class_code} – ${i.year?.name}` }))}
                    showSearch filterOption={(i, o) => o.label.toLowerCase().includes(i.toLowerCase())}
                  />
                  <Select placeholder="Lọc môn học" allowClear style={{ width: 180 }}
                    onChange={v => setFilters(f => ({ ...f, subject_id: v || null }))}
                    options={subjects.map(s => ({ value: s.subject_id, label: s.subject_name }))}
                  />
                  {selectedRowKeys.length > 0 && (
                    <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}
                      loading={batchDeleteMut.isPending}>
                      Xóa {selectedRowKeys.length} đã chọn
                    </Button>
                  )}
                </div>

                <Table
                  dataSource={assignments} columns={columns} rowKey="assignment_id" loading={isLoading}
                  rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
                  pagination={{ pageSize: 15, showTotal: t => `${t} phân công` }}
                  size="middle"
                />
              </div>
            ),
          },

          // ── Tab 2: Ma trận ────────────────────────────────────────────
          {
            key: 'matrix',
            label: <span><TableOutlined /> Sơ đồ ma trận</span>,
            children: (
              <div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                  <Select placeholder="Lọc năm học" allowClear style={{ width: 200 }}
                    onChange={v => setMatrixYear(v || null)}
                    options={years.map(y => ({ value: y.year_id, label: y.name }))}
                  />
                  {missingPairs.length > 0 && (
                    <Tag color="warning" icon={<WarningOutlined />} style={{ padding: '4px 10px', borderRadius: 8 }}>
                      {missingPairs.length} ô chưa phân công
                    </Tag>
                  )}
                  {missingPairs.length === 0 && matrix && (
                    <Tag color="success" icon={<CheckCircleOutlined />} style={{ padding: '4px 10px', borderRadius: 8 }}>
                      Đã phân công đầy đủ
                    </Tag>
                  )}
                </div>

                {matrixLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
                  : !matrix ? <div style={{ color: '#6B7280', textAlign: 'center', padding: 40 }}>Chọn năm học để xem ma trận</div>
                  : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                        <thead>
                          <tr>
                            <th style={{ ...thStyle, background: '#F8FAFF', minWidth: 90 }}>Lớp \ Môn</th>
                            {matrix.subjects.map(s => (
                              <th key={s.subject_id} style={{ ...thStyle, background: '#F8FAFF' }}>
                                <Tag color={subjectColor(s.subject_name)} style={{ margin: 0, borderRadius: 6 }}>
                                  {s.subject_name}
                                </Tag>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {matrix.classes.map((cls, ri) => (
                            <tr key={cls.class_instance_id} style={{ background: ri % 2 === 0 ? '#fff' : '#F8FAFF' }}>
                              <td style={{ ...tdStyle, fontWeight: 700, color: '#4F46E5', fontSize: 14 }}>
                                {cls.label}
                                <div style={{ color: '#6B7280', fontSize: 10, fontWeight: 400 }}>{cls.year}</div>
                              </td>
                              {matrix.subjects.map(sub => {
                                const key = `${cls.class_instance_id}-${sub.subject_id}`;
                                const cell = matrix.cells[key];
                                return (
                                  <td key={sub.subject_id} style={{
                                    ...tdStyle,
                                    background: cell ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                                  }}>
                                    {cell ? (
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: '#10B981', fontWeight: 600, fontSize: 12 }}>{cell.teacher_name}</div>
                                        <Popconfirm title="Xóa phân công này?" okText="Xóa" cancelText="Hủy"
                                          onConfirm={() => deleteMut.mutate(cell.assignment_id)}>
                                          <Button type="text" size="small" danger style={{ fontSize: 10, padding: '0 4px', height: 18 }}>✕</Button>
                                        </Popconfirm>
                                      </div>
                                    ) : (
                                      <Tooltip title={`Chưa phân công ${sub.subject_name} cho lớp ${cls.label}`}>
                                        <div style={{ textAlign: 'center', color: '#475569', fontSize: 18 }}>—</div>
                                      </Tooltip>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                {/* Legend */}
                <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(16,185,129,0.2)', border: '1px solid #10B98150' }} />
                    <Text style={{ color: '#94A3B8', fontSize: 12 }}>Đã phân công</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(239,68,68,0.15)', border: '1px solid #EF444450' }} />
                    <Text style={{ color: '#94A3B8', fontSize: 12 }}>Chưa phân công</Text>
                  </div>
                </div>
              </div>
            ),
          },

          {
            key: 'workload',
            label: <span><ThunderboltOutlined /> Tải giáo viên</span>,
            children: (
              <div>
                {workload.length === 0
                  ? <div style={{ color: '#6B7280', textAlign: 'center', padding: 40 }}>Chưa có phân công nào</div>
                  : (
                    <div>
                      {/* Summary bar */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                        {[
                          { label: 'Tổng GV', value: workload.length, color: '#4F46E5', bg: 'rgba(79,70,229,0.12)' },
                          { label: 'Tổng tiết/tuần (toàn trường)', value: workload.reduce((s, w) => s + (w.weekly_periods || 0), 0), color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
                          { label: 'TB tiết/GV/tuần', value: workload.length ? Math.round(workload.reduce((s, w) => s + (w.weekly_periods || 0), 0) / workload.length) : 0, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
                        ].map((s, i) => (
                          <div key={i} style={{ background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                            <div style={{ color: s.color, fontSize: 22, fontWeight: 800 }}>{s.value}</div>
                            <div style={{ color: '#94A3B8', fontSize: 11 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {workload.map((w, i) => {
                          const maxPeriods = Math.max(...workload.map(x => x.weekly_periods || 0), 1);
                          const maxAssign = Math.max(...workload.map(x => x.total_assignments), 1);
                          const periodPct = Math.round(((w.weekly_periods || 0) / maxPeriods) * 100);
                          const assignPct = Math.round((w.total_assignments / maxAssign) * 100);

                          // Cảnh báo nếu tiết/tuần > 25 (tiêu chuẩn thông thường)
                          const WARN_THRESHOLD = 25;
                          const isHeavy = (w.weekly_periods || 0) >= WARN_THRESHOLD;
                          const periodColor = isHeavy ? '#EF4444' : (w.weekly_periods || 0) >= 18 ? '#F59E0B' : '#10B981';
                          const assignColor = assignPct >= 80 ? '#EF4444' : assignPct >= 50 ? '#F59E0B' : '#4F46E5';

                          const periodByClass = w.periods_by_class || {};
                          const periodByClassEntries = Object.entries(periodByClass).sort((a, b) => b[1] - a[1]);

                          return (
                            <div key={w.teacher_id} style={{
                              background: '#fff', border: `1px solid ${isHeavy ? 'rgba(239,68,68,0.3)' : '#E5E7EB'}`,
                              borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                            }}>
                              {/* Header: rank + name + two key numbers */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div style={{
                                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                    background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#4F46E5', fontWeight: 700, fontSize: 16,
                                  }}>
                                    {i + 1}
                                  </div>
                                  <div>
                                    <div style={{ color: '#111827', fontWeight: 700, fontSize: 15 }}>{w.full_name}</div>
                                    <div style={{ color: '#6B7280', fontSize: 12 }}>@{w.username}</div>
                                  </div>
                                </div>
                                {/* Two stat badges */}
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                  <div style={{ textAlign: 'center', background: `${periodColor}15`, border: `1px solid ${periodColor}40`, borderRadius: 10, padding: '6px 14px' }}>
                                    <div style={{ color: periodColor, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{w.weekly_periods || 0}</div>
                                    <div style={{ color: '#94A3B8', fontSize: 10, marginTop: 2 }}>tiết/tuần</div>
                                  </div>
                                  <div style={{ textAlign: 'center', background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.3)', borderRadius: 10, padding: '6px 14px' }}>
                                    <div style={{ color: '#4F46E5', fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{w.total_assignments}</div>
                                    <div style={{ color: '#94A3B8', fontSize: 10, marginTop: 2 }}>phân công</div>
                                  </div>
                                </div>
                              </div>

                              {/* Progress bars */}
                              <div style={{ marginBottom: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <span style={{ color: '#94A3B8', fontSize: 11 }}>📅 Khối lượng tiết/tuần ({w.weekly_periods || 0} tiết)</span>
                                  {isHeavy && <span style={{ color: '#EF4444', fontSize: 11, fontWeight: 600 }}>⚠️ Vượt chuẩn ({WARN_THRESHOLD} tiết)</span>}
                                </div>
                                <Progress percent={periodPct} showInfo={false} strokeColor={periodColor} trailColor="rgba(99,102,241,0.12)" strokeWidth={10} style={{ marginBottom: 6 }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <span style={{ color: '#94A3B8', fontSize: 11 }}>📋 Số lớp phân công ({w.total_assignments} phân công)</span>
                                </div>
                                <Progress percent={assignPct} showInfo={false} strokeColor={assignColor} trailColor="rgba(99,102,241,0.12)" strokeWidth={6} />
                              </div>

                              {/* Tags: subjects */}
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                <span style={{ color: '#6B7280', fontSize: 12 }}>Môn dạy:</span>
                                {w.subjects.map((s, j) => (
                                  <Tag key={j} color={subjectColor(s)} style={{ borderRadius: 6, fontSize: 11 }}>{s}</Tag>
                                ))}
                              </div>

                              {/* Per-class period breakdown */}
                              {periodByClassEntries.length > 0 && (
                                <div style={{ background: '#F8FAFF', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px' }}>
                                  <div style={{ color: '#4B5563', fontSize: 11, marginBottom: 6, fontWeight: 600 }}>
                                    📊 Phân rã tiết theo lớp:
                                  </div>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {periodByClassEntries.map(([cls, count]) => (
                                      <div key={cls} style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        background: '#EEF2FF', border: '1px solid #C7D2FE',
                                        borderRadius: 8, padding: '3px 10px',
                                      }}>
                                        <span style={{ color: '#4F46E5', fontWeight: 700, fontSize: 12 }}>{cls}</span>
                                        <span style={{ color: '#9CA3AF', fontSize: 11 }}>·</span>
                                        <span style={{ color: '#D97706', fontWeight: 600, fontSize: 12 }}>{count} tiết</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {isHeavy && (
                                <div style={{
                                  marginTop: 8, background: 'rgba(239,68,68,0.08)',
                                  border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '6px 12px',
                                  color: '#EF4444', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                                }}>
                                  ⚠️ Giáo viên đang dạy <strong>{w.weekly_periods}</strong> tiết/tuần — vượt ngưỡng khuyến nghị {WARN_THRESHOLD} tiết/tuần. Cân nhắc điều chỉnh TKB.
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>
            ),
          },

        ]}
      />
    </div>
  );
}

const thStyle = {
  padding: '10px 12px', textAlign: 'center',
  border: '1px solid #E5E7EB',
  color: '#374151', fontWeight: 600, whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '8px 10px', textAlign: 'center',
  border: '1px solid #F3F4F6',
  minWidth: 100,
};
