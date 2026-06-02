import api from './axios';

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const usersApi = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  updateStatus: (id, status) => api.patch(`/users/${id}/status`, { status }),
  getRoles: () => api.get('/users/roles'),
};

export const classesApi = {
  getAll: () => api.get('/classes'),
  create: (data) => api.post('/classes', data),
  getYears: () => api.get('/classes/years'),
  createYear: (data) => api.post('/classes/years', data),
  getInstances: (params) => api.get('/classes/instances', { params }),
  createInstance: (data) => api.post('/classes/instances', data),
  updateInstance: (id, data) => api.put(`/classes/instances/${id}`, data),
  getInstanceStudents: (id) => api.get(`/classes/instances/${id}/students`),
  getMyClasses: () => api.get('/classes/my-classes'),
  getMyHomeroomClass: () => api.get('/classes/my-homeroom-class'),
  getHomeroomClassDetail: (id) => api.get(`/classes/instances/${id}/homeroom-detail`),
};

export const subjectsApi = {
  getAll: () => api.get('/subjects'),
  getTeachersBySubject: (id) => api.get(`/subjects/${id}/teachers`),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
};

export const assignmentsApi = {
  getAll: (params) => api.get('/assignments', { params }),
  create: (data) => api.post('/assignments', data),
  remove: (id) => api.delete(`/assignments/${id}`),
  batchDelete: (ids) => api.post('/assignments/batch-delete', { ids }),
  getTeacherSubjects: (classInstanceId) => api.get('/assignments/teacher-subjects', { params: { classInstanceId } }),
  getWorkload: () => api.get('/assignments/workload'),
  getMatrix: (yearId) => api.get('/assignments/matrix', { params: { year_id: yearId } }),
};

export const scoresApi = {
  getClassScores: (params) => api.get('/scores/class', { params }),
  upsert: (data) => api.post('/scores', data),
  batchUpsert: (scores) => api.post('/scores/batch', { scores }),
  update: (id, data) => api.put(`/scores/${id}`, data),
};

export const studentApi = {
  getReport: (params) => api.get('/student/report', { params }),
  getMyChildren: () => api.get('/student/my-children'),
};

export const achievementsApi = {
  getAll: (params) => api.get('/achievements', { params }),
  create: (formData) => api.post('/achievements', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  review: (id, data) => api.put(`/achievements/${id}/review`, data),
  addComment: (id, comment) => api.post(`/achievements/${id}/comments`, { comment }),
};

export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  getSent: () => api.get('/notifications/sent'),
  getRecipients: () => api.get('/notifications/recipients'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  create: (data) => api.post('/notifications', data),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const commentsApi = {
  getAll: (params) => api.get('/comments', { params }),
  create: (data) => api.post('/comments', data),
};

export const schedulesApi = {
  getByClass: (classInstanceId) => api.get(`/schedules/class/${classInstanceId}`),
  getMySchedule: () => api.get('/schedules/my-schedule'),
  getStudentSchedule: () => api.get('/schedules/student'),
  getParentSchedule: () => api.get('/schedules/parent'),
  getAll: (params) => api.get('/schedules', { params }),
  upsert: (data) => api.post('/schedules/upsert', data),
  remove: (id) => api.delete(`/schedules/${id}`),
  clearClass: (classInstanceId) => api.delete(`/schedules/class/${classInstanceId}`),
  autoGenerate: (config) => api.post('/schedules/auto-generate', config),
  autoApply: (scheduled) => api.post('/schedules/auto-apply', { scheduled }),
};

export const conductsApi = {
  getByClass: (params) => api.get('/conducts', { params }),
  upsert: (data) => api.put('/conducts/upsert', data),
};
