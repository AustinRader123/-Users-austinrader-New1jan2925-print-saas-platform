import { DATABASE_URL, get } from './env.js';

export const config = {
  // Server
  NODE_ENV: get('NODE_ENV', 'development'),
  PORT: parseInt(get('PORT', get('BACKEND_PORT', '3100'))),
  API_URL: get('API_URL', `http://localhost:${get('PORT', get('BACKEND_PORT', '3100'))}`),

  // Database
  DATABASE_URL,

  // JWT
  JWT_SECRET: get('JWT_SECRET', 'your-secret-key-change-in-production'),
  JWT_EXPIRY: get('JWT_EXPIRY', '7d'),

  // Stripe
  STRIPE_SECRET_KEY: get('STRIPE_SECRET_KEY', ''),
  STRIPE_PUBLISHABLE_KEY: get('STRIPE_PUBLISHABLE_KEY', ''),
  STRIPE_WEBHOOK_SECRET: get('STRIPE_WEBHOOK_SECRET', ''),

  // AWS S3
  AWS_REGION: get('AWS_REGION', 'us-east-1'),
  AWS_ACCESS_KEY_ID: get('AWS_ACCESS_KEY_ID', ''),
  AWS_SECRET_ACCESS_KEY: get('AWS_SECRET_ACCESS_KEY', ''),
  S3_BUCKET: get('S3_BUCKET', 'skuflow'),
  S3_MOCKUP_FOLDER: 'mockups',
  S3_DESIGN_FOLDER: 'designs',

  // Redis (for queues)
  REDIS_URL: get('REDIS_URL', 'redis://localhost:6379'),

  // SendGrid Email
  SENDGRID_API_KEY: get('SENDGRID_API_KEY', ''),
  SENDGRID_FROM_EMAIL: get('SENDGRID_FROM_EMAIL', 'noreply@skuflow.ai'),

  // File Upload
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  ALLOWED_DESIGN_TYPES: ['image/png', 'image/svg+xml'],

  // Mockup Engine
  MOCKUP_CACHE_TTL: 30 * 24 * 60 * 60, // 30 days
  MOCKUP_TIMEOUT: 60000, // 60 seconds

  // Features
  ENABLE_VENDOR_SYNC: get('ENABLE_VENDOR_SYNC', 'false') === 'true',
  ENABLE_MOCKUP_GENERATION: get('ENABLE_MOCKUP_GENERATION', 'true') !== 'false',
  ENABLE_EMAIL_NOTIFICATIONS: get('ENABLE_EMAIL_NOTIFICATIONS', 'true') !== 'false',
};
