const express = require('express');
const router = express.Router();
const ctrl = require('./student.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

router.use(authenticate);
router.get('/report', authorize('STUDENT', 'PARENT', 'TEACHER', 'ADMIN'), ctrl.getReport);
router.get('/my-children', authorize('PARENT'), ctrl.getMyChildren);

module.exports = router;
