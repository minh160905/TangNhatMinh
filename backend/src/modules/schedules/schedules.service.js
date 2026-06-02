const prisma = require('../../config/prisma');

const INCLUDE = {
  subject: { select: { subject_id: true, subject_name: true } },
  teacher: { select: { user_id: true, full_name: true } },
  class_instance: {
    include: {
      class: { select: { class_code: true } },
      year: { select: { name: true } },
    },
  },
};

/** Lấy TKB theo class_instance_id */
const getByClass = async (classInstanceId) => {
  return prisma.schedule.findMany({
    where: { class_instance_id: Number(classInstanceId) },
    include: INCLUDE,
    orderBy: [{ day_of_week: 'asc' }, { period: 'asc' }],
  });
};

/** Lấy TKB của giáo viên (tất cả lớp) */
const getByTeacher = async (teacherId) => {
  return prisma.schedule.findMany({
    where: { teacher_id: Number(teacherId) },
    include: INCLUDE,
    orderBy: [{ day_of_week: 'asc' }, { period: 'asc' }],
  });
};

/** Lấy TKB của học sinh (theo class_instance) */
const getByStudent = async (userId) => {
  const student = await prisma.student.findUnique({
    where: { user_id: Number(userId) },
    select: { class_instance_id: true },
  });
  if (!student?.class_instance_id) return [];
  return getByClass(student.class_instance_id);
};

/** Lấy TKB của con (phụ huynh) */
const getByParent = async (userId) => {
  const parent = await prisma.parent.findUnique({
    where: { user_id: Number(userId) },
    select: {
      students: {
        select: {
          student: {
            select: {
              class_instance_id: true,
              user: { select: { full_name: true } },
            },
          },
        },
      },
    },
  });
  if (!parent?.students?.length) return [];

  // Nếu có nhiều con, lấy TKB của con đầu tiên (hoặc theo query param)
  const children = parent.students.map(sp => sp.student).filter(s => s.class_instance_id);
  if (!children.length) return [];

  const results = await Promise.all(
    children.map(async (child) => {
      const schedules = await getByClass(child.class_instance_id);
      return { child_name: child.user.full_name, schedules };
    })
  );
  return results;
};

/** Create / upsert một ô TKB */
const upsert = async (data) => {
  const { class_instance_id, day_of_week, period, subject_id, teacher_id, room } = data;
  return prisma.schedule.upsert({
    where: { class_instance_id_day_of_week_period: { class_instance_id: Number(class_instance_id), day_of_week: Number(day_of_week), period: Number(period) } },
    create: { class_instance_id: Number(class_instance_id), day_of_week: Number(day_of_week), period: Number(period), subject_id: Number(subject_id), teacher_id: Number(teacher_id), room: room || null },
    update: { subject_id: Number(subject_id), teacher_id: Number(teacher_id), room: room || null },
    include: INCLUDE,
  });
};

/** Xóa một ô TKB */
const remove = async (id) => prisma.schedule.delete({ where: { schedule_id: Number(id) } });

/** Xóa toàn bộ TKB của một lớp */
const clearClass = async (classInstanceId) =>
  prisma.schedule.deleteMany({ where: { class_instance_id: Number(classInstanceId) } });

/** Lấy danh sách tất cả TKB (admin overview) */
const getAll = async (filters = {}) => {
  const where = {};
  if (filters.class_instance_id) where.class_instance_id = Number(filters.class_instance_id);
  if (filters.teacher_id) where.teacher_id = Number(filters.teacher_id);
  return prisma.schedule.findMany({ where, include: INCLUDE, orderBy: [{ class_instance_id: 'asc' }, { day_of_week: 'asc' }, { period: 'asc' }] });
};

/** Auto-generate TKB (preview only – không lưu DB) */
const autoGenerate = async (options) => {
  const autoSvc = require('./auto-schedule.service');
  return autoSvc.generate(options);
};

/** Áp dụng TKB đã generate vào DB */
const autoApply = async (scheduledSlots) => {
  const autoSvc = require('./auto-schedule.service');
  return autoSvc.applySchedule(scheduledSlots);
};

module.exports = { getByClass, getByTeacher, getByStudent, getByParent, upsert, remove, clearClass, getAll, autoGenerate, autoApply };
