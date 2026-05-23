const prisma = require('../../config/prisma');

const getAll = async () => prisma.subject.findMany({ orderBy: { subject_name: 'asc' } });

/**
 * Lấy danh sách giáo viên phụ trách dạy môn học theo subject_id.
 * Trả về danh sách unique GV kèm các lớp học họ phụ trách.
 */
const getTeachersBySubject = async (subjectId) => {
  const assignments = await prisma.teacherAssignment.findMany({
    where: { subject_id: Number(subjectId) },
    include: {
      teacher: {
        select: {
          user_id: true,
          full_name: true,
          email: true,
          phone: true,
        },
      },
      class_instance: {
        include: {
          class: { select: { class_code: true } },
          year: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { teacher: { full_name: 'asc' } },
      { class_instance: { year_id: 'desc' } },
    ],
  });

  // Group by teacher
  const teacherMap = new Map();
  for (const a of assignments) {
    const id = a.teacher.user_id;
    if (!teacherMap.has(id)) {
      teacherMap.set(id, {
        ...a.teacher,
        classes: [],
      });
    }
    teacherMap.get(id).classes.push({
      class_instance_id: a.class_instance_id,
      label: `${a.class_instance.class_instance_id ? '' : ''}${a.class_instance.class?.class_code || ''} – Năm ${a.class_instance.year?.name || ''}`.trim(),
      grade: a.class_instance.grade,
      class_code: a.class_instance.class?.class_code,
      year: a.class_instance.year?.name,
    });
  }

  return Array.from(teacherMap.values());
};

const create = async (data) => prisma.subject.create({ data: { subject_name: data.subject_name } });

const update = async (id, data) =>
  prisma.subject.update({ where: { subject_id: Number(id) }, data: { subject_name: data.subject_name } });

const remove = async (id) => prisma.subject.delete({ where: { subject_id: Number(id) } });

module.exports = { getAll, getTeachersBySubject, create, update, remove };
