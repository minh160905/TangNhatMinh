const prisma = require('../../config/prisma');

/**
 * Tự động tạo tổ chuyên môn cho tất cả môn học nếu chưa tồn tại
 */
const ensureDepartmentsExist = async () => {
  const subjects = await prisma.subject.findMany();
  for (const subject of subjects) {
    await prisma.department.upsert({
      where: { subject_id: subject.subject_id },
      update: {},
      create: {
        department_name: `Tổ ${subject.subject_name}`,
        subject_id: subject.subject_id,
      },
    });
  }
};

/**
 * Lấy tất cả tổ chuyên môn
 */
const getAll = async () => {
  await ensureDepartmentsExist();
  return prisma.department.findMany({
    include: {
      subject: true,
      head_teacher: {
        select: {
          user_id: true,
          username: true,
          full_name: true,
          email: true,
          phone: true,
        },
      },
      members: {
        include: {
          teacher: {
            select: {
              user_id: true,
              username: true,
              full_name: true,
              email: true,
              phone: true,
            },
          },
        },
      },
    },
    orderBy: { department_name: 'asc' },
  });
};

/**
 * Lấy tổ chuyên môn của một giáo viên cụ thể (nơi họ làm tổ trưởng hoặc thành viên)
 */
const getMyDepartment = async (teacherId) => {
  await ensureDepartmentsExist();
  
  // Tìm tổ họ làm tổ trưởng
  let dept = await prisma.department.findFirst({
    where: { head_teacher_id: Number(teacherId) },
    include: {
      subject: true,
      head_teacher: {
        select: { user_id: true, username: true, full_name: true },
      },
      members: {
        include: {
          teacher: {
            select: { user_id: true, username: true, full_name: true, email: true, phone: true },
          },
        },
      },
    },
  });

  // Nếu không phải tổ trưởng, tìm tổ họ làm thành viên
  if (!dept) {
    const memberRecord = await prisma.departmentMember.findFirst({
      where: { teacher_id: Number(teacherId) },
      include: {
        department: {
          include: {
            subject: true,
            head_teacher: {
              select: { user_id: true, username: true, full_name: true },
            },
            members: {
              include: {
                teacher: {
                  select: { user_id: true, username: true, full_name: true, email: true, phone: true },
                },
              },
            },
          },
        },
      },
    });
    dept = memberRecord?.department || null;
  }

  return dept;
};

/**
 * Bổ nhiệm Tổ trưởng tổ chuyên môn
 */
const assignHead = async (departmentId, teacherId) => {
  const deptId = Number(departmentId);
  const tId = teacherId ? Number(teacherId) : null;

  // 1. Kiểm tra tổ chuyên môn tồn tại
  const dept = await prisma.department.findUnique({
    where: { department_id: deptId },
  });
  if (!dept) throw { statusCode: 404, message: 'Tổ chuyên môn không tồn tại' };

  const oldHeadId = dept.head_teacher_id;

  if (tId) {
    // 2. Kiểm tra giáo viên được bổ nhiệm
    const teacher = await prisma.user.findUnique({
      where: { user_id: tId },
      include: { role: true },
    });
    if (!teacher) throw { statusCode: 404, message: 'Giáo viên không tồn tại' };

    // 3. Đảm bảo Hiệu trưởng không làm tổ trưởng
    if (teacher.role.role_name === 'PRINCIPAL') {
      throw { statusCode: 400, message: 'Hiệu trưởng không thể làm tổ trưởng tổ chuyên môn' };
    }

    // 4. Nếu giáo viên chưa là thành viên của tổ, tự động thêm vào thành viên
    const existingMember = await prisma.departmentMember.findUnique({
      where: { department_id_teacher_id: { department_id: deptId, teacher_id: tId } },
    });
    if (!existingMember) {
      await prisma.departmentMember.create({
        data: { department_id: deptId, teacher_id: tId },
      });
    }

    // 5. Cập nhật Tổ trưởng mới
    await prisma.department.update({
      where: { department_id: deptId },
      data: { head_teacher_id: tId },
    });

    // 6. Đổi vai trò giáo viên mới thành HEAD_OF_DEPARTMENT (role_id = 6)
    await prisma.user.update({
      where: { user_id: tId },
      data: { role_id: 6 },
    });
  } else {
    // Nếu tId là null, hủy bổ nhiệm tổ trưởng hiện tại
    await prisma.department.update({
      where: { department_id: deptId },
      data: { head_teacher_id: null },
    });
  }

  // 7. Hoàn vai trò giáo viên cũ về TEACHER (role_id = 2) nếu họ không làm tổ trưởng ở tổ khác
  if (oldHeadId && oldHeadId !== tId) {
    const otherHeadedDepts = await prisma.department.count({
      where: { head_teacher_id: oldHeadId },
    });
    if (otherHeadedDepts === 0) {
      await prisma.user.update({
        where: { user_id: oldHeadId },
        data: { role_id: 2 },
      });
    }
  }

  return { success: true };
};

/**
 * Thêm giáo viên vào tổ chuyên môn
 */
const addMember = async (departmentId, teacherId) => {
  const deptId = Number(departmentId);
  const tId = Number(teacherId);

  // Kiểm tra tổ chuyên môn
  const dept = await prisma.department.findUnique({ where: { department_id: deptId } });
  if (!dept) throw { statusCode: 404, message: 'Tổ chuyên môn không tồn tại' };

  // Kiểm tra giáo viên
  const teacher = await prisma.user.findUnique({
    where: { user_id: tId },
    include: { role: true },
  });
  if (!teacher) throw { statusCode: 404, message: 'Giáo viên không tồn tại' };

  // Thêm thành viên
  return prisma.departmentMember.upsert({
    where: { department_id_teacher_id: { department_id: deptId, teacher_id: tId } },
    update: {},
    create: { department_id: deptId, teacher_id: tId },
  });
};

/**
 * Xóa giáo viên khỏi tổ chuyên môn
 */
const removeMember = async (departmentId, teacherId) => {
  const deptId = Number(departmentId);
  const tId = Number(teacherId);

  const dept = await prisma.department.findUnique({ where: { department_id: deptId } });
  if (!dept) throw { statusCode: 404, message: 'Tổ chuyên môn không tồn tại' };

  // Nếu giáo viên bị xóa đang là tổ trưởng, hủy bổ nhiệm tổ trưởng và hoàn vai trò về TEACHER
  if (dept.head_teacher_id === tId) {
    await prisma.department.update({
      where: { department_id: deptId },
      data: { head_teacher_id: null },
    });

    const otherHeadedDepts = await prisma.department.count({
      where: { head_teacher_id: tId, NOT: { department_id: deptId } },
    });
    if (otherHeadedDepts === 0) {
      await prisma.user.update({
        where: { user_id: tId },
        data: { role_id: 2 },
      });
    }
  }

  // Xóa khỏi bảng liên kết thành viên
  return prisma.departmentMember.delete({
    where: { department_id_teacher_id: { department_id: deptId, teacher_id: tId } },
  });
};

module.exports = {
  getAll,
  getMyDepartment,
  assignHead,
  addMember,
  removeMember,
};
