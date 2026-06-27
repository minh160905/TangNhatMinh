const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findFirst({
    where: { student_code: 'HS0105' },
    include: { user: true, class_instance: { include: { year: true, class: true } } }
  });
  console.log('student_id:', student.student_id);
  console.log('class_instance_id:', student.class_instance_id);
  console.log('year_id:', student.class_instance.year_id);
  console.log('year:', student.class_instance.year.name);

  const subjects = await prisma.subject.findMany({ select: { subject_id: true, subject_name: true } });
  console.log('Subjects:', JSON.stringify(subjects));
}

main().catch(console.error).finally(() => prisma.$disconnect());
