const express = require('express');
const router = express.Router();
const ctrl = require('./scores.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

router.use(authenticate);

router.get('/class', authorize('TEACHER', 'ADMIN', 'PRINCIPAL', 'HEAD_OF_DEPARTMENT'), ctrl.getClassScores);
router.get('/student-history', authorize('TEACHER', 'ADMIN', 'PRINCIPAL', 'HEAD_OF_DEPARTMENT'), ctrl.getStudentScoreHistory);
router.post('/', authorize('TEACHER', 'PRINCIPAL', 'HEAD_OF_DEPARTMENT'), ctrl.upsertScore);
router.post('/batch', authorize('TEACHER', 'PRINCIPAL', 'HEAD_OF_DEPARTMENT'), ctrl.batchUpsert);
router.put('/:id', authorize('TEACHER', 'PRINCIPAL', 'HEAD_OF_DEPARTMENT'), ctrl.updateScore);

module.exports = router;
