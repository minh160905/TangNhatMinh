const express = require('express');
const router = express.Router();
const prisma = require('../../config/prisma');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { success, created } = require('../../utils/response');
const notificationsService = require('../notifications/notifications.service');

router.use(authenticate);

router.post('/', authorize('TEACHER', 'PRINCIPAL', 'HEAD_OF_DEPARTMENT'), async (req, res, next) => {
  try {
    const { student_id, semester, content } = req.body;
    const comment = await prisma.comment.create({
      data: { student_id: Number(student_id), teacher_id: req.user.userId, semester: Number(semester), content },
      include: { teacher: { select: { full_name: true } } },
    });

    // Send notifications to student and their parents
    const studentInfo = await prisma.student.findUnique({
      where: { student_id: Number(student_id) },
      include: {
        user: { select: { user_id: true } },
        parents: {
          include: { parent: { include: { user: { select: { user_id: true } } } } }
        }
      }
    });

    if (studentInfo) {
      const receiverIds = [];
      if (studentInfo.user?.user_id) receiverIds.push(studentInfo.user.user_id);
      if (studentInfo.parents?.length > 0) {
        studentInfo.parents.forEach(p => {
          if (p.parent?.user?.user_id) receiverIds.push(p.parent.user.user_id);
        });
      }

      if (receiverIds.length > 0) {
        await notificationsService.create({
          title: 'Nhận xét mới từ giáo viên',
          content: `Giáo viên ${comment.teacher.full_name} đã gửi nhận xét mới trong Học kỳ ${semester}.`,
          receiver_ids: receiverIds
        }, req.user.userId);
      }
    }

    created(res, comment, 'Nhận xét đã được gửi');
  } catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const { student_id, semester, all } = req.query;
    const where = {};
    if (semester) where.semester = Number(semester);

    if (req.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { user_id: req.user.userId },
      });
      if (student) {
        where.student_id = student.student_id;
      } else {
        where.student_id = -1;
      }
    } else if (req.user.role === 'PARENT') {
      const parent = await prisma.parent.findUnique({
        where: { user_id: req.user.userId },
        include: { students: true },
      });
      if (parent) {
        const parentStudentIds = parent.students.map((sp) => sp.student_id);
        if (student_id) {
          const queryStudentId = Number(student_id);
          if (parentStudentIds.includes(queryStudentId)) {
            where.student_id = queryStudentId;
          } else {
            where.student_id = -1;
          }
        } else {
          where.student_id = { in: parentStudentIds };
        }
      } else {
        where.student_id = -1;
      }
    } else {
      if (student_id) where.student_id = Number(student_id);
      if (['TEACHER', 'PRINCIPAL', 'HEAD_OF_DEPARTMENT'].includes(req.user.role) && all !== 'true') {
        where.teacher_id = req.user.userId;
      }
    }

    const comments = await prisma.comment.findMany({
      where,
      include: { teacher: { select: { full_name: true } } },
      orderBy: { created_at: 'desc' },
    });
    success(res, comments);
  } catch (e) { next(e); }
});

module.exports = router;
