import React, { useRef, useEffect } from 'react';
import { Badge, Popover, List, Button, Empty, Typography, Space, Tag } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../../api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

export default function NotificationBell() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount().then(r => r.data.data),
    refetchInterval: 30000, // poll every 30s
  });

  const { data: notifs } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationsApi.getAll().then(r => r.data.data),
    refetchInterval: 30000,
  });

  const markRead = useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries(['notifications']);
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const unreadCount = unreadData?.count || 0;
  const recentNotifs = (notifs || []).slice(0, 8);

  const content = (
    <div style={{ width: 360 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 0 12px', borderBottom: '1px solid #E5E7EB',
      }}>
        <Text strong style={{ color: '#111827', fontSize: 15 }}>Thông báo</Text>
        {unreadCount > 0 && (
          <Button size="small" type="link" icon={<CheckOutlined />}
            onClick={() => markAllRead.mutate()}
            style={{ color: '#4F46E5', fontSize: 12 }}>
            Đọc tất cả
          </Button>
        )}
      </div>

      {recentNotifs.length === 0 ? (
        <Empty description={<span style={{ color: '#9CA3AF' }}>Không có thông báo</span>} style={{ padding: '20px 0' }} />
      ) : (
        <List
          dataSource={recentNotifs}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: '10px 0',
                borderBottom: '1px solid #F3F4F6',
                cursor: 'pointer',
                background: !item.is_read ? '#EEF2FF' : 'transparent',
                borderRadius: 8, paddingInline: 8, marginBottom: 2,
                transition: 'background 0.2s',
              }}
              onClick={() => { if (!item.is_read) markRead.mutate(item.notification_id); }}
            >
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text strong style={{ color: '#111827', fontSize: 13 }}>{item.notification?.title}</Text>
                  {!item.is_read && <Tag color="geekblue" style={{ fontSize: 10 }}>Mới</Tag>}
                </div>
                <Text style={{ color: '#6B7280', fontSize: 12, display: 'block', marginBottom: 4 }}>
                  {item.notification?.content?.slice(0, 80)}...
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 11 }}>
                  {item.notification?.creator?.full_name} · {dayjs(item.notification?.created_at).fromNow()}
                </Text>
              </div>
            </List.Item>
          )}
        />
      )}

      <div style={{ paddingTop: 12, textAlign: 'center' }}>
        <Button type="link" size="small" onClick={() => navigate('/notifications')}
          style={{ color: '#4F46E5', fontWeight: 600 }}>
          Xem tất cả thông báo →
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      content={content} trigger="click" placement="bottomRight"
      overlayStyle={{ zIndex: 1001 }}
      overlayInnerStyle={{
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 14,
        padding: '12px 16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
      }}
    >
      <Badge count={unreadCount} overflowCount={99} size="small">
        <div className="notification-bell" style={{
          width: 36, height: 36, borderRadius: 8,
          background: '#EEF2FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: '#4F46E5',
          transition: 'all 0.2s', cursor: 'pointer',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#E0E7FF'}
          onMouseLeave={e => e.currentTarget.style.background = '#EEF2FF'}
        >
          <BellOutlined />
        </div>
      </Badge>
    </Popover>
  );
}
