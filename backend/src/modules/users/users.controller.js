const usersService = require('./users.service');
const { success, created, error } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const users = await usersService.getAll(req.query);
    return success(res, users);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const user = await usersService.getById(req.params.id);
    return success(res, user);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const user = await usersService.create(req.body);
    return created(res, user, 'Tạo tài khoản thành công');
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const user = await usersService.update(req.params.id, req.body);
    return success(res, user, 'Cập nhật thành công');
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'LOCKED'].includes(status)) {
      return error(res, 'Status must be ACTIVE or LOCKED', 400);
    }
    const user = await usersService.updateStatus(req.params.id, status);
    return success(res, user, `Tài khoản đã được ${status === 'LOCKED' ? 'khóa' : 'kích hoạt'}`);
  } catch (err) { next(err); }
};

const getRoles = async (req, res, next) => {
  try {
    const roles = await usersService.getRoles();
    return success(res, roles);
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, updateStatus, getRoles };
