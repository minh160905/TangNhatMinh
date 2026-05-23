const express = require('express');
const router = express.Router();
const prisma = require('../../config/prisma');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { success, created } = require('../../utils/response');

router.use(authenticate);

// GET /conducts?class_instance_id=&semester=&year_id=
// Returns all conduct records for a class in a semester
router.get('/', authorize('TEACHER'), async (req, res, next) => {
  try {
    const { class_instance_id, semester, year_id } = req.query;
    const where = {};
    if (semester) where.semester = Number(semester);
    if (year_id) where.year_id = Number(year_id);
    if (class_instance_id) {
      where.student = { class_instance_id: Number(class_instance_id) };
    }
    const conducts = await prisma.conduct.findMany({
      where,
      include: {
        student: { include: { user: { select: { full_name: true, username: true } } } },
        teacher: { select: { full_name: true } },
      },
      orderBy: { updated_at: 'desc' },
    });
    success(res, conducts);
  } catch (e) { next(e); }
});

// PUT /conducts/upsert — create or update a conduct record for a student
router.put('/upsert', authorize('TEACHER'), async (req, res, next) => {
  try {
    const { student_id, semester, year_id, rating, note } = req.body;

    // Verify teacher is homeroom of student's class (only homeroom can rate conduct)
    const student = await prisma.student.findUnique({
      where: { student_id: Number(student_id) },
      include: { class_instance: true },
    });
    if (!student?.class_instance) {
      return res.status(400).json({ success: false, message: 'Học sinh chưa có lớp' });
    }
    if (student.class_instance.homeroom_teacher_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Chỉ GVCN mới được đánh giá hạnh kiểm' });
    }

    const conduct = await prisma.conduct.upsert({
      where: {
        student_id_semester_year_id: {
          student_id: Number(student_id),
          semester: Number(semester),
          year_id: Number(year_id),
        },
      },
      update: {
        rating,
        note: note || null,
        teacher_id: req.user.userId,
      },
      create: {
        student_id: Number(student_id),
        semester: Number(semester),
        year_id: Number(year_id),
        rating,
        note: note || null,
        teacher_id: req.user.userId,
      },
      include: {
        student: { include: { user: { select: { full_name: true } } } },
        teacher: { select: { full_name: true } },
      },
    });
    success(res, conduct, 'Đã cập nhật hạnh kiểm');
  } catch (e) { next(e); }
});

module.exports = router;
