const express = require('express');
const router = express.Router();
const svc = require('./departments.service');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { success, created } = require('../../utils/response');

router.use(authenticate);

// Lấy danh sách tất cả tổ chuyên môn (Hiệu trưởng, Admin, Tổ trưởng)
router.get('/', authorize('PRINCIPAL', 'ADMIN', 'HEAD_OF_DEPARTMENT'), async (req, res, next) => {
  try {
    success(res, await svc.getAll());
  } catch (e) {
    next(e);
  }
});

// Lấy tổ chuyên môn của bản thân (Tổ trưởng, Giáo viên)
router.get('/my-department', authorize('HEAD_OF_DEPARTMENT', 'TEACHER'), async (req, res, next) => {
  try {
    success(res, await svc.getMyDepartment(req.user.userId));
  } catch (e) {
    next(e);
  }
});

// Bổ nhiệm tổ trưởng tổ chuyên môn (Chỉ Hiệu trưởng)
router.post('/:id/head', authorize('PRINCIPAL'), async (req, res, next) => {
  try {
    const { teacher_id } = req.body;
    success(res, await svc.assignHead(req.params.id, teacher_id), 'Đã bổ nhiệm tổ trưởng chuyên môn');
  } catch (e) {
    next(e);
  }
});

// Thêm giáo viên vào tổ (Chỉ Hiệu trưởng)
router.post('/:id/members', authorize('PRINCIPAL'), async (req, res, next) => {
  try {
    const { teacher_id } = req.body;
    created(res, await svc.addMember(req.params.id, teacher_id), 'Đã thêm giáo viên vào tổ chuyên môn');
  } catch (e) {
    next(e);
  }
});

// Xóa giáo viên khỏi tổ (Chỉ Hiệu trưởng)
router.delete('/:id/members/:teacherId', authorize('PRINCIPAL'), async (req, res, next) => {
  try {
    success(res, await svc.removeMember(req.params.id, req.params.teacherId), 'Đã xóa giáo viên khỏi tổ chuyên môn');
  } catch (e) {
    next(e);
  }
});

module.exports = router;
