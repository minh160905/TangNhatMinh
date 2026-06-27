import React, { useState } from 'react';
import { Typography, Tag, Select, Tabs, Modal, Avatar } from 'antd';
import { MailOutlined, PhoneOutlined, BookOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { schedulesApi } from '../../api';
import TimetableGrid from '../../components/common/TimetableGrid';

export default function ParentSchedulePage() {
  const [activeChild, setActiveChild] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState(null);

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
        <TimetableGrid
          schedules={schedules}
          loading={isLoading}
          showTeacher
          onLessonClick={setSelectedLesson}
        />
      </div>

      {/* Teacher details Modal */}
      <Modal
        title={
          <span style={{ fontSize: 16, fontWeight: 800, color: '#4F46E5' }}>
            📇 Thông tin giáo viên bộ môn
          </span>
        }
        open={!!selectedLesson}
        onCancel={() => setSelectedLesson(null)}
        footer={null}
        width={380}
        destroyOnClose
      >
        {selectedLesson && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <Avatar
              size={64}
              style={{
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                fontWeight: 700,
                fontSize: 24,
              }}
            >
              {(selectedLesson.teacher?.full_name || '?')[0].toUpperCase()}
            </Avatar>

            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
                {selectedLesson.teacher?.full_name}
              </div>
              <Tag color="blue" style={{ marginTop: 4, borderRadius: 6 }}>
                Giáo viên môn {selectedLesson.subject?.subject_name}
              </Tag>
            </div>

            <div style={{ width: '100%', background: '#F8FAFF', border: '1px solid #E0E7FF', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <BookOutlined style={{ color: '#4F46E5', fontSize: 16 }} />
                <div>
                  <div style={{ color: '#6B7280', fontSize: 11 }}>Môn học</div>
                  <div style={{ color: '#111827', fontWeight: 600, fontSize: 13 }}>
                    {selectedLesson.subject?.subject_name}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <MailOutlined style={{ color: '#4F46E5', fontSize: 16 }} />
                <div>
                  <div style={{ color: '#6B7280', fontSize: 11 }}>Email liên hệ</div>
                  <div style={{ color: '#111827', fontWeight: 600, fontSize: 13 }}>
                    {selectedLesson.teacher?.email || 'Chưa cập nhật'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PhoneOutlined style={{ color: '#4F46E5', fontSize: 16 }} />
                <div>
                  <div style={{ color: '#6B7280', fontSize: 11 }}>Số điện thoại</div>
                  <div style={{ color: '#111827', fontWeight: 600, fontSize: 13 }}>
                    {selectedLesson.teacher?.phone || 'Chưa cập nhật'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
