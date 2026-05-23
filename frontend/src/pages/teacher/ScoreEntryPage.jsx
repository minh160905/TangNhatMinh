import React, { useState, useCallback, useRef } from 'react';
import { Select, Button, Table, InputNumber, Typography, Space, Spin, Alert, Tag, Tooltip, App } from 'antd';
import { SaveOutlined, ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classesApi, scoresApi, assignmentsApi, subjectsApi } from '../../api';

const { Text, Title } = Typography;

const getScoreStyle = (v) => {
  if (v === null || v === undefined) return {};
  if (v >= 8) return { color: '#10B981', fontWeight: 700 };
  if (v < 5) return { color: '#EF4444', fontWeight: 700 };
  return { color: '#111827' };
};

const ScoreInputCell = ({ value, onChange, onBlur }) => (
  <InputNumber
    min={0} max={10} step={0.5}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    className="score-input"
    style={{
      width: 64, textAlign: 'center',
      background: 'rgba(15,14,30,0.8)',
      border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: 6, color: value !== null && value !== undefined ? (value >= 8 ? '#10B981' : value < 5 ? '#EF4444' : '#111827') : '#6B7280',
    }}
    controls={false}
    placeholder="—"
  />
);

export default function ScoreEntryPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();

  const [classInstanceId, setClassInstanceId] = useState(null);
  const [subjectId, setSubjectId] = useState(null);
  const [semester, setSemester] = useState(1);
  const [localScores, setLocalScores] = useState({}); // { studentId: { tx1, tx2, ..., gk, ck } }
  const [saving, setSaving] = useState(false);
  const [savedRows, setSavedRows] = useState(new Set());

  const { data: myClasses = [] } = useQuery({
    queryKey: ['my-classes'],
    queryFn: () => classesApi.getMyClasses().then(r => r.data.data),
  });

  const { data: mySubjects = [] } = useQuery({
    queryKey: ['teacher-subjects', classInstanceId],
    queryFn: () => classInstanceId
      ? assignmentsApi.getTeacherSubjects(classInstanceId).then(r => r.data.data)
      : Promise.resolve([]),
    enabled: !!classInstanceId,
  });

  const { data: classScores = [], isLoading: scoresLoading, refetch } = useQuery({
    queryKey: ['class-scores', classInstanceId, subjectId, semester],
    queryFn: () => scoresApi.getClassScores({ classInstanceId, subjectId, semester }).then(r => r.data.data),
    enabled: !!(classInstanceId && subjectId && semester),
    onSuccess: (data) => {
      // Initialize local scores from server data
      const init = {};
      data.forEach(row => {
        init[row.student_id] = {
          tx1: row.tx1, tx2: row.tx2, tx3: row.tx3, tx4: row.tx4, tx5: row.tx5,
          gk: row.gk, ck: row.ck,
        };
      });
      setLocalScores(init);
      setSavedRows(new Set());
    },
  });

  const batchMut = useMutation({
    mutationFn: (scores) => scoresApi.batchUpsert(scores),
    onSuccess: () => {
      qc.invalidateQueries(['class-scores']);
      message.success('✅ Lưu điểm thành công!');
    },
    onError: (e) => message.error(e.response?.data?.message || 'Lỗi lưu điểm'),
  });

  const updateLocal = (studentId, field, value) => {
    setLocalScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
    setSavedRows(prev => { const s = new Set(prev); s.delete(studentId); return s; });
  };

  const calcDTB = (row) => {
    const local = localScores[row.student_id] || {};
    const txVals = [local.tx1, local.tx2, local.tx3, local.tx4, local.tx5].filter(v => v !== null && v !== undefined);
    const txAvg = txVals.length ? txVals.reduce((a, b) => a + b, 0) / txVals.length : null;
    const gk = local.gk ?? null;
    const ck = local.ck ?? null;
    if (txAvg !== null && gk !== null && ck !== null) {
      return Math.round(((txAvg + 2 * gk + 3 * ck) / 6) * 100) / 100;
    }
    return null;
  };

  const handleSaveAll = async () => {
    if (!subjectId || !semester) return;
    setSaving(true);
    const scores = [];

    classScores.forEach(row => {
      const local = localScores[row.student_id] || {};
      for (let i = 1; i <= 5; i++) {
        const val = local[`tx${i}`];
        if (val !== null && val !== undefined) {
          scores.push({ student_id: row.student_id, subject_id: Number(subjectId), semester: Number(semester), score_type: 'TX', score_value: val, order_no: i });
        }
      }
      if (local.gk !== null && local.gk !== undefined) {
        scores.push({ student_id: row.student_id, subject_id: Number(subjectId), semester: Number(semester), score_type: 'GK', score_value: local.gk });
      }
      if (local.ck !== null && local.ck !== undefined) {
        scores.push({ student_id: row.student_id, subject_id: Number(subjectId), semester: Number(semester), score_type: 'CK', score_value: local.ck });
      }
    });

    if (scores.length > 0) {
      await batchMut.mutateAsync(scores);
      setSavedRows(new Set(classScores.map(r => r.student_id)));
    }
    setSaving(false);
  };

  const txColumns = [1, 2, 3, 4, 5].map(i => ({
    title: <span style={{ color: '#A78BFA', fontWeight: 700 }}>TX{i}</span>,
    dataIndex: `tx${i}`,
    width: 80,
    align: 'center',
    render: (_, row) => (
      <ScoreInputCell
        value={localScores[row.student_id]?.[`tx${i}`] ?? null}
        onChange={(v) => updateLocal(row.student_id, `tx${i}`, v)}
      />
    ),
  }));

  const columns = [
    {
      title: '#', width: 50, align: 'center',
      render: (_, __, idx) => <Text style={{ color: '#6B7280' }}>{idx + 1}</Text>,
    },
    {
      title: 'Họ và tên', dataIndex: 'full_name', width: 180,
      render: (name, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {savedRows.has(row.student_id) && <CheckCircleOutlined style={{ color: '#10B981' }} />}
          <div>
            <div style={{ color: '#111827', fontWeight: 600 }}>{name}</div>
            <div style={{ color: '#6B7280', fontSize: 11 }}>{row.student_code}</div>
          </div>
        </div>
      ),
    },
    ...txColumns,
    {
      title: <span style={{ color: '#60A5FA', fontWeight: 700 }}>TB-TX</span>,
      width: 80, align: 'center',
      render: (_, row) => {
        const txVals = [1,2,3,4,5].map(i => localScores[row.student_id]?.[`tx${i}`]).filter(v => v !== null && v !== undefined);
        const avg = txVals.length ? (txVals.reduce((a,b)=>a+b,0)/txVals.length).toFixed(2) : '—';
        return <Text style={{ color: '#60A5FA', fontWeight: 600 }}>{avg}</Text>;
      },
    },
    {
      title: <span style={{ color: '#F59E0B', fontWeight: 700 }}>GK</span>,
      dataIndex: 'gk', width: 80, align: 'center',
      render: (_, row) => (
        <ScoreInputCell
          value={localScores[row.student_id]?.gk ?? null}
          onChange={(v) => updateLocal(row.student_id, 'gk', v)}
        />
      ),
    },
    {
      title: <span style={{ color: '#F87171', fontWeight: 700 }}>CK</span>,
      dataIndex: 'ck', width: 80, align: 'center',
      render: (_, row) => (
        <ScoreInputCell
          value={localScores[row.student_id]?.ck ?? null}
          onChange={(v) => updateLocal(row.student_id, 'ck', v)}
        />
      ),
    },
    {
      title: <span style={{ color: '#10B981', fontWeight: 700 }}>ĐTB</span>,
      width: 80, align: 'center',
      render: (_, row) => {
        const dtb = calcDTB(row);
        return dtb !== null
          ? <Text strong style={getScoreStyle(dtb)}>{dtb}</Text>
          : <Text style={{ color: '#6B7280' }}>—</Text>;
      },
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>📊 Nhập điểm học sinh</h1>
        <p>Bảng nhập điểm Excel-like – chỉnh sửa trực tiếp và lưu hàng loạt</p>
      </div>

      {/* Filters */}
      <div style={{
        background: '#fff', border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 12, padding: '16px 20px', marginBottom: 20,
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
      }}>
        <Select
          placeholder="🏫 Chọn lớp" style={{ width: 220 }}
          value={classInstanceId}
          onChange={v => { setClassInstanceId(v); setSubjectId(null); setLocalScores({}); }}
          options={myClasses.map(c => ({ value: c.class_instance_id, label: `${c.grade}${c.class?.class_code} – ${c.year?.name}` }))}
          showSearch filterOption={(i, o) => o.label.toLowerCase().includes(i.toLowerCase())}
        />
        <Select
          placeholder="📚 Chọn môn" style={{ width: 180 }}
          value={subjectId}
          disabled={!classInstanceId}
          onChange={setSubjectId}
          options={mySubjects.map(a => ({ value: a.subject_id, label: a.subject?.subject_name }))}
        />
        <Select
          value={semester}
          onChange={setSemester}
          style={{ width: 140 }}
          options={[{ value: 1, label: 'Học kỳ I' }, { value: 2, label: 'Học kỳ II' }]}
        />
        <Button icon={<ReloadOutlined />} onClick={() => refetch()} style={{ borderRadius: 8 }}>Làm mới</Button>

        {classScores.length > 0 && (
          <Button
            type="primary" icon={<SaveOutlined />}
            loading={saving || batchMut.isPending}
            onClick={handleSaveAll}
            style={{ marginLeft: 'auto', borderRadius: 8, fontWeight: 700, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
          >
            💾 Lưu tất cả điểm
          </Button>
        )}
      </div>

      {!classInstanceId || !subjectId ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>
          <div style={{ fontSize: 48 }}>📋</div>
          <div style={{ marginTop: 12, fontSize: 16 }}>Chọn lớp và môn học để bắt đầu nhập điểm</div>
        </div>
      ) : scoresLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : classScores.length === 0 ? (
        <Alert message="Lớp này không có học sinh" type="info" showIcon />
      ) : (
        <>
          <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            <Text style={{ color: '#94A3B8' }}>
              {classScores.length} học sinh · Học kỳ {semester}
            </Text>
            <Text style={{ color: '#6B7280', fontSize: 12 }}>
              Công thức: ĐTB = (TB-TX + 2×GK + 3×CK) / 6
            </Text>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <span style={{ color: '#10B981', fontSize: 12 }}>● ≥ 8 xuất sắc</span>
              <span style={{ color: '#F59E0B', fontSize: 12 }}>● 5-7.9 trung bình</span>
              <span style={{ color: '#EF4444', fontSize: 12 }}>● &lt; 5 yếu</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <Table
              dataSource={classScores}
              columns={columns}
              rowKey="student_id"
              pagination={false}
              size="middle"
              rowClassName={(row) => savedRows.has(row.student_id) ? 'saved-row' : ''}
              style={{ minWidth: 900 }}
            />
          </div>

          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Button
              type="primary" size="large" icon={<SaveOutlined />}
              loading={saving || batchMut.isPending}
              onClick={handleSaveAll}
              style={{ borderRadius: 10, fontWeight: 700, minWidth: 160 }}
            >
              💾 Lưu tất cả điểm
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
