import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { authenticate, authorize } from '../middleware/auth.js';
import { sql } from '../db/client.js';
import { logAction, getIP } from '../lib/audit.js';
import 'dotenv/config';

// Configure Cloudinary
cloudinary.config({
  cloud_name:  process.env.CLOUDINARY_CLOUD_NAME,
  api_key:     process.env.CLOUDINARY_API_KEY,
  api_secret:  process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage — pipe buffer directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const router = Router();
router.use(authenticate);

/**
 * POST /api/upload/calorimeter/:testId
 * Chemist uploads Parr calorimeter snapshot for a GCV test.
 * Uploads to Cloudinary, saves URL back to sample_tests.image_url.
 */
router.post('/calorimeter/:testId', authorize('chemist'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });

    const testId = req.params.testId;

    // Verify ownership
    const [test] = await sql`
      SELECT id, assigned_chemist_id, status FROM sample_tests WHERE id = ${testId}
    `;
    if (!test)                                        return res.status(404).json({ error: 'Test not found' });
    if (test.assigned_chemist_id !== req.user.id)     return res.status(403).json({ error: 'Not your test' });
    if (test.status === 'approved')                   return res.status(409).json({ error: 'Test already approved — cannot change image' });

    // Upload buffer to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:          'coal-lims/calorimeter',
          public_id:       `gcv_${testId}`,
          overwrite:       true,
          resource_type:   'image',
          transformation:  [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => error ? reject(error) : resolve(result)
      );
      stream.end(req.file.buffer);
    });

    // Persist URL
    await sql`
      UPDATE sample_tests SET image_url = ${uploadResult.secure_url} WHERE id = ${testId}
    `;

    await logAction({ user: req.user, action: 'UPLOAD_CALORIMETER_IMAGE', entityType: 'sample_test',
      entityId: testId, detail: { image_url: uploadResult.secure_url }, ip: getIP(req) });

    res.json({ image_url: uploadResult.secure_url });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

export default router;
