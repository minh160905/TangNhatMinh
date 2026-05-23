const prisma = require('../../config/prisma');

const create = async (data, createdBy) => {
  const { title, content, receiver_ids } = data;

  const notification = await prisma.notification.create({
    data: { title, content, created_by: createdBy },
  });

  if (receiver_ids && receiver_ids.length > 0) {
    await prisma.notificationReceiver.createMany({
      data: receiver_ids.map(uid => ({
        notification_id: notification.notification_id,
        user_id: Number(uid),
        is_read: false,
      })),
    });
  }

  return prisma.notification.findUnique({
    where: { notification_id: notification.notification_id },
    include: { creator: { select: { full_name: true } }, _count: { select: { receivers: true } } },
  });
};

const getForUser = async (userId) => {
  return prisma.notificationReceiver.findMany({
    where: { user_id: Number(userId) },
    include: { notification: { include: { creator: { select: { full_name: true } } } } },
    orderBy: { notification: { created_at: 'desc' } },
  });
};

const markRead = async (notifId, userId) => {
  return prisma.notificationReceiver.updateMany({
    where: { notification_id: Number(notifId), user_id: Number(userId) },
    data: { is_read: true },
  });
};

const markAllRead = async (userId) => {
  return prisma.notificationReceiver.updateMany({
    where: { user_id: Number(userId), is_read: false },
    data: { is_read: true },
  });
};

const getUnreadCount = async (userId) => {
  return prisma.notificationReceiver.count({
    where: { user_id: Number(userId), is_read: false },
  });
};

const getSentNotifications = async (createdBy) => {
  return prisma.notification.findMany({
    where: { created_by: Number(createdBy) },
    include: {
      creator: { select: { full_name: true } },
      _count: { select: { receivers: true } },
    },
    orderBy: { created_at: 'desc' },
  });
};

/**
 * Lấy danh sách tất cả người có thể nhận thông báo từ giáo viên:
 *  - Học sinh của các lớp GV phụ trách (hoặc chủ nhiệm)
 *  - Phụ huynh của các học sinh đó
 */
const getRecipients = async (teacherId) => {
  // Lấy tất cả class_instance_id mà GV này phụ trách
  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacher_id: Number(teacherId) },
    select: { class_instance_id: true },
  });

  // Cộng thêm lớp GVCN
  const homeroomClasses = await prisma.classInstance.findMany({
    where: { homeroom_teacher_id: Number(teacherId) },
    select: { class_instance_id: true },
  });

  const allInstanceIds = [
    ...new Set([
      ...assignments.map(a => a.class_instance_id),
      ...homeroomClasses.map(c => c.class_instance_id),
    ]),
  ];

  if (allInstanceIds.length === 0) return { students: [], parents: [] };

  // Lấy học sinh từ các lớp đó
  const students = await prisma.student.findMany({
    where: { class_instance_id: { in: allInstanceIds } },
    select: {
      student_id: true,
      student_code: true,
      user: { select: { user_id: true, full_name: true, username: true } },
      class_instance: {
        select: {
          grade: true,
          class: { select: { class_code: true } },
        },
      },
    },
    orderBy: { user: { full_name: 'asc' } },
  });

  // Lấy phụ huynh của các học sinh đó
  const studentIds = students.map(s => s.student_id);
  const parentLinks = await prisma.studentParent.findMany({
    where: { student_id: { in: studentIds } },
    select: {
      student: {
        select: {
          user: { select: { full_name: true } },
          class_instance: {
            select: { grade: true, class: { select: { class_code: true } } },
          },
        },
      },
      parent: {
        select: {
          parent_id: true,
          user: { select: { user_id: true, full_name: true, username: true } },
        },
      },
    },
  });

  // Deduplicate parents
  const parentMap = new Map();
  for (const link of parentLinks) {
    const pid = link.parent.parent_id;
    if (!parentMap.has(pid)) {
      parentMap.set(pid, {
        ...link.parent,
        children: [],
      });
    }
    parentMap.get(pid).children.push({
      name: link.student.user.full_name,
      class: `${link.student.class_instance?.grade}${link.student.class_instance?.class?.class_code}`,
    });
  }

  return {
    students: students.map(s => ({
      user_id: s.user.user_id,
      full_name: s.user.full_name,
      username: s.user.username,
      student_code: s.student_code,
      class: `${s.class_instance?.grade}${s.class_instance?.class?.class_code}`,
    })),
    parents: Array.from(parentMap.values()).map(p => ({
      user_id: p.user.user_id,
      full_name: p.user.full_name,
      username: p.user.username,
      children: p.children,
    })),
  };
};

module.exports = { create, getForUser, markRead, markAllRead, getUnreadCount, getSentNotifications, getRecipients };

