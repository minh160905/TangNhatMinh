/**
 * AUTO-SCHEDULE SERVICE – EduManager THPT
 * ══════════════════════════════════════════════════════════════════════
 * Thuật toán tự động sắp xếp thời khoá biểu dựa trên phân công GV.
 *
 * Ràng buộc HARD (bắt buộc):
 *   H1. Không có 2 lớp trùng GV ở cùng tiết (day + period).
 *   H2. Mỗi lớp chỉ học 1 tiết tại 1 thời điểm (class_busy).
 *   H3. GV dạy lớp đó môn đó phải được phân công (teacher_assignments).
 *   H4. Mỗi môn xuất hiện tối đa 1 lần/ngày/lớp (tránh nhồi cùng ngày).
 *
 * Ràng buộc SOFT (cố gắng thỏa):
 *   S1. Max 4 tiết/GV/ngày.
 *   S2. Max 7 tiết/lớp/ngày.
 *   S3. Phân phối đều các môn theo ngày.
 *
 * Thuật toán: Greedy + MRV heuristic
 *   - Xử lý slot bị ràng buộc nhất trước (ít GV khả dụng nhất).
 *   - Chọn GV có tải thấp nhất tại thời điểm gán (Load-Balancing).
 *   - Duyệt ngày theo thứ tự lớp ít tiết nhất → phân phối đều.
 * ══════════════════════════════════════════════════════════════════════
 */

const prisma = require('../../config/prisma');

// ── Constants ─────────────────────────────────────────────────────────────────
const DAYS = [2, 3, 4, 5, 6, 7]; // Thứ 2 → Thứ 7 (6 ngày/tuần)
const ALL_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Trả về số tiết/tuần mặc định cho môn học dựa theo tên.
 * Quy tắc:
 *   - Môn chính (Toán, Văn, Anh): 3 tiết
 *   - Môn cơ bản (Lý, Hóa, Sinh, GDCD, Tin học, Thể dục): 2 tiết
 *   - Môn phụ (Sử, Địa, Âm nhạc, ...): 1 tiết
 */
const defaultPeriodsForSubject = (subjectName = '') => {
  const n = subjectName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/toan|van|anh/.test(n)) return 3;
  if (/ly|hoa|sinh|gdcd|tin|the|am nhac|nhac/.test(n)) return 2;
  return 1;
};

/**
 * Hàm sinh thời khoá biểu tự động.
 *
 * @param {Object} options
 * @param {number[]|null} options.classInstanceIds  - danh sách lớp cần xếp (null = tất cả)
 * @param {Object} options.periodsPerGrade          - { [grade]: { [subject_id]: N } } tiết/tuần theo khối
 *                                                    VD: { "10": { "1": 3, "2": 2 }, "11": { "1": 4 } }
 *                                                    Nếu khối không có cấu hình → dùng defaultPeriodsForSubject
 * @param {number|null} options.year_id             - lọc theo năm học
 * @param {number} options.maxTeacherPeriodsPerDay  - max tiết GV/ngày (default: 4)
 * @param {number} options.maxClassPeriodsPerDay    - max tiết lớp/ngày (default: 7)
 * @returns {{ scheduled, failed, stats }}
 */
const generate = async ({
  classInstanceIds = null,
  periodsPerGrade = {},  // { [grade]: { [subject_id]: N } }
  year_id = null,
  maxTeacherPeriodsPerDay = 4,
  maxClassPeriodsPerDay = 7,
} = {}) => {

  // ── 1. Lấy tất cả phân công liên quan ─────────────────────────────────────
  const assignWhere = {};
  if (classInstanceIds?.length) {
    assignWhere.class_instance_id = { in: classInstanceIds.map(Number) };
  }
  if (year_id) {
    assignWhere.class_instance = { year_id: Number(year_id) };
  }

  const assignments = await prisma.teacherAssignment.findMany({
    where: assignWhere,
    include: {
      teacher: { select: { user_id: true, full_name: true, username: true } },
      class_instance: {
        include: {
          class: { select: { class_code: true } },
          year: { select: { name: true, year_id: true } },
        },
      },
      subject: { select: { subject_id: true, subject_name: true } },
    },
  });

  if (!assignments.length) {
    return {
      scheduled: [],
      failed: [],
      stats: null,
      error: 'Không có phân công nào để sắp xếp. Hãy phân công giáo viên trước.',
    };
  }

  // ── 2. Gom nhóm theo (class_instance_id, subject_id) ──────────────────────
  // Một nhóm có thể có NHIỀU GV (nếu nhiều GV được phân công dạy cùng 1 môn cho cùng 1 lớp).
  // Thuật toán sẽ chọn GV tải thấp nhất trong từng nhóm.
  const groupMap = new Map(); // key: "classId-subjectId"

  for (const a of assignments) {
    const key = `${a.class_instance_id}-${a.subject_id}`;
    if (!groupMap.has(key)) {
      // Trà về số tiết theo khối lớp (nếu không có cấu hình riêng → dùng default)
      const grade = a.class_instance.grade;
      const gradeStr = String(grade);
      const gradeConfig = periodsPerGrade?.[gradeStr] || periodsPerGrade?.[grade] || {};
      const subjectStr = String(a.subject_id);
      const periods_needed =
        gradeConfig[subjectStr] !== undefined ? Number(gradeConfig[subjectStr])
        : gradeConfig[a.subject_id] !== undefined ? Number(gradeConfig[a.subject_id])
        : defaultPeriodsForSubject(a.subject.subject_name);

      groupMap.set(key, {
        class_instance_id: a.class_instance_id,
        subject_id: a.subject_id,
        subject_name: a.subject.subject_name,
        grade,                    // Khối lớp (10, 11, 12)
        class_label: `${grade}${a.class_instance.class?.class_code}`,
        year_name: a.class_instance.year?.name,
        year_id: a.class_instance.year?.year_id,
        teachers: [],
        periods_needed,
      });
    }
    groupMap.get(key).teachers.push({
      teacher_id: a.teacher.user_id,
      teacher_name: a.teacher.full_name,
      username: a.teacher.username,
    });
  }

  // ── 3. Tạo danh sách slot cần xếp ─────────────────────────────────────────
  // Mỗi group tạo N requests (N = periods_needed)
  const requests = [];
  for (const group of groupMap.values()) {
    for (let i = 0; i < group.periods_needed; i++) {
      requests.push({ ...group, slotIndex: i });
    }
  }

  // ── 4. MRV heuristic: sắp xếp slot "bị ràng buộc nhất" lên đầu ───────────
  // Bị ràng buộc nhiều hơn = GV ít hơn (ít lựa chọn) → xếp trước để tránh deadlock.
  // Nếu bằng nhau → xếp GV có tổng tiết nhiều hơn trước.
  const teacherTotalSlots = {}; // teacher_id → tổng số slot mà GV đó có thể dạy
  for (const r of requests) {
    for (const t of r.teachers) {
      teacherTotalSlots[t.teacher_id] = (teacherTotalSlots[t.teacher_id] || 0) + 1;
    }
  }

  requests.sort((a, b) => {
    // Ít GV hơn → ưu tiên hơn
    const diff = a.teachers.length - b.teachers.length;
    if (diff !== 0) return diff;
    // Cùng số GV → GV bận hơn → ưu tiên hơn
    const maxA = Math.max(...a.teachers.map(t => teacherTotalSlots[t.teacher_id] || 0));
    const maxB = Math.max(...b.teachers.map(t => teacherTotalSlots[t.teacher_id] || 0));
    return maxB - maxA;
  });

  // ── 5. Khởi tạo cấu trúc theo dõi ────────────────────────────────────────
  const teacherSlots = {};        // teacher_id → Set<"day-period">
  const classSlots = {};          // class_id   → Set<"day-period">
  const teacherDayLoad = {};      // teacher_id → { [day]: count }
  const classDayLoad = {};        // class_id   → { [day]: count }
  const classSubjectDays = {};    // "class-subject" → Set<day>
  const teacherTotal = {};        // teacher_id → total periods scheduled (for balancing)

  const ensureInit = (id, store, factory) => {
    if (!store[id]) store[id] = factory();
  };

  const scheduled = [];
  const failed = [];

  // ── 6. Vòng lặp phân công (Greedy) ────────────────────────────────────────
  for (const req of requests) {
    const { class_instance_id, subject_id, teachers, slotIndex } = req;
    const subjectKey = `${class_instance_id}-${subject_id}`;

    // Khởi tạo tracking cho lớp này
    ensureInit(class_instance_id, classSlots, () => new Set());
    ensureInit(class_instance_id, classDayLoad, () => ({}));
    ensureInit(subjectKey, classSubjectDays, () => new Set());

    // Khởi tạo tracking cho các GV trong nhóm
    for (const t of teachers) {
      ensureInit(t.teacher_id, teacherSlots, () => new Set());
      ensureInit(t.teacher_id, teacherDayLoad, () => ({}));
      ensureInit(t.teacher_id, teacherTotal, () => 0);
    }

    let assigned = false;

    // Sắp xếp ngày theo số tiết lớp đã có (ít → nhiều) → phân phối đều
    const dayOrder = [...DAYS].sort((a, b) => {
      const ca = classDayLoad[class_instance_id][a] || 0;
      const cb = classDayLoad[class_instance_id][b] || 0;
      return ca - cb;
    });

    for (const day of dayOrder) {
      if (assigned) break;

      // H4: Không xếp cùng môn 2 lần trong 1 ngày cho cùng lớp
      if (classSubjectDays[subjectKey].has(day)) continue;

      // S2: Max tiết lớp/ngày
      if ((classDayLoad[class_instance_id][day] || 0) >= maxClassPeriodsPerDay) continue;

      for (const period of ALL_PERIODS) {
        if (assigned) break;
        const slotKey = `${day}-${period}`;

        // H2: Lớp phải rảnh
        if (classSlots[class_instance_id].has(slotKey)) continue;

        // Lọc GV khả dụng: rảnh tiết này + chưa quá tải ngày này
        const availableTeachers = teachers.filter(t =>
          !teacherSlots[t.teacher_id].has(slotKey) &&
          (teacherDayLoad[t.teacher_id][day] || 0) < maxTeacherPeriodsPerDay
        );

        if (!availableTeachers.length) continue;

        // Chọn GV có tổng tiết ít nhất → Load Balancing
        availableTeachers.sort(
          (a, b) => (teacherTotal[a.teacher_id] || 0) - (teacherTotal[b.teacher_id] || 0)
        );
        const chosen = availableTeachers[0];

        // ── Gán tiết ──────────────────────────────────────────────────────
        classSlots[class_instance_id].add(slotKey);
        teacherSlots[chosen.teacher_id].add(slotKey);
        classDayLoad[class_instance_id][day] = (classDayLoad[class_instance_id][day] || 0) + 1;
        teacherDayLoad[chosen.teacher_id][day] = (teacherDayLoad[chosen.teacher_id][day] || 0) + 1;
        classSubjectDays[subjectKey].add(day);
        teacherTotal[chosen.teacher_id]++;

        scheduled.push({
          class_instance_id,
          day_of_week: day,
          period,
          subject_id,
          teacher_id: chosen.teacher_id,
          // Metadata (chỉ dùng preview, không lưu DB)
          _class_label: req.class_label,
          _subject_name: req.subject_name,
          _teacher_name: chosen.teacher_name,
        });

        assigned = true;
      }
    }

    if (!assigned) {
      failed.push({
        class_label: req.class_label,
        subject_name: req.subject_name,
        slot_index: slotIndex + 1,
        total_needed: req.periods_needed,
        teacher_names: teachers.map(t => t.teacher_name).join(' / '),
        reason: 'Không tìm được khung giờ phù hợp (GV bận hoặc lớp đầy)',
      });
    }
  }

  // ── 7. Tính thống kê ───────────────────────────────────────────────────────
  const stats = buildStats(scheduled, teacherTotal, assignments, requests.length, failed.length);

  return { scheduled, failed, stats };
};

// ── Helper: Tính thống kê cân bằng tải ────────────────────────────────────
const buildStats = (scheduled, teacherTotal, assignments, totalRequested, failedCount) => {
  // Build teacher info
  const teacherInfoMap = {};
  for (const a of assignments) {
    const tid = a.teacher.user_id;
    if (!teacherInfoMap[tid]) {
      teacherInfoMap[tid] = {
        full_name: a.teacher.full_name,
        username: a.teacher.username,
      };
    }
  }

  const teacherLoads = Object.entries(teacherTotal).map(([tid, count]) => ({
    teacher_id: Number(tid),
    full_name: teacherInfoMap[tid]?.full_name || `GV #${tid}`,
    username: teacherInfoMap[tid]?.username || '',
    periods_per_week: count,
  })).sort((a, b) => b.periods_per_week - a.periods_per_week);

  const values = teacherLoads.map(l => l.periods_per_week);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const max = values.length ? Math.max(...values) : 0;
  const min = values.length ? Math.min(...values) : 0;

  // Độ lệch chuẩn → đo mức độ mất cân bằng
  const stdDev = values.length
    ? Math.sqrt(values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length)
    : 0;

  // Balance score (0–100): 100 = hoàn toàn đều, 0 = rất lệch
  // Dùng hệ số biến thiên CV = stdDev/avg → balance = max(0, 1 - CV)
  const balanceScore = avg > 0
    ? Math.round(Math.max(0, 1 - stdDev / avg) * 100)
    : 100;

  return {
    total_requested: totalRequested,
    total_scheduled: scheduled.length,
    total_failed: failedCount,
    success_rate: totalRequested > 0 ? Math.round((scheduled.length / totalRequested) * 100) : 0,
    teachers: teacherLoads,
    avg_load: Math.round(avg * 10) / 10,
    max_load: max,
    min_load: min,
    std_dev: Math.round(stdDev * 10) / 10,
    balance_score: balanceScore,
    classes_count: new Set(scheduled.map(s => s.class_instance_id)).size,
    subjects_count: new Set(scheduled.map(s => s.subject_id)).size,
  };
};

/**
 * Áp dụng TKB đã generate vào DB.
 * Quy trình:
 *   1. Xóa toàn bộ TKB cũ của các lớp liên quan.
 *   2. Insert tất cả slot mới trong 1 transaction.
 *
 * @param {Array} scheduledSlots - mảng slot từ generate()
 * @returns {{ applied, classes_updated }}
 */
const applySchedule = async (scheduledSlots) => {
  if (!scheduledSlots?.length) {
    throw new Error('Không có tiết học nào để áp dụng');
  }

  // Chỉ lấy các field cần thiết cho DB (bỏ _metadata)
  const dbSlots = scheduledSlots.map(s => ({
    class_instance_id: Number(s.class_instance_id),
    day_of_week: Number(s.day_of_week),
    period: Number(s.period),
    subject_id: Number(s.subject_id),
    teacher_id: Number(s.teacher_id),
  }));

  const classIds = [...new Set(dbSlots.map(s => s.class_instance_id))];

  // Transaction: clear + insert
  await prisma.$transaction(async (tx) => {
    await tx.schedule.deleteMany({ where: { class_instance_id: { in: classIds } } });
    await tx.schedule.createMany({ data: dbSlots, skipDuplicates: true });
  });

  return {
    applied: dbSlots.length,
    classes_updated: classIds.length,
  };
};

module.exports = { generate, applySchedule, defaultPeriodsForSubject };
