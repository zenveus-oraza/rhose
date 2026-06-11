# Rhose EC2 Deployment

This deployment shape runs the compiled Express API with PM2 and serves the compiled Vite frontend as static files.

## 1. Server Prerequisites

- Node.js 20+
- npm
- PM2 installed globally: `npm install -g pm2`
- PostgreSQL reachable from the EC2 instance
- An IAM role or AWS credentials with `s3:PutObject` permission for the upload bucket
- SES SMTP credentials for the configured sender/domain

## 2. Environment

Create `backend/.env` from `backend/.env.example` and set production values:

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`
- `AWS_REGION`, `S3_BUCKET_NAME`, `S3_KEY_PREFIX`
- `S3_PUBLIC_BASE_URL` when using CloudFront or a custom asset domain

When the EC2 instance has an IAM role for S3, leave `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` unset.

## 3. Build

```bash
npm ci
npm run build
npm run db:migrate
```

The frontend output is written to `frontend/dist`. Configure Nginx or your web server to serve that directory and proxy `/api` to the backend port.

## 4. PM2

Start the API:

```bash
npm run pm2:start
pm2 save
pm2 startup
```

Reload after a new deployment:

```bash
npm run deploy:build
npm run db:migrate
npm run pm2:reload
```

Logs:

```bash
npm run pm2:logs
```
