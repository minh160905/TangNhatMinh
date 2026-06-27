const express = require('express');
const router = express.Router();
const svc = require('./notifications.service');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { success, created } = require('../../utils/response');

router.use(authenticate);

router.get('/unread-count', async (req, res, next) => {
  try { success(res, { count: await svc.getUnreadCount(req.user.userId) }); } catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try { success(res, await svc.getForUser(req.user.userId)); } catch (e) { next(e); }
});

router.get('/sent', authorize('TEACHER', 'PRINCIPAL', 'HEAD_OF_DEPARTMENT'), async (req, res, next) => {
  try { success(res, await svc.getSentNotifications(req.user.userId)); } catch (e) { next(e); }
});

router.get('/recipients', authorize('TEACHER', 'PRINCIPAL', 'HEAD_OF_DEPARTMENT'), async (req, res, next) => {
  try { success(res, await svc.getRecipients(req.user.userId)); } catch (e) { next(e); }
});

router.post('/', authorize('TEACHER', 'PRINCIPAL', 'HEAD_OF_DEPARTMENT'), async (req, res, next) => {
  try { created(res, await svc.create(req.body, req.user.userId)); } catch (e) { next(e); }
});

router.patch('/:id/read', async (req, res, next) => {
  try { success(res, await svc.markRead(req.params.id, req.user.userId)); } catch (e) { next(e); }
});

router.patch('/read-all', async (req, res, next) => {
  try { success(res, await svc.markAllRead(req.user.userId)); } catch (e) { next(e); }
});

module.exports = router;
