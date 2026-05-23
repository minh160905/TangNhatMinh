const { z } = require('zod');
const authService = require('./auth.service');
const { success, badRequest, error } = require('../../utils/response');

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data.username, data.password);
    return success(res, result, 'Đăng nhập thành công');
  } catch (err) {
    next(err);
  }
};

const logout = (req, res) => {
  return success(res, null, 'Đăng xuất thành công');
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.userId);
    return success(res, user);
  } catch (err) {
    next(err);
  }
};

module.exports = { login, logout, getMe };
