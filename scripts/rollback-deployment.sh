#!/bin/bash

# Rollback Script for Next.js Deployment
# Restores the most recent backup of public_html

set -e

echo "=== Adnanpay Deployment Rollback ==="
echo "Date: $(date)"
echo ""

# Configuration
REMOTE_USER="adnanpay"
REMOTE_HOST="natanetwork.net"
REMOTE_PATH="/home/adnanpay/public_html"
BACKUP_BASE="/home/adnanpay/backups"

# Step 1: List available backups
echo "[1/4] Listing available backups..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "ls -lt ${BACKUP_BASE} | grep public_html | head -5"
echo ""

# Step 2: Get latest backup
echo "[2/4] Identifying latest backup..."
LATEST_BACKUP=$(ssh ${REMOTE_USER}@${REMOTE_HOST} "ls -t ${BACKUP_BASE} | grep public_html | head -1")

if [ -z "$LATEST_BACKUP" ]; then
    echo "Error: No backup found"
    exit 1
fi

echo "Latest backup: ${LATEST_BACKUP}"
echo ""

# Step 3: Confirm rollback
read -p "Rollback to ${LATEST_BACKUP}? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

# Step 4: Restore backup
echo "[3/4] Restoring backup..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "rm -rf ${REMOTE_PATH}/* && cp -r ${BACKUP_BASE}/${LATEST_BACKUP}/* ${REMOTE_PATH}/"
echo "Backup restored"
echo ""

# Step 5: Verify restoration
echo "[4/4] Verifying restoration..."
curl -f -s -o /dev/null https://adnanpay.com/ && echo "✓ Frontend OK" || echo "✗ Frontend FAILED"
curl -f -s -o /dev/null https://adnanpay.com/ppob-api/health && echo "✓ Backend OK" || echo "✗ Backend FAILED"

echo ""
echo "=== Rollback Complete ==="
echo "Restored from: ${LATEST_BACKUP}"
