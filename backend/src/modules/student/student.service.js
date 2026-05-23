const prisma = require('../../config/prisma');

/**
 * Get full score report for a student (grouped by subject)
 * Used by STUDENT and PARENT
 */
const getStudentReport = async (studentId, semester) => {
  const student = await prisma.student.findUnique({
    where: { student_id: Number(studentId) },
    include: {
      user: { select: { full_name: true, email: true } },
      class_instance: { include: { class: true, year: true } },
    },
  });
  if (!student) throw { statusCode: 404, message: 'Student not found' };

  const scores = await prisma.score.findMany({
    where: { student_id: Number(studentId), semester: Number(semester) },
    include: { subject: true },
    orderBy: [{ subject: { subject_name: 'asc' } }, { order_no: 'asc' }],
  });

  // Group by subject
  const subjectMap = {};
  for (const s of scores) {
    const sid = s.subject_id;
    if (!subjectMap[sid]) {
      subjectMap[sid] = {
        subject_id: sid,
        subject_name: s.subject.subject_name,
        tx: [],
        gk: null,
        ck: null,
      };
    }
    if (s.score_type === 'TX') subjectMap[sid].tx.push({ order_no: s.order_no, value: s.score_value });
    if (s.score_type === 'GK') subjectMap[sid].gk = s.score_value;
    if (s.score_type === 'CK') subjectMap[sid].ck = s.score_value;
  }

  const subjects = Object.values(subjectMap).map((sub) => {
    const txValues = sub.tx.sort((a, b) => a.order_no - b.order_no).map(t => t.value);
    const txAvg = txValues.length ? txValues.reduce((a, b) => a + b, 0) / txValues.length : null;
    const gk = sub.gk;
    const ck = sub.ck;
    let dtb = null;
    if (txAvg !== null && gk !== null && ck !== null) {
      dtb = Math.round(((txAvg + 2 * gk + 3 * ck) / 6) * 100) / 100;
    }
    return {
      subject_id: sub.subject_id,
      subject_name: sub.subject_name,
      tx1: txValues[0] ?? null,
      tx2: txValues[1] ?? null,
      tx3: txValues[2] ?? null,
      tx4: txValues[3] ?? null,
      tx5: txValues[4] ?? null,
      tx_avg: txAvg !== null ? Math.round(txAvg * 100) / 100 : null,
      gk,
      ck,
      dtb,
    };
  });

  // Overall average
  const dtbList = subjects.map(s => s.dtb).filter(d => d !== null);
  const overall_avg = dtbList.length ? Math.round((dtbList.reduce((a, b) => a + b, 0) / dtbList.length) * 100) / 100 : null;

  return {
    student: {
      student_id: student.student_id,
      full_name: student.user.full_name,
      student_code: student.student_code,
      class: student.class_instance ? `${student.class_instance.grade}${student.class_instance.class.class_code}` : null,
      year: student.class_instance?.year?.name,
    },
    semester,
    subjects,
    overall_avg,
  };
};

/**
 * Find student record from user_id
 */
const getStudentByUserId = async (userId) => {
  const student = await prisma.student.findUnique({ where: { user_id: Number(userId) } });
  if (!student) throw { statusCode: 404, message: 'Student profile not found' };
  return student;
};

/**
 * Find students linked to a parent
 */
const getStudentsByParentUserId = async (userId) => {
  const parent = await prisma.parent.findUnique({
    where: { user_id: Number(userId) },
    include: {
      students: {
        include: { student: { include: { user: { select: { full_name: true, email: true } } } } },
      },
    },
  });
  if (!parent) throw { statusCode: 404, message: 'Parent profile not found' };
  return parent.students.map(sp => sp.student);
};

module.exports = { getStudentReport, getStudentByUserId, getStudentsByParentUserId };
