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

const createInstance = async (data) =>
  prisma.classInstance.create({
    data: {
      class_id: Number(data.class_id),
      year_id: Number(data.year_id),
      grade: Number(data.grade),
      homeroom_teacher_id: data.homeroom_teacher_id ? Number(data.homeroom_teacher_id) : null,
    },
    include: { class: true, year: true, homeroom_teacher: { select: TEACHER_SELECT } },
  });

const updateInstance = async (id, data) =>
  prisma.classInstance.update({
    where: { class_instance_id: Number(id) },
    data: {
      homeroom_teacher_id: data.homeroom_teacher_id ? Number(data.homeroom_teacher_id) : undefined,
      grade: data.grade ? Number(data.grade) : undefined,
    },
    include: { class: true, year: true, homeroom_teacher: { select: TEACHER_SELECT } },
  });

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
    where: { homeroom_teacher_id: teacherId },
    include: { class: true, year: true, _count: { select: { students: true } } },
    orderBy: { year_id: 'desc' },
  });

const getMyClasses = async (teacherId) =>
  prisma.classInstance.findMany({
    where: {
      OR: [
        { homeroom_teacher_id: teacherId },
        { teacher_assignments: { some: { teacher_id: teacherId } } },
      ],
    },
    include: { class: true, year: true, _count: { select: { students: true } } },
    orderBy: [{ year_id: 'desc' }, { grade: 'asc' }],
  });

const getHomeroomClassDetail = async (classInstanceId, teacherId) => {
  // Verify the teacher is the homeroom teacher of this class
  const instance = await prisma.classInstance.findFirst({
    where: { class_instance_id: Number(classInstanceId), homeroom_teacher_id: teacherId },
    include: { class: true, year: true },
  });
  if (!instance) throw { statusCode: 403, message: 'Bạn không phải GVCN của lớp này' };

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

module.exports = { getAllClasses, createClass, getAllYears, createYear, getAllInstances, createInstance, updateInstance, getInstanceStudents, getMyClasses, getHomeroomClassDetail, getMyHomeroomClass };
