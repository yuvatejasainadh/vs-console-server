# VoiceShield Console Production Deployment Guide (Render & AWS RDS)

---

## 1. Architecture Overview

```text
               Browser / Client
                      ↓ (HTTPS)
            [Render Free Web Service]
      (Docker container: backend/Dockerfile)
           ↓ (TLS / Port 5432)        ↓ (HTTPS)
     [AWS RDS PostgreSQL]             [AWS S3]
   Region: ap-south-2            (Evidence & Exports)
 Database: voiceshield_console
```

---

## 2. Target Infrastructure Details

### 2.1 AWS RDS PostgreSQL (ap-south-2)
- **Host:** `voiceshield-prod-db.chcku4ke2u3b.ap-south-2.rds.amazonaws.com`
- **Port:** `5432`
- **Region:** `ap-south-2`
- **Database:** `voiceshield_console`
- **Engine Version:** PostgreSQL 18.3
- **Application User:** Dedicated Console user (e.g. `voiceshield_console_user`, NOT `vs_admin`)
- **SSL/TLS:** Enforced (`DATABASE_SSL=true`)

### 2.2 Render Web Service
- **Type:** Web Service (Docker)
- **Repo:** `yuvatejasainadh/vs-console-server`
- **Dockerfile Path:** `backend/Dockerfile`
- **Health Check Path:** `/health/live` (or `/health`)

---

## 3. Environment Variables Configuration for Render

Enter the following environment variables in the Render Dashboard (**Environment** tab):

| Variable Name | Production Value | Secret? | Description |
|:---|:---|:---:|:---|
| `NODE_ENV` | `production` | No | Enables production mode |
| `APP_ENV` | `production` | No | Application environment flag |
| `PORT` | `4000` | No | Listening port inside container |
| `CORS_ORIGINS` | `https://console.voiceshield.internal,http://localhost:3000` | No | Allowed frontend origins |
| `DATABASE_HOST` | `voiceshield-prod-db.chcku4ke2u3b.ap-south-2.rds.amazonaws.com` | No | AWS RDS endpoint |
| `DATABASE_PORT` | `5432` | No | PostgreSQL port |
| `DATABASE_NAME` | `voiceshield_console` | No | Dedicated Console database |
| `DATABASE_USER` | `voiceshield_console_user` | No | Dedicated application user (never `vs_admin`) |
| `DATABASE_PASSWORD` | `<your-db-password>` | **YES** | Console user database password |
| `DATABASE_SSL` | `true` | No | Enables TLS for PostgreSQL |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | `true` | No | Enables CA validation |
| `DATABASE_POOL_MIN` | `2` | No | Minimum connections |
| `DATABASE_POOL_MAX` | `5` | No | Maximum connections (Render Free sizing) |
| `DATABASE_CONNECTION_TIMEOUT` | `5000` | No | Connection timeout in ms |
| `DATABASE_IDLE_TIMEOUT` | `30000` | No | Idle timeout in ms |
| `RDS_IDENTIFIER` | `voiceshield-prod-db` | No | RDS Instance Identifier |
| `AWS_REGION` | `ap-south-2` | No | AWS Region |
| `JWT_SECRET` | `<min-32-char-random-secret>` | **YES** | JWT Access Token signing key |
| `JWT_EXPIRES_IN` | `15m` | No | Access token TTL |
| `REFRESH_TOKEN_SECRET` | `<min-32-char-random-secret>` | **YES** | Refresh token secret |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` | No | Refresh token TTL |
| `STORAGE_DRIVER` | `s3` (or `local`) | No | Object storage mode |
| `AWS_S3_BUCKET` | `voiceshield-evidence-production` | No | S3 Evidence bucket |
| `AWS_ACCESS_KEY_ID` | `<aws-access-key-id>` | **YES** | S3 AWS Access Key |
| `AWS_SECRET_ACCESS_KEY` | `<aws-secret-access-key>` | **YES** | S3 AWS Secret Key |

---

## 4. Database Migrations Execution

To run schema migrations against `voiceshield_console`:

```bash
npm run migration:run
```
Or inside a production container:
```bash
npm run migration:run:prod
```

---

## 5. Deployment Verification Checklist

1. Verify container liveness:
   ```bash
   curl -f https://<your-render-service>.onrender.com/health/live
   ```
2. Verify database connectivity:
   ```bash
   curl -f https://<your-render-service>.onrender.com/health/ready
   ```
   Should return: `"checks": { "application": "UP", "database": "CONNECTED", ... }`
