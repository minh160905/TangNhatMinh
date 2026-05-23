const svc = require('./scores.service');
const { success, created, badRequest } = require('../../utils/response');

const getClassScores = async (req, res, next) => {
  try {
    const { classInstanceId, subjectId, semester } = req.query;
    if (!classInstanceId || !subjectId || !semester) {
      return badRequest(res, 'classInstanceId, subjectId, semester are required');
    }
    return success(res, await svc.getClassScores({ classInstanceId, subjectId, semester }));
  } catch (e) { next(e); }
};

const upsertScore = async (req, res, next) => {
  try {
    const score = await svc.upsertScore(req.body, req.user.userId);
    return created(res, score, 'Điểm đã được lưu');
  } catch (e) { next(e); }
};

const batchUpsert = async (req, res, next) => {
  try {
    const { scores } = req.body;
    if (!Array.isArray(scores)) return badRequest(res, 'scores must be an array');
    const result = await svc.batchUpsert(scores, req.user.userId);
    return success(res, result, 'Lưu điểm hàng loạt thành công');
  } catch (e) { next(e); }
};

const updateScore = async (req, res, next) => {
  try {
    const score = await svc.updateScore(req.params.id, req.body, req.user.userId);
    return success(res, score, 'Cập nhật điểm thành công');
  } catch (e) { next(e); }
};

module.exports = { getClassScores, upsertScore, batchUpsert, updateScore };
