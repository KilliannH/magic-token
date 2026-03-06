#!/bin/bash
# ============================================
# $MGC — Deploy to Google Cloud Platform
# Cloud Run + Cloud SQL (PostgreSQL)
# ============================================

set -e

# ---- CONFIG (edit these) ----
PROJECT_ID="mgc-project-489120"       # ton GCP project ID
REGION="europe-west1"              # proche de Nantes
SERVICE_NAME="mgc-app"
DB_INSTANCE="mgc-db"
DB_NAME="mgc"
DB_USER="mgc_user"
DB_PASSWORD="$(openssl rand -base64 24)"  # auto-generated, saved in .env.production

echo ""
echo "  ✨ $MGC — GCP Deployment"
echo "  ========================"
echo "  Project:  $PROJECT_ID"
echo "  Region:   $REGION"
echo "  Service:  $SERVICE_NAME"
echo ""

# ---- STEP 1: Set project ----
echo "📌 Step 1: Setting GCP project..."
gcloud config set project $PROJECT_ID

# ---- STEP 2: Enable APIs ----
echo "📌 Step 2: Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com

# ---- STEP 3: Create Cloud SQL instance ----
echo "📌 Step 3: Creating Cloud SQL PostgreSQL instance..."
echo "   (this takes 5-10 minutes...)"

# Check if instance already exists
if gcloud sql instances describe $DB_INSTANCE --quiet 2>/dev/null; then
  echo "   Instance $DB_INSTANCE already exists, skipping."
else
  gcloud sql instances create $DB_INSTANCE \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=$REGION \
    --storage-size=10GB \
    --storage-auto-increase \
    --availability-type=zonal \
    --assign-ip

  echo "   ✅ Instance created."
fi

# Create database
echo "📌 Step 3b: Creating database and user..."
gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE 2>/dev/null || echo "   Database already exists."

gcloud sql users create $DB_USER \
  --instance=$DB_INSTANCE \
  --password=$DB_PASSWORD 2>/dev/null || echo "   User already exists."

# Get connection name
CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE --format='value(connectionName)')
echo "   Connection: $CONNECTION_NAME"

# ---- STEP 4: Store DB password in Secret Manager ----
echo "📌 Step 4: Storing secrets..."
echo -n "$DB_PASSWORD" | gcloud secrets create mgc-db-password --data-file=- 2>/dev/null || \
  echo -n "$DB_PASSWORD" | gcloud secrets versions add mgc-db-password --data-file=-

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"

# ---- STEP 5: Build and push container ----
echo "📌 Step 5: Building container with Cloud Build..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME .

# ---- STEP 6: Deploy to Cloud Run ----
echo "📌 Step 6: Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --add-cloudsql-instances $CONNECTION_NAME \
  --set-env-vars "NODE_ENV=production,DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@/mgc?host=/cloudsql/${CONNECTION_NAME},DATABASE_SSL=false" \
  --port 3001 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --concurrency 80

# ---- STEP 7: Get URL ----
echo ""
echo "  ============================================"
echo "  ✅ DEPLOYED!"
echo "  ============================================"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
echo ""
echo "  🌐 URL: $SERVICE_URL"
echo "  📡 API: ${SERVICE_URL}/api/health"
echo "  🎮 Game: ${SERVICE_URL}/game"
echo ""
echo "  📊 Cloud SQL: $CONNECTION_NAME"
echo "  🔑 DB Password saved to Secret Manager"
echo ""
echo "  ✨ It's a Magic Token!"
echo ""

# Save config for reference
cat > .env.production << ENVEOF
# GCP Production Config (generated $(date))
PROJECT_ID=$PROJECT_ID
REGION=$REGION
SERVICE_NAME=$SERVICE_NAME
SERVICE_URL=$SERVICE_URL
DB_INSTANCE=$DB_INSTANCE
DB_CONNECTION=$CONNECTION_NAME
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@/mgc?host=/cloudsql/${CONNECTION_NAME}
ENVEOF

echo "  Config saved to .env.production"
