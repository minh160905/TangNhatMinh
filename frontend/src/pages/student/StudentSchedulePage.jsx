import React from 'react';
import { Typography, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { schedulesApi } from '../../api';
import TimetableGrid from '../../components/common/TimetableGrid';

export default function StudentSchedulePage() {
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['student-schedule'],
    queryFn: () => schedulesApi.getStudentSchedule().then(r => r.data.data),
  });

  const classInfo = schedules[0]?.class_instance;
  const classLabel = classInfo ? `Lớp ${classInfo.grade}${classInfo.class?.class_code} – ${classInfo.year?.name}` : '';

  return (
    <div>
      <div className="page-header">
        <h1>📅 Thời khoá biểu</h1>
        <p>Lịch học của lớp bạn trong tuần</p>
      </div>

      {classLabel && (
        <div style={{ marginBottom: 16 }}>
          <Tag color="purple" style={{ fontSize: 14, fontWeight: 700, borderRadius: 8, padding: '4px 14px' }}>
            {classLabel}
          </Tag>
          <Tag color="default" style={{ borderRadius: 8 }}>{schedules.length} tiết/tuần</Tag>
        </div>
      )}

      <div style={{ background: 'rgba(30,27,75,0.4)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: 16 }}>
        <TimetableGrid schedules={schedules} loading={isLoading} showTeacher />
      </div>
    </div>
  );
}
