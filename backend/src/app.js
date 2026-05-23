require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const authRouter = require('./modules/auth/auth.router');
const usersRouter = require('./modules/users/users.router');
const classesRouter = require('./modules/classes/classes.router');
const subjectsRouter = require('./modules/subjects/subjects.router');
const assignmentsRouter = require('./modules/assignments/assignments.router');
const scoresRouter = require('./modules/scores/scores.router');
const studentRouter = require('./modules/student/student.router');
const achievementsRouter = require('./modules/achievements/achievements.router');
const notificationsRouter = require('./modules/notifications/notifications.router');
const commentsRouter = require('./modules/comments/comments.router');
const conductRouter = require('./modules/comments/conduct.router');
const schedulesRouter = require('./modules/schedules/schedules.router');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static files (uploads) ──────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/classes', classesRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/scores', scoresRouter);
app.use('/api/student', studentRouter);
app.use('/api/achievements', achievementsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/conducts', conductRouter);
app.use('/api/schedules', schedulesRouter);

// ── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
