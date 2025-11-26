# Fix Secret Manager Permissions

## Error Message
```
Permission denied on secret: projects/47249889063/secrets/openai_api_key/versions/latest
for Revision service account 47249889063-compute@developer.gserviceaccount.com
```

## Issue
The Cloud Run service account doesn't have permission to access the secrets.

## Solution: Grant Secret Accessor Role

Run these commands to grant the necessary permissions:

```bash
# Set your project ID (if not already set)
gcloud config set project YOUR_PROJECT_ID

# Get your project number (from the error: 47249889063)
PROJECT_NUMBER=47249889063

# Grant access to each secret
# Note: Use the actual secret names from your deployment (with underscores or hyphens)

# If your secrets use underscores (openai_api_key):
gcloud secrets add-iam-policy-binding openai_api_key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding anthropic_api_key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding deepseek_api_key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding database_url \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# If you have sendgrid_api_key:
gcloud secrets add-iam-policy-binding sendgrid_api_key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# OR if your secrets use hyphens (openai-api-key):
gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding anthropic-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding deepseek-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Quick Fix Script

Run this script to grant permissions to all secrets at once:

```bash
#!/bin/bash

# Your project number from the error
PROJECT_NUMBER=47249889063

# List all your secrets first to see their exact names
echo "Listing all secrets..."
gcloud secrets list

echo ""
echo "Granting permissions to Cloud Run service account..."
echo "Service Account: ${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
echo ""

# Grant permissions (adjust secret names based on what you see in the list above)
SECRETS=(
  "openai_api_key"
  "anthropic_api_key"
  "deepseek_api_key"
  "database_url"
  "sendgrid_api_key"
)

for secret in "${SECRETS[@]}"; do
  if gcloud secrets describe "$secret" &>/dev/null; then
    echo "Granting access to: $secret"
    gcloud secrets add-iam-policy-binding "$secret" \
      --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
      --role="roles/secretmanager.secretAccessor"
  else
    echo "⚠️  Secret '$secret' not found, skipping..."
  fi
done

echo ""
echo "✅ Permissions granted!"
```

## Verify Permissions

Check if permissions are correctly set:

```bash
# Check IAM policy for a specific secret
gcloud secrets get-iam-policy openai_api_key

# Or check all secrets
for secret in $(gcloud secrets list --format="value(name)"); do
  echo "Checking: $secret"
  gcloud secrets get-iam-policy "$secret" | grep -A 5 "bindings:"
done
```

## Common Issues

### 1. Secret Name Mismatch
**Problem**: Secret name in deployment doesn't match actual secret name.

**Solution**: 
- List your secrets: `gcloud secrets list`
- Use the exact secret names (with underscores or hyphens) in your deployment command

### 2. Wrong Service Account
**Problem**: Using wrong service account number.

**Solution**: Use the project number from the error message (47249889063 in your case)

### 3. Secret Doesn't Exist
**Problem**: Secret hasn't been created yet.

**Solution**: Create the secret first, then grant permissions.

## After Fixing Permissions

1. **Redeploy** your Cloud Run service:
   ```bash
   gcloud run deploy rfp-response-wizard \
     --image gcr.io/YOUR_PROJECT_ID/rfp-response-wizard:latest \
     --region us-central1 \
     --update-secrets="DATABASE_URL=database_url:latest,OPENAI_API_KEY=openai_api_key:latest,ANTHROPIC_API_KEY=anthropic_api_key:latest,DEEPSEEK_API_KEY=deepseek_api_key:latest"
   ```

2. **Verify** the deployment:
   ```bash
   gcloud run services describe rfp-response-wizard \
     --region us-central1 \
     --format="value(spec.template.spec.containers[0].env)"
   ```

## Important Notes

- Secret names are **case-sensitive**
- Use **exact secret names** as they appear in `gcloud secrets list`
- The service account format is: `{PROJECT_NUMBER}-compute@developer.gserviceaccount.com`
- You need to grant permissions for **each secret individually**

