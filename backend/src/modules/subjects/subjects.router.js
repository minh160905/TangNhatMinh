const express = require('express');
const router = express.Router();
const svc = require('./subjects.service');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { success, created } = require('../../utils/response');

router.use(authenticate);

router.get('/', async (req, res, next) => { try { success(res, await svc.getAll()); } catch (e) { next(e); } });
router.get('/:id/teachers', authorize('ADMIN'), async (req, res, next) => { try { success(res, await svc.getTeachersBySubject(req.params.id)); } catch (e) { next(e); } });
router.post('/', authorize('ADMIN'), async (req, res, next) => { try { created(res, await svc.create(req.body)); } catch (e) { next(e); } });
router.put('/:id', authorize('ADMIN'), async (req, res, next) => { try { success(res, await svc.update(req.params.id, req.body)); } catch (e) { next(e); } });
router.delete('/:id', authorize('ADMIN'), async (req, res, next) => { try { success(res, await svc.remove(req.params.id)); } catch (e) { next(e); } });

module.exports = router;
