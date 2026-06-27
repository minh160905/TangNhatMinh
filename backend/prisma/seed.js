/**
 * SEED FILE – EduManager THPT
 * Dữ liệu mẫu đầy đủ theo yêu cầu:
 *  – 9 lớp: 10A, 10B, 10C, 11A, 11B, 11C, 12A, 12B, 12C
 *  – 10 học sinh / lớp (90 HS tổng)
 *  – 9 phụ huynh cho 9 HS ngẫu nhiên
 *  – 8 môn học + 32 giáo viên (4 GV/môn, 3 GV mới thêm vào mỗi tổ)
 *  – 9/32 GV làm GVCN
 *  – 2 kỳ học, điểm số đầy đủ tất cả môn, gán year_id đầy đủ
 *  – Tự động sinh thời khóa biểu cho tất cả các lớp
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
  'Đinh Đức Hòa', 'Lê Minh Khải', 'Lý Hoàng Phi', 'Trần Minh Trí',
  'Phạm Thế Vũ', 'Bùi Xuân Trường', 'Hoàng Anh Tú', 'Đỗ Thành Đạt'
];

const FEMALE_NAMES = [
  'Nguyễn Thị Ánh', 'Trần Thị Bình', 'Lê Thị Châu', 'Phạm Thị Dung',
  'Hoàng Thị Linh', 'Đặng Thị Mai', 'Vũ Thị Ngọc', 'Bùi Thị Oanh',
  'Đỗ Thị Phương', 'Ngô Thị Quỳnh', 'Đinh Thị Rô', 'Lý Thị Sen',
  'Phan Thị Thắm', 'Tô Thị Uyên', 'Huỳnh Thị Vân', 'Cao Thị Xuân',
  'Mai Thị Yến', 'Hồ Thị Zân', 'Lê Thị An', 'Trịnh Thị Bé',
  'Nguyễn Thị Cẩm', 'Phạm Thị Diệu', 'Dương Thị Giang', 'Tạ Thị Hoa',
  'Đào Thị Hương', 'Hà Thị Khánh', 'Trương Thị Lan', 'Bùi Thị Mơ',
  'Đinh Thị Nga', 'Lê Thị Phú', 'Phan Hoài An', 'Trần Mỹ Lệ',
  'Vũ Thu Trang', 'Hoàng Ngọc Vy', 'Đặng Mai Phương', 'Lê Cẩm Tú'
];

// Ghép danh sách học sinh
const ALL_STUDENT_NAMES = [];
for (let i = 0; i < Math.min(MALE_NAMES.length, FEMALE_NAMES.length); i++) {
  ALL_STUDENT_NAMES.push({ name: MALE_NAMES[i], gender: 'M' });
  ALL_STUDENT_NAMES.push({ name: FEMALE_NAMES[i], gender: 'F' });
}

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

const EXTRA_TEACHER_NAMES = [
  // Toán
  ['Phạm Văn Đại', 'Lê Hữu Hải', 'Nguyễn Thị Hồng'],
  // Lý
  ['Trần Quốc Huy', 'Bùi Thị Dung', 'Nguyễn Minh Tuấn'],
  // Hóa
  ['Phan Thanh Sơn', 'Vũ Thị Thúy', 'Nguyễn Văn Minh'],
  // Sinh
  ['Đỗ Đức Thịnh', 'Lê Thị Thu', 'Nguyễn Hoàng Nam'],
  // Sử
  ['Trần Văn Hùng', 'Phạm Minh Trí', 'Hoàng Thị Thanh'],
  // Địa
  ['Nguyễn Thị Mai', 'Đặng Quốc Bảo', 'Vũ Văn Kiên'],
  // Văn
  ['Lê Thị Lan', 'Bùi Văn Sang', 'Trần Thị Thảo'],
  // Tiếng Anh
  ['Nguyễn Anh Tuấn', 'Phạm Thị Trang', 'Lê Minh Thành']
];

const CLASS_CONFIG = [
  { code: 'A', grade: 10 },
  { code: 'B', grade: 10 },
  { code: 'C', grade: 10 },
  { code: 'A', grade: 11 },
  { code: 'B', grade: 11 },
  { code: 'C', grade: 11 },
  { code: 'A', grade: 12 },
  { code: 'B', grade: 12 },
  { code: 'C', grade: 12 },
];

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🗑️  Đang dọn dẹp dữ liệu cũ...');
  await prisma.schedule.deleteMany({});
  await prisma.achievementComment.deleteMany({});
  await prisma.achievement.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.conduct.deleteMany({});
  await prisma.score.deleteMany({});
  await prisma.notificationReceiver.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.studentParent.deleteMany({});
  await prisma.parent.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.teacherAssignment.deleteMany({});
  await prisma.departmentMember.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.classInstance.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.academicYear.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✅ Đã dọn dẹp xong cơ sở dữ liệu');

  console.log('🌱 Bắt đầu seed dữ liệu đầy đủ...\n');

  // ── 1. Roles ──────────────────────────────────────────────────────────────
  await prisma.role.createMany({
    data: [
      { role_id: 1, role_name: 'ADMIN' },
      { role_id: 2, role_name: 'TEACHER' },
      { role_id: 3, role_name: 'STUDENT' },
      { role_id: 4, role_name: 'PARENT' },
      { role_id: 5, role_name: 'PRINCIPAL' },
      { role_id: 6, role_name: 'HEAD_OF_DEPARTMENT' },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Roles: ADMIN, TEACHER, STUDENT, PARENT, PRINCIPAL, HEAD_OF_DEPARTMENT');

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

  // ── 2b. Hiệu trưởng (PRINCIPAL) ───────────────────────────────────────────
  const principalUser = await prisma.user.create({
    data: {
      username: 'gv_hieutruong',
      password_hash: hash('Teacher@123'),
      full_name: 'Nguyễn Thế Dân',
      email: 'hieutruong@school.edu.vn',
      phone: '0901111999',
      role_id: 5,
      status: 'ACTIVE',
    },
  });
  console.log('✅ Hiệu trưởng: gv_hieutruong / Teacher@123');

  // ── 3. Môn học ─────────────────────────────────────────────────────────────
  const subjects = [];
  for (const info of TEACHER_INFO) {
    const s = await prisma.subject.create({ data: { subject_name: info.subject } });
    subjects.push(s);
  }
  console.log(`✅ Môn học: ${subjects.map(s => s.subject_name).join(', ')}`);

  // ── 4. Giáo viên (32 giáo viên, 4 GV/tổ) ──────────────────────────
  const teachers = [];
  
  // 4a. 8 Giáo viên cốt cán (Tổ trưởng tương lai)
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

  // 4b. 24 Giáo viên thành viên mới (3 giáo viên mới mỗi tổ)
  for (let i = 0; i < subjects.length; i++) {
    const subj = subjects[i];
    const subjectCode = subj.subject_name.toLowerCase().replace(/[^a-z]/g, '').substring(0, 6);
    
    for (let extraIdx = 0; extraIdx < 3; extraIdx++) {
      const name = EXTRA_TEACHER_NAMES[i][extraIdx];
      const username = `gv_${subjectCode}_${extraIdx + 2}`;
      const t = await prisma.user.create({
        data: {
          username,
          password_hash: hash('Teacher@123'),
          full_name: name,
          email: `${subjectCode}${extraIdx + 2}@school.edu.vn`,
          phone: `0901${String(i).padStart(2, '0')}${String(extraIdx + 10).padStart(3, '0')}`,
          role_id: 2,
          status: 'ACTIVE',
        }
      });
      teachers.push({ user: t, subjectId: subj.subject_id, subjectName: subj.subject_name });
    }
  }

  // Cấu hình tài khoản đặc biệt và Tổ trưởng
  // - GV Toán cốt cán (teachers[0]) được đổi username thành gv_chunhiem (HEAD_OF_DEPARTMENT + GVCN 10A)
  await prisma.user.update({ where: { user_id: teachers[0].user.user_id }, data: { username: 'gv_chunhiem' } });

  // Thiết lập toàn bộ 8 GV cốt cán làm HEAD_OF_DEPARTMENT (Tổ trưởng)
  for (let i = 0; i < 8; i++) {
    await prisma.user.update({
      where: { user_id: teachers[i].user.user_id },
      data: { role_id: 6 } // HEAD_OF_DEPARTMENT
    });
  }

  // ── 5. Tổ chuyên môn & gán thành viên ─────────────────────────────────────
  console.log('🌱 Đang tạo tổ chuyên môn và gán thành viên...');
  for (let i = 0; i < subjects.length; i++) {
    const subject = subjects[i];
    const dept = await prisma.department.create({
      data: {
        department_name: `Tổ ${subject.subject_name}`,
        subject_id: subject.subject_id,
        head_teacher_id: teachers[i].user.user_id, // Tổ trưởng chuyên môn
      },
    });

    // Lọc tất cả thành viên thuộc tổ này (gồm 1 tổ trưởng + 3 giáo viên mới)
    const deptTeachers = teachers.filter(t => t.subjectId === subject.subject_id);
    for (const t of deptTeachers) {
      await prisma.departmentMember.create({
        data: {
          department_id: dept.department_id,
          teacher_id: t.user.user_id,
        },
      });
    }
  }
  console.log('✅ Đã thiết lập các tổ chuyên môn và gán thành viên');

  // ── 6. Năm học ─────────────────────────────────────────────────────────────
  const year = await prisma.academicYear.create({
    data: { name: '2024-2025', start_date: new Date('2024-09-02'), end_date: new Date('2025-05-31') },
  });
  console.log(`✅ Năm học: ${year.name}`);

  // ── 7. Lớp cơ bản (A, B, C) ────────────────────────────────────────────────
  const classA = await prisma.class.create({ data: { class_code: 'A' } });
  const classB = await prisma.class.create({ data: { class_code: 'B' } });
  const classC = await prisma.class.create({ data: { class_code: 'C' } });
  const classMap = { A: classA, B: classB, C: classC };

  // ── 7b. Class instances + gán GVCN tự động ──────────────────────────────────
  // GVCN gán tuần tự cho các lớp:
  // 10A -> index 0 (gv_chunhiem - Toán)
  // 10B -> index 1 (gv_l - Lý)
  // 10C -> index 8 (gv_toan_2 - Toán phụ)
  // 11A -> index 2 (gv_ha - Hóa)
  // 11B -> index 3 (gv_sinh - Sinh)
  // 11C -> index 11 (gv_ly_2 - Lý phụ)
  // 12A -> index 6 (gv_vn - Văn)
  // 12B -> index 7 (gv_tingan - Anh)
  // 12C -> index 14 (gv_hoa_2 - Hóa phụ)
  const classInstances = [];
  const gvcnIndicesMap = [0, 1, 8, 2, 3, 11, 6, 7, 14];

  for (let i = 0; i < CLASS_CONFIG.length; i++) {
    const cfg = CLASS_CONFIG[i];
    const teacherIdx = gvcnIndicesMap[i];
    const gvcnTeacher = teachers[teacherIdx];

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
  console.log('✅ 9 lớp học đã tạo và gán GVCN tự động');

  // ── 8. Phân công giảng dạy tự động (Xoay vòng) ───────────────────────────
  console.log('\n⏳ Đang phân công giảng dạy cho 9 lớp × 8 môn...');
  for (let ciIdx = 0; ciIdx < classInstances.length; ciIdx++) {
    const ci = classInstances[ciIdx];
    for (const subj of subjects) {
      const deptTeachers = teachers.filter(t => t.subjectId === subj.subject_id);
      const t = deptTeachers[ciIdx % deptTeachers.length]; // Xoay vòng 4 giáo viên

      await prisma.teacherAssignment.create({
        data: {
          teacher_id: t.user.user_id,
          class_instance_id: ci.instance.class_instance_id,
          subject_id: subj.subject_id,
        },
      });
    }
  }
  console.log('✅ Phân công giảng dạy tự động hoàn tất');

  // ── 9. Học sinh (10 HS/lớp = 90 HS) ──────────────────────────────────────
  console.log('\n🌱 Đang tạo học sinh...');
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

  // ── 10. Demo accounts ─────────────────────────────────────────────────────
  await prisma.user.update({ where: { user_id: allStudents[0].user.user_id }, data: { username: 'hocsinh1' } });
  await prisma.user.update({ where: { user_id: teachers[9].user.user_id }, data: { username: 'gv_bomon' } });
  console.log(`✅ Demo: hocsinh1 (${allStudents[0].student.student_code}) và gv_bomon (GV bộ môn Toán – Lê Hữu Hải)`);

  // ── 11. Phụ huynh (9 PH cho 9 HS ngẫu nhiên) ─────────────────────────────
  console.log('\n🌱 Đang tạo phụ huynh liên kết...');
  const parentStudentIndices = [4, 14, 24, 34, 44, 54, 64, 74, 84]; // HS thứ 5 của mỗi lớp
  const parents = [];

  for (let i = 0; i < 9; i++) {
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
  console.log(`✅ 9 Phụ huynh tạo xong (phuhuynh1 liên kết với ${allStudents[4].user.full_name})`);

  // ── 12. Điểm số – 2 kỳ, tất cả môn, tất cả HS ────────────────────────────
  console.log('\n⏳ Đang tạo điểm số cho 90 học sinh × 8 môn × 2 kỳ...');
  let scoreCount = 0;

  for (const sem of [1, 2]) {
    for (const hs of allStudents) {
      const classAssignments = await prisma.teacherAssignment.findMany({
        where: { class_instance_id: hs.classInstanceId }
      });
      
      for (const subj of subjects) {
        const assignment = classAssignments.find(a => a.subject_id === subj.subject_id);
        const teacherId = assignment ? assignment.teacher_id : adminUser.user_id;

        // TX: 3 điểm
        for (let ord = 1; ord <= 3; ord++) {
          await prisma.score.create({
            data: {
              student_id: hs.student.student_id,
              subject_id: subj.subject_id,
              year_id: year.year_id,
              semester: sem,
              score_type: 'TX',
              score_value: rndScore(),
              order_no: ord,
              created_by: teacherId,
            },
          });
          scoreCount++;
        }

        // GK: 1 điểm
        await prisma.score.create({
          data: {
            student_id: hs.student.student_id,
            subject_id: subj.subject_id,
            year_id: year.year_id,
            semester: sem,
            score_type: 'GK',
            score_value: rndScore(),
            order_no: null,
            created_by: teacherId,
          },
        });
        scoreCount++;

        // CK: 1 điểm
        await prisma.score.create({
          data: {
            student_id: hs.student.student_id,
            subject_id: subj.subject_id,
            year_id: year.year_id,
            semester: sem,
            score_type: 'CK',
            score_value: rndScore(),
            order_no: null,
            created_by: teacherId,
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
  console.log('🌱 Đang tạo nhận xét học sinh...');
  for (let ciIdx = 0; ciIdx < classInstances.length; ciIdx++) {
    const ci = classInstances[ciIdx];
    const classStudents = allStudents.filter(s => s.classInstanceId === ci.instance.class_instance_id);
    
    const instanceWithGvcn = await prisma.classInstance.findUnique({
      where: { class_instance_id: ci.instance.class_instance_id },
      select: { homeroom_teacher_id: true }
    });
    
    if (instanceWithGvcn && instanceWithGvcn.homeroom_teacher_id) {
      for (let i = 0; i < Math.min(3, classStudents.length); i++) {
        const hs = classStudents[i];
        await prisma.comment.create({
          data: {
            student_id: hs.student.student_id,
            teacher_id: instanceWithGvcn.homeroom_teacher_id,
            semester: 1,
            content: `Em ${hs.user.full_name} có thái độ học tập ${i === 0 ? 'rất tích cực, cần tiếp tục phát huy' : i === 1 ? 'tốt, tuy học lực cần cố gắng nhiều hơn' : 'cần cải thiện, đặc biệt là sự tập trung nghe giảng trong giờ học'}.`,
          },
        });
      }
    }
  }
  console.log('✅ Nhận xét học sinh tạo xong');

  // ── 14b. Đánh giá Hạnh kiểm học sinh ──────────────────────────────────────
  console.log('🌱 Đang tạo hạnh kiểm học sinh...');
  const ratings = ['EXCELLENT', 'GOOD', 'AVERAGE'];
  for (const hs of allStudents) {
    const ci = await prisma.classInstance.findUnique({
      where: { class_instance_id: hs.classInstanceId },
      select: { homeroom_teacher_id: true }
    });
    if (ci && ci.homeroom_teacher_id) {
      for (const sem of [1, 2]) {
        await prisma.conduct.create({
          data: {
            student_id: hs.student.student_id,
            semester: sem,
            year_id: year.year_id,
            rating: ratings[Math.floor(Math.random() * ratings.length)],
            note: 'Đánh giá hạnh kiểm định kỳ',
            teacher_id: ci.homeroom_teacher_id,
          }
        });
      }
    }
  }
  console.log('✅ Hạnh kiểm học sinh tạo xong');

  // ── 15. Thành tích ────────────────────────────────────────────────────────
  const gvcn10A = teachers[gvcnIndicesMap[0]];
  await prisma.achievement.create({
    data: {
      student_id: allStudents[0].student.student_id,
      title: 'Giải Nhì môn Toán cấp huyện',
      description: 'Tham gia kỳ thi Học sinh giỏi cấp huyện môn Toán lớp 10 và đạt giải Nhì. Kỳ thi diễn ra ngày 15/10/2024.',
      category: 'Học thuật',
      status: 'PENDING',
    },
  });

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

  // ── 16. Thời khóa biểu (Schedules) ─────────────────────────────────────────
  console.log('📅 Seeding thời khoá biểu cho 9 lớp...\n');
  const PERIODS_PER_DAY = [1, 2, 3, 4, 5, 6];
  const DAYS = [2, 3, 4, 5, 6]; // T2→T6
  const ROOMS = ['A101', 'A102', 'A103', 'B201', 'B202', 'B203', 'C301', 'C302', 'C303'];
  let totalCreatedSchedules = 0;

  for (let ciIdx = 0; ciIdx < classInstances.length; ciIdx++) {
    const ci = classInstances[ciIdx];
    const label = `${ci.grade}${ci.code}`;
    const assignments = await prisma.teacherAssignment.findMany({
      where: { class_instance_id: ci.instance.class_instance_id }
    });

    if (assignments.length === 0) {
      console.log(`  ⚠️  Lớp ${label}: không có GV phân công, bỏ qua`);
      continue;
    }

    const room = ROOMS[ciIdx % ROOMS.length];
    let assignmentIdx = 0;
    const scheduleEntries = [];

    for (const day of DAYS) {
      for (const period of PERIODS_PER_DAY) {
        const assignment = assignments[assignmentIdx % assignments.length];
        assignmentIdx++;
        scheduleEntries.push({
          class_instance_id: ci.instance.class_instance_id,
          day_of_week: day,
          period,
          subject_id: assignment.subject_id,
          teacher_id: assignment.teacher_id,
          room,
        });
      }
    }

    await prisma.schedule.createMany({ data: scheduleEntries, skipDuplicates: true });
    totalCreatedSchedules += scheduleEntries.length;
    console.log(`  Sub-step: Lớp ${label} -> ${scheduleEntries.length} tiết`);
  }
  console.log(`\n🎉 Hoàn thành thời khoá biểu! Tổng ${totalCreatedSchedules} tiết học được tạo.`);

  // ── Tổng kết tài khoản demo ───────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 SEED HOÀN THÀNH!\n');
  console.log('📋 TÀI KHOẢN DEMO:');
  console.log('═'.repeat(60));
  console.log('  Role            | Username          | Password');
  console.log('  ─'.repeat(30));
  console.log(`  Admin           | admin             | Admin@123`);
  console.log(`  GV Chủ nhiệm   | gv_chunhiem       | Teacher@123  ← GVCN lớp 10A`);
  console.log(`  Tổ trưởng Sử   | gv_su             | Teacher@123  ← Tổ trưởng Sử (không GVCN)`);
  console.log(`  GV bộ môn      | gv_bomon          | Teacher@123  ← GV bộ môn Toán (Thường) – Lê Hữu Hải`);
  console.log(`  Học sinh 1     | hocsinh1          | Student@123  ← ${allStudents[0].user.full_name}`);
  console.log(`  Phụ huynh      | phuhuynh1         | Parent@123   ← PH của Lê Quốc Cường`);
  console.log('═'.repeat(60));
  console.log(`\n📊 THỐNG KÊ:`);
  console.log(`  – Học sinh: 90 (10/lớp × 9 lớp)`);
  console.log(`  – Phụ huynh: 9`);
  console.log(`  – Giáo viên: 32 (9 GVCN, 23 bộ môn)`);
  console.log(`  – Bản ghi điểm: ${scoreCount} (90 HS × 8 môn × 2 kỳ × 5 cột)`);
  console.log(`  – Lớp học: 9 (10A/B/C, 11A/B/C, 12A/B/C)`);
  console.log(`  – Năm học: 2024-2025`);
}

main()
  .catch((e) => { console.error('❌ Seed thất bại:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
