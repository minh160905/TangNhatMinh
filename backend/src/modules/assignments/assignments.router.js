const express = require('express');
const router = express.Router();
const svc = require('./assignments.service');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { success, created } = require('../../utils/response');

router.use(authenticate);

router.get('/', async (req, res, next) => { try { success(res, await svc.getAll(req.query)); } catch (e) { next(e); } });
router.post('/', authorize('HEAD_OF_DEPARTMENT'), async (req, res, next) => { try { created(res, await svc.create(req.body, req.user)); } catch (e) { next(e); } });
router.delete('/:id', authorize('HEAD_OF_DEPARTMENT'), async (req, res, next) => { try { success(res, await svc.remove(req.params.id, req.user)); } catch (e) { next(e); } });

// Xóa hàng loạt
router.post('/batch-delete', authorize('HEAD_OF_DEPARTMENT'), async (req, res, next) => {
  try { success(res, await svc.batchRemove(req.body.ids, req.user)); } catch (e) { next(e); }
});

// Thống kê tải giáo viên
router.get('/workload', authorize('ADMIN', 'PRINCIPAL', 'HEAD_OF_DEPARTMENT'), async (req, res, next) => {
  try { success(res, await svc.getTeacherWorkload(req.user)); } catch (e) { next(e); }
});

// Ma trận phân công
router.get('/matrix', authorize('ADMIN', 'PRINCIPAL', 'HEAD_OF_DEPARTMENT'), async (req, res, next) => {
  try { success(res, await svc.getMatrix(req.query.year_id, req.user)); } catch (e) { next(e); }
});

// GV: lấy môn dạy trong lớp
router.get('/teacher-subjects', authorize('TEACHER', 'PRINCIPAL', 'HEAD_OF_DEPARTMENT'), async (req, res, next) => {
  try {
    const { classInstanceId } = req.query;
    success(res, await svc.getTeacherSubjectsInClass(req.user.userId, classInstanceId));
  } catch (e) { next(e); }
});

module.exports = router;
