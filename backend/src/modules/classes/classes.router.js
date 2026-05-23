const express = require('express');
const router = express.Router();
const ctrl = require('./classes.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

router.use(authenticate);

// Base classes
router.get('/', ctrl.getAllClasses);
router.post('/', authorize('ADMIN'), ctrl.createClass);

// Academic years
router.get('/years', ctrl.getAllYears);
router.post('/years', authorize('ADMIN'), ctrl.createYear);

// My classes (for teacher)
router.get('/my-classes', authorize('TEACHER'), ctrl.getMyClasses);
router.get('/my-homeroom-class', authorize('TEACHER'), ctrl.getMyHomeroomClass);

// Class instances
router.get('/instances', ctrl.getAllInstances);
router.post('/instances', authorize('ADMIN'), ctrl.createInstance);
router.put('/instances/:id', authorize('ADMIN'), ctrl.updateInstance);
router.get('/instances/:id/students', ctrl.getInstanceStudents);
router.get('/instances/:id/homeroom-detail', authorize('TEACHER'), ctrl.getHomeroomClassDetail);

module.exports = router;
