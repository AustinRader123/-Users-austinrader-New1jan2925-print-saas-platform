# SkuFlow Deployment Guide

## Prerequisites

- Node.js 18+ LTS
- PostgreSQL 15+
- Redis 6+
- Docker + Docker Compose v2 (for local/prod-like orchestration)
- AWS Account (for S3, optional for dev)
- Stripe Account (optional)
- SendGrid Account (optional)

## Environment Setup

### 1. Create Environment Files

Start from the committed templates and fill in production values:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Production-critical keys:
- `JWT_SECRET` (32+ characters)
- `CORS_ORIGIN` (explicit allowlist, no `*`)
- `DATABASE_URL`
- `DN_ENC_KEY`
- `BILLING_PROVIDER` and Stripe keys/webhook (if using Stripe)

### 2. Database Setup

```bash
# Apply all migrations (CI/prod)
npm run db:deploy

# Seed initial data (optional)
npm run db:seed
```

## Deployment Options

### Option A: Docker Compose (Recommended for Dev/Small)

The repository now includes:
- `backend/Dockerfile`
- `frontend/Dockerfile`
- root `docker-compose.yml`

Run prod-like stack:
```bash
docker compose --profile prod up -d --build postgres redis backend frontend
```

Run dev frontend profile:
```bash
docker compose --profile dev up -d --build postgres redis backend frontend-dev
```

Optional worker:
```bash
docker compose --profile worker up -d worker
```

### Option B: AWS Deployment

#### Backend to EC2/ECS:

```bash
# Build Docker image
docker build -t skuflow-backend ./backend

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker tag skuflow-backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/skuflow-backend:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/skuflow-backend:latest
```

#### Frontend to S3 + CloudFront:

```bash
# Build
npm run build

# Deploy to S3
aws s3 sync dist/ s3://skuflow-frontend --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E123ABC456 --paths "/*"
```

#### RDS for PostgreSQL:

```bash
aws rds create-db-instance \
  --db-instance-identifier skuflow-db \
  --engine postgres \
  --db-instance-class db.t3.micro \
  --master-username admin \
  --master-user-password "YourSecurePassword123!" \
  --allocated-storage 20
```

#### ElastiCache for Redis:

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id skuflow-redis \
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
heroku create skuflow-api
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

Use the committed operational scripts:

```bash
# backup to artifacts/backups/db-<timestamp>.sql.gz
DATABASE_URL=postgresql://... npm run backup:db

# restore (requires explicit --yes)
DATABASE_URL=postgresql://... npm run restore:db -- --yes artifacts/backups/db-YYYYMMDD-HHMMSS.sql.gz

# rollback code and/or database
DATABASE_URL=postgresql://... npm run rollback -- --yes --ref HEAD~1 --backup artifacts/backups/db-YYYYMMDD-HHMMSS.sql.gz
```

### S3 Bucket Versioning

```bash
aws s3api put-bucket-versioning \
  --bucket skuflow \
  --versioning-configuration Status=Enabled
```

## CI/CD Pipeline

### GitHub Actions Workflow

Use `.github/workflows/phase6-ci.yml` for production-hardening CI:
- backend install/build/test
- frontend install/build
- smoke suite (`smoke:phase2a` and `smoke:phase6`)
- mock provider defaults for non-interactive runs

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
- [ ] Run `DOCTOR_PROFILE=production npm run doctor` before release
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
  --db-instance-identifier skuflow-db-replica \
  --source-db-instance-identifier skuflow-db
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
