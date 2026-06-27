const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    select: { student_code: true }
  });
  console.log('Student codes:', students.map(s => s.student_code));
}

main().catch(console.error).finally(() => prisma.$disconnect());
