const express = require('express');
const router = express.Router();
const svc = require('./assignments.service');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { success, created } = require('../../utils/response');

router.use(authenticate);

router.get('/', async (req, res, next) => { try { success(res, await svc.getAll(req.query)); } catch (e) { next(e); } });
router.post('/', authorize('ADMIN'), async (req, res, next) => { try { created(res, await svc.create(req.body)); } catch (e) { next(e); } });
router.delete('/:id', authorize('ADMIN'), async (req, res, next) => { try { success(res, await svc.remove(req.params.id)); } catch (e) { next(e); } });

// Xóa hàng loạt
router.post('/batch-delete', authorize('ADMIN'), async (req, res, next) => {
  try { success(res, await svc.batchRemove(req.body.ids)); } catch (e) { next(e); }
});

// Thống kê tải giáo viên
router.get('/workload', authorize('ADMIN'), async (req, res, next) => {
  try { success(res, await svc.getTeacherWorkload()); } catch (e) { next(e); }
});

// Ma trận phân công
router.get('/matrix', authorize('ADMIN'), async (req, res, next) => {
  try { success(res, await svc.getMatrix(req.query.year_id)); } catch (e) { next(e); }
});

// GV: lấy môn dạy trong lớp
router.get('/teacher-subjects', authorize('TEACHER'), async (req, res, next) => {
  try {
    const { classInstanceId } = req.query;
    success(res, await svc.getTeacherSubjectsInClass(req.user.userId, classInstanceId));
  } catch (e) { next(e); }
});

module.exports = router;
