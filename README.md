# 🎓 EduManager – Hệ thống Quản lý và Đánh giá Học sinh THPT

Hệ thống web hoàn chỉnh quản lý học sinh THPT với 4 vai trò: Admin, Giáo viên, Học sinh, Phụ huynh.

## 📋 Tính năng chính

| Vai trò | Chức năng |
|---------|-----------|
| **Admin** | Quản lý người dùng, lớp học, môn học, phân công GV |
| **Giáo viên** | Nhập điểm (Excel-like), duyệt thành tích, nhận xét, gửi thông báo |
| **Học sinh** | Xem bảng điểm, gửi thành tích, nhận thông báo |
| **Phụ huynh** | Xem điểm con, nhận thông báo |

## 🛠 Công nghệ sử dụng

- **Frontend**: React 18 + Vite + Ant Design + React Query + Zustand
- **Backend**: Node.js + Express.js (Clean Architecture)
- **ORM**: Prisma
- **Database**: MySQL 8.0
- **Auth**: JWT

## 🚀 Hướng dẫn cài đặt

### Yêu cầu
- Node.js >= 18
- MySQL 8.0 (đang chạy)
- npm >= 9

### 1. Cấu hình database

Tạo database MySQL:
```sql
CREATE DATABASE school_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Cấu hình Backend

Mở file `backend/.env` và chỉnh sửa thông tin MySQL:

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/school_db"
JWT_SECRET="school_jwt_super_secret_key_2024"
PORT=5000
FRONTEND_URL=http://localhost:5173
```

### 3. Khởi động Backend

```bash
cd backend

# Push schema lên database
npx prisma db push

# Tạo dữ liệu mẫu
node prisma/seed.js

# Chạy server
npm run dev
```

Server sẽ chạy tại: http://localhost:5000

### 4. Khởi động Frontend

```bash
cd frontend
npm run dev
```

App sẽ chạy tại: http://localhost:5173

## 🔑 Tài khoản demo

| Vai trò | Username | Password | Ghi chú |
|---------|----------|----------|---------|
| Admin | `admin` | `Admin@123` | Toàn quyền hệ thống |
| GV Chủ nhiệm 10A | `gv_chunhiem` | `Teacher@123` | GVCN lớp 10A, dạy Toán |
| GV Không GVCN | `gv_nochunhiem` | `Teacher@123` | GV Sử, không chủ nhiệm |
| Học sinh 1 (10A) | `hocsinh1` | `Student@123` | Nguyễn Văn An – HS0101 |
| Học sinh 2 (10A) | `hocsinh2` | `Student@123` | Nguyễn Thị Ánh – HS0102 |
| Phụ huynh | `phuhuynh1` | `Parent@123` | PH của Lê Quốc Cường (HS0105) |

## 📁 Cấu trúc dự án

```
TangNhatMinh/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema (17 tables)
│   │   └── seed.js          # Sample data
│   └── src/
│       ├── app.js           # Express entry point
│       ├── config/          # Prisma config
│       ├── middleware/       # Auth + Error handlers
│       ├── modules/         # Feature modules
│       │   ├── auth/        # Login/Logout
│       │   ├── users/       # User management
│       │   ├── classes/     # Classes + Academic years
│       │   ├── subjects/    # Subjects
│       │   ├── assignments/ # Teacher assignments
│       │   ├── scores/      # Score entry + pivot
│       │   ├── student/     # Student report
│       │   ├── achievements/# Achievement submission + review
│       │   ├── notifications/# Notifications + bell
│       │   └── comments/    # Teacher comments
│       └── utils/           # Response helpers
│
└── frontend/
    └── src/
        ├── api/             # API calls (axios)
        ├── components/
        │   ├── layout/      # AppLayout, sidebar
        │   └── common/      # NotificationBell
        ├── pages/
        │   ├── auth/        # Login
        │   ├── admin/       # Users, Classes, Assignments, Subjects
        │   ├── teacher/     # ScoreEntry, Achievements, Comments, Notifications
        │   ├── student/     # ScoreReport, Achievements
        │   ├── parent/      # ChildReport
        │   └── shared/      # Notifications
        ├── router/          # Protected routes
        ├── store/           # Zustand auth store
        └── utils/           # Helpers
```

## 🧮 Công thức tính điểm

```
ĐTB Môn = (TB_TX + 2 × GK + 3 × CK) / 6

Trong đó:
- TB_TX = Trung bình các điểm thường xuyên (tối đa 5 điểm)
- GK = Điểm giữa kỳ (1 điểm)
- CK = Điểm cuối kỳ (1 điểm)
```

## 🎨 Màu highlight bảng điểm

| Ngưỡng | Màu | Xếp loại |
|--------|-----|-----------|
| ≥ 8.0 | 🟢 Xanh lá | Giỏi |
| ≥ 6.5 | 🔵 Xanh dương | Khá |
| ≥ 5.0 | 🟡 Vàng | Trung bình |
| < 5.0 | 🔴 Đỏ | Yếu |

## 🔌 API Endpoints

```
POST /api/auth/login          # Đăng nhập
GET  /api/auth/me             # Thông tin user

GET  /api/users               # Danh sách users (ADMIN)
POST /api/users               # Tạo user (ADMIN)
PUT  /api/users/:id           # Cập nhật user (ADMIN)
PATCH /api/users/:id/status   # Khóa/mở tài khoản (ADMIN)

GET  /api/classes             # Danh sách lớp cơ bản
GET  /api/classes/instances   # Danh sách lớp theo năm
POST /api/classes/instances   # Tạo lớp học

GET  /api/scores/class        # Bảng điểm lớp (TEACHER)
POST /api/scores              # Nhập điểm (TEACHER)
POST /api/scores/batch        # Nhập điểm hàng loạt (TEACHER)

GET  /api/student/report      # Báo cáo điểm (STUDENT/PARENT)

POST /api/achievements        # Gửi thành tích (STUDENT)
PUT  /api/achievements/:id/review  # Duyệt thành tích (TEACHER)

POST /api/notifications       # Gửi thông báo (TEACHER/ADMIN)
GET  /api/notifications/unread-count  # Số chưa đọc (badge)
```

## 🔒 Phân quyền (RBAC)

| Route | ADMIN | TEACHER | STUDENT | PARENT |
|-------|-------|---------|---------|--------|
| User management | ✅ | ❌ | ❌ | ❌ |
| Class management | ✅ | ❌ | ❌ | ❌ |
| Score entry | ❌ | ✅ | ❌ | ❌ |
| Achievement review | ❌ | ✅ (GVCN) | ❌ | ❌ |
| View own scores | ❌ | ❌ | ✅ | ❌ |
| View child scores | ❌ | ❌ | ❌ | ✅ |
