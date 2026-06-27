import React, { useState } from 'react';
import { Form, Input, Button, Typography, Alert } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';

const { Title, Text } = Typography;

const demoAccounts = [
  { label: 'Admin',      username: 'admin',          password: 'Admin@123',   color: '#7C3AED', bg: '#F5F3FF' },
  { label: 'Hiệu trưởng', username: 'gv_hieutruong',  password: 'Teacher@123', color: '#B91C1C', bg: '#FEF2F2' },
  { label: 'Tổ trưởng Toán', username: 'gv_chunhiem', password: 'Teacher@123', color: '#0F766E', bg: '#F0FDFA' },
  { label: 'Học sinh 1', username: 'hocsinh1',       password: 'Student@123', color: '#4F46E5', bg: '#EEF2FF' },
  { label: 'GV bộ môn thường', username: 'gv_bomon', password: 'Teacher@123', color: '#10B981', bg: '#ECFDF5' },
  { label: 'Phụ huynh',  username: 'phuhuynh1',      password: 'Parent@123',  color: '#2563EB', bg: '#EFF6FF' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form] = Form.useForm();
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: (data) => authApi.login(data),
    onSuccess: (res) => {
      const { token, user } = res.data.data;
      login(token, user);
      navigate('/');
    },
    onError: (err) => setError(err.response?.data?.message || 'Đăng nhập thất bại'),
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F8FAFF 0%, #EEF2FF 50%, #F5F3FF 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative shapes */}
      {[
        { top: '-80px', right: '-80px', size: 280, color: '#4F46E5' },
        { bottom: '-60px', left: '-60px', size: 220, color: '#7C3AED' },
        { top: '40%', left: '5%', size: 120, color: '#6366F1' },
      ].map((orb, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: orb.top, bottom: orb.bottom,
          left: orb.left, right: orb.right,
          width: orb.size, height: orb.size,
          borderRadius: '50%',
          background: orb.color, opacity: 0.06,
          filter: 'blur(50px)', pointerEvents: 'none',
        }} />
      ))}

      <div style={{ zIndex: 1, width: '100%', maxWidth: 440, padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 70, height: 70, borderRadius: 20, margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34, boxShadow: '0 12px 32px rgba(79,70,229,0.3)',
          }}>🎓</div>
          <Title level={2} style={{ color: '#111827', margin: 0, fontWeight: 800 }}>EduManager</Title>
          <Text style={{ color: '#6B7280', fontSize: 14 }}>Hệ thống Quản lý Học sinh THPT</Text>
        </div>

        {/* Login card */}
        <div style={{
          background: '#fff',
          borderRadius: 20, padding: '32px',
          boxShadow: '0 10px 40px rgba(79,70,229,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #E5E7EB',
        }}>
          <Title level={4} style={{ color: '#111827', marginBottom: 24, textAlign: 'center', fontWeight: 700 }}>
            Đăng nhập hệ thống
          </Title>

          {error && (
            <Alert message={error} type="error" showIcon closable
              onClose={() => setError('')} style={{ marginBottom: 16, borderRadius: 10 }} />
          )}

          <Form form={form} layout="vertical" onFinish={loginMutation.mutate} size="large">
            <Form.Item name="username" label="Tên đăng nhập"
              rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}>
              <Input
                prefix={<UserOutlined style={{ color: '#4F46E5' }} />}
                placeholder="Nhập tên đăng nhập" style={{ height: 46 }}
              />
            </Form.Item>

            <Form.Item name="password" label="Mật khẩu"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}>
              <Input.Password
                prefix={<LockOutlined style={{ color: '#4F46E5' }} />}
                placeholder="Nhập mật khẩu" style={{ height: 46 }}
              />
            </Form.Item>

            <Button
              type="primary" htmlType="submit" block size="large"
              loading={loginMutation.isPending} icon={<LoginOutlined />}
              style={{ height: 48, borderRadius: 12, fontSize: 15, fontWeight: 700 }}
            >
              Đăng nhập
            </Button>
          </Form>
        </div>

        {/* Demo accounts */}
        <div style={{
          background: '#fff', border: '1px solid #E5E7EB',
          borderRadius: 16, padding: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {demoAccounts.map((acc) => (
              <button
                key={acc.username}
                onClick={() => form.setFieldsValue({ username: acc.username, password: acc.password })}
                style={{
                  background: acc.bg, border: `1.5px solid ${acc.color}30`,
                  borderRadius: 10, padding: '8px 10px', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = acc.color; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = `${acc.color}30`; }}
              >
                <div style={{ color: acc.color, fontWeight: 700, fontSize: 12 }}>{acc.label}</div>
                <div style={{ color: '#9CA3AF', fontSize: 11 }}>{acc.username}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
