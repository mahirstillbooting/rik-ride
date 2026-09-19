import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * POST /api/upload/image
 * Secure image upload endpoint supporting Base64 Data URI strings.
 * Validates file type (JPEG, PNG, WebP) and size limit (max 5MB).
 */
router.post('/image', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { imageBase64, fileName, category } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ success: false, error: 'Valid imageBase64 payload is required.' });
      return;
    }

    // Extract mime type and base64 buffer data
    const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    let mimeType = 'image/jpeg';
    let base64Data = imageBase64;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
      res.status(400).json({
        success: false,
        error: `Invalid file format [${mimeType}]. Allowed formats: JPEG, PNG, WebP.`,
      });
      return;
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

    if (buffer.length > MAX_SIZE_BYTES) {
      res.status(400).json({
        success: false,
        error: `File size exceeds maximum permitted threshold of 5MB (Received: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB).`,
      });
      return;
    }

    const ext = mimeType.split('/')[1] || 'jpg';
    const cleanCategory = category ? String(category).toLowerCase().replace(/[^a-z0-9]/g, '') : 'img';
    const uniqueName = `${cleanCategory}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const targetFilePath = path.join(UPLOADS_DIR, uniqueName);

    await fs.promises.writeFile(targetFilePath, buffer);

    const relativeUrl = `/uploads/${uniqueName}`;

    res.json({
      success: true,
      message: 'File uploaded successfully.',
      fileUrl: relativeUrl,
      fileName: uniqueName,
      fileSize: buffer.length,
      mimeType,
    });
  } catch (error: any) {
    console.error('[UploadRoutes] File upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to process file upload.', details: error.message });
  }
});

export default router;
