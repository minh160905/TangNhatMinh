const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find student Lê Quốc Cường (student_id = 5)
  const student = await prisma.student.findUnique({
    where: { student_id: 5 },
    include: {
      user: true,
      class_instance: {
        include: { homeroom_teacher: true }
      }
    }
  });

  if (!student) {
    console.error('❌ Không tìm thấy học sinh student_id=5 (Lê Quốc Cường)');
    return;
  }

  const teacherId = student.class_instance?.homeroom_teacher_id;
  const yearId = student.class_instance?.year_id;

  if (!teacherId || !yearId) {
    console.error('❌ Học sinh chưa có giáo viên chủ nhiệm hoặc năm học');
    return;
  }

  console.log(`👤 Học sinh: ${student.user.full_name}`);
  console.log(`👨‍🏫 Giáo viên chủ nhiệm ID: ${teacherId} (${student.class_instance.homeroom_teacher.full_name})`);
  console.log(`📅 Năm học ID: ${yearId}`);

  // Clear existing comments & conducts for student_id = 5 to have a clean slate
  await prisma.comment.deleteMany({ where: { student_id: 5 } });
  await prisma.conduct.deleteMany({ where: { student_id: 5 } });
  console.log('🧹 Đã dọn dẹp các nhận xét và hạnh kiểm cũ của Lê Quốc Cường');

  // Seed Comments
  const commentsData = [
    {
      student_id: 5,
      teacher_id: teacherId,
      semester: 1,
      content: 'Học sinh Lê Quốc Cường có ý thức học tập tốt trong Học kỳ I, chú ý nghe giảng và phát biểu xây dựng bài. Cần phát huy hơn nữa ở môn Toán.',
      created_at: new Date('2026-01-15T09:00:00Z'),
    },
    {
      student_id: 5,
      teacher_id: teacherId,
      semester: 1,
      content: 'Cường có mối quan hệ tốt với bạn bè, tích cực tham gia các hoạt động ngoại khóa của lớp.',
      created_at: new Date('2026-01-18T14:30:00Z'),
    },
    {
      student_id: 5,
      teacher_id: teacherId,
      semester: 2,
      content: 'Học kỳ II có nhiều tiến bộ vượt bậc, đặc biệt là các môn tự nhiên. Bài kiểm tra cuối kỳ đạt kết quả rất tốt.',
      created_at: new Date('2026-05-20T08:15:00Z'),
    },
    {
      student_id: 5,
      teacher_id: teacherId,
      semester: 2,
      content: 'Học sinh ngoan ngoãn, lễ phép, hoàn thành tốt mọi nhiệm vụ được giao.',
      created_at: new Date('2026-05-22T10:00:00Z'),
    }
  ];

  for (const comment of commentsData) {
    await prisma.comment.create({ data: comment });
  }
  console.log('✅ Đã tạo 4 nhận xét mẫu (2 cho HK1, 2 cho HK2)');

  // Seed Conducts
  await prisma.conduct.create({
    data: {
      student_id: 5,
      teacher_id: teacherId,
      semester: 1,
      year_id: yearId,
      rating: 'GOOD',
      note: 'Hạnh kiểm Khá. Ý thức kỷ luật tốt, đi học đầy đủ và đúng giờ. Cần chú ý giữ gìn trật tự trong giờ học hơn.',
    }
  });

  await prisma.conduct.create({
    data: {
      student_id: 5,
      teacher_id: teacherId,
      semester: 2,
      year_id: yearId,
      rating: 'EXCELLENT',
      note: 'Hạnh kiểm Tốt. Tích cực, năng nổ trong các hoạt động phong trào, đạt danh hiệu học sinh tiên tiến.',
    }
  });
  console.log('✅ Đã tạo 2 hạnh kiểm mẫu (HK1: Khá, HK2: Tốt)');

  console.log('\n🎉 Hoàn thành nạp dữ liệu demo nhận xét và hạnh kiểm!');
}

main()
  .catch(e => { console.error('❌ Lỗi:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
