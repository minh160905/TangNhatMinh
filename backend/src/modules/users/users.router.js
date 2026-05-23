const express = require('express');
const router = express.Router();
const ctrl = require('./users.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

router.use(authenticate);

router.get('/roles', ctrl.getRoles);
router.get('/', authorize('ADMIN'), ctrl.getAll);
router.get('/:id', authorize('ADMIN'), ctrl.getById);
router.post('/', authorize('ADMIN'), ctrl.create);
router.put('/:id', authorize('ADMIN'), ctrl.update);
router.patch('/:id/status', authorize('ADMIN'), ctrl.updateStatus);

module.exports = router;
