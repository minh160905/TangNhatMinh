const prisma = require('../../config/prisma');

const getAll = async (filters = {}) => {
  const where = {};
  if (filters.class_instance_id) where.class_instance_id = Number(filters.class_instance_id);
  if (filters.teacher_id) where.teacher_id = Number(filters.teacher_id);
  if (filters.subject_id) where.subject_id = Number(filters.subject_id);

  return prisma.teacherAssignment.findMany({
    where,
    include: {
      teacher: { select: { user_id: true, username: true, full_name: true, email: true, phone: true, status: true } },
      class_instance: { include: { class: true, year: true } },
      subject: true,
    },
    orderBy: [{ class_instance_id: 'asc' }, { subject_id: 'asc' }],
  });
};

const checkAssignmentPermission = async (user, subjectId, teacherId) => {
  if (user.role === 'HEAD_OF_DEPARTMENT') {
    const dept = await prisma.department.findUnique({
      where: { head_teacher_id: Number(user.userId) },
    });
    if (!dept) {
      throw { statusCode: 403, message: 'Bạn không phải là tổ trưởng của tổ chuyên môn nào' };
    }

    if (Number(subjectId) !== dept.subject_id) {
      throw { statusCode: 403, message: `Bạn chỉ có quyền phân công môn học thuộc tổ chuyên môn của mình (${dept.department_name})` };
    }

    if (teacherId) {
      const isMember = await prisma.departmentMember.findUnique({
        where: { department_id_teacher_id: { department_id: dept.department_id, teacher_id: Number(teacherId) } },
      });
      if (!isMember) {
        throw { statusCode: 403, message: 'Giáo viên được phân công phải là thành viên trong tổ chuyên môn của bạn' };
      }
    }
    return dept;
  }
};

const create = async (data, user) => {
  await checkAssignmentPermission(user, data.subject_id, data.teacher_id);
  
  return prisma.teacherAssignment.create({
    data: {
      teacher_id: Number(data.teacher_id),
      class_instance_id: Number(data.class_instance_id),
      subject_id: Number(data.subject_id),
    },
    include: {
      teacher: { select: { user_id: true, username: true, full_name: true, email: true, phone: true, status: true } },
      class_instance: { include: { class: true, year: true } },
      subject: true,
    },
  });
};

const remove = async (id, user) => {
  const numId = Number(id);
  const assignment = await prisma.teacherAssignment.findUnique({ where: { assignment_id: numId } });
  if (!assignment) throw { statusCode: 404, message: 'Phân công không tồn tại' };

  await checkAssignmentPermission(user, assignment.subject_id, assignment.teacher_id);

  return prisma.teacherAssignment.delete({ where: { assignment_id: numId } });
};

const batchRemove = async (ids, user) => {
  const numIds = ids.map(Number);
  
  if (user.role === 'HEAD_OF_DEPARTMENT') {
    for (const numId of numIds) {
      const assignment = await prisma.teacherAssignment.findUnique({ where: { assignment_id: numId } });
      if (assignment) {
        await checkAssignmentPermission(user, assignment.subject_id, assignment.teacher_id);
      }
    }
  }

  return prisma.teacherAssignment.deleteMany({ where: { assignment_id: { in: numIds } } });
};

// Get subjects that a teacher teaches in a given class instance
const getTeacherSubjectsInClass = async (teacherId, classInstanceId) =>
  prisma.teacherAssignment.findMany({
    where: { teacher_id: Number(teacherId), class_instance_id: Number(classInstanceId) },
    include: { subject: true },
  });

/**
 * Thống kê tải giáo viên: mỗi GV dạy bao nhiêu lớp & môn
 */
const getTeacherWorkload = async (user) => {
  const where = {};
  const scheduleWhere = {};

  if (user && user.role === 'HEAD_OF_DEPARTMENT') {
    const dept = await prisma.department.findUnique({
      where: { head_teacher_id: Number(user.userId) },
      include: { members: true },
    });
    if (dept) {
      const memberIds = dept.members.map(m => m.teacher_id);
      where.subject_id = dept.subject_id;
      where.teacher_id = { in: memberIds };

      scheduleWhere.subject_id = dept.subject_id;
      scheduleWhere.teacher_id = { in: memberIds };
    } else {
      return [];
    }
  }

  const assignments = await prisma.teacherAssignment.findMany({
    where,
    include: {
      teacher: { select: { user_id: true, full_name: true, username: true } },
      subject: { select: { subject_name: true } },
      class_instance: {
        include: {
          class: { select: { class_code: true } },
          year: { select: { name: true } },
        },
      },
    },
  });

  // Lấy số tiết/tuần từ bảng schedules (group by teacher_id)
  const scheduleGroups = await prisma.schedule.groupBy({
    by: ['teacher_id'],
    where: scheduleWhere,
    _count: { schedule_id: true },
  });

  // Lấy chi tiết từng tiết theo teacher + class để hiển thị phân rã
  const scheduleDetails = await prisma.schedule.findMany({
    where: scheduleWhere,
    select: {
      teacher_id: true,
      class_instance_id: true,
      class_instance: {
        select: {
          grade: true,
          class: { select: { class_code: true } },
        },
      },
    },
  });

  // Map teacher_id → số tiết/tuần
  const periodMap = new Map();
  for (const g of scheduleGroups) {
    periodMap.set(g.teacher_id, g._count.schedule_id);
  }

  // Map teacher_id → { classLabel → period_count }
  const periodByClassMap = new Map();
  for (const s of scheduleDetails) {
    if (!periodByClassMap.has(s.teacher_id)) periodByClassMap.set(s.teacher_id, new Map());
    const classLabel = `${s.class_instance.grade}${s.class_instance.class?.class_code}`;
    const classMap = periodByClassMap.get(s.teacher_id);
    classMap.set(classLabel, (classMap.get(classLabel) || 0) + 1);
  }

  // Group by teacher
  const teacherMap = new Map();
  for (const a of assignments) {
    const tid = a.teacher.user_id;
    if (!teacherMap.has(tid)) {
      teacherMap.set(tid, {
        teacher_id: tid,
        full_name: a.teacher.full_name,
        username: a.teacher.username,
        total_assignments: 0,
        subjects: new Set(),
        classes: new Set(),
      });
    }
    const entry = teacherMap.get(tid);
    entry.total_assignments++;
    entry.subjects.add(a.subject.subject_name);
    entry.classes.add(`${a.class_instance.class_instance_id}`);
  }

  return Array.from(teacherMap.values()).map(e => {
    const weeklyPeriods = periodMap.get(e.teacher_id) || 0;
    const periodByClass = periodByClassMap.has(e.teacher_id)
      ? Object.fromEntries(periodByClassMap.get(e.teacher_id))
      : {};
    return {
      ...e,
      subjects: Array.from(e.subjects),
      classes: Array.from(e.classes),
      subject_count: e.subjects.size,
      class_count: e.classes.size,
      weekly_periods: weeklyPeriods,       // tổng tiết/tuần
      periods_by_class: periodByClass,     // { "10A": 6, "11B": 8, ... }
    };
  }).sort((a, b) => b.weekly_periods - a.weekly_periods || b.total_assignments - a.total_assignments);
};


/**
 * Ma trận phân công: lớp × môn → tên GV
 * Filter theo year_id
 */
const getMatrix = async (yearId, user) => {
  const where = {};
  if (yearId) where.class_instance = { year_id: Number(yearId) };

  if (user && user.role === 'HEAD_OF_DEPARTMENT') {
    const dept = await prisma.department.findUnique({
      where: { head_teacher_id: Number(user.userId) },
      include: { members: true },
    });
    if (dept) {
      const memberIds = dept.members.map(m => m.teacher_id);
      where.subject_id = dept.subject_id;
      where.teacher_id = { in: memberIds };
    } else {
      return { classes: [], subjects: [], cells: {} };
    }
  }

  const assignments = await prisma.teacherAssignment.findMany({
    where,
    include: {
      teacher: { select: { full_name: true } },
      class_instance: {
        include: {
          class: { select: { class_code: true } },
          year: { select: { name: true } },
        },
      },
      subject: { select: { subject_id: true, subject_name: true } },
    },
  });

  // Build matrix: rows = classes, cols = subjects, cell = teacher name
  const classMap = new Map(); // class_instance_id → label
  const subjectMap = new Map(); // subject_id → name
  const cellMap = new Map(); // `${ciId}-${subjectId}` → { teacher, assignment_id }

  for (const a of assignments) {
    const ciId = a.class_instance_id;
    const ciLabel = `${a.class_instance.class_instance_id}|${a.class_instance.grade}${a.class_instance.class?.class_code}|${a.class_instance.year?.name}`;
    classMap.set(ciId, ciLabel);
    subjectMap.set(a.subject.subject_id, a.subject.subject_name);
    cellMap.set(`${ciId}-${a.subject.subject_id}`, {
      teacher_name: a.teacher.full_name,
      assignment_id: a.assignment_id,
    });
  }

  return {
    classes: Array.from(classMap.entries()).map(([id, label]) => {
      const [ciId, classCode, year] = label.split('|');
      return { class_instance_id: Number(id), label: classCode, year };
    }).sort((a, b) => a.label.localeCompare(b.label)),
    subjects: Array.from(subjectMap.entries()).map(([id, name]) => ({ subject_id: id, subject_name: name }))
      .sort((a, b) => a.subject_name.localeCompare(b.subject_name)),
    cells: Object.fromEntries(cellMap),
  };
};

module.exports = { getAll, create, remove, batchRemove, getTeacherSubjectsInClass, getTeacherWorkload, getMatrix };
