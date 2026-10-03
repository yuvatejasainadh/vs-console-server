# VoiceShield Console Disaster Recovery & Business Continuity Plan

---

## 1. Recovery Objectives

| Metric | Target | Description |
|:---|:---:|:---|
| **Recovery Point Objective (RPO)** | **< 5 Minutes** | Maximum acceptable data loss duration. Achieved via continuous RDS WAL archiving and automated snapshots. |
| **Recovery Time Objective (RTO)** | **< 30 Minutes** | Target time to restore service following a catastrophic outage. |

---

## 2. Backup Architecture & Policies

### 2.1 PostgreSQL RDS Automated Backups
- **Retention Period:** 30 Days
- **Backup Window:** Daily at 03:00 - 04:00 UTC (off-peak)
- **Continuous Archiving:** Transaction logs (WAL) continuously streamed to S3, enabling Point-In-Time Recovery (PITR) down to the second.

### 2.2 Evidence Storage (S3) Replication
- **Cross-Region Replication (CRR):** S3 bucket objects replicated to a secondary AWS region (e.g. `us-east-1` ➔ `us-west-2`).
- **Object Versioning:** Enabled to protect against accidental deletion or overwrite.

---

## 3. Disaster Recovery Procedures

### Scenario A: Accidental Data Corruption or Database Failure
1. Identify the target timestamp prior to corruption.
2. In AWS RDS Management Console / CLI, initiate Point-in-Time Recovery:
   ```bash
   aws rds restore-db-instance-to-point-in-time \
     --source-db-instance-identifier voiceshield-production-rds \
     --target-db-instance-identifier voiceshield-production-rds-restored \
     --restore-time 2026-10-03T16:45:00Z \
     --db-subnet-group-name voiceshield-private-subnet
   ```
3. Update backend `DATABASE_URL` secret in AWS Secrets Manager to point to the restored RDS instance.
4. Restart backend ECS tasks.

### Scenario B: Complete Regional AWS Outage
1. Direct DNS (Route 53) to failover region ALB.
2. Spin up ECS Fargate tasks in the secondary region using the replicated container image in ECR.
3. Promote the read-replica RDS instance in the secondary region to primary standalone database.
4. Point backend configuration to secondary RDS and secondary S3 evidence bucket.
5. Verify health check `/health/ready`.
