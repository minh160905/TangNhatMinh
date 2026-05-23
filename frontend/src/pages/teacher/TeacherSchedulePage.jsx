import React, { useState } from 'react';
import { Typography, Tag, Spin, Tabs, Empty } from 'antd';
import { CalendarOutlined, TeamOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { classesApi, schedulesApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import TimetableGrid from '../../components/common/TimetableGrid';

const { Text } = Typography;

export default function TeacherSchedulePage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('my-schedule');

  // Fetch teacher's own teaching schedule
  const { data: schedules = [], isLoading: isLoadingMySchedule } = useQuery({
    queryKey: ['my-schedule'],
    queryFn: () => schedulesApi.getMySchedule().then(r => r.data.data),
  });

  // Fetch homeroom class information
  const { data: homeroomClass, isLoading: isLoadingHomeroomClass } = useQuery({
    queryKey: ['my-homeroom-class'],
    queryFn: () => classesApi.getMyHomeroomClass().then(r => r.data.data),
  });

  const homeroomClassId = homeroomClass?.class_instance_id;

  // Fetch schedule of the homeroom class
  const { data: homeroomSchedules = [], isLoading: isLoadingHomeroomSchedules } = useQuery({
    queryKey: ['class-schedule', homeroomClassId],
    queryFn: () => schedulesApi.getByClass(homeroomClassId).then(r => r.data.data),
    enabled: !!homeroomClassId,
  });

  // Group by class for stats
  const classSet = new Set(schedules.map(s => s.class_instance_id));
  const subjectSet = new Set(schedules.map(s => s.subject_id));

  return (
    <div>
      <div className="page-header">
        <h1>📅 Thời khoá biểu</h1>
        <p>Lịch dạy của bạn và thời khóa biểu của lớp bạn chủ nhiệm</p>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '16px 20px' }}
        items={[
          {
            key: 'my-schedule',
            label: (
              <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarOutlined /> Lịch dạy của tôi
              </span>
            ),
            children: (
              <div>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Tổng tiết dạy/tuần', value: schedules.length, color: '#4F46E5', bg: 'rgba(79,70,229,0.1)' },
                    { label: 'Số lớp dạy', value: classSet.size, color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
                    { label: 'Số môn dạy', value: subjectSet.size, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
                  ].map((s, i) => (
                    <div key={i} style={{
                      background: s.bg, border: `1px solid ${s.color}30`,
                      borderRadius: 12, padding: '14px 18px', textAlign: 'center',
                    }}>
                      <div style={{ color: s.color, fontSize: 28, fontWeight: 800 }}>{s.value}</div>
                      <div style={{ color: '#6B7280', fontSize: 12 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16 }}>
                  <TimetableGrid
                    schedules={schedules} loading={isLoadingMySchedule}
                    showTeacher={false} showClass
                    highlightTeacherId={user?.userId}
                  />
                </div>
              </div>
            )
          },
          {
            key: 'homeroom-schedule',
            label: (
              <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TeamOutlined /> Thời khóa biểu lớp CN
                {homeroomClass && (
                  <Tag color="purple" style={{ margin: 0, fontSize: 10, borderRadius: 10, marginLeft: 4 }}>
                    {homeroomClass.grade}{homeroomClass.class?.class_code}
                  </Tag>
                )}
              </span>
            ),
            children: isLoadingHomeroomClass ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
            ) : homeroomClass ? (
              <div>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Lớp chủ nhiệm', value: `${homeroomClass.grade}${homeroomClass.class?.class_code}`, color: '#4F46E5', bg: 'rgba(79,70,229,0.1)' },
                    { label: 'Sĩ số học sinh', value: `${homeroomClass._count?.students || 0} HS`, color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
                    { label: 'Số tiết học/tuần', value: `${homeroomSchedules.length} tiết`, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
                  ].map((s, i) => (
                    <div key={i} style={{
                      background: s.bg, border: `1px solid ${s.color}30`,
                      borderRadius: 12, padding: '14px 18px', textAlign: 'center',
                    }}>
                      <div style={{ color: s.color, fontSize: 26, fontWeight: 800 }}>{s.value}</div>
                      <div style={{ color: '#6B7280', fontSize: 12 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16 }}>
                  <TimetableGrid
                    schedules={homeroomSchedules} loading={isLoadingHomeroomSchedules}
                    showTeacher={true} showClass={false}
                  />
                </div>
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <div>
                      <p style={{ color: '#4B5563', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Bạn chưa được phân công lớp chủ nhiệm</p>
                      <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>Chức năng xem thời khóa biểu lớp chủ nhiệm chỉ khả dụng đối với GVCN.</p>
                    </div>
                  }
                />
              </div>
            )
          }
        ]}
      />
    </div>
  );
}

