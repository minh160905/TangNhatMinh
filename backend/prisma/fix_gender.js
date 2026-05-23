require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const students = await prisma.student.findMany({
    include: { user: { select: { full_name: true } } },
    orderBy: { student_id: 'asc' },
  });

  for (const s of students) {
    const name = s.user.full_name || '';
    // Tên Việt: có chữ ' Thị ' = nữ
    const gender = name.includes(' Thị ') ? 'Nữ' : 'Nam';
    await prisma.student.update({ where: { student_id: s.student_id }, data: { gender } });
  }
  console.log('✅ Fixed gender for', students.length, 'students');

  const sample = await prisma.student.findMany({
    take: 6, include: { user: { select: { full_name: true } } }, orderBy: { student_id: 'asc' },
  });
  sample.forEach(s => console.log(` ${s.user.full_name} → ${s.gender} | ${s.hometown}`));
  await prisma.$disconnect();
}
fix().catch(console.error);
