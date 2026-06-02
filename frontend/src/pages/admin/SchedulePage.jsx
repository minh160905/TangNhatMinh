import React, { useState, useEffect, useMemo } from 'react';
import {
  Select, Typography, Modal, Form, Button, Popconfirm, Tag, Spin, Space,
  Tabs, InputNumber, Alert, Progress, Tooltip, Divider,
} from 'antd';
import {
  DeleteOutlined, SaveOutlined, ClearOutlined, CalendarOutlined,
  CheckCircleOutlined, WarningOutlined, ReloadOutlined, RobotOutlined,
  InfoCircleOutlined, SettingOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulesApi, classesApi, subjectsApi, usersApi } from '../../api';
import TimetableGrid from '../../components/common/TimetableGrid';
import { App } from 'antd';

const { Text } = Typography;

const DAY_NAMES = { 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7' };

// ── Màu trạng thái tải GV ─────────────────────────────────────────────────────
const getLoadColor = (periods) => {
  if (periods >= 18) return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: 'Nặng' };
  if (periods >= 12) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.09)', label: 'Vừa' };
  if (periods >= 6)  return { color: '#10B981', bg: 'rgba(16,185,129,0.09)', label: 'Nhẹ' };
  return { color: '#94A3B8', bg: 'rgba(148,163,184,0.09)', label: 'Rất ít' };
};

// Màu cho từng khối
const GRADE_PALETTE = {
  '10': { color: '#4F46E5', bg: 'rgba(79,70,229,0.08)', border: 'rgba(79,70,229,0.25)', label: 'Khối 10' },
  '11': { color: '#0EA5E9', bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.25)', label: 'Khối 11' },
  '12': { color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)', label: 'Khối 12' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function defaultPeriodsUI(subjectName = '') {
  const n = subjectName.toLowerCase();
  if (n.includes('toán') || n.includes('văn') || n.includes('anh')) return 3;
  if (n.includes('lý') || n.includes('hóa') || n.includes('sinh') ||
      n.includes('gdcd') || n.includes('tin') || n.includes('thể') ||
      n.includes('âm nhạc') || n.includes('nhạc')) return 2;
  return 1;
}

function getSubjectEmoji(name = '') {
  const n = name.toLowerCase();
  if (n.includes('toán')) return '📐';
  if (n.includes('văn')) return '📝';
  if (n.includes('anh')) return '🌍';
  if (n.includes('lý')) return '⚛️';
  if (n.includes('hóa')) return '🧪';
  if (n.includes('sinh')) return '🌱';
  if (n.includes('sử')) return '📜';
  if (n.includes('địa')) return '🗺️';
  if (n.includes('gdcd') || n.includes('công dân')) return '🏛️';
  if (n.includes('tin')) return '💻';
  if (n.includes('thể')) return '⚽';
  if (n.includes('nhạc') || n.includes('âm')) return '🎵';
  return '📚';
}

// ── Component chính ───────────────────────────────────────────────────────────
export default function AdminSchedulePage() {
  const { message, modal } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();

  // Tab chính
  const [activeTab, setActiveTab] = useState('view');

  // ── State: xem TKB ────────────────────────────────────────────────────────
  const [selectedClass, setSelectedClass] = useState(null);
  const [editModal, setEditModal] = useState({ open: false, day: null, period: null, existing: null });

  // ── State: auto-schedule ──────────────────────────────────────────────────
  const [yearFilter, setYearFilter] = useState(null);
  // periodsConfig = { "10": { subjectId: N }, "11": { ... }, "12": { ... } }
  const [periodsConfig, setPeriodsConfig] = useState({});
  const [gradeTab, setGradeTab] = useState(null);
  const [generateResult, setGenerateResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: instances = [] } = useQuery({
    queryKey: ['instances'],
    queryFn: () => classesApi.getInstances().then(r => r.data.data),
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.getAll().then(r => r.data.data),
  });
  const { data: teachers = [] } = useQuery({
    queryKey: ['users', { role: 'TEACHER' }],
    queryFn: () => usersApi.getAll({ role: 'TEACHER' }).then(r => r.data.data),
  });
  const { data: years = [] } = useQuery({
    queryKey: ['years'],
    queryFn: () => classesApi.getYears().then(r => r.data.data),
  });
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['schedules', selectedClass],
    queryFn: () => schedulesApi.getByClass(selectedClass).then(r => r.data.data),
    enabled: !!selectedClass,
  });

  // ── Lấy danh sách khối lớp từ instances ───────────────────────────────────
  const grades = useMemo(
    () => [...new Set(instances.map(i => String(i.grade)))].sort(),
    [instances]
  );

  // ── Khởi tạo periodsConfig khi subjects/instances load ───────────────────
  useEffect(() => {
    if (!subjects.length || !grades.length) return;
    setPeriodsConfig(prev => {
      const next = { ...prev };
      for (const grade of grades) {
        if (!next[grade]) next[grade] = {};
        for (const s of subjects) {
          const sid = String(s.subject_id);
          if (next[grade][sid] === undefined) {
            next[grade][sid] = defaultPeriodsUI(s.subject_name);
          }
        }
      }
      return next;
    });
  }, [subjects, grades]);

  // Chọn tab khối mặc định
  useEffect(() => {
    if (grades.length && !gradeTab) setGradeTab(grades[0]);
  }, [grades]);

  // ── Mutations: xem TKB ────────────────────────────────────────────────────
  const upsertMut = useMutation({
    mutationFn: (data) => schedulesApi.upsert(data),
    onSuccess: () => {
      qc.invalidateQueries(['schedules', selectedClass]);
      setEditModal({ open: false });
      message.success('Đã lưu tiết học!');
    },
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCellClick = (day, period, existing) => {
    setEditModal({ open: true, day, period, existing });
    form.setFieldsValue({
      subject_id: existing?.subject_id,
      teacher_id: existing?.teacher_id,
      room: existing?.room || '',
    });
  };

  const handleSave = (values) => {
    upsertMut.mutate({ class_instance_id: selectedClass, day_of_week: editModal.day, period: editModal.period, ...values });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateResult(null);
    try {
      const resp = await schedulesApi.autoGenerate({
        periodsPerGrade: periodsConfig,   // { "10": { sid: N }, "11": {...}, "12": {...} }
        year_id: yearFilter,
      });
      setGenerateResult(resp.data.data);
      if (resp.data.data?.failed?.length > 0) {
        message.warning(`Đã tạo TKB – có ${resp.data.data.failed.length} tiết không thể xếp`);
      } else {
        message.success(`Tạo TKB thành công! ${resp.data.data.stats?.total_scheduled || 0} tiết sẵn sàng`);
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'Lỗi khi tạo TKB tự động');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!generateResult?.scheduled?.length) return;
    const classCount = new Set(generateResult.scheduled.map(s => s.class_instance_id)).size;
    modal.confirm({
      title: '⚠️ Xác nhận áp dụng thời khoá biểu',
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>
            Thao tác này sẽ <strong style={{ color: '#EF4444' }}>XÓA TOÀN BỘ TKB hiện tại</strong>{' '}
            của <strong>{classCount} lớp</strong> và thay bằng TKB mới vừa tạo.
          </p>
          <p style={{ color: '#6B7280', fontSize: 13 }}>
            Tổng <strong>{generateResult.scheduled.length} tiết</strong> sẽ được lưu. Không thể hoàn tác.
          </p>
        </div>
      ),
      okText: '✅ Áp dụng ngay',
      okButtonProps: { style: { background: '#4F46E5', borderColor: '#4F46E5' } },
      cancelText: 'Hủy',
      onOk: async () => {
        setIsApplying(true);
        try {
          const resp = await schedulesApi.autoApply(generateResult.scheduled);
          qc.invalidateQueries(['schedules']);
          message.success(`Đã áp dụng: ${resp.data.data.applied} tiết cho ${resp.data.data.classes_updated} lớp`);
          setGenerateResult(null);
          setActiveTab('view');
        } catch (e) {
          message.error(e.response?.data?.message || 'Lỗi khi áp dụng TKB');
        } finally {
          setIsApplying(false);
        }
      },
    });
  };

  const resetPeriodsConfig = () => {
    const next = {};
    for (const grade of grades) {
      next[grade] = {};
      for (const s of subjects) {
        next[grade][String(s.subject_id)] = defaultPeriodsUI(s.subject_name);
      }
    }
    setPeriodsConfig(next);
  };

  // Tổng tiết/tuần cho khối đang chọn
  const currentGradeConfig = periodsConfig[gradeTab] || {};
  const totalPeriodsCurrentGrade = Object.values(currentGradeConfig).reduce((a, b) => a + Number(b || 0), 0);

  // Palette cho grade tab đang chọn
  const gradePalette = GRADE_PALETTE[gradeTab] || GRADE_PALETTE['10'];

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <h1>📅 Thời khoá biểu</h1>
        <p>Quản lý thủ công hoặc tự động sắp xếp toàn trường bằng AI</p>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="large"
        style={{
          background: '#fff', borderRadius: 14,
          border: '1px solid #E5E7EB', padding: '0 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
        items={[
          // ══════════════════════════════════════════════════════════════
          // TAB 1: Xem & chỉnh sửa thủ công
          // ══════════════════════════════════════════════════════════════
          {
            key: 'view',
            label: <span style={{ padding: '0 4px' }}><CalendarOutlined style={{ marginRight: 6 }} />Xem & Chỉnh sửa</span>,
            children: (
              <div style={{ paddingBottom: 20 }}>
                <div style={{
                  background: '#F8FAFF', border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 12, padding: '14px 18px', marginBottom: 16,
                  display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
                }}>
                  <Text style={{ color: '#94A3B8', flexShrink: 0, fontSize: 13 }}>Chọn lớp:</Text>
                  <Select
                    placeholder="Chọn lớp học..."
                    style={{ width: 280 }}
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
                      <Tag color="purple" style={{ fontSize: 12, borderRadius: 8, padding: '2px 10px' }}>
                        {schedules.length} tiết đã xếp
                      </Tag>
                      <Popconfirm
                        title="Xóa toàn bộ TKB của lớp này?" okText="Xóa hết" cancelText="Hủy"
                        okButtonProps={{ danger: true }} onConfirm={() => clearMut.mutate()}
                      >
                        <Button danger icon={<ClearOutlined />} size="small" loading={clearMut.isPending}>
                          Xóa TKB lớp này
                        </Button>
                      </Popconfirm>
                    </>
                  )}
                </div>
                <Text style={{ color: '#6B7280', fontSize: 12, display: 'block', marginBottom: 10 }}>
                  💡 Click ô trống để thêm tiết · Click ô đã có để sửa hoặc xóa
                </Text>
                <div style={{ background: 'rgba(30,27,75,0.4)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: 14 }}>
                  {!selectedClass ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
                      <div>Chọn một lớp để xem và chỉnh sửa thời khoá biểu</div>
                    </div>
                  ) : (
                    <TimetableGrid schedules={schedules} loading={schedulesLoading} showTeacher onCellClick={handleCellClick} />
                  )}
                </div>
              </div>
            ),
          },

          // ══════════════════════════════════════════════════════════════
          // TAB 2: Tự động sắp xếp
          // ══════════════════════════════════════════════════════════════
          {
            key: 'auto',
            label: <span style={{ padding: '0 4px' }}><RobotOutlined style={{ marginRight: 6 }} />🤖 Tự động sắp xếp</span>,
            children: (
              <div style={{ paddingBottom: 24 }}>

                {/* Main grid */}
                <div style={{ display: 'grid', gridTemplateColumns: generateResult ? '1fr 1fr' : '1fr', gap: 20 }}>

                  {/* ── CONFIG PANEL ─────────────────────────────────── */}
                  <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚙️</div>
                      <Text strong style={{ color: '#111827', fontSize: 15 }}>Cấu hình</Text>
                    </div>

                    {/* Năm học */}
                    <div style={{ marginBottom: 14 }}>
                      <Text style={{ color: '#6B7280', fontSize: 12, display: 'block', marginBottom: 5 }}>Lọc theo năm học (bỏ trống = tất cả)</Text>
                      <Select
                        placeholder="Tất cả năm học" allowClear style={{ width: '100%' }}
                        value={yearFilter} onChange={v => setYearFilter(v || null)}
                        options={years.map(y => ({ value: y.year_id, label: y.name }))}
                      />
                    </div>

                    <Divider style={{ margin: '10px 0' }} />

                    {/* Header cấu hình tiết */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Text strong style={{ color: '#374151', fontSize: 13 }}>
                        Số tiết / môn / tuần
                        <span style={{ color: '#94A3B8', fontWeight: 400, fontSize: 11, marginLeft: 6 }}>
                          (theo từng khối)
                        </span>
                      </Text>
                      <Button
                        size="small" type="link"
                        onClick={resetPeriodsConfig}
                        style={{ color: '#4F46E5', padding: 0, height: 'auto', fontSize: 11 }}
                      >
                        Đặt lại mặc định
                      </Button>
                    </div>

                    {/* Grade Tabs */}
                    <Tabs
                      activeKey={gradeTab}
                      onChange={setGradeTab}
                      size="small"
                      type="card"
                      style={{ marginBottom: 10 }}
                      tabBarStyle={{ marginBottom: 0 }}
                      items={grades.map(grade => {
                        const gp = GRADE_PALETTE[grade] || { color: '#4F46E5', bg: 'rgba(79,70,229,0.08)', border: 'rgba(79,70,229,0.25)', label: `Khối ${grade}` };
                        const gradeTotal = Object.values(periodsConfig[grade] || {}).reduce((a, b) => a + Number(b || 0), 0);
                        return {
                          key: grade,
                          label: (
                            <span style={{ color: grade === gradeTab ? gp.color : '#6B7280', fontWeight: grade === gradeTab ? 700 : 500, fontSize: 13 }}>
                              {gp.label}
                              <span style={{
                                marginLeft: 5, fontSize: 10, fontWeight: 700,
                                background: grade === gradeTab ? gp.color : '#E5E7EB',
                                color: grade === gradeTab ? '#fff' : '#6B7280',
                                borderRadius: 8, padding: '1px 5px',
                              }}>{gradeTotal}</span>
                            </span>
                          ),
                          children: (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 310, overflowY: 'auto', padding: '8px 2px' }}>
                              {subjects.map(s => {
                                const sid = String(s.subject_id);
                                const val = periodsConfig[grade]?.[sid] ?? defaultPeriodsUI(s.subject_name);
                                const emoji = getSubjectEmoji(s.subject_name);
                                const tierColor = val >= 3 ? '#4F46E5' : val === 2 ? '#10B981' : '#94A3B8';
                                return (
                                  <div key={s.subject_id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '7px 11px', borderRadius: 9,
                                    background: `${tierColor}08`, border: `1px solid ${tierColor}20`,
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                      <span style={{ fontSize: 15 }}>{emoji}</span>
                                      <span style={{ color: '#374151', fontWeight: 600, fontSize: 12 }}>{s.subject_name}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      <InputNumber
                                        min={0} max={10} value={val}
                                        onChange={v => setPeriodsConfig(prev => ({
                                          ...prev,
                                          [grade]: { ...(prev[grade] || {}), [sid]: v ?? 0 },
                                        }))}
                                        size="small"
                                        style={{ width: 58 }}
                                      />
                                      <span style={{ color: '#9CA3AF', fontSize: 11 }}>tiết</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ),
                        };
                      })}
                    />

                    {/* Grade summary row */}
                    {grades.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                        {grades.map(grade => {
                          const gp = GRADE_PALETTE[grade] || { color: '#4F46E5', bg: 'rgba(79,70,229,0.08)' };
                          const tot = Object.values(periodsConfig[grade] || {}).reduce((a, b) => a + Number(b || 0), 0);
                          return (
                            <div key={grade} style={{
                              flex: 1, textAlign: 'center', padding: '7px 10px',
                              background: gp.bg, border: `1px solid ${gp.color}25`,
                              borderRadius: 10,
                            }}>
                              <div style={{ color: gp.color, fontWeight: 800, fontSize: 18 }}>{tot}</div>
                              <div style={{ color: '#9CA3AF', fontSize: 10 }}>tiết/Khối {grade}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <Button
                      type="primary" block size="large"
                      icon={<RobotOutlined />}
                      loading={isGenerating}
                      onClick={handleGenerate}
                      style={{
                        height: 46, borderRadius: 12, fontSize: 14, fontWeight: 700,
                        background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                        border: 'none', boxShadow: '0 4px 14px rgba(79,70,229,0.38)',
                      }}
                    >
                      {isGenerating ? 'Đang tạo TKB...' : '🤖 Tạo TKB tự động'}
                    </Button>
                  </div>

                  {/* ── PREVIEW PANEL ──────────────────────────────────── */}
                  {generateResult && (
                    <div style={{
                      background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#10B981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📊</div>
                        <Text strong style={{ color: '#111827', fontSize: 15 }}>Kết quả xem trước</Text>
                      </div>

                      {/* Summary cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                        {[
                          { label: 'Tiết đã xếp', value: generateResult.stats?.total_scheduled, sub: `/ ${generateResult.stats?.total_requested} yêu cầu`, color: '#10B981', bg: 'rgba(16,185,129,0.09)' },
                          { label: 'Tỷ lệ thành công', value: `${generateResult.stats?.success_rate}%`, sub: `${generateResult.failed?.length || 0} tiết thất bại`, color: generateResult.failed?.length ? '#F59E0B' : '#10B981', bg: generateResult.failed?.length ? 'rgba(245,158,11,0.09)' : 'rgba(16,185,129,0.09)' },
                          { label: 'Điểm cân bằng', value: generateResult.stats?.balance_score, sub: 'Phân phối tải GV', color: (generateResult.stats?.balance_score || 0) >= 70 ? '#4F46E5' : '#F59E0B', bg: 'rgba(79,70,229,0.09)' },
                          { label: 'Lớp được xếp', value: generateResult.stats?.classes_count, sub: `${generateResult.stats?.subjects_count} môn`, color: '#8B5CF6', bg: 'rgba(139,92,246,0.09)' },
                        ].map((s, i) => (
                          <div key={i} style={{ background: s.bg, borderRadius: 10, padding: '10px 12px', textAlign: 'center', border: `1px solid ${s.color}20` }}>
                            <div style={{ color: s.color, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                            <div style={{ color: '#374151', fontSize: 11, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                            <div style={{ color: '#9CA3AF', fontSize: 10 }}>{s.sub}</div>
                          </div>
                        ))}
                      </div>

                      {/* Balance progress */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <Text style={{ color: '#6B7280', fontSize: 12 }}>⚖️ Cân bằng tải GV</Text>
                          <Text style={{ color: '#4F46E5', fontSize: 12, fontWeight: 700 }}>
                            {generateResult.stats?.balance_score}/100
                          </Text>
                        </div>
                        <Progress
                          percent={generateResult.stats?.balance_score || 0}
                          strokeColor={{ '0%': '#4F46E5', '100%': '#10B981' }}
                          trailColor="rgba(99,102,241,0.1)" strokeWidth={8} showInfo={false}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                          <span style={{ color: '#9CA3AF', fontSize: 11 }}>TB: {generateResult.stats?.avg_load} tiết/GV/tuần</span>
                          <span style={{ color: '#9CA3AF', fontSize: 11 }}>Lệch ±{generateResult.stats?.std_dev}</span>
                        </div>
                      </div>

                      {/* Teacher workload */}
                      <div style={{ marginBottom: 14 }}>
                        <Text style={{ color: '#374151', fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                          📋 Tải giáo viên (tiết/tuần)
                        </Text>
                        <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {(generateResult.stats?.teachers || []).map(t => {
                            const cfg = getLoadColor(t.periods_per_week);
                            const pct = Math.round((t.periods_per_week / (generateResult.stats?.max_load || 1)) * 100);
                            return (
                              <div key={t.teacher_id} style={{
                                display: 'flex', alignItems: 'center', gap: 7, padding: '5px 9px',
                                borderRadius: 8, background: cfg.bg, border: `1px solid ${cfg.color}20`,
                              }}>
                                <div style={{
                                  width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: 'rgba(255,255,255,0.7)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, fontWeight: 800, fontSize: 11,
                                }}>{t.full_name?.[0] || '?'}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                    <span style={{ color: '#374151', fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{t.full_name}</span>
                                    <span style={{ color: cfg.color, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{t.periods_per_week} tiết</span>
                                  </div>
                                  <div style={{ height: 4, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: cfg.color, borderRadius: 3, transition: 'width 0.4s ease' }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Conflicts */}
                      {generateResult.failed?.length > 0 ? (
                        <Alert
                          type="warning" icon={<WarningOutlined />}
                          message={`${generateResult.failed.length} tiết không thể xếp`}
                          description={
                            <div style={{ maxHeight: 100, overflowY: 'auto', marginTop: 4 }}>
                              {generateResult.failed.map((f, i) => (
                                <div key={i} style={{ fontSize: 11, color: '#92400E', marginBottom: 2 }}>
                                  • Lớp <strong>{f.class_label}</strong> – {f.subject_name} (tiết {f.slot_index}/{f.total_needed}): {f.reason}
                                </div>
                              ))}
                            </div>
                          }
                          style={{ borderRadius: 10, marginBottom: 12 }} showIcon
                        />
                      ) : (
                        <Alert type="success" icon={<CheckCircleOutlined />}
                          message="Không có xung đột! TKB hoàn toàn hợp lệ."
                          style={{ borderRadius: 10, marginBottom: 12 }} showIcon
                        />
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          type="primary" loading={isApplying} onClick={handleApply}
                          icon={<CheckCircleOutlined />}
                          style={{ flex: 1, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#10B981,#059669)', border: 'none', fontWeight: 700 }}
                        >✅ Áp dụng TKB</Button>
                        <Button icon={<ReloadOutlined />} onClick={handleGenerate} loading={isGenerating} style={{ height: 40, borderRadius: 10 }}>Tạo lại</Button>
                        <Button onClick={() => setGenerateResult(null)} style={{ height: 40, borderRadius: 10 }}>Đóng</Button>
                      </div>
                    </div>
                  )}
                </div>



              </div>
            ),
          },
        ]}
      />

      {/* Edit modal */}
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
            <Select placeholder="Chọn môn học" options={subjects.map(s => ({ value: s.subject_id, label: s.subject_name }))}
              showSearch filterOption={(i, o) => o.label.toLowerCase().includes(i.toLowerCase())} />
          </Form.Item>
          <Form.Item name="teacher_id" label="Giáo viên" rules={[{ required: true, message: 'Chọn GV' }]}>
            <Select placeholder="Chọn giáo viên" options={teachers.map(t => ({ value: t.user_id, label: t.full_name }))}
              showSearch filterOption={(i, o) => o.label.toLowerCase().includes(i.toLowerCase())} />
          </Form.Item>
          <Form.Item name="room" label="Phòng học">
            <Select placeholder="Chọn phòng" allowClear
              options={['A101', 'A102', 'A103', 'B201', 'B202', 'B203', 'C301', 'C302'].map(r => ({ value: r, label: r }))} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            {editModal.existing && (
              <Popconfirm title="Xóa tiết học này?" okText="Xóa" cancelText="Hủy"
                onConfirm={() => { deleteMut.mutate(editModal.existing.schedule_id); setEditModal({ open: false }); }}>
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
