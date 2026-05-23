import React, { useState } from 'react';
import { Typography, Tag, Select, Tabs } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { schedulesApi } from '../../api';
import TimetableGrid from '../../components/common/TimetableGrid';

export default function ParentSchedulePage() {
  const [activeChild, setActiveChild] = useState(0);

  const { data: childrenData = [], isLoading } = useQuery({
    queryKey: ['parent-schedule'],
    queryFn: () => schedulesApi.getParentSchedule().then(r => r.data.data),
  });

  if (!isLoading && childrenData.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1>📅 Thời khoá biểu</h1>
        </div>
        <div style={{ color: '#6B7280', textAlign: 'center', padding: 60 }}>
          Chưa có thông tin lớp học của con.
        </div>
      </div>
    );
  }

  const currentChild = childrenData[activeChild];
  const schedules = currentChild?.schedules || [];
  const classInfo = schedules[0]?.class_instance;
  const classLabel = classInfo ? `Lớp ${classInfo.grade}${classInfo.class?.class_code} – ${classInfo.year?.name}` : '';

  const tabItems = childrenData.map((child, idx) => ({
    key: String(idx),
    label: (
      <span>
        👦 {child.child_name}
      </span>
    ),
  }));

  return (
    <div>
      <div className="page-header">
        <h1>📅 Thời khoá biểu</h1>
        <p>Lịch học của con em bạn</p>
      </div>

      {childrenData.length > 1 && (
        <Tabs
          items={tabItems}
          activeKey={String(activeChild)}
          onChange={(k) => setActiveChild(Number(k))}
          style={{ marginBottom: 16 }}
        />
      )}

      {classLabel && (
        <div style={{ marginBottom: 16 }}>
          <Tag color="blue" style={{ fontSize: 14, fontWeight: 700, borderRadius: 8, padding: '4px 14px' }}>
            {currentChild?.child_name}
          </Tag>
          <Tag color="purple" style={{ borderRadius: 8 }}>{classLabel}</Tag>
          <Tag color="default" style={{ borderRadius: 8 }}>{schedules.length} tiết/tuần</Tag>
        </div>
      )}

      <div style={{ background: 'rgba(30,27,75,0.4)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: 16 }}>
        <TimetableGrid schedules={schedules} loading={isLoading} showTeacher />
      </div>
    </div>
  );
}
