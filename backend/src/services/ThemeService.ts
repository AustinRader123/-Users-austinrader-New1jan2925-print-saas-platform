import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { config } from '../config.js';

const prisma = new PrismaClient();

const fontPreset = z.enum(['INTER', 'ROBOTO', 'OPEN_SANS', 'LATO', 'MONTSERRAT']);

const themeConfigSchema = z.object({
  colors: z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    text: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }),
  typography: z.object({
    fontPreset,
  }),
  layout: z.object({
    heroStyle: z.enum(['STANDARD', 'CENTERED', 'SPLIT']).default('STANDARD'),
    showFeaturedCollections: z.boolean().default(true),
  }).default({ heroStyle: 'STANDARD', showFeaturedCollections: true }),
  hero: z.object({
    title: z.string().max(120).optional(),
    subtitle: z.string().max(400).optional(),
    ctaText: z.string().max(80).optional(),
    ctaHref: z.string().max(240).optional(),
    imageUrl: z.string().max(1024).optional(),
  }).default({}),
  banner: z.object({
    enabled: z.boolean().default(false),
    text: z.string().max(200).optional(),
  }).default({ enabled: false }),
  footerLinks: z.array(z.object({ label: z.string().max(60), href: z.string().max(400) })).max(8).default([]),
  featuredCollectionIds: z.array(z.string().min(1)).max(12).default([]),
});

export type ThemeConfigInput = z.infer<typeof themeConfigSchema>;

export class ThemeService {
  validate(input: unknown): ThemeConfigInput {
    return themeConfigSchema.parse(input);
  }

  async getTheme(storeId: string) {
    const records = await (prisma as any).themeConfig.findMany({
      where: { storeId },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    });

    const draft = records.find((r: any) => !r.publishedAt) || null;
    const published = records.find((r: any) => Boolean(r.publishedAt)) || null;

    return { draft, published };
  }

  async upsertDraft(storeId: string, configInput: unknown, storefrontId?: string) {
    const parsed = this.validate(configInput);
    const existing = await (prisma as any).themeConfig.findFirst({
      where: { storeId, publishedAt: null },
      orderBy: { updatedAt: 'desc' },
    });

    if (existing) {
      return (prisma as any).themeConfig.update({
        where: { id: existing.id },
        data: {
          config: parsed,
          storefrontId: storefrontId || existing.storefrontId || null,
          version: Number(existing.version || 1) + 1,
        },
      });
    }

    return (prisma as any).themeConfig.create({
      data: {
        storeId,
        storefrontId: storefrontId || null,
        config: parsed,
        version: 1,
      },
    });
  }

  async publish(storeId: string) {
    const draft = await (prisma as any).themeConfig.findFirst({
      where: { storeId, publishedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
    if (!draft) throw new Error('Theme draft not found');

    const published = await (prisma as any).themeConfig.create({
      data: {
        storeId,
        storefrontId: draft.storefrontId || null,
        config: draft.config,
        version: Number(draft.version || 1),
        publishedAt: new Date(),
      },
    });

    await (prisma as any).store.update({
      where: { id: storeId },
      data: { theme: draft.config },
    });

    return published;
  }

  createPreviewToken(input: { storeId: string; userId: string; expiresMinutes?: number }) {
    const expiresIn = Math.max(1, input.expiresMinutes || 15) * 60;
    return jwt.sign({
      scope: 'theme.preview',
      storeId: input.storeId,
      userId: input.userId,
    }, config.JWT_SECRET, { expiresIn });
  }

  verifyPreviewToken(token: string) {
    return jwt.verify(token, config.JWT_SECRET) as { scope: string; storeId: string; userId: string };
  }

  async getDraftForPreviewToken(token: string) {
    const decoded = this.verifyPreviewToken(token);
    if (decoded.scope !== 'theme.preview') throw new Error('Invalid preview token scope');

    const draft = await (prisma as any).themeConfig.findFirst({
      where: { storeId: decoded.storeId, publishedAt: null },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      storeId: decoded.storeId,
      draft,
    };
  }
}

export default new ThemeService();
