const prisma = require('../../config/prisma');

const TEACHER_SELECT = {
  user_id: true, username: true, full_name: true, email: true, phone: true, status: true,
};

// ── Classes ────────────────────────────────────────────────────────────────
const getAllClasses = async () => prisma.class.findMany({ orderBy: { class_code: 'asc' } });

const createClass = async (data) => prisma.class.create({ data: { class_code: data.class_code } });

// ── Academic Years ─────────────────────────────────────────────────────────
const getAllYears = async () => prisma.academicYear.findMany({ orderBy: { start_date: 'desc' } });

const createYear = async (data) =>
  prisma.academicYear.create({
    data: { name: data.name, start_date: new Date(data.start_date), end_date: new Date(data.end_date) },
  });

// ── Class Instances ────────────────────────────────────────────────────────
const getAllInstances = async (filters = {}) => {
  const where = {};
  if (filters.year_id) where.year_id = Number(filters.year_id);
  if (filters.grade) where.grade = Number(filters.grade);
  if (filters.teacher_id) where.homeroom_teacher_id = Number(filters.teacher_id);

  return prisma.classInstance.findMany({
    where,
    include: {
      class: true,
      year: true,
      homeroom_teacher: { select: TEACHER_SELECT },
      _count: { select: { students: true } },
    },
    orderBy: [{ year_id: 'desc' }, { grade: 'asc' }],
  });
};

const createInstance = async (data) => {
  if (data.homeroom_teacher_id) {
    const teacher = await prisma.user.findUnique({
      where: { user_id: Number(data.homeroom_teacher_id) },
      include: { role: true },
    });
    if (teacher?.role?.role_name === 'PRINCIPAL') {
      throw {
        statusCode: 400,
        message: 'Hiệu trưởng không thể làm giáo viên chủ nhiệm',
      };
    }

    const existing = await prisma.classInstance.findFirst({
      where: {
        year_id: Number(data.year_id),
        homeroom_teacher_id: Number(data.homeroom_teacher_id),
      },
      include: { class: true },
    });
    if (existing) {
      throw {
        statusCode: 400,
        message: `Giáo viên này đã là giáo viên chủ nhiệm lớp ${existing.grade}${existing.class?.class_code || ''} trong năm học này`,
      };
    }
  }

  return prisma.classInstance.create({
    data: {
      class_id: Number(data.class_id),
      year_id: Number(data.year_id),
      grade: Number(data.grade),
      homeroom_teacher_id: data.homeroom_teacher_id ? Number(data.homeroom_teacher_id) : null,
    },
    include: { class: true, year: true, homeroom_teacher: { select: TEACHER_SELECT } },
  });
};

const updateInstance = async (id, data) => {
  if (data.homeroom_teacher_id) {
    const teacher = await prisma.user.findUnique({
      where: { user_id: Number(data.homeroom_teacher_id) },
      include: { role: true },
    });
    if (teacher?.role?.role_name === 'PRINCIPAL') {
      throw {
        statusCode: 400,
        message: 'Hiệu trưởng không thể làm giáo viên chủ nhiệm',
      };
    }

    const instance = await prisma.classInstance.findUnique({
      where: { class_instance_id: Number(id) },
      select: { year_id: true },
    });
    if (instance) {
      const existing = await prisma.classInstance.findFirst({
        where: {
          year_id: Number(instance.year_id),
          homeroom_teacher_id: Number(data.homeroom_teacher_id),
          NOT: {
            class_instance_id: Number(id),
          },
        },
        include: { class: true },
      });
      if (existing) {
        throw {
          statusCode: 400,
          message: `Giáo viên này đã là giáo viên chủ nhiệm lớp ${existing.grade}${existing.class?.class_code || ''} trong năm học này`,
        };
      }
    }
  }

  return prisma.classInstance.update({
    where: { class_instance_id: Number(id) },
    data: {
      homeroom_teacher_id: data.homeroom_teacher_id !== undefined ? (data.homeroom_teacher_id ? Number(data.homeroom_teacher_id) : null) : undefined,
      grade: data.grade ? Number(data.grade) : undefined,
    },
    include: { class: true, year: true, homeroom_teacher: { select: TEACHER_SELECT } },
  });
};

const getInstanceStudents = async (id) =>
  prisma.student.findMany({
    where: { class_instance_id: Number(id) },
    select: {
      student_id: true,
      student_code: true,
      date_of_birth: true,
      gender: true,
      hometown: true,
      user: {
        select: {
          user_id: true,
          username: true,
          full_name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: { user: { full_name: 'asc' } },
  });


const getMyHomeroomClass = async (teacherId) =>
  prisma.classInstance.findFirst({
    where: { homeroom_teacher_id: Number(teacherId) },
    include: { class: true, year: true, _count: { select: { students: true } } },
    orderBy: { year_id: 'desc' },
  });

const getMyClasses = async (teacherId) =>
  prisma.classInstance.findMany({
    where: {
      OR: [
        { homeroom_teacher_id: Number(teacherId) },
        { teacher_assignments: { some: { teacher_id: Number(teacherId) } } },
      ],
    },
    include: { class: true, year: true, _count: { select: { students: true } } },
    orderBy: [{ year_id: 'desc' }, { grade: 'asc' }],
  });

const getHomeroomClassDetail = async (classInstanceId, user) => {
  const isBypass = ['PRINCIPAL', 'ADMIN'].includes(user.role);

  const instance = await prisma.classInstance.findUnique({
    where: { class_instance_id: Number(classInstanceId) },
    include: { class: true, year: true, homeroom_teacher: { select: { user_id: true, full_name: true } } },
  });
  if (!instance) throw { statusCode: 404, message: 'Lớp học không tồn tại' };

  if (!isBypass && instance.homeroom_teacher_id !== user.userId) {
    throw { statusCode: 403, message: 'Bạn không phải GVCN của lớp này' };
  }

  const students = await prisma.student.findMany({
    where: { class_instance_id: Number(classInstanceId) },
    select: {
      student_id: true,
      student_code: true,
      date_of_birth: true,
      gender: true,
      hometown: true,
      user: {
        select: {
          user_id: true, username: true, full_name: true, email: true, phone: true, status: true,
        },
      },
      parents: {
        include: {
          parent: {
            include: {
              user: {
                select: {
                  user_id: true, username: true, full_name: true, email: true, phone: true, status: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { user: { full_name: 'asc' } },
  });

  return { instance, students };
};

const toggleYearLock = async (id, semester) => {
  const year = await prisma.academicYear.findUnique({
    where: { year_id: Number(id) },
  });
  if (!year) throw { statusCode: 404, message: 'Academic year not found' };

  const sem = Number(semester);
  if (sem === 1) {
    return prisma.academicYear.update({
      where: { year_id: Number(id) },
      data: { is_locked_sem1: !year.is_locked_sem1 },
    });
  } else {
    return prisma.academicYear.update({
      where: { year_id: Number(id) },
      data: { is_locked_sem2: !year.is_locked_sem2 },
    });
  }
};

module.exports = { getAllClasses, createClass, getAllYears, createYear, getAllInstances, createInstance, updateInstance, getInstanceStudents, getMyClasses, getHomeroomClassDetail, getMyHomeroomClass, toggleYearLock };
