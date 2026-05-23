/**
 * Seed dữ liệu thời khoá biểu cho 6 lớp (10A, 10B, 11A, 11B, 12A, 12B)
 * Mỗi lớp: 5 ngày (T2-T6), mỗi ngày 6 tiết → 30 tiết/lớp
 * Chạy: node prisma/seed_schedules.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('📅 Seeding thời khoá biểu...\n');

  // Lấy dữ liệu cần thiết
  const instances = await prisma.classInstance.findMany({
    include: {
      class: true,
      year: true,
      teacher_assignments: {
        include: { teacher: true, subject: true },
      },
    },
    orderBy: { grade: 'asc' },
  });

  if (instances.length === 0) {
    console.error('❌ Không có lớp học nào. Hãy chạy seed.js trước.');
    return;
  }

  // Các tiết học theo buổi (sáng: 1-5, chiều: 6-10)
  // Mỗi ngày dạy 6 tiết (3 sáng + 3 chiều cho đơn giản)
  const PERIODS_PER_DAY = [1, 2, 3, 4, 5, 6];
  const DAYS = [2, 3, 4, 5, 6]; // T2→T6

  // Phòng học mẫu
  const ROOMS = ['A101', 'A102', 'A103', 'B201', 'B202', 'B203', 'C301', 'C302'];

  let totalCreated = 0;

  for (const inst of instances) {
    const label = `${inst.grade}${inst.class.class_code}`;
    const assignments = inst.teacher_assignments;

    if (assignments.length === 0) {
      console.log(`  ⚠️  Lớp ${label}: không có GV phân công, bỏ qua`);
      continue;
    }

    // Xóa TKB cũ của lớp này (nếu có)
    await prisma.schedule.deleteMany({ where: { class_instance_id: inst.class_instance_id } });

    // Phân bổ môn vào các tiết (shuffle đơn giản dựa trên index)
    const room = ROOMS[inst.class_instance_id % ROOMS.length];
    let assignmentIdx = 0;
    const scheduleEntries = [];

    for (const day of DAYS) {
      for (const period of PERIODS_PER_DAY) {
        const assignment = assignments[assignmentIdx % assignments.length];
        assignmentIdx++;
        scheduleEntries.push({
          class_instance_id: inst.class_instance_id,
          day_of_week: day,
          period,
          subject_id: assignment.subject_id,
          teacher_id: assignment.teacher_id,
          room,
        });
      }
    }

    // Tạo hàng loạt
    await prisma.schedule.createMany({ data: scheduleEntries, skipDuplicates: true });
    totalCreated += scheduleEntries.length;
    console.log(`  ✅ Lớp ${label}: ${scheduleEntries.length} tiết`);
  }

  console.log(`\n🎉 Hoàn thành! Tổng ${totalCreated} tiết học được tạo cho ${instances.length} lớp.`);
}

main()
  .catch(e => { console.error('❌ Lỗi:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
