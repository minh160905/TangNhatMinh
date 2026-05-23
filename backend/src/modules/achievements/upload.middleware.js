const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Determine resource type based on mime
    const isImage = file.mimetype.startsWith('image/');
    return {
      folder: 'school_achievements',          // Cloudinary folder
      resource_type: isImage ? 'image' : 'raw', // raw = PDF/DOC/etc.
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      transformation: isImage
        ? [{ width: 1200, crop: 'limit', quality: 'auto' }]  // auto-optimize images
        : undefined,
      // File name: timestamp + original name (sanitised)
      public_id: `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Định dạng file không được hỗ trợ. Chỉ chấp nhận: JPG, PNG, PDF, DOC, DOCX'));
    }
  },
});

module.exports = upload;
