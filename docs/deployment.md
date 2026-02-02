# DecoNetwork Deployment Guide

## Prerequisites

- Node.js 18+ LTS
- PostgreSQL 15+
- Redis 6+
- AWS Account (for S3, optional for dev)
- Stripe Account (optional)
- SendGrid Account (optional)

## Environment Setup

### 1. Create Environment Files

**Backend - `/backend/.env`:**
```bash
NODE_ENV=production
PORT=3000
API_URL=https://api.yourdomain.com

DATABASE_URL=postgresql://user:password@db-host:5432/deco_network
REDIS_URL=redis://redis-host:6379

JWT_SECRET=your-very-long-random-secret-key
JWT_EXPIRY=7d

STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=deco-network-prod

SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=noreply@deconetwork.com

ENABLE_VENDOR_SYNC=true
ENABLE_MOCKUP_GENERATION=true
ENABLE_EMAIL_NOTIFICATIONS=true
```

**Frontend - `/frontend/.env.production`:**
```
VITE_API_URL=https://api.yourdomain.com/api
```

### 2. Database Setup

```bash
# Apply all migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

## Deployment Options

### Option A: Docker Compose (Recommended for Dev/Small)

Create `/docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: deco_network
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/deco_network
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend/logs:/app/logs

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:3000/api

volumes:
  postgres_data:
```

Run with:
```bash
docker-compose up
```

### Option B: AWS Deployment

#### Backend to EC2/ECS:

```bash
# Build Docker image
docker build -t deco-network-backend ./backend

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker tag deco-network-backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/deco-network-backend:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/deco-network-backend:latest
```

#### Frontend to S3 + CloudFront:

```bash
# Build
npm run build

# Deploy to S3
aws s3 sync dist/ s3://deco-network-frontend --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E123ABC456 --paths "/*"
```

#### RDS for PostgreSQL:

```bash
aws rds create-db-instance \
  --db-instance-identifier deco-network-db \
  --engine postgres \
  --db-instance-class db.t3.micro \
  --master-username admin \
  --master-user-password "YourSecurePassword123!" \
  --allocated-storage 20
```

#### ElastiCache for Redis:

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id deco-network-redis \
  --engine redis \
  --cache-node-type cache.t3.micro
```

### Option C: Vercel + Heroku

**Frontend on Vercel:**
```bash
npm i -g vercel
vercel
```

**Backend on Heroku:**
```bash
heroku create deco-network-api
git push heroku main
heroku config:set DATABASE_URL=postgresql://...
```

## SSL/HTTPS Setup

### Using Let's Encrypt with Nginx

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location ~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring & Logging

### Application Performance Monitoring

Install Sentry:
```bash
npm install @sentry/node
```

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Log Aggregation

Use CloudWatch, DataDog, or ELK stack:

```typescript
// Already configured in logger.ts
// Logs go to:
// - logs/error.log
// - logs/combined.log
// - Console (in development)
```

## Backup & Recovery

### Database Backups

```bash
# Automated backups (recommended: daily)
# AWS RDS handles automatically

# Manual backup
pg_dump postgresql://user:pass@host:5432/deco_network > backup.sql

# Restore
psql postgresql://user:pass@host:5432/deco_network < backup.sql
```

### S3 Bucket Versioning

```bash
aws s3api put-bucket-versioning \
  --bucket deco-network \
  --versioning-configuration Status=Enabled
```

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm ci
      - run: cd backend && npm run build
      - run: cd backend && npm test

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
```

## Performance Optimization

### Frontend
```bash
# Build with optimizations
npm run build

# Analyze bundle
npm install -D rollup-plugin-visualizer
```

### Backend
```typescript
// Enable compression
import compression from 'compression';
app.use(compression());

// Connection pooling
// Prisma handles automatically with DATABASE_URL pooling params
```

### Database
```sql
-- Create indexes on frequently queried columns
CREATE INDEX idx_users_email ON "User"(email);
CREATE INDEX idx_orders_storeId ON "Order"("storeId");
CREATE INDEX idx_designs_userId ON "Design"("userId");
CREATE INDEX idx_cart_userId ON "Cart"("userId");
```

## Security Checklist

- [ ] Generate new JWT secret
- [ ] Use strong database password
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for production domain
- [ ] Rotate API keys regularly
- [ ] Enable database encryption
- [ ] Set up AWS IAM roles
- [ ] Configure S3 bucket policies
- [ ] Enable API rate limiting
- [ ] Set up DDoS protection (CloudFlare)
- [ ] Enable database backups
- [ ] Configure firewall rules

## Scaling Considerations

### Horizontal Scaling

```bash
# Backend workers
# Run multiple Node.js instances behind load balancer
# Each worker connects to same PostgreSQL + Redis

# Use PM2 for process management
npm install -g pm2
pm2 start npm --name backend -- run start
pm2 start npm --name worker1 -- run worker
pm2 start npm --name worker2 -- run worker
```

### Database Scaling

```bash
# Read replicas
aws rds create-db-instance-read-replica \
  --db-instance-identifier deco-network-db-replica \
  --source-db-instance-identifier deco-network-db
```

### Caching

```typescript
// Redis caching
const redis = new Redis(process.env.REDIS_URL);

app.get('/products', async (req, res) => {
  const cacheKey = `products:${req.query.storeId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) return res.json(JSON.parse(cached));
  
  const products = await getProducts(req.query.storeId);
  await redis.setex(cacheKey, 3600, JSON.stringify(products));
  res.json(products);
});
```

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql postgresql://user:pass@host/dbname

# Check environment variables
echo $DATABASE_URL
```

### Memory Leaks
```bash
# Monitor with PM2
pm2 monitor

# Node heap snapshots
node --inspect app.js
```

### SSL Certificate Renewal
```bash
# Auto-renew with certbot
certbot renew --dry-run
```

## Support & Further Information

- Prisma: https://www.prisma.io/docs/
- Express: https://expressjs.com/
- React: https://react.dev/
- Vite: https://vitejs.dev/
- AWS: https://aws.amazon.com/documentation/
