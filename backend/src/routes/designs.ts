import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import DesignService from '../services/DesignService.js';
import MockupService from '../services/MockupService.js';
import logger from '../logger.js';

const router = Router();

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

export default router;
