const express = require('express');
const router = express.Router();
const ctrl = require('./scores.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

router.use(authenticate);

router.get('/class', authorize('TEACHER', 'ADMIN'), ctrl.getClassScores);
router.post('/', authorize('TEACHER'), ctrl.upsertScore);
router.post('/batch', authorize('TEACHER'), ctrl.batchUpsert);
router.put('/:id', authorize('TEACHER'), ctrl.updateScore);

module.exports = router;
