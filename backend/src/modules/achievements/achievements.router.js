const express = require('express');
const router = express.Router();
const svc = require('./achievements.service');
const upload = require('./upload.middleware');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { success, created, error } = require('../../utils/response');

router.use(authenticate);

// ── GET all (filtered by role) ────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try { success(res, await svc.getAll(req.query, req.user)); } catch (e) { next(e); }
});

// ── POST submit achievement + upload files ────────────────────────────────
router.post(
  '/',
  authorize('STUDENT'),
  (req, res, next) => {
    // Use multer with Cloudinary; handle multer-specific errors gracefully
    upload.array('files', 5)(req, res, (err) => {
      if (err) {
        return error(res, err.message || 'Lỗi tải file lên Cloudinary', 400);
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const achievement = await svc.create(req.body, req.user.userId, req.files || []);
      created(res, achievement, 'Gửi thành tích thành công');
    } catch (e) { next(e); }
  }
);

// ── PUT review achievement (GVCN only) ───────────────────────────────────
router.put('/:id/review', authorize('TEACHER'), async (req, res, next) => {
  try {
    const { status, comment } = req.body;
    success(res, await svc.review(req.params.id, status, req.user.userId, comment));
  } catch (e) { next(e); }
});

// ── POST add comment on achievement ──────────────────────────────────────
router.post('/:id/comments', authorize('TEACHER'), async (req, res, next) => {
  try {
    created(res, await svc.addComment(req.params.id, req.user.userId, req.body.comment));
  } catch (e) { next(e); }
});

// ── DELETE file from achievement (student can delete own pending files) ──
router.delete('/files/:fileId', authorize('STUDENT', 'TEACHER', 'ADMIN'), async (req, res, next) => {
  try {
    success(res, await svc.deleteFile(req.params.fileId), 'File đã được xóa');
  } catch (e) { next(e); }
});

module.exports = router;
