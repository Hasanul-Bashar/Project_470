const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage engine configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'property-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

exports.uploadMiddleware = upload.array('photos', 5);

exports.handleUpload = (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files uploaded' });
    }

    const photoUrls = req.files.map((file) => {
      // Check if file exists on disk, and convert to Data URI for portable serverless hosting fallback
      try {
        if (file.path && fs.existsSync(file.path)) {
          const fileBuffer = fs.readFileSync(file.path);
          const mimeType = file.mimetype || 'image/jpeg';
          // Return base64 data URI so images persist in DB and render seamlessly anywhere without depending on local disk
          return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
        }
      } catch (readErr) {
        console.warn('⚠️ Base64 conversion fallback failed, returning relative URL:', readErr.message);
      }
      return `/uploads/${file.filename}`;
    });

    return res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      photos: photoUrls,
    });
  } catch (err) {
    console.error('❌ Upload Error:', err);
    return res.status(500).json({ message: 'Server error uploading property images' });
  }
};
