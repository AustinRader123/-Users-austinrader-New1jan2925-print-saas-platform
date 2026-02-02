import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000'),
  API_URL: process.env.API_URL || 'http://localhost:3000',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/deco_network',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  // AWS S3
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  S3_BUCKET: process.env.S3_BUCKET || 'deco-network',
  S3_MOCKUP_FOLDER: 'mockups',
  S3_DESIGN_FOLDER: 'designs',

  // Redis (for queues)
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // SendGrid Email
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'noreply@deconetwork.com',

  // File Upload
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  ALLOWED_DESIGN_TYPES: ['image/png', 'image/svg+xml'],

  // Mockup Engine
  MOCKUP_CACHE_TTL: 30 * 24 * 60 * 60, // 30 days
  MOCKUP_TIMEOUT: 60000, // 60 seconds

  // Features
  ENABLE_VENDOR_SYNC: process.env.ENABLE_VENDOR_SYNC === 'true',
  ENABLE_MOCKUP_GENERATION: process.env.ENABLE_MOCKUP_GENERATION !== 'false',
  ENABLE_EMAIL_NOTIFICATIONS: process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false',
};
