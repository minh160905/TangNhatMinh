const express = require('express');
const router = express.Router();
const prisma = require('../../config/prisma');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { success, created } = require('../../utils/response');

router.use(authenticate);

router.post('/', authorize('TEACHER'), async (req, res, next) => {
  try {
    const { student_id, semester, content } = req.body;
    const comment = await prisma.comment.create({
      data: { student_id: Number(student_id), teacher_id: req.user.userId, semester: Number(semester), content },
      include: { teacher: { select: { full_name: true } } },
    });
    created(res, comment, 'Nhận xét đã được gửi');
  } catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const { student_id, semester } = req.query;
    const where = {};
    if (student_id) where.student_id = Number(student_id);
    if (semester) where.semester = Number(semester);
    const comments = await prisma.comment.findMany({
      where,
      include: { teacher: { select: { full_name: true } } },
      orderBy: { created_at: 'desc' },
    });
    success(res, comments);
  } catch (e) { next(e); }
});

module.exports = router;
