const svc = require('./student.service');
const { success, badRequest } = require('../../utils/response');

const getReport = async (req, res, next) => {
  try {
    const { semester = 1, studentId } = req.query;
    let targetStudentId;

    if (req.user.role === 'STUDENT') {
      const student = await svc.getStudentByUserId(req.user.userId);
      targetStudentId = student.student_id;
    } else if (req.user.role === 'PARENT') {
      // Parent must specify studentId
      if (!studentId) return badRequest(res, 'studentId is required for parents');
      targetStudentId = studentId;
    } else {
      if (!studentId) return badRequest(res, 'studentId is required');
      targetStudentId = studentId;
    }

    const report = await svc.getStudentReport(targetStudentId, semester);
    return success(res, report);
  } catch (e) { next(e); }
};

const getMyChildren = async (req, res, next) => {
  try {
    const children = await svc.getStudentsByParentUserId(req.user.userId);
    return success(res, children);
  } catch (e) { next(e); }
};

module.exports = { getReport, getMyChildren };
