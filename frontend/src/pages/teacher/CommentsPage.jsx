import React, { useState } from 'react';
import { Select, Button, Input, Typography, Tag, Tabs, Spin, Empty } from 'antd';
import { SendOutlined, CommentOutlined, StarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classesApi, commentsApi, conductsApi } from '../../api';
import { App } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;

// ── Conduct config ────────────────────────────────────────────────────────────
const CONDUCT_OPTIONS = [
  { value: 'EXCELLENT', label: 'Tốt',        color: '#10B981', bg: '#ECFDF5', border: '#6EE7B7' },
  { value: 'GOOD',      label: 'Khá',        color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD' },
  { value: 'AVERAGE',   label: 'Trung bình', color: '#D97706', bg: '#FFFBEB', border: '#FCD34D' },
  { value: 'WEAK',      label: 'Yếu',        color: '#EF4444', bg: '#FEF2F2', border: '#FCA5A5' },
];

const ConductBadge = ({ rating }) => {
  if (!rating) return <span style={{ color: '#D1D5DB' }}>—</span>;
  const cfg = CONDUCT_OPTIONS.find(o => o.value === rating);
  if (!cfg) return null;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      borderRadius: 20, padding: '3px 12px', fontWeight: 700, fontSize: 12,
    }}>
      {cfg.label}
    </span>
  );
};

// ── Comments tab ──────────────────────────────────────────────────────────────
function CommentsTab({ classInstanceId, semester }) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [commentText, setCommentText] = useState('');

  const { data: students = [] } = useQuery({
    queryKey: ['class-students', classInstanceId],
    queryFn: () => classesApi.getInstanceStudents(classInstanceId).then(r => r.data.data),
    enabled: !!classInstanceId,
  });

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', selectedStudent?.student_id, semester],
    queryFn: () => commentsApi.getAll({ student_id: selectedStudent?.student_id, semester }).then(r => r.data.data),
    enabled: !!selectedStudent,
  });

  const sendMut = useMutation({
    mutationFn: (d) => commentsApi.create(d),
    onSuccess: () => { qc.invalidateQueries(['comments']); setCommentText(''); message.success('💬 Nhận xét đã được gửi'); },
    onError: (e) => message.error(e.response?.data?.message || 'Lỗi gửi nhận xét'),
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
      {/* Student list */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', color: '#4F46E5', fontWeight: 700, fontSize: 13 }}>
          Danh sách học sinh ({students.length})
        </div>
        <div style={{ overflowY: 'auto', maxHeight: 500 }}>
          {students.length === 0
            ? <div style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Chọn lớp để xem danh sách</div>
            : students.map(s => (
              <div key={s.student_id} onClick={() => setSelectedStudent(s)} style={{
                padding: '10px 16px', cursor: 'pointer', transition: 'background 0.15s',
                background: selectedStudent?.student_id === s.student_id ? '#EEF2FF' : 'transparent',
                borderLeft: `3px solid ${selectedStudent?.student_id === s.student_id ? '#4F46E5' : 'transparent'}`,
              }}>
                <div style={{ color: '#111827', fontWeight: 600, fontSize: 13 }}>{s.user?.full_name}</div>
                <div style={{ color: '#9CA3AF', fontSize: 11 }}>{s.student_code}</div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Comment area */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20 }}>
        {!selectedStudent ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
            <CommentOutlined style={{ fontSize: 40, marginBottom: 12, display: 'block' }} />
            Chọn học sinh để xem và gửi nhận xét
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0,
              }}>{selectedStudent.user?.full_name?.[0]}</div>
              <div>
                <Text strong style={{ color: '#111827' }}>{selectedStudent.user?.full_name}</Text>
                <Text style={{ color: '#9CA3AF', marginLeft: 8, fontSize: 12 }}>Học kỳ {semester}</Text>
              </div>
            </div>

            <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 16 }}>
              {isLoading ? <Spin /> : comments.length === 0
                ? <div style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Chưa có nhận xét nào trong học kỳ này</div>
                : comments.map(c => (
                  <div key={c.comment_id} style={{
                    background: '#F8FAFF', borderRadius: 10, padding: '10px 14px', marginBottom: 10,
                    border: '1px solid #E5E7EB',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text strong style={{ color: '#4F46E5', fontSize: 13 }}>{c.teacher?.full_name}</Text>
                      <Text style={{ color: '#9CA3AF', fontSize: 11 }}>{dayjs(c.created_at).format('DD/MM/YYYY HH:mm')}</Text>
                    </div>
                    <Text style={{ color: '#111827', fontSize: 13 }}>{c.content}</Text>
                  </div>
                ))
              }
            </div>

            <div>
              <TextArea
                value={commentText} onChange={e => setCommentText(e.target.value)}
                placeholder="Nhập nhận xét về học sinh..." rows={4}
                style={{ marginBottom: 10, borderRadius: 8 }}
              />
              <Button type="primary" icon={<SendOutlined />}
                loading={sendMut.isPending} disabled={!commentText.trim()}
                onClick={() => sendMut.mutate({ student_id: selectedStudent.student_id, semester, content: commentText })}
                style={{ borderRadius: 8 }}>
                Gửi nhận xét
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Conduct tab ───────────────────────────────────────────────────────────────
function ConductTab({ classInstanceId, semester }) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState(null); // student_id being edited
  const [draftRating, setDraftRating] = useState(null);
  const [draftNote, setDraftNote] = useState('');

  // Need homeroom class to get year_id
  const { data: homeroomClass } = useQuery({
    queryKey: ['my-homeroom-class'],
    queryFn: () => classesApi.getMyHomeroomClass().then(r => r.data.data),
  });
  const yearId = homeroomClass?.year_id;

  const { data: students = [] } = useQuery({
    queryKey: ['class-students', classInstanceId],
    queryFn: () => classesApi.getInstanceStudents(classInstanceId).then(r => r.data.data),
    enabled: !!classInstanceId,
  });

  const { data: conducts = [], isLoading: conductLoading } = useQuery({
    queryKey: ['conducts', classInstanceId, semester, yearId],
    queryFn: () => conductsApi.getByClass({ class_instance_id: classInstanceId, semester, year_id: yearId }).then(r => r.data.data),
    enabled: !!classInstanceId && !!yearId,
  });

  const upsertMut = useMutation({
    mutationFn: (d) => conductsApi.upsert(d),
    onSuccess: () => {
      qc.invalidateQueries(['conducts']);
      setEditingId(null); setDraftRating(null); setDraftNote('');
      message.success('✅ Đã lưu đánh giá hạnh kiểm');
    },
    onError: (e) => message.error(e.response?.data?.message || 'Lỗi lưu hạnh kiểm'),
  });

  const conductMap = Object.fromEntries(conducts.map(c => [c.student_id, c]));

  const startEdit = (s) => {
    const existing = conductMap[s.student_id];
    setEditingId(s.student_id);
    setDraftRating(existing?.rating || null);
    setDraftNote(existing?.note || '');
  };

  const save = (s) => {
    if (!draftRating) { message.warning('Vui lòng chọn mức xếp loại hạnh kiểm'); return; }
    upsertMut.mutate({ student_id: s.student_id, semester, year_id: yearId, rating: draftRating, note: draftNote });
  };

  if (!classInstanceId) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
        <StarOutlined style={{ fontSize: 40, marginBottom: 12, display: 'block' }} />
        Chọn lớp để đánh giá hạnh kiểm
      </div>
    );
  }

  // Check if teacher is homeroom of this class
  if (homeroomClass && homeroomClass.class_instance_id !== classInstanceId) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#EF4444' }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
        <div style={{ fontWeight: 600 }}>Chỉ GVCN mới có thể đánh giá hạnh kiểm</div>
        <div style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4 }}>Vui lòng chọn lớp bạn chủ nhiệm</div>
      </div>
    );
  }

  const rated = Object.keys(conductMap).length;

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ background: '#F8FAFF', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#4F46E5' }}>{students.length}</div>
          <div style={{ color: '#6B7280', fontSize: 12 }}>Tổng học sinh</div>
        </div>
        <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 10, padding: '10px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#10B981' }}>{rated}</div>
          <div style={{ color: '#6B7280', fontSize: 12 }}>Đã đánh giá</div>
        </div>
        <div style={{ background: '#FFF7ED', border: '1px solid #FCD34D', borderRadius: 10, padding: '10px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#D97706' }}>{students.length - rated}</div>
          <div style={{ color: '#6B7280', fontSize: 12 }}>Chưa đánh giá</div>
        </div>
        {CONDUCT_OPTIONS.map(o => (
          <div key={o.value} style={{ background: o.bg, border: `1px solid ${o.border}`, borderRadius: 10, padding: '10px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: o.color }}>
              {conducts.filter(c => c.rating === o.value).length}
            </div>
            <div style={{ color: '#6B7280', fontSize: 12 }}>{o.label}</div>
          </div>
        ))}
      </div>

      {/* Student list */}
      {conductLoading
        ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {students.map(s => {
              const existing = conductMap[s.student_id];
              const isEditing = editingId === s.student_id;

              return (
                <div key={s.student_id} style={{
                  background: '#fff', border: `1px solid ${isEditing ? '#C7D2FE' : '#E5E7EB'}`,
                  borderRadius: 12, padding: '14px 18px',
                  boxShadow: isEditing ? '0 0 0 3px rgba(79,70,229,0.08)' : 'none',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {/* Avatar */}
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: 16,
                    }}>{s.user?.full_name?.[0]}</div>

                    {/* Name */}
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ color: '#111827', fontWeight: 700, fontSize: 14 }}>{s.user?.full_name}</div>
                      <div style={{ color: '#9CA3AF', fontSize: 12 }}>{s.student_code}</div>
                    </div>

                    {/* Current rating or edit */}
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {CONDUCT_OPTIONS.map(o => (
                          <button key={o.value} onClick={() => setDraftRating(o.value)} style={{
                            background: draftRating === o.value ? o.color : o.bg,
                            color: draftRating === o.value ? '#fff' : o.color,
                            border: `2px solid ${draftRating === o.value ? o.color : o.border}`,
                            borderRadius: 20, padding: '4px 14px', cursor: 'pointer',
                            fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
                          }}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <ConductBadge rating={existing?.rating} />
                    )}

                    {/* Action buttons */}
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button type="primary" size="small" icon={<CheckCircleOutlined />}
                          loading={upsertMut.isPending}
                          onClick={() => save(s)}
                          style={{ borderRadius: 8, background: '#10B981', border: 'none', fontWeight: 600 }}>
                          Lưu
                        </Button>
                        <Button size="small" onClick={() => setEditingId(null)}
                          style={{ borderRadius: 8 }}>Hủy</Button>
                      </div>
                    ) : (
                      <Button size="small" onClick={() => startEdit(s)}
                        style={{
                          borderRadius: 8, borderColor: '#C7D2FE', color: '#4F46E5',
                          fontWeight: 600, background: '#EEF2FF',
                        }}>
                        {existing ? 'Chỉnh sửa' : 'Đánh giá'}
                      </Button>
                    )}
                  </div>

                  {/* Note area when editing */}
                  {isEditing && (
                    <div style={{ marginTop: 12 }}>
                      <TextArea
                        value={draftNote} onChange={e => setDraftNote(e.target.value)}
                        placeholder="Ghi chú thêm về hạnh kiểm học sinh (không bắt buộc)..."
                        rows={2} style={{ borderRadius: 8 }}
                      />
                    </div>
                  )}

                  {/* Show existing note if not editing */}
                  {!isEditing && existing?.note && (
                    <div style={{ marginTop: 8, color: '#6B7280', fontSize: 12, fontStyle: 'italic', paddingLeft: 50 }}>
                      📝 {existing.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CommentsPage() {
  const [classInstanceId, setClassInstanceId] = useState(null);
  const [semester, setSemester] = useState(1);
  const [activeTab, setActiveTab] = useState('comments');

  const { data: myClasses = [] } = useQuery({
    queryKey: ['my-classes'],
    queryFn: () => classesApi.getMyClasses().then(r => r.data.data),
  });

  const { data: homeroomClass } = useQuery({
    queryKey: ['my-homeroom-class'],
    queryFn: () => classesApi.getMyHomeroomClass().then(r => r.data.data),
  });

  const isHomeroomTab = activeTab === 'conduct';
  const isHomeroomClass = homeroomClass && classInstanceId === homeroomClass.class_instance_id;

  return (
    <div>
      <div className="page-header">
        <h1>💬 Nhận xét & Hạnh kiểm học sinh</h1>
        <p>Gửi nhận xét và đánh giá hạnh kiểm cho từng học sinh theo học kỳ</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <Select
          placeholder="🏫 Chọn lớp" style={{ width: 220 }}
          value={classInstanceId}
          onChange={v => setClassInstanceId(v)}
          options={myClasses.map(c => ({
            value: c.class_instance_id,
            label: `Lớp ${c.grade}${c.class?.class_code} – ${c.year?.name}`,
          }))}
        />
        <Select
          value={semester} onChange={setSemester} style={{ width: 140 }}
          options={[{ value: 1, label: 'Học kỳ I' }, { value: 2, label: 'Học kỳ II' }]}
        />
        {homeroomClass && classInstanceId === homeroomClass.class_instance_id && (
          <span style={{
            background: '#ECFDF5', border: '1px solid #6EE7B7',
            borderRadius: 20, padding: '4px 14px',
            color: '#059669', fontWeight: 600, fontSize: 12,
          }}>
            ⭐ Lớp chủ nhiệm của bạn
          </span>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '16px 20px' }}
        items={[
          {
            key: 'comments',
            label: (
              <span style={{ fontWeight: 600 }}>
                <CommentOutlined style={{ marginRight: 6 }} />Nhận xét
              </span>
            ),
            children: <CommentsTab classInstanceId={classInstanceId} semester={semester} />,
          },
          {
            key: 'conduct',
            label: (
              <span style={{ fontWeight: 600 }}>
                <StarOutlined style={{ marginRight: 6 }} />Hạnh kiểm
                {homeroomClass && (
                  <Tag color="gold" style={{ marginLeft: 6, fontSize: 10, borderRadius: 10 }}>GVCN</Tag>
                )}
              </span>
            ),
            children: <ConductTab classInstanceId={classInstanceId} semester={semester} />,
          },
        ]}
      />
    </div>
  );
}
