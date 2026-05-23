/**
 * SEED FILE – EduManager THPT
 * Dữ liệu mẫu đầy đủ theo yêu cầu:
 *  – 6 lớp: 10A, 10B, 11A, 11B, 12A, 12B
 *  – 10 học sinh / lớp (60 HS tổng)
 *  – 6 phụ huynh cho 6 HS ngẫu nhiên
 *  – 8 môn học + 8 giáo viên
 *  – 6/8 GV làm GVCN
 *  – 2 kỳ học, điểm số đầy đủ tất cả môn
 *  – Tài khoản demo rõ ràng
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const hash = (pw) => bcrypt.hashSync(pw, 10);

// ─── Helpers ────────────────────────────────────────────────────────────────
const rnd = (min, max) => Math.round((Math.random() * (max - min) + min) * 10) / 10;
const rndScore = () => rnd(4.0, 10.0); // Điểm ngẫu nhiên 4–10

const MALE_NAMES = [
  'Nguyễn Văn An', 'Trần Minh Bảo', 'Lê Quốc Cường', 'Phạm Đức Dũng',
  'Hoàng Văn Em', 'Đặng Minh Phúc', 'Vũ Quang Hải', 'Bùi Thế Hùng',
  'Đỗ Ngọc Khoa', 'Ngô Thanh Long', 'Đinh Văn Mạnh', 'Lý Hải Nam',
  'Phan Quốc Nghĩa', 'Tô Minh Phương', 'Huỳnh Đức Quân', 'Cao Văn Sang',
  'Mai Xuân Thành', 'Hồ Đình Tuấn', 'Lê Bá Uy', 'Trịnh Văn Vũ',
  'Nguyễn Hữu Xuân', 'Phạm Công Yên', 'Dương Quốc Anh', 'Tạ Đình Bình',
  'Đào Văn Chi', 'Hà Minh Dương', 'Trương Quốc Đạt', 'Bùi Văn Giang',
  'Đinh Đức Hòa', 'Lê Minh Khải',
];

const FEMALE_NAMES = [
  'Nguyễn Thị Ánh', 'Trần Thị Bình', 'Lê Thị Châu', 'Phạm Thị Dung',
  'Hoàng Thị Linh', 'Đặng Thị Mai', 'Vũ Thị Ngọc', 'Bùi Thị Oanh',
  'Đỗ Thị Phương', 'Ngô Thị Quỳnh', 'Đinh Thị Rô', 'Lý Thị Sen',
  'Phan Thị Thắm', 'Tô Thị Uyên', 'Huỳnh Thị Vân', 'Cao Thị Xuân',
  'Mai Thị Yến', 'Hồ Thị Zân', 'Lê Thị An', 'Trịnh Thị Bé',
  'Nguyễn Thị Cẩm', 'Phạm Thị Diệu', 'Dương Thị Giang', 'Tạ Thị Hoa',
  'Đào Thị Hương', 'Hà Thị Khánh', 'Trương Thị Lan', 'Bùi Thị Mơ',
  'Đinh Thị Nga', 'Lê Thị Phú',
];

// Ghép cả hai danh sách, lần lượt nam/nữ
const ALL_STUDENT_NAMES = [];
for (let i = 0; i < 30; i++) {
  ALL_STUDENT_NAMES.push({ name: MALE_NAMES[i], gender: 'M' });
  ALL_STUDENT_NAMES.push({ name: FEMALE_NAMES[i], gender: 'F' });
}

const PROVINCES = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Huế', 'Cần Thơ', 'Hải Phòng'];
const DISTRICTS = ['Quận 1', 'Quận Hoàn Kiếm', 'Quận Hải Châu', 'Phường Trung Tâm', 'Quận Ninh Kiều', 'Quận Lê Chân'];

const TEACHER_INFO = [
  { name: 'Nguyễn Văn Toán',   subject: 'Toán',       email: 'toan@school.edu.vn',   phone: '0901111001' },
  { name: 'Trần Thị Lý',       subject: 'Lý',         email: 'ly@school.edu.vn',     phone: '0901111002' },
  { name: 'Lê Minh Hóa',       subject: 'Hóa',        email: 'hoa@school.edu.vn',    phone: '0901111003' },
  { name: 'Phạm Thị Sinh',     subject: 'Sinh',       email: 'sinh@school.edu.vn',   phone: '0901111004' },
  { name: 'Hoàng Văn Sử',      subject: 'Sử',         email: 'su@school.edu.vn',     phone: '0901111005' },
  { name: 'Đặng Thị Địa',      subject: 'Địa',        email: 'dia@school.edu.vn',    phone: '0901111006' },
  { name: 'Vũ Thị Văn',        subject: 'Văn',        email: 'van@school.edu.vn',    phone: '0901111007' },
  { name: 'Bùi Đức Anh',       subject: 'Tiếng Anh',  email: 'anh@school.edu.vn',   phone: '0901111008' },
];

// 6 trong 8 GV được phân công GVCN cho 6 lớp
// GV Sử (idx 4) và GV Địa (idx 5) KHÔNG làm GVCN
const GVCN_TEACHER_INDICES = [0, 1, 2, 3, 6, 7]; // Toán, Lý, Hóa, Sinh, Văn, TiếngAnh

const CLASS_CONFIG = [
  { code: 'A', grade: 10 },
  { code: 'B', grade: 10 },
  { code: 'A', grade: 11 },
  { code: 'B', grade: 11 },
  { code: 'A', grade: 12 },
  { code: 'B', grade: 12 },
];

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu đầy đủ...\n');

  // ── 1. Roles ──────────────────────────────────────────────────────────────
  await prisma.role.createMany({
    data: [
      { role_id: 1, role_name: 'ADMIN' },
      { role_id: 2, role_name: 'TEACHER' },
      { role_id: 3, role_name: 'STUDENT' },
      { role_id: 4, role_name: 'PARENT' },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Roles: ADMIN, TEACHER, STUDENT, PARENT');

  // ── 2. Admin ───────────────────────────────────────────────────────────────
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      password_hash: hash('Admin@123'),
      full_name: 'Quản trị viên Hệ thống',
      email: 'admin@school.edu.vn',
      phone: '0900000000',
      role_id: 1,
      status: 'ACTIVE',
    },
  });
  console.log('✅ Admin: admin / Admin@123');

  // ── 3. Môn học ─────────────────────────────────────────────────────────────
  const subjects = [];
  for (const info of TEACHER_INFO) {
    const s = await prisma.subject.create({ data: { subject_name: info.subject } });
    subjects.push(s);
  }
  console.log(`✅ Môn học: ${subjects.map(s => s.subject_name).join(', ')}`);

  // ── 4. Giáo viên (8 GV, mỗi GV phụ trách 1 môn) ──────────────────────────
  const teachers = [];
  for (let i = 0; i < TEACHER_INFO.length; i++) {
    const info = TEACHER_INFO[i];
    const username = `gv_${info.subject.toLowerCase().replace(/[^a-z]/g, '').substring(0, 6)}`;
    const t = await prisma.user.create({
      data: {
        username,
        password_hash: hash('Teacher@123'),
        full_name: info.name,
        email: info.email,
        phone: info.phone,
        role_id: 2,
        status: 'ACTIVE',
      },
    });
    teachers.push({ user: t, subjectId: subjects[i].subject_id, subjectName: info.subject });
  }

  // Tài khoản demo rõ ràng:
  // - GV không chủ nhiệm: teacher_su (index 4 – GV Sử)
  // - GV chủ nhiệm: teacher_toan (index 0 – GV Toán, GVCN 10A)
  // Đổi username để dễ nhớ
  await prisma.user.update({ where: { user_id: teachers[4].user.user_id }, data: { username: 'gv_nochunhiem' } });
  await prisma.user.update({ where: { user_id: teachers[0].user.user_id }, data: { username: 'gv_chunhiem' } });

  console.log('✅ 8 Giáo viên tạo xong:');
  teachers.forEach((t, i) => console.log(`   [${i}] ${t.user.username.padEnd(16)} → dạy ${t.subjectName} ${GVCN_TEACHER_INDICES.includes(i) ? '(GVCN)' : '(không GVCN)'}`));

  // ── 5. Năm học ─────────────────────────────────────────────────────────────
  const year = await prisma.academicYear.create({
    data: { name: '2024-2025', start_date: new Date('2024-09-02'), end_date: new Date('2025-05-31') },
  });
  console.log(`\n✅ Năm học: ${year.name}`);

  // ── 6. Lớp cơ bản (class codes: A, B) ─────────────────────────────────────
  const classA = await prisma.class.create({ data: { class_code: 'A' } });
  const classB = await prisma.class.create({ data: { class_code: 'B' } });
  const classMap = { A: classA, B: classB };

  // ── 7. Class instances + gán GVCN ─────────────────────────────────────────
  const classInstances = [];
  for (let i = 0; i < CLASS_CONFIG.length; i++) {
    const cfg = CLASS_CONFIG[i];
    const gvcnTeacher = teachers[GVCN_TEACHER_INDICES[i]];
    const ci = await prisma.classInstance.create({
      data: {
        class_id: classMap[cfg.code].class_id,
        year_id: year.year_id,
        grade: cfg.grade,
        homeroom_teacher_id: gvcnTeacher.user.user_id,
      },
    });
    classInstances.push({ instance: ci, grade: cfg.grade, code: cfg.code, gvcn: gvcnTeacher });
    console.log(`   Lớp ${cfg.grade}${cfg.code} → GVCN: ${gvcnTeacher.user.full_name}`);
  }
  console.log('✅ 6 lớp học đã tạo và gán GVCN');

  // ── 8. Phân công tất cả GV dạy tất cả lớp ─────────────────────────────────
  for (const ci of classInstances) {
    for (const t of teachers) {
      await prisma.teacherAssignment.create({
        data: {
          teacher_id: t.user.user_id,
          class_instance_id: ci.instance.class_instance_id,
          subject_id: t.subjectId,
        },
      });
    }
  }
  console.log('✅ Phân công 8 GV × 6 lớp (48 phân công)');

  // ── 9. Học sinh (10 HS/lớp = 60 HS) ──────────────────────────────────────
  const allStudents = [];
  let nameIdx = 0;

  for (let classIdx = 0; classIdx < classInstances.length; classIdx++) {
    const ci = classInstances[classIdx];
    const classLabel = `${ci.grade}${ci.code}`;

    for (let num = 1; num <= 10; num++) {
      const nameInfo = ALL_STUDENT_NAMES[nameIdx % ALL_STUDENT_NAMES.length];
      nameIdx++;
      const studentCode = `HS${String(classIdx + 1).padStart(2, '0')}${String(num).padStart(2, '0')}`;
      const username = `hs_${classLabel.toLowerCase()}_${num.toString().padStart(2, '0')}`;
      const dob = new Date(2006 + (12 - ci.grade), Math.floor(Math.random() * 12), Math.floor(Math.random() * 27) + 1);

      // Tạo user account
      const userAccount = await prisma.user.create({
        data: {
          username,
          password_hash: hash('Student@123'),
          full_name: nameInfo.name,
          email: `${studentCode.toLowerCase()}@student.edu.vn`,
          phone: `09${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
          role_id: 3,
          status: 'ACTIVE',
        },
      });

      // Tạo student profile đầy đủ
      const student = await prisma.student.create({
        data: {
          user_id: userAccount.user_id,
          student_code: studentCode,
          date_of_birth: dob,
          class_instance_id: ci.instance.class_instance_id,
        },
      });

      allStudents.push({
        user: userAccount,
        student,
        classLabel,
        classInstanceId: ci.instance.class_instance_id,
      });
    }
    console.log(`   Lớp ${classLabel}: 10 học sinh tạo xong`);
  }
  console.log(`✅ Tổng: ${allStudents.length} học sinh`);

  // ── 10. Demo student accounts ─────────────────────────────────────────────
  // Đổi 2 HS đầu tiên (lớp 10A) thành username dễ nhớ
  await prisma.user.update({ where: { user_id: allStudents[0].user.user_id }, data: { username: 'hocsinh1' } });
  await prisma.user.update({ where: { user_id: allStudents[1].user.user_id }, data: { username: 'hocsinh2' } });
  console.log(`✅ Demo: hocsinh1 (${allStudents[0].student.student_code}) và hocsinh2 (${allStudents[1].student.student_code}) – lớp 10A`);

  // ── 11. Phụ huynh (6 PH cho 6 HS ngẫu nhiên) ─────────────────────────────
  // Chọn 6 HS từ 6 lớp khác nhau (HS số 5 của mỗi lớp)
  const parentStudentIndices = [4, 14, 24, 34, 44, 54]; // HS thứ 5 của mỗi lớp

  const parents = [];
  for (let i = 0; i < 6; i++) {
    const hs = allStudents[parentStudentIndices[i]];
    const parentName = `Phụ huynh của ${hs.user.full_name}`;
    const parentUsername = i === 0 ? 'phuhuynh1' : `ph_${hs.student.student_code.toLowerCase()}`;

    const parentUser = await prisma.user.create({
      data: {
        username: parentUsername,
        password_hash: hash('Parent@123'),
        full_name: parentName,
        email: `ph_${hs.student.student_code.toLowerCase()}@gmail.com`,
        phone: `08${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
        role_id: 4,
        status: 'ACTIVE',
      },
    });

    const parent = await prisma.parent.create({ data: { user_id: parentUser.user_id } });

    await prisma.studentParent.create({
      data: { student_id: hs.student.student_id, parent_id: parent.parent_id },
    });

    parents.push({ user: parentUser, parent, linkedStudent: hs });
  }
  console.log(`✅ 6 Phụ huynh tạo xong (phuhuynh1 / Parent@123 → liên kết với ${allStudents[4].user.full_name})`);

  // ── 12. Điểm số – 2 kỳ, tất cả môn, tất cả HS ────────────────────────────
  console.log('\n⏳ Đang tạo điểm số cho 60 học sinh × 8 môn × 2 kỳ...');

  let scoreCount = 0;
  for (const sem of [1, 2]) {
    for (const hs of allStudents) {
      for (const subj of subjects) {
        // TX: 3 điểm mỗi học kỳ
        const txCount = 3;
        for (let ord = 1; ord <= txCount; ord++) {
          await prisma.score.create({
            data: {
              student_id: hs.student.student_id,
              subject_id: subj.subject_id,
              semester: sem,
              score_type: 'TX',
              score_value: rndScore(),
              order_no: ord,
              created_by: teachers.find(t => t.subjectId === subj.subject_id)?.user.user_id || adminUser.user_id,
            },
          });
          scoreCount++;
        }

        // GK: 1 điểm
        await prisma.score.create({
          data: {
            student_id: hs.student.student_id,
            subject_id: subj.subject_id,
            semester: sem,
            score_type: 'GK',
            score_value: rndScore(),
            order_no: null,
            created_by: teachers.find(t => t.subjectId === subj.subject_id)?.user.user_id || adminUser.user_id,
          },
        });
        scoreCount++;

        // CK: 1 điểm
        await prisma.score.create({
          data: {
            student_id: hs.student.student_id,
            subject_id: subj.subject_id,
            semester: sem,
            score_type: 'CK',
            score_value: rndScore(),
            order_no: null,
            created_by: teachers.find(t => t.subjectId === subj.subject_id)?.user.user_id || adminUser.user_id,
          },
        });
        scoreCount++;
      }
    }
    console.log(`   Kỳ ${sem}: hoàn tất`);
  }
  console.log(`✅ Tổng điểm: ${scoreCount} bản ghi`);

  // ── 13. Notifications ─────────────────────────────────────────────────────
  const notif1 = await prisma.notification.create({
    data: {
      title: '📢 Lịch thi học kỳ 1 năm 2024-2025',
      content: 'Kính thông báo: Lịch thi học kỳ 1 bắt đầu từ ngày 16/12/2024. Học sinh cần có mặt trước 15 phút, mang đủ dụng cụ học tập và thẻ học sinh. Mọi vi phạm sẽ bị xử lý theo quy chế thi.',
      created_by: adminUser.user_id,
    },
  });

  // Gửi cho tất cả học sinh
  await prisma.notificationReceiver.createMany({
    data: allStudents.map(s => ({ notification_id: notif1.notification_id, user_id: s.user.user_id, is_read: false })),
  });

  const notif2 = await prisma.notification.create({
    data: {
      title: '📋 Họp phụ huynh học kỳ 1',
      content: 'Kính mời Quý phụ huynh tham dự buổi họp phụ huynh học kỳ 1 vào ngày 23/11/2024 lúc 8:00 sáng tại hội trường nhà trường. Đây là dịp để trao đổi về tình hình học tập của học sinh.',
      created_by: adminUser.user_id,
    },
  });
  await prisma.notificationReceiver.createMany({
    data: parents.map(p => ({ notification_id: notif2.notification_id, user_id: p.user.user_id, is_read: false })),
  });

  console.log('✅ 2 Thông báo tạo xong');

  // ── 14. Nhận xét học sinh ─────────────────────────────────────────────────
  // GVCN 10A (teacher Toán) nhận xét 3 học sinh lớp 10A kỳ 1
  const gvcn10A = teachers[GVCN_TEACHER_INDICES[0]];
  for (let i = 0; i < 3; i++) {
    const hs = allStudents[i];
    await prisma.comment.create({
      data: {
        student_id: hs.student.student_id,
        teacher_id: gvcn10A.user.user_id,
        semester: 1,
        content: `Em ${hs.user.full_name} có thái độ học tập ${i === 0 ? 'rất tích cực, cần tiếp tục phát huy' : i === 1 ? 'tốt, tuy nhiên cần chú ý hơn môn Tiếng Anh' : 'cần cải thiện, đặc biệt là sự chăm chú trong giờ học'}.`,
      },
    });
  }
  console.log('✅ Nhận xét học sinh tạo xong');

  // ── 15. Thành tích ────────────────────────────────────────────────────────
  // HS 1 gửi thành tích (PENDING)
  await prisma.achievement.create({
    data: {
      student_id: allStudents[0].student.student_id,
      title: 'Giải Nhì môn Toán cấp huyện',
      description: 'Tham gia kỳ thi Học sinh giỏi cấp huyện môn Toán lớp 10 và đạt giải Nhì. Kỳ thi diễn ra ngày 15/10/2024.',
      category: 'Học thuật',
      status: 'PENDING',
    },
  });

  // HS 2 gửi thành tích (APPROVED)
  const ach2 = await prisma.achievement.create({
    data: {
      student_id: allStudents[1].student.student_id,
      title: 'Huy chương Đồng Tiếng Anh Olympic',
      description: 'Đạt Huy chương Đồng tại kỳ thi Olympic Tiếng Anh cấp thành phố năm học 2024-2025.',
      category: 'Học thuật',
      status: 'APPROVED',
      reviewed_by: gvcn10A.user.user_id,
      reviewed_at: new Date(),
    },
  });

  await prisma.achievementComment.create({
    data: {
      achievement_id: ach2.achievement_id,
      teacher_id: gvcn10A.user.user_id,
      comment: 'Thành tích xuất sắc! Nhà trường rất tự hào về em. Tiếp tục phát huy nhé!',
    },
  });
  console.log('✅ Thành tích học sinh tạo xong');

  // ── Tổng kết tài khoản demo ───────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 SEED HOÀN THÀNH!\n');
  console.log('📋 TÀI KHOẢN DEMO:');
  console.log('═'.repeat(60));
  console.log('  Role            | Username          | Password');
  console.log('  ─'.repeat(30));
  console.log(`  Admin           | admin             | Admin@123`);
  console.log(`  GV Chủ nhiệm   | gv_chunhiem       | Teacher@123  ← GVCN lớp 10A`);
  console.log(`  GV Không GVCN  | gv_nochunhiem     | Teacher@123  ← GV Sử, không CN`);
  console.log(`  Học sinh 1      | hocsinh1          | Student@123  ← ${allStudents[0].user.full_name}`);
  console.log(`  Học sinh 2      | hocsinh2          | Student@123  ← ${allStudents[1].user.full_name}`);
  console.log(`  Phụ huynh      | phuhuynh1         | Parent@123   ← PH của ${allStudents[4].user.full_name}`);
  console.log('═'.repeat(60));
  console.log(`\n📊 THỐNG KÊ:`);
  console.log(`  – Học sinh: 60 (10/lớp × 6 lớp)`);
  console.log(`  – Phụ huynh: 6`);
  console.log(`  – Giáo viên: 8 (6 GVCN, 2 không GVCN)`);
  console.log(`  – Bản ghi điểm: ${scoreCount} (60 HS × 8 môn × 2 kỳ × 5 cột)`);
  console.log(`  – Lớp học: 6 (10A, 10B, 11A, 11B, 12A, 12B)`);
  console.log(`  – Năm học: 2024-2025`);
}

main()
  .catch((e) => { console.error('❌ Seed thất bại:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
