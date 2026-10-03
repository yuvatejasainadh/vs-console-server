# VoiceShield Console AWS Production Deployment Guide

---

## 1. Target AWS Architecture

```text
               Internet
                  ↓
       [AWS WAF / Shield]
                  ↓
   [Application Load Balancer (ALB)]
          (TLS Termination)
                  ↓
   [ECS Fargate / EKS Pods / EC2]
     (VoiceShield Backend Service)
          ↓                   ↓
 [AWS RDS PostgreSQL 16]   [AWS S3]
   (Multi-AZ, Encrypted)  (Evidence & Exports)
```

---

## 2. Infrastructure Requirements

### 2.1 AWS RDS PostgreSQL
- **Engine:** PostgreSQL 16.4+
- **Instance Class:** `db.m6g.large` (minimum for production)
- **High Availability:** Multi-AZ enabled
- **Storage:** gp3, auto-scaling enabled (100GB to 1TB)
- **Encryption:** AWS KMS managed key at rest
- **Networking:** Private subnets only, accessible only from backend security group

### 2.2 AWS S3 Bucket
- **Bucket:** `voiceshield-evidence-production`
- **Default Encryption:** SSE-S3 or SSE-KMS
- **Block Public Access:** Enabled (all 4 settings ON)
- **Versioning:** Enabled
- **Lifecycle Rules:** Transition exports older than 30 days to Glacier / Expire after 90 days

### 2.3 IAM Roles & Least Privilege
Use AWS IAM Task Roles instead of long-lived access keys:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::voiceshield-evidence-production",
        "arn:aws:s3:::voiceshield-evidence-production/*"
      ]
    }
  ]
}
```

---

## 3. Environment Variables for Production

| Variable | Example Value | Description |
|:---|:---|:---|
| `APP_ENV` | `production` | Enables production mode & strict error masks |
| `PORT` | `4000` | HTTP listening port |
| `CORS_ORIGINS` | `https://console.voiceshield.internal` | Trusted frontend domain |
| `DATABASE_URL` | `postgresql://user:pass@rds-endpoint:5432/voiceshield_console?sslmode=require` | PostgreSQL RDS connection URL |
| `JWT_SECRET` | Secret from AWS Secrets Manager (min 32 chars) | JWT signing secret |
| `JWT_EXPIRES_IN` | `15m` | Access token lifespan |
| `REFRESH_TOKEN_SECRET` | Secret from AWS Secrets Manager (min 32 chars) | Refresh token secret |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` | Refresh token lifespan |
| `STORAGE_DRIVER` | `s3` | Object storage provider |
| `AWS_REGION` | `us-east-1` | AWS region |
| `AWS_S3_BUCKET` | `voiceshield-evidence-production` | Target S3 bucket |

---

## 4. Deployment Steps

1. **Build Container Image:**
   ```bash
   docker build -t voiceshield-console-backend:latest .
   ```
2. **Push to AWS ECR:**
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com
   docker tag voiceshield-console-backend:latest <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/voiceshield-console:latest
   docker push <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/voiceshield-console:latest
   ```
3. **Execute Database Migrations:**
   ```bash
   npm run migration:run
   ```
4. **Deploy Task Definition to ECS / EKS.**
5. **Verify Health:**
   ```bash
   curl -f https://console-api.voiceshield.internal/health/ready
   ```
