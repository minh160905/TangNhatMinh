const prisma = require('../../config/prisma');

/**
 * Get pivot score table for a class (teacher view)
 * Returns one row per student with TX1-TX5, GK, CK, DTB columns
 */
const getClassScores = async ({ classInstanceId, subjectId, semester }) => {
  // Resolve year_id from class instance
  const classInstance = await prisma.classInstance.findUnique({
    where: { class_instance_id: Number(classInstanceId) },
    select: { year_id: true },
  });
  const year_id = classInstance?.year_id;

  const students = await prisma.student.findMany({
    where: { class_instance_id: Number(classInstanceId) },
    include: {
      user: { select: { full_name: true } },
      scores: {
        where: {
          subject_id: Number(subjectId),
          semester: Number(semester),
          ...(year_id ? { year_id } : {}),
        },
        orderBy: { order_no: 'asc' },
      },
    },
    orderBy: { user: { full_name: 'asc' } },
  });

  return students.map((student) => {
    const txScores = student.scores.filter(s => s.score_type === 'TX').sort((a, b) => (a.order_no || 0) - (b.order_no || 0));
    const gkScore = student.scores.find(s => s.score_type === 'GK');
    const ckScore = student.scores.find(s => s.score_type === 'CK');

    const txValues = txScores.map(s => s.score_value);
    const txAvg = txValues.length ? txValues.reduce((a, b) => a + b, 0) / txValues.length : null;
    const gk = gkScore?.score_value ?? null;
    const ck = ckScore?.score_value ?? null;

    let dtb = null;
    if (txAvg !== null && gk !== null && ck !== null) {
      dtb = Math.round(((txAvg + 2 * gk + 3 * ck) / 6) * 100) / 100;
    }

    return {
      student_id: student.student_id,
      full_name: student.user.full_name,
      student_code: student.student_code,
      tx1: txScores[0]?.score_value ?? null,
      tx2: txScores[1]?.score_value ?? null,
      tx3: txScores[2]?.score_value ?? null,
      tx4: txScores[3]?.score_value ?? null,
      tx5: txScores[4]?.score_value ?? null,
      tx_avg: txAvg !== null ? Math.round(txAvg * 100) / 100 : null,
      gk,
      ck,
      dtb,
      raw_scores: student.scores, // for score_id references
    };
  });
};

/**
 * Helper to verify teacher assignment and academic year lock status
 */
const checkScorePermission = async (createdBy, classInstanceId, subjectId, semester, yearId = null) => {
  // 1. Check Year Lock
  let resolvedYearId = yearId;
  if (!resolvedYearId && classInstanceId) {
    const ci = await prisma.classInstance.findUnique({
      where: { class_instance_id: Number(classInstanceId) },
      select: { year_id: true },
    });
    resolvedYearId = ci?.year_id || null;
  }
  if (resolvedYearId) {
    const year = await prisma.academicYear.findUnique({
      where: { year_id: Number(resolvedYearId) },
      select: { is_locked_sem1: true, is_locked_sem2: true },
    });
    const isLocked = Number(semester) === 1 ? year?.is_locked_sem1 : year?.is_locked_sem2;
    if (isLocked) {
      throw { statusCode: 400, message: 'Không thể cập nhật điểm cho kì học này' };
    }
  }

  // 2. Check Teacher Assignment
  const user = await prisma.user.findUnique({
    where: { user_id: Number(createdBy) },
    include: { role: true },
  });
  if (['TEACHER', 'PRINCIPAL', 'HEAD_OF_DEPARTMENT'].includes(user?.role?.role_name)) {
    if (!classInstanceId) {
      throw { statusCode: 400, message: 'Không tìm thấy lớp học của học sinh để kiểm tra phân công' };
    }
    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        teacher_id: Number(createdBy),
        class_instance_id: Number(classInstanceId),
        subject_id: Number(subjectId),
      },
    });
    if (!assignment) {
      throw { statusCode: 403, message: 'Bạn không được phân công giảng dạy môn học này cho lớp đã chọn' };
    }
  }
};

/**
 * Helper: write a ScoreHistory record
 */
const recordHistory = async (scoreId, changedBy, oldValue, newValue) => {
  await prisma.scoreHistory.create({
    data: {
      score_id: scoreId,
      changed_by: Number(changedBy),
      old_value: oldValue !== null && oldValue !== undefined ? Number(oldValue) : null,
      new_value: Number(newValue),
    },
  });
};

/**
 * Upsert a score (insert or update based on type+order_no)
 */
const upsertScore = async (data, createdBy) => {
  const { student_id, subject_id, semester, score_type, score_value, order_no, class_instance_id } = data;

  let resolvedClassInstanceId = class_instance_id;
  if (!resolvedClassInstanceId) {
    const student = await prisma.student.findUnique({
      where: { student_id: Number(student_id) },
      select: { class_instance_id: true },
    });
    resolvedClassInstanceId = student?.class_instance_id;
  }

  await checkScorePermission(createdBy, resolvedClassInstanceId, subject_id, semester);

  // Auto-resolve year_id from class instance
  let year_id = null;
  if (resolvedClassInstanceId) {
    const ci = await prisma.classInstance.findUnique({
      where: { class_instance_id: Number(resolvedClassInstanceId) },
      select: { year_id: true },
    });
    year_id = ci?.year_id || null;
  }

  // Validate TX count
  if (score_type === 'TX') {
    const txWhere = { student_id: Number(student_id), subject_id: Number(subject_id), semester: Number(semester), score_type: 'TX', ...(year_id ? { year_id } : {}) };
    const existingTX = await prisma.score.count({ where: txWhere });
    const existing = await prisma.score.findFirst({
      where: { ...txWhere, order_no: Number(order_no) },
    });
    if (!existing && existingTX >= 5) throw { statusCode: 400, message: 'Tối đa 5 điểm TX mỗi học kỳ' };
  }

  if (score_value < 0 || score_value > 10) throw { statusCode: 400, message: 'Điểm phải từ 0 đến 10' };

  // Find existing score to upsert
  const where = {
    student_id: Number(student_id),
    subject_id: Number(subject_id),
    semester: Number(semester),
    score_type,
    ...(score_type === 'TX' ? { order_no: Number(order_no) } : {}),
    ...(year_id ? { year_id } : {}),
  };

  const existing = await prisma.score.findFirst({ where });

  let result;
  if (existing) {
    const oldValue = existing.score_value;
    result = await prisma.score.update({
      where: { score_id: existing.score_id },
      data: { score_value: Number(score_value), created_by: createdBy },
    });
    await recordHistory(existing.score_id, createdBy, oldValue, score_value);
  } else {
    result = await prisma.score.create({
      data: {
        student_id: Number(student_id),
        subject_id: Number(subject_id),
        semester: Number(semester),
        score_type,
        score_value: Number(score_value),
        order_no: score_type === 'TX' ? Number(order_no) : null,
        created_by: createdBy,
        ...(year_id ? { year_id } : {}),
      },
    });
    await recordHistory(result.score_id, createdBy, null, score_value);
  }
  return result;
};

/**
 * Batch upsert scores (multiple students at once)
 */
const batchUpsert = async (scores, createdBy) => {
  const results = [];
  for (const score of scores) {
    results.push(await upsertScore(score, createdBy));
  }
  return results;
};

const updateScore = async (id, data, updatedBy) => {
  const { score_value } = data;
  if (score_value < 0 || score_value > 10) throw { statusCode: 400, message: 'Điểm phải từ 0 đến 10' };

  const existing = await prisma.score.findUnique({
    where: { score_id: Number(id) },
    include: {
      student: { select: { class_instance_id: true } }
    }
  });
  if (!existing) throw { statusCode: 404, message: 'Score not found' };

  await checkScorePermission(updatedBy, existing.student.class_instance_id, existing.subject_id, existing.semester, existing.year_id);

  const oldValue = existing.score_value;
  const result = await prisma.score.update({
    where: { score_id: Number(id) },
    data: { score_value: Number(score_value), created_by: updatedBy },
  });
  await recordHistory(Number(id), updatedBy, oldValue, score_value);
  return result;
};

/**
 * Get edit history of all scores for a student in a specific subject + semester
 */
const getStudentScoreHistory = async ({ studentId, subjectId, semester, yearId }) => {
  // Resolve year_id if not provided
  let resolvedYearId = yearId ? Number(yearId) : null;
  if (!resolvedYearId) {
    const student = await prisma.student.findUnique({
      where: { student_id: Number(studentId) },
      select: { class_instance: { select: { year_id: true } } },
    });
    resolvedYearId = student?.class_instance?.year_id || null;
  }

  const scores = await prisma.score.findMany({
    where: {
      student_id: Number(studentId),
      subject_id: Number(subjectId),
      semester: Number(semester),
      ...(resolvedYearId ? { year_id: resolvedYearId } : {}),
    },
    select: { score_id: true, score_type: true, order_no: true },
  });

  if (scores.length === 0) return [];

  const scoreIds = scores.map(s => s.score_id);
  const scoreTypeMap = {};
  scores.forEach(s => {
    scoreTypeMap[s.score_id] = s.score_type === 'TX'
      ? `TX${s.order_no}`
      : s.score_type;
  });

  const histories = await prisma.scoreHistory.findMany({
    where: { score_id: { in: scoreIds } },
    include: {
      changer: { select: { full_name: true, username: true } },
    },
    orderBy: { changed_at: 'desc' },
  });

  return histories.map(h => ({
    history_id: h.history_id,
    score_type_label: scoreTypeMap[h.score_id] || 'Điểm',
    old_value: h.old_value,
    new_value: h.new_value,
    changed_by_name: h.changer?.full_name || h.changer?.username || 'Ẩn danh',
    changed_at: h.changed_at,
  }));
};

module.exports = { getClassScores, upsertScore, batchUpsert, updateScore, getStudentScoreHistory };
