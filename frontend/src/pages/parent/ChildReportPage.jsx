import React, { useState, useEffect } from 'react';
import { Select, Button, Typography, Spin, Alert, Table } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { studentApi, classesApi } from '../../api';

const { Text } = Typography;

export default function ChildReportPage() {
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [semester, setSemester] = useState(1);
  const [yearId, setYearId] = useState(null);

  const { data: children = [], isLoading: childLoading } = useQuery({
    queryKey: ['my-children'],
    queryFn: () => studentApi.getMyChildren().then(r => r.data.data),
  });

  const { data: years = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => classesApi.getYears().then(r => r.data.data),
  });

  // Auto-select the latest year
  useEffect(() => {
    if (years.length > 0 && !yearId) {
      setYearId(years[0].year_id); // years sorted desc by start_date
    }
  }, [years, yearId]);

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['child-report', selectedStudentId, semester, yearId],
    queryFn: () => studentApi.getReport({ semester, studentId: selectedStudentId, yearId }).then(r => r.data.data),
    enabled: !!selectedStudentId && !!yearId,
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
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
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
              placeholder="Năm học"
              style={{ width: 160 }}
              value={yearId}
              onChange={setYearId}
              options={years.map(y => ({ value: y.year_id, label: y.name }))}
            />
            <Select
              value={semester}
              onChange={setSemester}
              style={{ width: 140 }}
              options={[{ value: 1, label: 'Học kỳ I' }, { value: 2, label: 'Học kỳ II' }]}
            />
          </div>

          {!selectedStudentId ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>
              <div style={{ fontSize: 48 }}>🧑‍🎓</div>
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

// Score display table
function ChildScoreTable({ report, semester }) {
  const ScoreCell = ({ value }) => {
    if (value === null || value === undefined) return <Text style={{ color: '#475569' }}>—</Text>;
    let color = '#111827';
    if (value >= 8) color = '#10B981';
    else if (value < 5) color = '#EF4444';
    return <span style={{ color, fontWeight: value >= 8 || value < 5 ? 700 : 400 }}>{value.toFixed(1)}</span>;
  };

  const handleExportCSV = () => {
    if (!report || !report.subjects || report.subjects.length === 0) return;
    const headers = ['Môn học', 'TX1', 'TX2', 'TX3', 'TX4', 'TX5', 'TB-TX', 'GK', 'CK', 'ĐTB Môn'];
    const rows = report.subjects.map(s => [
      s.subject_name || '',
      s.tx1 ?? '',
      s.tx2 ?? '',
      s.tx3 ?? '',
      s.tx4 ?? '',
      s.tx5 ?? '',
      s.tx_avg ?? '',
      s.gk ?? '',
      s.ck ?? '',
      s.dtb ?? ''
    ]);
    rows.push([
      'ĐTB TỔNG KẾT HỌC KỲ',
      '', '', '', '', '', '', '', '',
      report.overall_avg ?? ''
    ]);
    rows.push([
      'XẾP LOẠI HỌC LỰC',
      '', '', '', '', '', '', '', '',
      report.academic_classification ?? ''
    ]);
    rows.push([
      'XẾP LOẠI HẠNH KIỂM',
      '', '', '', '', '', '', '', '',
      report.conduct_classification ?? ''
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bang_Diem_${report.student.full_name}_HK${semester}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    { title: 'Môn học', dataIndex: 'subject_name', render: v => <Text strong style={{ color: '#111827' }}>{v}</Text> },
    ...[1, 2, 3, 4, 5].map(i => ({
      title: <span style={{ color: '#A78BFA' }}>TX{i}</span>,
      dataIndex: `tx${i}`, width: 70, align: 'center',
      render: v => <ScoreCell value={v} />,
    })),
    { title: <span style={{ color: '#F59E0B' }}>GK</span>, dataIndex: 'gk', width: 70, align: 'center', render: v => <ScoreCell value={v} /> },
    { title: <span style={{ color: '#F87171' }}>CK</span>, dataIndex: 'ck', width: 70, align: 'center', render: v => <ScoreCell value={v} /> },
    {
      title: <span style={{ color: '#10B981', fontWeight: 800 }}>ĐTB</span>,
      dataIndex: 'dtb', width: 90, align: 'center',
      render: v => v != null
        ? <strong style={{ color: v >= 8 ? '#10B981' : v < 5 ? '#EF4444' : '#F59E0B', fontSize: 14 }}>{v.toFixed(2)}</strong>
        : <Text style={{ color: '#475569' }}>—</Text>,
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
            {
              label: 'ĐTB tổng kết',
              value: report.overall_avg?.toFixed(2),
              color: report.overall_avg >= 8 ? '#10B981' : report.overall_avg < 5 ? '#EF4444' : '#F59E0B',
            },
            { label: 'Học lực', value: report.academic_classification, color: '#F59E0B' },
            { label: 'Hạnh kiểm', value: report.conduct_classification, color: '#EC4899' },
          ].map(item => (
            <div key={item.label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 16px', minWidth: 140 }}>
              <div style={{ color: '#6B7280', fontSize: 11 }}>{item.label}</div>
              <div style={{ color: item.color, fontWeight: 700, fontSize: 14 }}>{item.value || '—'}</div>
            </div>
          ))}
        </div>
      )}

      {report?.subjects?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Button
            onClick={handleExportCSV}
            style={{ borderRadius: 8, borderColor: '#10B981', color: '#10B981', fontWeight: 600 }}
          >
            📥 Tải bảng điểm con (CSV)
          </Button>
        </div>
      )}

      {(!report?.subjects || report.subjects.length === 0) ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
          <div>Chưa có điểm cho năm học và học kỳ này</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <Table dataSource={report.subjects} columns={columns} rowKey="subject_id" pagination={false} size="middle" />
        </div>
      )}
    </div>
  );
}
