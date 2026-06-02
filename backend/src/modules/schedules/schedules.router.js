const express = require('express');
const router = express.Router();
const svc = require('./schedules.service');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { success, created } = require('../../utils/response');

router.use(authenticate);

// Lấy TKB theo lớp (tất cả role đều dùng được)
router.get('/class/:classInstanceId', async (req, res, next) => {
  try { success(res, await svc.getByClass(req.params.classInstanceId)); } catch (e) { next(e); }
});

// GV xem TKB của mình
router.get('/my-schedule', authorize('TEACHER'), async (req, res, next) => {
  try { success(res, await svc.getByTeacher(req.user.userId)); } catch (e) { next(e); }
});

// HS xem TKB lớp mình
router.get('/student', authorize('STUDENT'), async (req, res, next) => {
  try { success(res, await svc.getByStudent(req.user.userId)); } catch (e) { next(e); }
});

// PH xem TKB lớp con
router.get('/parent', authorize('PARENT'), async (req, res, next) => {
  try { success(res, await svc.getByParent(req.user.userId)); } catch (e) { next(e); }
});

// Admin: lấy tất cả TKB (với filter)
router.get('/', authorize('ADMIN'), async (req, res, next) => {
  try { success(res, await svc.getAll(req.query)); } catch (e) { next(e); }
});

// Admin: tạo/cập nhật một ô TKB
router.post('/upsert', authorize('ADMIN'), async (req, res, next) => {
  try { success(res, await svc.upsert(req.body)); } catch (e) { next(e); }
});

// Admin: Tự động tạo TKB – chỉ preview, chưa lưu DB
router.post('/auto-generate', authorize('ADMIN'), async (req, res, next) => {
  try {
    const result = await svc.autoGenerate(req.body);
    success(res, result);
  } catch (e) { next(e); }
});

// Admin: Áp dụng TKB đã generate vào DB
router.post('/auto-apply', authorize('ADMIN'), async (req, res, next) => {
  try {
    if (!req.body?.scheduled?.length) {
      return res.status(400).json({ success: false, message: 'Không có dữ liệu TKB để áp dụng' });
    }
    const result = await svc.autoApply(req.body.scheduled);
    success(res, result);
  } catch (e) { next(e); }
});

// Admin: xóa một ô TKB
router.delete('/:id', authorize('ADMIN'), async (req, res, next) => {
  try { success(res, await svc.remove(req.params.id)); } catch (e) { next(e); }
});

// Admin: xóa toàn bộ TKB của một lớp
router.delete('/class/:classInstanceId', authorize('ADMIN'), async (req, res, next) => {
  try { success(res, await svc.clearClass(req.params.classInstanceId)); } catch (e) { next(e); }
});

module.exports = router;
