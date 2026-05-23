import React, { useState } from 'react';
import { Select, Typography, Spin, Alert } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../../api';
import ScoreReportPage from '../student/ScoreReportPage'; // Reuse same component but with studentId param

const { Text } = Typography;

export default function ChildReportPage() {
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [semester, setSemester] = useState(1);

  const { data: children = [], isLoading: childLoading } = useQuery({
    queryKey: ['my-children'],
    queryFn: () => studentApi.getMyChildren().then(r => r.data.data),
  });

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['child-report', selectedStudentId, semester],
    queryFn: () => studentApi.getReport({ semester, studentId: selectedStudentId }).then(r => r.data.data),
    enabled: !!selectedStudentId,
  });

  if (childLoading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

  return (
    <div>
      <div className="page-header">
        <h1>👨‍👧 Xem bảng điểm con</h1>
        <p>Theo dõi kết quả học tập của con em</p>
      </div>

      {children.length === 0 ? (
        <Alert message="Chưa có thông tin con em được liên kết với tài khoản này" type="info" showIcon />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <Select
              placeholder="Chọn con em"
              style={{ width: 250 }}
              value={selectedStudentId}
              onChange={setSelectedStudentId}
              options={children.map(c => ({
                value: c.student_id,
                label: `${c.user?.full_name} (${c.student_code || 'HS'})`,
              }))}
            />
            <Select
              value={semester}
              onChange={setSemester}
              style={{ width: 160 }}
              options={[{ value: 1, label: 'Học kỳ I' }, { value: 2, label: 'Học kỳ II' }]}
            />
          </div>

          {!selectedStudentId ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>
              <div style={{ fontSize: 48 }}>👶</div>
              <div style={{ marginTop: 12 }}>Chọn con em để xem bảng điểm</div>
            </div>
          ) : isLoading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
          ) : error ? (
            <Alert message="Không thể tải bảng điểm" type="error" showIcon />
          ) : (
            <ChildScoreTable report={report} semester={semester} />
          )}
        </>
      )}
    </div>
  );
}

// Inline child score table (reuses same pattern as ScoreReportPage)
function ChildScoreTable({ report, semester }) {
  // Import components inline
  const ScoreCell = ({ value }) => {
    if (value === null || value === undefined) return <Text style={{ color: '#475569' }}>—</Text>;
    let color = '#111827';
    if (value >= 8) color = '#10B981';
    else if (value < 5) color = '#EF4444';
    return <span style={{ color, fontWeight: value >= 8 || value < 5 ? 700 : 400 }}>{value.toFixed(1)}</span>;
  };

  const { Table } = require('antd');

  const columns = [
    { title: 'Môn học', dataIndex: 'subject_name', render: v => <Text strong style={{ color: '#111827' }}>{v}</Text> },
    ...[1,2,3,4,5].map(i => ({
      title: <span style={{ color: '#A78BFA' }}>TX{i}</span>,
      dataIndex: `tx${i}`, width: 70, align: 'center',
      render: v => <ScoreCell value={v} />,
    })),
    { title: <span style={{ color: '#F59E0B' }}>GK</span>, dataIndex: 'gk', width: 70, align: 'center', render: v => <ScoreCell value={v} /> },
    { title: <span style={{ color: '#F87171' }}>CK</span>, dataIndex: 'ck', width: 70, align: 'center', render: v => <ScoreCell value={v} /> },
    {
      title: <span style={{ color: '#10B981', fontWeight: 800 }}>ĐTB</span>,
      dataIndex: 'dtb', width: 90, align: 'center',
      render: v => v != null ? <strong style={{ color: v >= 8 ? '#10B981' : v < 5 ? '#EF4444' : '#F59E0B', fontSize: 14 }}>{v.toFixed(2)}</strong> : <Text style={{ color: '#475569' }}>—</Text>,
    },
  ];

  return (
    <div>
      {report?.student && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { label: 'Họ tên', value: report.student.full_name, color: '#4F46E5' },
            { label: 'Lớp', value: report.student.class, color: '#60A5FA' },
            { label: 'Năm học', value: report.student.year, color: '#34D399' },
            { label: 'ĐTB tổng kết', value: report.overall_avg?.toFixed(2), color: report.overall_avg >= 8 ? '#10B981' : report.overall_avg < 5 ? '#EF4444' : '#F59E0B' },
          ].map(item => (
            <div key={item.label} style={{ background: '#fff', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '10px 16px', minWidth: 140 }}>
              <div style={{ color: '#6B7280', fontSize: 11 }}>{item.label}</div>
              <div style={{ color: item.color, fontWeight: 700, fontSize: 14 }}>{item.value || '—'}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <Table dataSource={report?.subjects || []} columns={columns} rowKey="subject_id" pagination={false} size="middle" />
      </div>
    </div>
  );
}
