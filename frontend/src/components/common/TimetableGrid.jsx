import React from 'react';
import { Tag, Tooltip, Spin, Empty } from 'antd';
import { BookOutlined, UserOutlined, HomeOutlined } from '@ant-design/icons';

const DAYS = [
  { value: 2, label: 'Thứ 2' },
  { value: 3, label: 'Thứ 3' },
  { value: 4, label: 'Thứ 4' },
  { value: 5, label: 'Thứ 5' },
  { value: 6, label: 'Thứ 6' },
  { value: 7, label: 'Thứ 7' },
];

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const PERIOD_TIMES = {
  1: '07:00–07:45', 2: '07:50–08:35', 3: '08:45–09:30',
  4: '09:40–10:25', 5: '10:30–11:15',
  6: '13:00–13:45', 7: '13:50–14:35', 8: '14:45–15:30',
  9: '15:40–16:25', 10: '16:30–17:15',
};

const SUBJECT_COLORS = {
  'Toán':       { bg: '#EEF2FF', border: '#4F46E5', text: '#4338CA' },
  'Vật Lí':     { bg: '#ECFDF5', border: '#10B981', text: '#065F46' },
  'Hóa Học':    { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E' },
  'Sinh Học':   { bg: '#F0FDF4', border: '#22C55E', text: '#15803D' },
  'Lịch Sử':   { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B' },
  'Địa Lí':    { bg: '#F0FDFA', border: '#14B8A6', text: '#0F766E' },
  'Ngữ Văn':   { bg: '#FAF5FF', border: '#A855F7', text: '#7E22CE' },
  'Tiếng Anh': { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8' },
};

const getColor = (subjectName) => {
  for (const [key, val] of Object.entries(SUBJECT_COLORS)) {
    if (subjectName?.includes(key)) return val;
  }
  return { bg: '#EEF2FF', border: '#6366F1', text: '#4338CA' };
};

export default function TimetableGrid({
  schedules = [],
  showTeacher = true,
  showClass = false,
  loading = false,
  onCellClick = null,
  highlightTeacherId = null,
}) {
  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!schedules.length) return <Empty description={<span style={{ color: '#9CA3AF' }}>Chưa có thời khoá biểu</span>} style={{ padding: 40 }} />;

  const map = {};
  for (const s of schedules) map[`${s.day_of_week}-${s.period}`] = s;

  const usedDays = DAYS.filter(d => schedules.some(s => s.day_of_week === d.value));
  const maxPeriod = Math.max(...schedules.map(s => s.period), 6);
  const usedPeriods = PERIODS.filter(p => p <= maxPeriod);
  const isEditable = typeof onCellClick === 'function';

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ ...TH, width: 100, background: '#F8FAFF' }}>Tiết</th>
            {usedDays.map(d => (
              <th key={d.value} style={{ ...TH, background: '#F8FAFF', minWidth: 140 }}>
                <div style={{ color: '#111827', fontWeight: 700 }}>{d.label}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {usedPeriods.map((period, pi) => (
            <React.Fragment key={period}>
              {period === 1 && (
                <tr>
                  <td colSpan={usedDays.length + 1} style={SESSION_DIV}>
                    🌅 BUỔI SÁNG
                  </td>
                </tr>
              )}
              {period === 6 && (
                <tr>
                  <td colSpan={usedDays.length + 1} style={SESSION_DIV}>
                    ☀️ BUỔI CHIỀU
                  </td>
                </tr>
              )}
              <tr style={{ background: pi % 2 === 0 ? '#fff' : '#FAFBFF' }}>
                {/* Period label */}
                <td style={{ ...TD, background: '#F8FAFF', textAlign: 'center', verticalAlign: 'middle' }}>
                  <div style={{ color: '#4F46E5', fontWeight: 700, fontSize: 14 }}>Tiết {period}</div>
                  <div style={{ color: '#9CA3AF', fontSize: 10 }}>{PERIOD_TIMES[period]}</div>
                </td>

                {usedDays.map(d => {
                  const cell = map[`${d.value}-${period}`];
                  const clr = cell ? getColor(cell.subject?.subject_name) : null;
                  const isMyLesson = highlightTeacherId && cell?.teacher_id === highlightTeacherId;

                  return (
                    <td key={d.value} style={{
                      ...TD, padding: 6,
                      cursor: isEditable ? 'pointer' : 'default',
                      transition: 'background 0.15s',
                      background: isMyLesson ? '#EEF2FF' : undefined,
                    }}
                      onClick={() => isEditable && onCellClick(d.value, period, cell)}
                      onMouseEnter={e => { if (isEditable) e.currentTarget.style.background = '#F5F7FF'; }}
                      onMouseLeave={e => { if (isEditable) e.currentTarget.style.background = isMyLesson ? '#EEF2FF' : ''; }}
                    >
                      {cell ? (
                        <Tooltip title={`${cell.subject?.subject_name} · GV: ${cell.teacher?.full_name} · ${PERIOD_TIMES[period]}`}>
                          <div style={{
                            background: clr.bg,
                            border: `1.5px solid ${clr.border}60`,
                            borderRadius: 10, padding: '7px 10px',
                            minHeight: 56, display: 'flex', flexDirection: 'column', gap: 3,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          }}>
                            <div style={{ color: clr.text, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <BookOutlined style={{ marginRight: 4, fontSize: 10 }} />
                              {cell.subject?.subject_name}
                            </div>
                            {showTeacher && (
                              <div style={{ color: '#6B7280', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <UserOutlined style={{ marginRight: 3, fontSize: 9 }} />
                                {cell.teacher?.full_name}
                              </div>
                            )}
                            {showClass && cell.class_instance && (
                              <div style={{ color: '#9CA3AF', fontSize: 10 }}>
                                Lớp {cell.class_instance.grade}{cell.class_instance.class?.class_code}
                              </div>
                            )}
                            {cell.room && (
                              <div style={{ color: '#9CA3AF', fontSize: 10 }}>
                                <HomeOutlined style={{ marginRight: 3, fontSize: 9 }} />
                                {cell.room}
                              </div>
                            )}
                            {isEditable && (
                              <div style={{ color: '#9CA3AF', fontSize: 9, marginTop: 2 }}>Click để sửa</div>
                            )}
                          </div>
                        </Tooltip>
                      ) : (
                        isEditable ? (
                          <div style={{
                            border: '2px dashed #D1D5DB',
                            borderRadius: 10, padding: 6,
                            minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#9CA3AF', fontSize: 11, transition: 'border-color 0.15s',
                          }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#4F46E5'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#D1D5DB'}
                          >
                            + Thêm
                          </div>
                        ) : (
                          <div style={{ minHeight: 44 }} />
                        )
                      )}
                    </td>
                  );
                })}
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TH = {
  padding: '10px 8px', textAlign: 'center',
  border: '1px solid #E5E7EB',
  color: '#374151', fontWeight: 700,
  position: 'sticky', top: 0, zIndex: 1,
};

const TD = {
  border: '1px solid #F3F4F6',
  verticalAlign: 'top',
};

const SESSION_DIV = {
  background: '#F8FAFF', padding: '6px 14px',
  color: '#6B7280', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  borderBottom: '1px solid #E5E7EB', borderTop: '1px solid #E5E7EB',
};
