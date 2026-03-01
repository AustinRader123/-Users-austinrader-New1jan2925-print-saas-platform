import express from 'express';
import multer from 'multer';
import StorageProvider from '../services/StorageProvider.js';
import logger from '../logger.js';
import path from 'path';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload a file: returns { url, path, fileName, size }
router.post('/upload', upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const folder = req.body.folder || 'uploads';
    const result = await StorageProvider.uploadFile(req.file.buffer, req.file.originalname, folder);
    return res.status(201).json(result);
  } catch (err: any) {
    logger.error('storage upload error', err?.message || err);
    return res.status(500).json({ error: err?.message || 'upload failed' });
  }
});

// Download/serve a file by folder/filename
router.get('/:folder/:file', async (req, res) => {
  try {
    const { folder, file } = req.params;
    const virtualPath = `/uploads/${folder}/${file}`;
    const fullPath = StorageProvider.getLocalPath(virtualPath);
    return res.sendFile(path.resolve(fullPath));
  } catch (err: any) {
    logger.warn('storage get error', err?.message || err);
    return res.status(404).json({ error: 'not found' });
  }
});

// Delete a file
router.delete('/:folder/:file', async (req, res) => {
  try {
    const { folder, file } = req.params;
    const virtualPath = `/uploads/${folder}/${file}`;
    await StorageProvider.deleteFile(virtualPath);
    return res.status(204).send();
  } catch (err: any) {
    logger.error('storage delete error', err?.message || err);
    return res.status(500).json({ error: 'delete failed' });
  }
});

export default router;
