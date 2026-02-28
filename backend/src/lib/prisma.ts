import { PrismaClient } from '@prisma/client';

// Central Prisma client singleton used across services
// Prefer importing `prisma` from this module instead of creating new PrismaClient() instances.
const prisma = new PrismaClient();

export default prisma;
