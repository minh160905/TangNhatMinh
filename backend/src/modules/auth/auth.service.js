const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');

const login = async (username, password) => {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: true },
  });

  if (!user) throw { statusCode: 401, message: 'Tên đăng nhập hoặc mật khẩu không đúng' };
  if (user.status === 'LOCKED') throw { statusCode: 403, message: 'Tài khoản đã bị khóa' };

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw { statusCode: 401, message: 'Tên đăng nhập hoặc mật khẩu không đúng' };

  const payload = {
    userId: user.user_id,
    username: user.username,
    role: user.role.role_name,
    fullName: user.full_name,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

  return {
    token,
    user: {
      userId: user.user_id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role.role_name,
    },
  };
};

const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    include: {
      role: true,
      student: { include: { class_instance: { include: { class: true, year: true } } } },
      parent: { include: { students: { include: { student: { include: { user: true, class_instance: { include: { class: true, year: true } } } } } } } },
    },
  });
  if (!user) throw { statusCode: 404, message: 'User not found' };
  return user;
};

module.exports = { login, getMe };
