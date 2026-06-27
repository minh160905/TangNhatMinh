const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// student_id=5 (Lê Quốc Cường), class_instance_id=1, year_id=1 (2024-2025)
const STUDENT_ID = 5;
const YEAR_ID = 1;

// Realistic scores for semester 1 and 2
const scoreData = [
  // subject_id, semester, TX scores (up to 3), GK, CK
  { subjectId: 1,  name: 'Toán',      s1: { tx: [7.5, 8.0, 6.5], gk: 7.0, ck: 8.5 }, s2: { tx: [8.0, 8.5, 7.5], gk: 8.0, ck: 9.0 } },
  { subjectId: 2,  name: 'Lý',        s1: { tx: [6.5, 7.0, 7.5], gk: 6.5, ck: 7.0 }, s2: { tx: [7.0, 7.5, 8.0], gk: 7.5, ck: 8.0 } },
  { subjectId: 3,  name: 'Hóa',       s1: { tx: [8.0, 8.5, 9.0], gk: 8.0, ck: 8.5 }, s2: { tx: [8.5, 9.0, 8.0], gk: 8.5, ck: 9.0 } },
  { subjectId: 4,  name: 'Sinh',      s1: { tx: [7.0, 6.5, 7.5], gk: 6.0, ck: 7.0 }, s2: { tx: [7.5, 7.0, 8.0], gk: 7.0, ck: 7.5 } },
  { subjectId: 5,  name: 'Sử',        s1: { tx: [6.0, 6.5, 5.5], gk: 6.0, ck: 6.5 }, s2: { tx: [6.5, 7.0, 6.0], gk: 6.5, ck: 7.0 } },
  { subjectId: 6,  name: 'Địa',       s1: { tx: [5.5, 6.0, 6.5], gk: 5.5, ck: 6.0 }, s2: { tx: [6.0, 6.5, 7.0], gk: 6.5, ck: 7.0 } },
  { subjectId: 7,  name: 'Văn',       s1: { tx: [7.5, 8.0, 7.0], gk: 7.5, ck: 8.0 }, s2: { tx: [8.0, 8.5, 7.5], gk: 8.0, ck: 8.5 } },
  { subjectId: 8,  name: 'Tiếng Anh', s1: { tx: [6.0, 5.5, 6.5], gk: 5.5, ck: 6.0 }, s2: { tx: [6.5, 7.0, 6.0], gk: 6.5, ck: 7.0 } },
  { subjectId: 9,  name: 'GDCD',      s1: { tx: [9.0, 8.5, 9.5], gk: 9.0, ck: 9.5 }, s2: { tx: [9.5, 9.0, 10.0], gk: 9.5, ck: 10.0 } },
  { subjectId: 10, name: 'Tin học',   s1: { tx: [8.5, 9.0, 8.0], gk: 8.5, ck: 9.0 }, s2: { tx: [9.0, 9.5, 8.5], gk: 9.0, ck: 9.5 } },
  { subjectId: 11, name: 'Thể dục',   s1: { tx: [8.0, 8.5, 9.0], gk: 8.5, ck: 9.0 }, s2: { tx: [9.0, 8.5, 9.5], gk: 9.0, ck: 9.5 } },
  { subjectId: 12, name: 'Công Nghệ', s1: { tx: [7.0, 7.5, 8.0], gk: 7.0, ck: 7.5 }, s2: { tx: [7.5, 8.0, 7.0], gk: 8.0, ck: 8.0 } },
];

async function main() {
  // Delete existing scores for this student first
  await prisma.score.deleteMany({ where: { student_id: STUDENT_ID, year_id: YEAR_ID } });
  console.log('Cleared old scores.');

  const records = [];

  for (const sub of scoreData) {
    for (const [sem, semKey] of [[1, 's1'], [2, 's2']]) {
      const semData = sub[semKey];

      // TX scores
      semData.tx.forEach((val, idx) => {
        records.push({
          student_id: STUDENT_ID,
          subject_id: sub.subjectId,
          year_id: YEAR_ID,
          semester: sem,
          score_type: 'TX',
          score_value: val,
          order_no: idx + 1,
        });
      });

      // GK
      records.push({
        student_id: STUDENT_ID,
        subject_id: sub.subjectId,
        year_id: YEAR_ID,
        semester: sem,
        score_type: 'GK',
        score_value: semData.gk,
        order_no: null,
      });

      // CK
      records.push({
        student_id: STUDENT_ID,
        subject_id: sub.subjectId,
        year_id: YEAR_ID,
        semester: sem,
        score_type: 'CK',
        score_value: semData.ck,
        order_no: null,
      });
    }
  }

  await prisma.score.createMany({ data: records });
  console.log(`Inserted ${records.length} score records for Le Quoc Cuong (student_id=${STUDENT_ID}).`);

  // Quick summary
  for (const sub of scoreData) {
    for (const [sem, semKey] of [[1, 's1'], [2, 's2']]) {
      const d = sub[semKey];
      const txAvg = d.tx.reduce((a,b) => a+b,0) / d.tx.length;
      const dtb = Math.round(((txAvg + 2*d.gk + 3*d.ck) / 6) * 100) / 100;
      console.log(`  ${sub.name} HK${sem}: TX=${txAvg.toFixed(2)} GK=${d.gk} CK=${d.ck} → ĐTB=${dtb}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
