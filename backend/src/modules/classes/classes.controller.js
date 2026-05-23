const svc = require('./classes.service');
const { success, created } = require('../../utils/response');

// Classes
const getAllClasses = async (req, res, next) => { try { return success(res, await svc.getAllClasses()); } catch (e) { next(e); } };
const createClass = async (req, res, next) => { try { return created(res, await svc.createClass(req.body)); } catch (e) { next(e); } };

// Years
const getAllYears = async (req, res, next) => { try { return success(res, await svc.getAllYears()); } catch (e) { next(e); } };
const createYear = async (req, res, next) => { try { return created(res, await svc.createYear(req.body)); } catch (e) { next(e); } };

// Instances
const getAllInstances = async (req, res, next) => { try { return success(res, await svc.getAllInstances(req.query)); } catch (e) { next(e); } };
const createInstance = async (req, res, next) => { try { return created(res, await svc.createInstance(req.body)); } catch (e) { next(e); } };
const updateInstance = async (req, res, next) => { try { return success(res, await svc.updateInstance(req.params.id, req.body)); } catch (e) { next(e); } };
const getInstanceStudents = async (req, res, next) => { try { return success(res, await svc.getInstanceStudents(req.params.id)); } catch (e) { next(e); } };
const getMyClasses = async (req, res, next) => { try { return success(res, await svc.getMyClasses(req.user.userId)); } catch (e) { next(e); } };
const getMyHomeroomClass = async (req, res, next) => { try { return success(res, await svc.getMyHomeroomClass(req.user.userId)); } catch (e) { next(e); } };
const getHomeroomClassDetail = async (req, res, next) => { try { return success(res, await svc.getHomeroomClassDetail(req.params.id, req.user.userId)); } catch (e) { next(e); } };

module.exports = { getAllClasses, createClass, getAllYears, createYear, getAllInstances, createInstance, updateInstance, getInstanceStudents, getMyClasses, getHomeroomClassDetail, getMyHomeroomClass };
