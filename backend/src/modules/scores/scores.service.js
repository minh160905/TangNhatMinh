const prisma = require('../../config/prisma');

/**
 * Get pivot score table for a class (teacher view)
 * Returns one row per student with TX1-TX5, GK, CK, DTB columns
 */
const getClassScores = async ({ classInstanceId, subjectId, semester }) => {
  const students = await prisma.student.findMany({
    where: { class_instance_id: Number(classInstanceId) },
    include: {
      user: { select: { full_name: true } },
      scores: {
        where: { subject_id: Number(subjectId), semester: Number(semester) },
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
 * Upsert a score (insert or update based on type+order_no)
 */
const upsertScore = async (data, createdBy) => {
  const { student_id, subject_id, semester, score_type, score_value, order_no } = data;

  // Validate TX count
  if (score_type === 'TX') {
    const existingTX = await prisma.score.count({
      where: { student_id: Number(student_id), subject_id: Number(subject_id), semester: Number(semester), score_type: 'TX' },
    });
    const existing = await prisma.score.findFirst({
      where: { student_id: Number(student_id), subject_id: Number(subject_id), semester: Number(semester), score_type: 'TX', order_no: Number(order_no) },
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
  };

  const existing = await prisma.score.findFirst({ where });

  if (existing) {
    return prisma.score.update({
      where: { score_id: existing.score_id },
      data: { score_value: Number(score_value), created_by: createdBy },
    });
  } else {
    return prisma.score.create({
      data: {
        student_id: Number(student_id),
        subject_id: Number(subject_id),
        semester: Number(semester),
        score_type,
        score_value: Number(score_value),
        order_no: score_type === 'TX' ? Number(order_no) : null,
        created_by: createdBy,
      },
    });
  }
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
  return prisma.score.update({
    where: { score_id: Number(id) },
    data: { score_value: Number(score_value), created_by: updatedBy },
  });
};

module.exports = { getClassScores, upsertScore, batchUpsert, updateScore };
