import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config.js';
import logger from '../logger.js';

const prisma = new PrismaClient();

export class AuthService {
  async register(email: string, password: string, name: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, role: 'CUSTOMER' },
    });

    return this.generateToken(user.id, user.role, undefined);
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    return this.generateToken(user.id, user.role, undefined);
  }

  async generateToken(userId: string, role: string, storeId?: string) {
    const token = jwt.sign(
      { userId, role, storeId },
      config.JWT_SECRET as string,
      { expiresIn: config.JWT_EXPIRY } as any
    );
    return { token, userId, role };
  }

  async getUser(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }
}

export default new AuthService();
