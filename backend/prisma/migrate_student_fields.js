/**
 * Migration script: Thêm gender và hometown cho 60 học sinh đã có
 * Chạy: node prisma/migrate_student_fields.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Dữ liệu quê quán theo tỉnh thành Việt Nam
const HOMETOWNS = [
  'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
  'An Giang', 'Bà Rịa – Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
  'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
  'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông',
  'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang',
  'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình',
  'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu',
  'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định',
  'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên',
  'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị',
  'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên',
  'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang',
];

async function main() {
  console.log('🔄 Cập nhật gender & hometown cho 60 học sinh...\n');

  // Lấy tất cả students kèm user để biết giới tính từ tên
  const students = await prisma.student.findMany({
    include: { user: { select: { full_name: true } } },
    orderBy: { student_id: 'asc' },
  });

  let count = 0;
  for (const s of students) {
    // Phát hiện giới tính từ tên (Thị = Nữ, Văn/Đức/Quốc/Minh = Nam)
    const name = s.user.full_name || '';
    const isFemaleName = name.includes('Thị') || name.includes(' Ánh') || name.includes(' Bình')
      || name.includes(' Châu') || name.includes(' Dung') || name.includes(' Linh')
      || name.includes(' Mai') || name.includes(' Ngọc') || name.includes(' Oanh')
      || name.includes(' Phương') || name.includes(' Quỳnh') || name.includes(' Sen')
      || name.includes(' Thắm') || name.includes(' Uyên') || name.includes(' Vân')
      || name.includes(' Xuân') || name.includes(' Yến') || name.includes(' Giang')
      || name.includes(' Hoa') || name.includes(' Hương') || name.includes(' Khánh')
      || name.includes(' Lan') || name.includes(' Mơ') || name.includes(' Nga')
      || name.includes(' Cẩm') || name.includes(' Diệu') || name.includes(' Phú')
      || name.includes(' An') || name.includes(' Bé') || name.includes(' Zân');

    const gender = isFemaleName ? 'Nữ' : 'Nam';
    const hometown = HOMETOWNS[count % HOMETOWNS.length];

    await prisma.student.update({
      where: { student_id: s.student_id },
      data: { gender, hometown },
    });

    count++;
  }

  console.log(`✅ Đã cập nhật ${count} học sinh với gender và hometown`);

  // Kiểm tra sample
  const sample = await prisma.student.findMany({
    take: 3,
    include: { user: { select: { full_name: true } } },
    orderBy: { student_id: 'asc' },
  });
  console.log('\n📋 Mẫu dữ liệu:');
  sample.forEach(s => {
    console.log(`  ${s.user.full_name} → ${s.gender} | ${s.hometown}`);
  });
}

main()
  .catch((e) => { console.error('❌ Migration thất bại:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
