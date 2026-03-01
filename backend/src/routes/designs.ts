import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import DesignService from '../services/DesignService.js';
import MockupService from '../services/MockupService.js';
import StorageProvider from '../services/StorageProvider.js';
import multer from 'multer';
import logger from '../logger.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Create design
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, content } = req.body;

    const design = await DesignService.createDesign(req.userId!, {
      name,
      description,
      content,
    });

    res.status(201).json(design);
  } catch (error) {
    logger.error('Create design error:', error);
    res.status(500).json({ error: 'Failed to create design' });
  }
});

// Get design
router.get('/:designId', async (req: AuthRequest, res: Response) => {
  try {
    const design = await DesignService.getDesign(req.params.designId, req.userId);
    if (!design) {
      return res.status(404).json({ error: 'Design not found' });
    }

    res.json(design);
  } catch (error) {
    logger.error('Get design error:', error);
    res.status(500).json({ error: 'Failed to get design' });
  }
});

// Update design
router.put('/:designId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { content, name, description } = req.body;

    const design = await DesignService.updateDesign(req.params.designId, req.userId!, {
      content,
      name,
      description,
      updatedAt: new Date(),
    });

    res.json(design);
  } catch (error) {
    logger.error('Update design error:', error);
    res.status(500).json({ error: 'Failed to update design' });
  }
});

// List user designs
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const designs = await DesignService.listUserDesigns(req.userId!, {
      skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
      take: req.query.take ? parseInt(req.query.take as string) : 20,
    });

    res.json(designs);
  } catch (error) {
    logger.error('List designs error:', error);
    res.status(500).json({ error: 'Failed to list designs' });
  }
});

// Validate design
router.post('/:designId/validate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { decorationAreaId } = req.body;

    if (!decorationAreaId) {
      return res.status(400).json({ error: 'Decoration area ID required' });
    }

    const validation = await DesignService.validateDesign(
      req.params.designId,
      decorationAreaId
    );

    res.json(validation);
  } catch (error) {
    logger.error('Validate design error:', error);
    res.status(500).json({ error: 'Failed to validate design' });
  }
});

// Export design
router.post('/:designId/export', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { format } = req.body;

    const design = await DesignService.exportDesign(
      req.params.designId,
      req.userId!,
      format || 'png'
    );

    res.json(design);
  } catch (error) {
    logger.error('Export design error:', error);
    res.status(500).json({ error: 'Failed to export design' });
  }
});

// Generate mockups
router.post('/:designId/generate-mockups', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { variantIds } = req.body;

    if (!variantIds || !Array.isArray(variantIds)) {
      return res.status(400).json({ error: 'Variant IDs array required' });
    }

    const mockups = [];
    for (const variantId of variantIds) {
      const mockup = await MockupService.generateMockup(req.params.designId, variantId);
      mockups.push(mockup);
    }

    res.status(201).json(mockups);
  } catch (error) {
    logger.error('Generate mockups error:', error);
    res.status(500).json({ error: 'Failed to generate mockups' });
  }
});

// Get mockups for design
router.get('/:designId/mockups', async (req: AuthRequest, res: Response) => {
  try {
    const mockups = await MockupService.getMockupsForDesign(req.params.designId);
    res.json(mockups);
  } catch (error) {
    logger.error('Get mockups error:', error);
    res.status(500).json({ error: 'Failed to get mockups' });
  }
});

router.post('/:designId/assets/upload', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req.body?.storeId as string) || req.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'File required' });
    }

    const design = await DesignService.getDesign(req.params.designId, req.userId);
    if (!design || design.userId !== req.userId) {
      return res.status(404).json({ error: 'Design not found' });
    }

    const uploaded = await StorageProvider.uploadFile(req.file.buffer, req.file.originalname, 'designs');
    const asset = await DesignService.createFileAsset({
      storeId,
      designId: req.params.designId,
      kind: 'DESIGN_UPLOAD',
      fileName: uploaded.fileName,
      url: uploaded.url,
      mimeType: req.file.mimetype,
      sizeBytes: uploaded.size,
      createdById: req.userId,
      metadata: { originalName: req.file.originalname },
    });

    return res.status(201).json({ ...uploaded, asset });
  } catch (error) {
    logger.error('Upload design asset error:', error);
    return res.status(500).json({ error: 'Failed to upload design asset' });
  }
});

router.get('/:designId/assets', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const assets = await DesignService.listFileAssets(req.params.designId, req.userId!);
    return res.json(assets);
  } catch (error) {
    logger.error('List design assets error:', error);
    return res.status(500).json({ error: (error as Error).message || 'Failed to list design assets' });
  }
});

router.post('/:designId/mockups/render', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const variantId = req.body?.variantId as string;
    if (!variantId) {
      return res.status(400).json({ error: 'variantId required' });
    }
    const design = await DesignService.getDesign(req.params.designId, req.userId);
    if (!design || design.userId !== req.userId) {
      return res.status(404).json({ error: 'Design not found' });
    }

    const mockup = await MockupService.generateMockup(req.params.designId, variantId);
    return res.status(201).json(mockup);
  } catch (error) {
    logger.error('Render mockup error:', error);
    return res.status(500).json({ error: 'Failed to render mockup' });
  }
});

router.get('/mockups/:mockupId/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const mockup = await MockupService.getMockup(req.params.mockupId);
    if (!mockup) {
      return res.status(404).json({ error: 'Mockup not found' });
    }
    return res.json({ id: mockup.id, status: mockup.status, imageUrl: mockup.imageUrl, error: mockup.error });
  } catch (error) {
    logger.error('Get mockup status error:', error);
    return res.status(500).json({ error: 'Failed to get mockup status' });
  }
});

export default router;
