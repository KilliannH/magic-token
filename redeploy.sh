#!/bin/bash
# Quick redeploy to Cloud Run (after code changes)
set -e

PROJECT_ID="mgc-project-489120"
REGION="europe-west1"
SERVICE_NAME="mgc-app"

echo "🔨 Building..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME . --quiet

echo "🚀 Deploying..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --region $REGION \
  --quiet

URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
echo ""
echo "✅ Deployed → $URL"
