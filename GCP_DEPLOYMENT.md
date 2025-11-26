# Google Cloud Platform Deployment Guide

This guide provides step-by-step instructions for deploying the RFP Response Wizard application to Google Cloud Platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Deployment Options](#deployment-options)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

1. **Google Cloud Account**: Sign up at https://cloud.google.com/
2. **Google Cloud SDK**: Install `gcloud` CLI tool
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Linux
   curl https://sdk.cloud.google.com | bash
   
   # Windows
   # Download from https://cloud.google.com/sdk/docs/install
   ```
3. **Authentication**: Login and set your project
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```
4. **Enable Required APIs**:
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   ```

## Environment Variables

### Required Environment Variables

The following environment variables **MUST** be configured in Google Cloud:

#### 1. Database Configuration
- **`DATABASE_URL`** (Secret Manager recommended)
  - Format: `postgresql://username:password@host:port/database?sslmode=require`
  - Example: `postgresql://user:pass@neon-host.neon.tech/dbname?sslmode=require`
  - **Type**: Secret (contains credentials)
  - **Where to set**: Secret Manager or Cloud Run environment variables

#### 2. API Keys (All should be stored in Secret Manager)
- **`OPENAI_API_KEY`** (Secret Manager recommended)
  - Your OpenAI API key from https://platform.openai.com/api-keys
  - **Type**: Secret (sensitive)
  
- **`ANTHROPIC_API_KEY`** (Secret Manager recommended)
  - Your Anthropic API key from https://console.anthropic.com/settings/keys
  - **Type**: Secret (sensitive)
  
- **`DEEPSEEK_API_KEY`** (Secret Manager recommended)
  - Your DeepSeek API key from https://platform.deepseek.com/api_keys
  - **Type**: Secret (sensitive)

#### 3. Optional Environment Variables
- **`SENDGRID_API_KEY`** (Secret Manager recommended)
  - SendGrid API key for email functionality
  - **Type**: Secret (sensitive)
  - **Required**: No (email features will be disabled if not set)

- **`NODE_ENV`**
  - Set to `production` for production deployments
  - **Type**: Environment variable
  - **Default**: `production` (set automatically in deployment)

- **`PORT`**
  - Port number for the application
  - **Type**: Environment variable
  - **Default**: `8080` (set automatically by Cloud Run)
  - **Note**: Cloud Run sets this automatically; don't override unless necessary

### Complete List of Environment Variables

| Variable Name | Type | Required | Secret Manager | Description |
|--------------|------|----------|----------------|-------------|
| `DATABASE_URL` | Secret | ✅ Yes | ✅ Recommended | PostgreSQL connection string |
| `OPENAI_API_KEY` | Secret | ✅ Yes | ✅ Recommended | OpenAI API key |
| `ANTHROPIC_API_KEY` | Secret | ✅ Yes | ✅ Recommended | Anthropic API key |
| `DEEPSEEK_API_KEY` | Secret | ✅ Yes | ✅ Recommended | DeepSeek API key |
| `SENDGRID_API_KEY` | Secret | ❌ No | ✅ Recommended | SendGrid API key (optional) |
| `NODE_ENV` | Env Var | ❌ No | ❌ No | Node environment (`production`) |
| `PORT` | Env Var | ❌ No | ❌ No | Port number (auto-set by Cloud Run) |

## Deployment Options

### Option 1: Cloud Run (Recommended)

**Why Cloud Run?**
- Full Docker support (Node.js + Python)
- Serverless, auto-scaling
- Pay-per-use pricing
- Better Python subprocess support

**Steps:**

1. **Build and push Docker image**:
   ```bash
   # Build the image
   docker build -t gcr.io/YOUR_PROJECT_ID/rfp-response-wizard:latest .
   
   # Push to Container Registry
   docker push gcr.io/YOUR_PROJECT_ID/rfp-response-wizard:latest
   ```

2. **Create secrets in Secret Manager**:
   ```bash
   # Create secrets for sensitive data
   echo -n "your-database-url" | gcloud secrets create database-url --data-file=-
   echo -n "your-openai-key" | gcloud secrets create openai-api-key --data-file=-
   echo -n "your-anthropic-key" | gcloud secrets create anthropic-api-key --data-file=-
   echo -n "your-deepseek-key" | gcloud secrets create deepseek-api-key --data-file=-
   echo -n "your-sendgrid-key" | gcloud secrets create sendgrid-api-key --data-file=-
   ```

3. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy rfp-response-wizard \
     --image gcr.io/YOUR_PROJECT_ID/rfp-response-wizard:latest \
     --region us-central1 \
     --platform managed \
     --allow-unauthenticated \
     --memory 2Gi \
     --cpu 2 \
     --timeout 300 \
     --max-instances 10 \
     --min-instances 1 \
     --set-secrets="DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest,DEEPSEEK_API_KEY=deepseek-api-key:latest,SENDGRID_API_KEY=sendgrid-api-key:latest" \
     --set-env-vars="NODE_ENV=production"
   ```

### Option 2: App Engine Standard

**Note**: App Engine Standard has limitations with Python subprocess calls. Use Cloud Run instead for better Python support.

If you still want to use App Engine:

1. **Set environment variables in `app.yaml`** or use Secret Manager
2. **Deploy**:
   ```bash
   gcloud app deploy
   ```

### Option 3: Cloud Build CI/CD (Recommended for Production)

Use the provided `cloudbuild.yaml` for automated deployments:

1. **Set up secrets in Secret Manager** (same as Option 1, Step 2)

2. **Update `cloudbuild.yaml`** to include secrets:
   ```yaml
   # In the deploy step, update --set-secrets:
   --set-secrets="DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest,DEEPSEEK_API_KEY=deepseek-api-key:latest,SENDGRID_API_KEY=sendgrid-api-key:latest"
   ```

3. **Trigger build**:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

4. **Set up automatic triggers** (optional):
   ```bash
   # Connect to GitHub repository
   gcloud builds triggers create github \
     --repo-name=YOUR_REPO \
     --repo-owner=YOUR_GITHUB_USERNAME \
     --branch-pattern="^main$" \
     --build-config=cloudbuild.yaml
   ```

## Deployment Steps

### Step 1: Prepare Secrets

Create all required secrets in Secret Manager:

```bash
# Database URL
echo -n "postgresql://user:pass@host:port/db?sslmode=require" | \
  gcloud secrets create database-url --data-file=-

# API Keys
echo -n "sk-..." | gcloud secrets create openai-api-key --data-file=-
echo -n "sk-ant-..." | gcloud secrets create anthropic-api-key --data-file=-
echo -n "your-deepseek-key" | gcloud secrets create deepseek-api-key --data-file=-
echo -n "SG...." | gcloud secrets create sendgrid-api-key --data-file=-
```

### Step 2: Grant Permissions

Grant Cloud Run service account access to secrets:

```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

# Grant secret accessor role
gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding anthropic-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding deepseek-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding sendgrid-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 3: Build and Deploy

**Using Cloud Build (Recommended)**:
```bash
gcloud builds submit --config cloudbuild.yaml
```

**Using Docker directly**:
```bash
# Build
docker build -t gcr.io/YOUR_PROJECT_ID/rfp-response-wizard:latest .

# Push
docker push gcr.io/YOUR_PROJECT_ID/rfp-response-wizard:latest

# Deploy
gcloud run deploy rfp-response-wizard \
  --image gcr.io/YOUR_PROJECT_ID/rfp-response-wizard:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --set-secrets="DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest,DEEPSEEK_API_KEY=deepseek-api-key:latest,SENDGRID_API_KEY=sendgrid-api-key:latest" \
  --set-env-vars="NODE_ENV=production"
```

### Step 4: Verify Deployment

1. **Get the service URL**:
   ```bash
   gcloud run services describe rfp-response-wizard --region us-central1 --format="value(status.url)"
   ```

2. **Test the health endpoint**:
   ```bash
   curl https://YOUR_SERVICE_URL/api/health
   ```

3. **Check logs**:
   ```bash
   gcloud run services logs read rfp-response-wizard --region us-central1
   ```

## Post-Deployment

### Update Environment Variables

To update environment variables or secrets:

```bash
# Update a secret
echo -n "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Update environment variables
gcloud run services update rfp-response-wizard \
  --region us-central1 \
  --update-env-vars="NODE_ENV=production"
```

### Scale Configuration

Adjust scaling settings:

```bash
gcloud run services update rfp-response-wizard \
  --region us-central1 \
  --min-instances 1 \
  --max-instances 20 \
  --memory 4Gi \
  --cpu 4
```

## Troubleshooting

### Issue: Python scripts not executing

**Solution**: Ensure Python 3.11 is installed in the Docker image. The Dockerfile includes Python installation.

### Issue: Database connection errors

**Solution**: 
1. Verify `DATABASE_URL` secret is correctly set
2. Check database firewall rules allow Cloud Run IPs
3. Ensure SSL mode is set (`?sslmode=require`)

### Issue: API key authentication errors

**Solution**:
1. Verify secrets are correctly created in Secret Manager
2. Check IAM permissions for secret access
3. Ensure secrets are referenced correctly in deployment command

### Issue: Port binding errors

**Solution**: Cloud Run automatically sets the `PORT` environment variable. The application now reads `process.env.PORT` and defaults to 5000 for local development.

### Issue: Timeout errors

**Solution**: Increase timeout in Cloud Run:
```bash
gcloud run services update rfp-response-wizard \
  --region us-central1 \
  --timeout 600
```

### Viewing Logs

```bash
# Real-time logs
gcloud run services logs tail rfp-response-wizard --region us-central1

# Recent logs
gcloud run services logs read rfp-response-wizard --region us-central1 --limit 50
```

## Security Best Practices

1. **Always use Secret Manager** for sensitive data (API keys, database URLs)
2. **Never commit secrets** to version control
3. **Use least privilege** IAM roles
4. **Enable Cloud Armor** for DDoS protection (optional)
5. **Use VPC connector** for private database access (optional)
6. **Enable audit logs** for compliance

## Cost Optimization

1. **Set min-instances to 0** for development (cold starts acceptable)
2. **Use Cloud Run** instead of App Engine for better cost control
3. **Monitor usage** with Cloud Monitoring
4. **Set up billing alerts** to avoid surprises

## Support

For issues or questions:
1. Check Cloud Run logs: `gcloud run services logs read`
2. Review application logs in Cloud Console
3. Check Secret Manager for secret access issues
4. Verify IAM permissions for service account

