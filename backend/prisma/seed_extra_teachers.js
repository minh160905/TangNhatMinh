/**
 * SEED EXTRA TEACHERS – EduManager THPT
 * ══════════════════════════════════════════════════════════════════════
 * Thêm 4 môn học mới + 8 giáo viên mới để test tự động sắp xếp TKB.
 *
 * Môn mới:  GDCD, Tin học, Thể dục, Âm nhạc
 * Phân chia: mỗi môn có 2 GV, mỗi GV phụ trách 3 lớp
 *   GV-1 (môn X) → dạy 10A, 10B, 11A
 *   GV-2 (môn X) → dạy 11B, 12A, 12B
 *
 * Kết quả sau seed:
 *   16 GV tổng, 12 môn, phân phối đều theo nhóm lớp
 * ══════════════════════════════════════════════════════════════════════
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const hash = (pw) => bcrypt.hashSync(pw, 10);

const NEW_SUBJECT_SPECS = [
  {
    name: 'GDCD',
    gv1: {
      username: 'gv_gdcd_1',
      full_name: 'Nguyễn Thị Lan Anh',
      email: 'gdcd1@school.edu.vn',
      phone: '0912100001',
    },
    gv2: {
      username: 'gv_gdcd_2',
      full_name: 'Trần Văn Bình',
      email: 'gdcd2@school.edu.vn',
      phone: '0912100002',
    },
  },
  {
    name: 'Tin học',
    gv1: {
      username: 'gv_tin_1',
      full_name: 'Lê Minh Cường',
      email: 'tin1@school.edu.vn',
      phone: '0912100003',
    },
    gv2: {
      username: 'gv_tin_2',
      full_name: 'Phạm Thị Dương',
      email: 'tin2@school.edu.vn',
      phone: '0912100004',
    },
  },
  {
    name: 'Thể dục',
    gv1: {
      username: 'gv_td_1',
      full_name: 'Hoàng Văn Hùng',
      email: 'theduc1@school.edu.vn',
      phone: '0912100005',
    },
    gv2: {
      username: 'gv_td_2',
      full_name: 'Đặng Thị Kim Ngân',
      email: 'theduc2@school.edu.vn',
      phone: '0912100006',
    },
  },
  {
    name: 'Âm nhạc',
    gv1: {
      username: 'gv_nhac_1',
      full_name: 'Vũ Thị Phương Linh',
      email: 'amnhac1@school.edu.vn',
      phone: '0912100007',
    },
    gv2: {
      username: 'gv_nhac_2',
      full_name: 'Bùi Đức Quang',
      email: 'amnhac2@school.edu.vn',
      phone: '0912100008',
    },
  },
];

async function main() {
  console.log('🌱 Bắt đầu thêm 4 môn mới + 8 giáo viên mới...\n');

  // ── Kiểm tra dữ liệu gốc ──────────────────────────────────────────────────
  const classInstances = await prisma.classInstance.findMany({
    include: { class: true, year: true },
    orderBy: [{ grade: 'asc' }, { class_id: 'asc' }],
  });

  if (classInstances.length < 6) {
    throw new Error('Cần ít nhất 6 lớp học. Hãy chạy seed.js trước.');
  }

  // Chia thành 2 nhóm (3 lớp mỗi nhóm)
  const group1 = classInstances.slice(0, 3); // 10A, 10B, 11A
  const group2 = classInstances.slice(3, 6); // 11B, 12A, 12B

  console.log('📚 Nhóm lớp 1 (GV-1):', group1.map(c => `${c.grade}${c.class.class_code}`).join(', '));
  console.log('📚 Nhóm lớp 2 (GV-2):', group2.map(c => `${c.grade}${c.class.class_code}`).join(', '));
  console.log('');

  let totalAssignments = 0;

  // ── Tạo môn học + GV ──────────────────────────────────────────────────────
  for (const spec of NEW_SUBJECT_SPECS) {
    // Kiểm tra môn đã tồn tại chưa
    const existingSubject = await prisma.subject.findFirst({
      where: { subject_name: spec.name },
    });

    let subject;
    if (existingSubject) {
      subject = existingSubject;
      console.log(`⚠️  Môn "${spec.name}" đã tồn tại (ID: ${subject.subject_id}), bỏ qua tạo mới.`);
    } else {
      subject = await prisma.subject.create({ data: { subject_name: spec.name } });
      console.log(`✅ Tạo môn: ${subject.subject_name} (ID: ${subject.subject_id})`);
    }

    // ── GV-1: phụ trách nhóm 1 ──────────────────────────────────────────────
    const existingGV1 = await prisma.user.findUnique({ where: { username: spec.gv1.username } });
    let user1;
    if (existingGV1) {
      user1 = existingGV1;
      console.log(`   ⚠️  GV "${spec.gv1.username}" đã tồn tại, bỏ qua.`);
    } else {
      user1 = await prisma.user.create({
        data: {
          username: spec.gv1.username,
          password_hash: hash('Teacher@123'),
          full_name: spec.gv1.full_name,
          email: spec.gv1.email,
          phone: spec.gv1.phone,
          role_id: 2,
          status: 'ACTIVE',
        },
      });
      console.log(`   ✅ GV-1: ${user1.username} (${user1.full_name})`);
    }

    for (const ci of group1) {
      try {
        await prisma.teacherAssignment.create({
          data: {
            teacher_id: user1.user_id,
            class_instance_id: ci.class_instance_id,
            subject_id: subject.subject_id,
          },
        });
        totalAssignments++;
      } catch (e) {
        if (e.code === 'P2002') {
          console.log(`      ⚠️  Phân công ${user1.username} → ${ci.grade}${ci.class.class_code} đã tồn tại`);
        } else throw e;
      }
    }
    console.log(`      → Dạy: ${group1.map(c => `${c.grade}${c.class.class_code}`).join(', ')}`);

    // ── GV-2: phụ trách nhóm 2 ──────────────────────────────────────────────
    const existingGV2 = await prisma.user.findUnique({ where: { username: spec.gv2.username } });
    let user2;
    if (existingGV2) {
      user2 = existingGV2;
      console.log(`   ⚠️  GV "${spec.gv2.username}" đã tồn tại, bỏ qua.`);
    } else {
      user2 = await prisma.user.create({
        data: {
          username: spec.gv2.username,
          password_hash: hash('Teacher@123'),
          full_name: spec.gv2.full_name,
          email: spec.gv2.email,
          phone: spec.gv2.phone,
          role_id: 2,
          status: 'ACTIVE',
        },
      });
      console.log(`   ✅ GV-2: ${user2.username} (${user2.full_name})`);
    }

    for (const ci of group2) {
      try {
        await prisma.teacherAssignment.create({
          data: {
            teacher_id: user2.user_id,
            class_instance_id: ci.class_instance_id,
            subject_id: subject.subject_id,
          },
        });
        totalAssignments++;
      } catch (e) {
        if (e.code === 'P2002') {
          console.log(`      ⚠️  Phân công ${user2.username} → ${ci.grade}${ci.class.class_code} đã tồn tại`);
        } else throw e;
      }
    }
    console.log(`      → Dạy: ${group2.map(c => `${c.grade}${c.class.class_code}`).join(', ')}`);
    console.log('');
  }

  // ── Tổng kết ──────────────────────────────────────────────────────────────
  const totalTeachers = await prisma.user.count({ where: { role_id: 2 } });
  const totalSubjects = await prisma.subject.count();
  const totalAssignmentsInDB = await prisma.teacherAssignment.count();

  console.log('═'.repeat(60));
  console.log('🎉 SEED EXTRA TEACHERS HOÀN THÀNH!\n');
  console.log(`📊 THỐNG KÊ:`);
  console.log(`   Tổng giáo viên: ${totalTeachers} (gốc: 8, mới: 8)`);
  console.log(`   Tổng môn học: ${totalSubjects} (gốc: 8, mới: 4)`);
  console.log(`   Tổng phân công trong DB: ${totalAssignmentsInDB}`);
  console.log(`   Phân công thêm trong lần này: ${totalAssignments}`);
  console.log('');
  console.log('📋 TÀI KHOẢN MỚI (Password: Teacher@123):');
  console.log('   gv_gdcd_1, gv_gdcd_2   → GDCD');
  console.log('   gv_tin_1, gv_tin_2     → Tin học');
  console.log('   gv_td_1, gv_td_2       → Thể dục');
  console.log('   gv_nhac_1, gv_nhac_2   → Âm nhạc');
  console.log('═'.repeat(60));
}

main()
  .catch((e) => { console.error('❌ Seed thất bại:', e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
