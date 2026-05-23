import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Space, Typography, Badge } from 'antd';
import {
  UserOutlined, TeamOutlined, BookOutlined, SolutionOutlined,
  FileTextOutlined, TrophyOutlined, BellOutlined, LogoutOutlined,
  BarChartOutlined, CommentOutlined, SendOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, CalendarOutlined,
  SettingOutlined, RightOutlined, HomeOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api';
import NotificationBell from '../common/NotificationBell';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const MENUS = {
  ADMIN: [
    { key: '/admin/users',       icon: <TeamOutlined />,      label: 'Quản lý người dùng' },
    { key: '/admin/classes',     icon: <BookOutlined />,      label: 'Quản lý lớp học' },
    { key: '/admin/subjects',    icon: <FileTextOutlined />,  label: 'Quản lý môn học' },
    { key: '/admin/assignments', icon: <SolutionOutlined />,  label: 'Phân công GV' },
    { key: '/admin/schedule',    icon: <CalendarOutlined />,  label: 'Thời khoá biểu' },
  ],
  TEACHER: [
    { key: '/teacher/my-class',      icon: <HomeOutlined />,        label: 'Lớp chủ nhiệm' },
    { key: '/teacher/scores',        icon: <BarChartOutlined />, label: 'Nhập điểm' },
    { key: '/teacher/achievements',  icon: <TrophyOutlined />,   label: 'Duyệt thành tích' },
    { key: '/teacher/comments',      icon: <CommentOutlined />,  label: 'Nhận xét học sinh' },
    { key: '/teacher/notifications', icon: <SendOutlined />,     label: 'Gửi thông báo' },
    { key: '/teacher/schedule',      icon: <CalendarOutlined />, label: 'Thời khoá biểu' },
  ],
  STUDENT: [
    { key: '/student/report',       icon: <BarChartOutlined />, label: 'Bảng điểm' },
    { key: '/student/achievements', icon: <TrophyOutlined />,   label: 'Thành tích' },
    { key: '/student/schedule',     icon: <CalendarOutlined />, label: 'Thời khoá biểu' },
  ],
  PARENT: [
    { key: '/parent/report',   icon: <BarChartOutlined />, label: 'Xem điểm con' },
    { key: '/parent/schedule', icon: <CalendarOutlined />, label: 'Thời khoá biểu' },
  ],
};

const ROLE_CONFIG = {
  ADMIN:   { label: 'Quản trị viên', color: '#7C3AED', bg: '#F5F3FF', dot: '#7C3AED' },
  TEACHER: { label: 'Giáo viên',     color: '#4F46E5', bg: '#EEF2FF', dot: '#4F46E5' },
  STUDENT: { label: 'Học sinh',      color: '#059669', bg: '#ECFDF5', dot: '#059669' },
  PARENT:  { label: 'Phụ huynh',     color: '#2563EB', bg: '#EFF6FF', dot: '#2563EB' },
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role;
  const roleCfg = ROLE_CONFIG[role] || ROLE_CONFIG.STUDENT;

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    navigate('/login');
  };

  const userMenu = [
    ...(role !== 'ADMIN' ? [{
      key: 'notifications', icon: <BellOutlined />,
      label: 'Thông báo',
      onClick: () => navigate('/notifications'),
    }] : []),
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true, onClick: handleLogout },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <Sider
        collapsible collapsed={collapsed} onCollapse={setCollapsed}
        width={240} trigger={null}
        style={{
          background: '#fff',
          borderRight: '1px solid #E5E7EB',
          position: 'fixed', height: '100vh', left: 0, top: 0, zIndex: 100,
          boxShadow: '1px 0 6px rgba(0,0,0,0.05)',
        }}
      >
        {/* Logo */}
        <div style={{
          padding: '18px 16px',
          borderBottom: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>🎓</div>
          {!collapsed && (
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>EduManager</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>THPT System</div>
            </div>
          )}
        </div>

        {/* Role badge */}
        {!collapsed && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: roleCfg.bg, borderRadius: 20, padding: '4px 12px',
              border: `1px solid ${roleCfg.color}30`,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: roleCfg.dot }} />
              <span style={{ color: roleCfg.color, fontSize: 12, fontWeight: 700 }}>{roleCfg.label}</span>
            </div>
          </div>
        )}

        {/* Menu */}
        <div style={{ padding: '8px 0', flex: 1 }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={MENUS[role] || []}
            onClick={({ key }) => navigate(key)}
            style={{ background: 'transparent', border: 'none' }}
          />
        </div>

        {/* Notifications (non-admin) */}
        {role !== 'ADMIN' && (
          <div style={{ borderTop: '1px solid #F3F4F6', padding: '8px 0' }}>
            <Menu
              mode="inline"
              selectedKeys={[location.pathname]}
              items={[{ key: '/notifications', icon: <BellOutlined />, label: 'Thông báo' }]}
              onClick={() => navigate('/notifications')}
              style={{ background: 'transparent', border: 'none' }}
            />
          </div>
        )}
      </Sider>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <Layout style={{
        marginLeft: collapsed ? 80 : 240, transition: 'margin 0.2s',
        background: '#F8FAFF',
      }}>
        {/* Header */}
        <Header style={{
          position: 'sticky', top: 0, zIndex: 99,
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #E5E7EB',
          height: 60,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, color: '#6B7280',
              display: 'flex', alignItems: 'center', padding: 8, borderRadius: 8,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>

          <Space size={12} align="center">
            {role !== 'ADMIN' && <NotificationBell />}

            <Dropdown menu={{ items: userMenu }} placement="bottomRight" arrow>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer', padding: '6px 12px', borderRadius: 10,
                border: '1px solid #E5E7EB', background: '#fff',
                transition: 'all 0.15s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#4F46E5'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E7EB'}
              >
                <Avatar
                  size={32}
                  style={{
                    background: `linear-gradient(135deg, ${roleCfg.color}, ${roleCfg.dot}99)`,
                    fontWeight: 700, fontSize: 13,
                  }}
                >
                  {(user?.fullName || user?.username || '?')[0].toUpperCase()}
                </Avatar>
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ color: '#111827', fontWeight: 700, fontSize: 13 }}>
                    {user?.fullName || user?.username}
                  </div>
                  <div style={{ color: roleCfg.color, fontSize: 11, fontWeight: 600 }}>{roleCfg.label}</div>
                </div>
              </div>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: '24px', minHeight: 'calc(100vh - 60px)' }}>
          <div className="fade-in">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
