const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');

const USER_SELECT = {
  user_id: true, username: true, full_name: true,
  email: true, phone: true, status: true, created_at: true,
  role: true,
};

/** Select cơ bản + thông tin mở rộng theo role */
const USER_SELECT_DETAILED = {
  ...USER_SELECT,
  // Student profile
  student: {
    select: {
      student_id: true,
      student_code: true,
      date_of_birth: true,
      gender: true,
      hometown: true,
      class_instance: {
        select: {
          class_instance_id: true,
          grade: true,
          class: { select: { class_code: true } },
          year: { select: { name: true } },
        },
      },
    },
  },
  // Parent profile + children
  parent: {
    select: {
      parent_id: true,
      students: {
        select: {
          student: {
            select: {
              student_id: true,
              student_code: true,
              user: { select: { full_name: true } },
              class_instance: {
                select: {
                  grade: true,
                  class: { select: { class_code: true } },
                  year: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  },
  // Teacher subjects (unique)
  teacher_assignments: {
    select: {
      subject: { select: { subject_id: true, subject_name: true } },
    },
    distinct: ['subject_id'],
    orderBy: { subject: { subject_name: 'asc' } },
  },
};

const getAll = async (filters = {}) => {
  const where = {};
  if (filters.role) where.role = { role_name: filters.role };
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { full_name: { contains: filters.search } },
      { username: { contains: filters.search } },
      { email: { contains: filters.search } },
    ];
  }
  return prisma.user.findMany({
    where,
    select: USER_SELECT,
    orderBy: { created_at: 'desc' },
  });
};

const getById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { user_id: Number(id) },
    select: USER_SELECT_DETAILED,
  });
  if (!user) throw { statusCode: 404, message: 'User not found' };
  return user;
};

const create = async (data) => {
  const { username, password, full_name, email, phone, role_id } = data;
  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { username, password_hash: hash, full_name, email, phone, role_id: Number(role_id) },
    include: { role: true },
  });

  const roleName = user.role.role_name;
  if (roleName === 'STUDENT') {
    await prisma.student.create({ data: { user_id: user.user_id, student_code: data.student_code || null } });
  } else if (roleName === 'PARENT') {
    await prisma.parent.create({ data: { user_id: user.user_id } });
  }

  const { password_hash, ...safeUser } = user;
  return safeUser;
};

const update = async (id, data) => {
  const numId = Number(id);

  // ── 1. Tách fields của users vs students ─────────────────────────────────
  const { password, role_id, student_code, date_of_birth, gender, hometown, class_instance_id, ...userFields } = data;

  if (password) {
    userFields.password_hash = await bcrypt.hash(password, 10);
  }

  // ── 2. Update bảng users ─────────────────────────────────────────────────
  const updatedUser = await prisma.user.update({
    where: { user_id: numId },
    data: userFields,
    select: USER_SELECT,
  });

  // ── 3. Nếu là học sinh, update bảng students ─────────────────────────────
  const existingStudent = await prisma.student.findUnique({ where: { user_id: numId } });
  if (existingStudent) {
    const studentData = {};
    if (student_code !== undefined) studentData.student_code = student_code || null;
    if (date_of_birth !== undefined) studentData.date_of_birth = date_of_birth ? new Date(date_of_birth) : null;
    if (gender !== undefined) studentData.gender = gender || null;
    if (hometown !== undefined) studentData.hometown = hometown || null;
    if (class_instance_id !== undefined) studentData.class_instance_id = class_instance_id ? Number(class_instance_id) : null;

    if (Object.keys(studentData).length > 0) {
      await prisma.student.update({ where: { user_id: numId }, data: studentData });
    }
  }

  return updatedUser;
};


const updateStatus = async (id, status) => {
  return prisma.user.update({
    where: { user_id: Number(id) },
    data: { status },
    select: USER_SELECT,
  });
};

const getRoles = async () => prisma.role.findMany();

module.exports = { getAll, getById, create, update, updateStatus, getRoles };
