const prisma = require('../../config/prisma');
const cloudinary = require('../../config/cloudinary');

const create = async (data, studentUserId, files = []) => {
  // Get student id from user
  const student = await prisma.student.findUnique({ where: { user_id: Number(studentUserId) } });
  if (!student) throw { statusCode: 404, message: 'Student profile not found' };

  const achievement = await prisma.achievement.create({
    data: {
      student_id: student.student_id,
      title: data.title,
      description: data.description || null,
      category: data.category || null,
      status: 'PENDING',
    },
  });

  // Save Cloudinary file info
  if (files.length > 0) {
    await prisma.achievementFile.createMany({
      data: files.map(f => ({
        achievement_id: achievement.achievement_id,
        // Cloudinary provides `path` (secure URL) and `filename` (public_id)
        file_url: f.path,           // full Cloudinary HTTPS URL
        file_type: f.mimetype || 'unknown',
      })),
    });
  }

  return prisma.achievement.findUnique({
    where: { achievement_id: achievement.achievement_id },
    include: { files: true, student: { include: { user: { select: { full_name: true } } } } },
  });
};

const getAll = async (filters = {}, user) => {
  const where = {};

  if (user.role === 'STUDENT') {
    const student = await prisma.student.findUnique({ where: { user_id: user.userId } });
    if (student) where.student_id = student.student_id;
  } else if (user.role === 'PARENT') {
    const parent = await prisma.parent.findUnique({
      where: { user_id: user.userId },
      include: { students: true },
    });
    if (parent) where.student_id = { in: parent.students.map(sp => sp.student_id) };
  } else if (user.role === 'TEACHER') {
    // GVCN only sees achievements of students in their homeroom classes
    const classInstances = await prisma.classInstance.findMany({
      where: { homeroom_teacher_id: user.userId },
      include: { students: true },
    });
    const studentIds = classInstances.flatMap(ci => ci.students.map(s => s.student_id));
    where.student_id = { in: studentIds };
  }

  if (filters.status) where.status = filters.status;

  return prisma.achievement.findMany({
    where,
    include: {
      student: { include: { user: { select: { full_name: true } } } },
      reviewer: { select: { full_name: true } },
      files: true,
      comments: { include: { teacher: { select: { full_name: true } } } },
    },
    orderBy: { submitted_at: 'desc' },
  });
};

const review = async (id, status, teacherUserId, comment) => {
  const achievement = await prisma.achievement.findUnique({
    where: { achievement_id: Number(id) },
    include: { student: { include: { class_instance: true } } },
  });
  if (!achievement) throw { statusCode: 404, message: 'Achievement not found' };

  const ci = achievement.student.class_instance;
  if (!ci || ci.homeroom_teacher_id !== teacherUserId) {
    throw { statusCode: 403, message: 'Chỉ GVCN của lớp mới có thể duyệt thành tích này' };
  }

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw { statusCode: 400, message: 'Status must be APPROVED or REJECTED' };
  }

  const updated = await prisma.achievement.update({
    where: { achievement_id: Number(id) },
    data: { status, reviewed_by: teacherUserId, reviewed_at: new Date() },
    include: { student: { include: { user: { select: { full_name: true } } } } },
  });

  if (comment) {
    await prisma.achievementComment.create({
      data: { achievement_id: Number(id), teacher_id: teacherUserId, comment },
    });
  }

  return updated;
};

const addComment = async (id, teacherUserId, comment) => {
  return prisma.achievementComment.create({
    data: { achievement_id: Number(id), teacher_id: Number(teacherUserId), comment },
    include: { teacher: { select: { full_name: true } } },
  });
};

/**
 * Delete a file from Cloudinary by its public_id derived from file_url
 */
const deleteFile = async (fileId) => {
  const file = await prisma.achievementFile.findUnique({ where: { file_id: Number(fileId) } });
  if (!file) throw { statusCode: 404, message: 'File not found' };

  // Extract public_id from Cloudinary URL
  // URL format: https://res.cloudinary.com/<cloud>/image/upload/v<ver>/<folder>/<public_id>.<ext>
  try {
    const parts = file.file_url.split('/');
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx !== -1) {
      // Everything after "upload/v<version>/" is the public_id (with extension)
      const afterUpload = parts.slice(uploadIdx + 2).join('/');
      const publicId = afterUpload.replace(/\.[^/.]+$/, ''); // remove extension
      const resourceType = file.file_type.startsWith('image/') ? 'image' : 'raw';
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    }
  } catch (e) {
    console.warn('⚠️ Could not delete from Cloudinary:', e.message);
  }

  return prisma.achievementFile.delete({ where: { file_id: Number(fileId) } });
};

module.exports = { create, getAll, review, addComment, deleteFile };
