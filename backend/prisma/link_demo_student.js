/**
 * Script: Link hocsinh2 demo account to Lê Quốc Cường's data
 * - Rename hocsinh2 → hs_old_demo (free up the name)
 * - Rename Lê Quốc Cường's user → hocsinh2
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find student Lê Quốc Cường (student_id = 5)
  const lqc = await prisma.student.findUnique({
    where: { student_id: 5 },
    include: { user: true },
  });

  if (!lqc) {
    console.error('❌ Không tìm thấy học sinh student_id=5');
    return;
  }
  console.log(`🔍 Tìm thấy: ${lqc.user.full_name} (username: ${lqc.user.username})`);

  // Find hocsinh2 account
  const hocsinh2 = await prisma.user.findUnique({ where: { username: 'hocsinh2' } });
  if (!hocsinh2) {
    console.error('❌ Không tìm thấy tài khoản hocsinh2');
    return;
  }
  console.log(`🔍 Tìm thấy: hocsinh2 → ${hocsinh2.full_name} (user_id: ${hocsinh2.user_id})`);

  // Step 1: Rename hocsinh2 to hs_old_demo (free up the username)
  await prisma.user.update({
    where: { user_id: hocsinh2.user_id },
    data: { username: 'hs_old_demo' },
  });
  console.log(`✅ Đã đổi hocsinh2 → hs_old_demo`);

  // Step 2: Rename Lê Quốc Cường's account to hocsinh2
  await prisma.user.update({
    where: { user_id: lqc.user_id },
    data: { username: 'hocsinh2' },
  });
  console.log(`✅ Đã đổi ${lqc.user.username} → hocsinh2`);

  // Verify
  const verify = await prisma.student.findUnique({
    where: { student_id: 5 },
    include: { user: true, class_instance: { include: { class: true, year: true } } },
  });
  console.log('\n🎉 Kết nối thành công!');
  console.log(`   Tài khoản demo: hocsinh2 / Student@123`);
  console.log(`   Học sinh: ${verify.user.full_name}`);
  console.log(`   Mã HS: ${verify.student_code}`);
  console.log(`   Lớp: ${verify.class_instance?.grade}${verify.class_instance?.class?.class_code}`);
  console.log(`   Năm học: ${verify.class_instance?.year?.name}`);
}

main()
  .catch(e => { console.error('❌ Lỗi:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
