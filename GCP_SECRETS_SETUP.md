# GCP Secret Manager Setup Guide

## Complete List of Secrets Required for Deployment

### 🔐 Required Secrets (Must Create)

These secrets are **required** for the application to function:

| Secret Name | Environment Variable | Description | Example Value |
|-------------|---------------------|-------------|---------------|
| `database-url` | `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:port/db?sslmode=require` |
| `openai-api-key` | `OPENAI_API_KEY` | OpenAI API key | `sk-proj-...` |
| `anthropic-api-key` | `ANTHROPIC_API_KEY` | Anthropic (Claude) API key | `sk-ant-...` |
| `deepseek-api-key` | `DEEPSEEK_API_KEY` | DeepSeek API key | `sk-...` |

### 🔓 Optional Secrets

| Secret Name | Environment Variable | Description | Example Value |
|-------------|---------------------|-------------|---------------|
| `sendgrid-api-key` | `SENDGRID_API_KEY` | SendGrid API key (for email features) | `SG.xxx...` |

---

## Step-by-Step Setup Instructions

### Prerequisites

1. **Set your GCP project**:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable Secret Manager API** (if not already enabled):
   ```bash
   gcloud services enable secretmanager.googleapis.com
   ```

---

### Step 1: Create Required Secrets

Run these commands one by one, replacing the placeholder values with your actual credentials:

#### 1. Database URL
```bash
echo -n "postgresql://username:password@host:port/database?sslmode=require" | \
  gcloud secrets create database-url --data-file=-
```

**Example for Neon Database**:
```bash
echo -n "postgresql://user:pass@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require" | \
  gcloud secrets create database-url --data-file=-
```

#### 2. OpenAI API Key
```bash
echo -n "sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" | \
  gcloud secrets create openai-api-key --data-file=-
```

**Get your key from**: https://platform.openai.com/api-keys

#### 3. Anthropic API Key
```bash
echo -n "sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" | \
  gcloud secrets create anthropic-api-key --data-file=-
```

**Get your key from**: https://console.anthropic.com/settings/keys

#### 4. DeepSeek API Key
```bash
echo -n "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" | \
  gcloud secrets create deepseek-api-key --data-file=-
```

**Get your key from**: https://platform.deepseek.com/api_keys

---

### Step 2: Create Optional Secrets (if needed)

#### SendGrid API Key (Optional)
```bash
echo -n "SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" | \
  gcloud secrets create sendgrid-api-key --data-file=-
```

**Get your key from**: https://app.sendgrid.com/settings/api_keys

---

### Step 3: Grant Cloud Run Access to Secrets

After creating all secrets, grant the Cloud Run service account permission to access them:

```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

# Grant access to all required secrets
for secret in database-url openai-api-key anthropic-api-key deepseek-api-key; do
  echo "Granting access to $secret..."
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done

# Grant access to optional SendGrid secret (if created)
if gcloud secrets describe sendgrid-api-key &>/dev/null; then
  echo "Granting access to sendgrid-api-key..."
  gcloud secrets add-iam-policy-binding sendgrid-api-key \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
fi
```

---

### Step 4: Verify Secrets Are Created

List all secrets:
```bash
gcloud secrets list
```

Verify a specific secret (without revealing its value):
```bash
gcloud secrets describe database-url
gcloud secrets describe openai-api-key
gcloud secrets describe anthropic-api-key
gcloud secrets describe deepseek-api-key
```

Test secret access (this will show the value - use carefully):
```bash
gcloud secrets versions access latest --secret=database-url
```

---

## Quick Setup Script

Save this as `setup-gcp-secrets.sh` and run it:

```bash
#!/bin/bash

# Set your project
PROJECT_ID=$(gcloud config get-value project)
echo "Setting up secrets for project: $PROJECT_ID"

# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Get project number for IAM binding
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# Function to create secret
create_secret() {
  local secret_name=$1
  local prompt=$2
  
  if gcloud secrets describe $secret_name &>/dev/null; then
    echo "⚠️  Secret $secret_name already exists. Skipping..."
    return
  fi
  
  echo ""
  echo "Creating secret: $secret_name"
  read -sp "$prompt: " secret_value
  echo ""
  
  if [ -z "$secret_value" ]; then
    echo "❌ Error: Secret value cannot be empty. Skipping $secret_name"
    return
  fi
  
  echo -n "$secret_value" | gcloud secrets create $secret_name --data-file=-
  echo "✅ Created secret: $secret_name"
  
  # Grant access
  gcloud secrets add-iam-policy-binding $secret_name \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
  echo "✅ Granted Cloud Run access to $secret_name"
}

# Create required secrets
create_secret "database-url" "Enter your PostgreSQL DATABASE_URL"
create_secret "openai-api-key" "Enter your OpenAI API Key"
create_secret "anthropic-api-key" "Enter your Anthropic API Key"
create_secret "deepseek-api-key" "Enter your DeepSeek API Key"

# Optional: SendGrid
read -p "Do you want to create SendGrid API key secret? (y/n): " create_sendgrid
if [ "$create_sendgrid" = "y" ] || [ "$create_sendgrid" = "Y" ]; then
  create_secret "sendgrid-api-key" "Enter your SendGrid API Key"
fi

echo ""
echo "✅ Secret setup complete!"
echo ""
echo "Summary of created secrets:"
gcloud secrets list --filter="name~'(database-url|openai-api-key|anthropic-api-key|deepseek-api-key|sendgrid-api-key)'"
```

Make it executable and run:
```bash
chmod +x setup-gcp-secrets.sh
./setup-gcp-secrets.sh
```

---

## Deployment Command with Secrets

After creating all secrets, deploy with:

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

**Note**: Remove `SENDGRID_API_KEY=sendgrid-api-key:latest` from `--set-secrets` if you didn't create that secret.

---

## Updating Secrets

To update a secret value:

```bash
# Add a new version
echo -n "new-secret-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# The service will automatically use the latest version if configured with :latest
# Or redeploy to pick up the new version
gcloud run services update rfp-response-wizard \
  --region us-central1 \
  --update-secrets="SECRET_NAME=SECRET_NAME:latest"
```

---

## Troubleshooting

### Secret Access Denied

If you get permission errors:
```bash
# Check IAM bindings
gcloud secrets get-iam-policy SECRET_NAME

# Re-grant access
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Verify Secrets in Cloud Run

Check if secrets are accessible in the deployed service:
```bash
# View service configuration
gcloud run services describe rfp-response-wizard \
  --region us-central1 \
  --format="value(spec.template.spec.containers[0].env)"

# View service logs
gcloud run services logs read rfp-response-wizard \
  --region us-central1 \
  --limit 50
```

---

## Summary Checklist

- [ ] Enable Secret Manager API
- [ ] Create `database-url` secret
- [ ] Create `openai-api-key` secret
- [ ] Create `anthropic-api-key` secret
- [ ] Create `deepseek-api-key` secret
- [ ] (Optional) Create `sendgrid-api-key` secret
- [ ] Grant Cloud Run service account access to all secrets
- [ ] Verify secrets are accessible
- [ ] Deploy with secrets configured

---

## Security Best Practices

1. ✅ **Never commit secrets** to version control
2. ✅ **Use Secret Manager** for all sensitive data
3. ✅ **Rotate secrets regularly** (every 90 days recommended)
4. ✅ **Use least privilege** IAM roles
5. ✅ **Monitor secret access** via Cloud Audit Logs
6. ✅ **Use secret versions** for rollback capability
7. ✅ **Restrict secret access** to specific service accounts

---

For more details, see [GCP_DEPLOYMENT.md](./GCP_DEPLOYMENT.md) and [GCP_ENV_VARIABLES.md](./GCP_ENV_VARIABLES.md).

