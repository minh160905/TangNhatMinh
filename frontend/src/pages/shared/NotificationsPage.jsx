import React from 'react';
import { Typography, Button, Empty, Spin } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../api';
import dayjs from 'dayjs';
import { App } from 'antd';

const { Text, Paragraph } = Typography;

export default function NotificationsPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();

  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationsApi.getAll().then(r => r.data.data),
  });

  const markRead = useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => { qc.invalidateQueries(['notifications']); message.success('Đã đọc tất cả'); },
  });

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>🔔 Thông báo</h1>
          <p>{unread > 0 ? `${unread} thông báo chưa đọc` : 'Tất cả đã đọc'}</p>
        </div>
        {unread > 0 && (
          <Button icon={<CheckOutlined />} type="primary" ghost onClick={() => markAllRead.mutate()}
            style={{ borderRadius: 8, fontWeight: 600 }}>
            Đọc tất cả
          </Button>
        )}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : notifs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Empty
            image={<BellOutlined style={{ fontSize: 52, color: '#D1D5DB' }} />}
            description={<span style={{ color: '#9CA3AF' }}>Chưa có thông báo nào</span>}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifs.map(item => (
            <div
              key={item.id}
              onClick={() => !item.is_read && markRead.mutate(item.notification_id)}
              style={{
                background: !item.is_read ? '#EEF2FF' : '#fff',
                border: `1px solid ${!item.is_read ? '#C7D2FE' : '#E5E7EB'}`,
                borderRadius: 14, padding: '16px 20px',
                cursor: !item.is_read ? 'pointer' : 'default',
                transition: 'all 0.2s',
                position: 'relative',
                boxShadow: !item.is_read ? '0 2px 8px rgba(79,70,229,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => { if (!item.is_read) e.currentTarget.style.background = '#E0E7FF'; }}
              onMouseLeave={e => { if (!item.is_read) e.currentTarget.style.background = '#EEF2FF'; }}
            >
              {!item.is_read && (
                <div style={{
                  position: 'absolute', top: 16, right: 16,
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#4F46E5', boxShadow: '0 0 0 3px rgba(79,70,229,0.15)',
                }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text strong style={{ color: '#111827', fontSize: 15 }}>{item.notification?.title}</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                  {dayjs(item.notification?.created_at).format('DD/MM/YYYY HH:mm')}
                </Text>
              </div>
              <Paragraph style={{ color: '#4B5563', margin: '0 0 8px', lineHeight: 1.6 }}>
                {item.notification?.content}
              </Paragraph>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                📨 Từ: {item.notification?.creator?.full_name}
              </Text>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
