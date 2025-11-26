# GCP Environment Variables Reference

## Quick Reference: Environment Variables for Google Cloud Platform

This document lists all environment variables required for deploying the RFP Response Wizard to GCP.

---

## Required Environment Variables (Must Configure)

### 1. Database Configuration

| Variable | Type | Secret Manager | Description |
|----------|------|----------------|-------------|
| `DATABASE_URL` | **Secret** | ✅ **YES** | PostgreSQL connection string |

**Format**: `postgresql://username:password@host:port/database?sslmode=require`

**Example**: `postgresql://user:pass@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require`

**GCP Secret Manager Command**:
```bash
echo -n "postgresql://user:pass@host:port/db?sslmode=require" | \
  gcloud secrets create database-url --data-file=-
```

---

### 2. API Keys (All Required)

| Variable | Type | Secret Manager | Description |
|----------|------|----------------|-------------|
| `OPENAI_API_KEY` | **Secret** | ✅ **YES** | OpenAI API key |
| `ANTHROPIC_API_KEY` | **Secret** | ✅ **YES** | Anthropic (Claude) API key |
| `DEEPSEEK_API_KEY` | **Secret** | ✅ **YES** | DeepSeek API key |

**GCP Secret Manager Commands**:
```bash
# OpenAI
echo -n "sk-..." | gcloud secrets create openai-api-key --data-file=-

# Anthropic
echo -n "sk-ant-..." | gcloud secrets create anthropic-api-key --data-file=-

# DeepSeek
echo -n "your-deepseek-key" | gcloud secrets create deepseek-api-key --data-file=-
```

**Where to get API keys**:
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/settings/keys
- DeepSeek: https://platform.deepseek.com/api_keys

---

## Optional Environment Variables

| Variable | Type | Secret Manager | Required | Description |
|----------|------|----------------|----------|-------------|
| `SENDGRID_API_KEY` | **Secret** | ✅ **YES** | ❌ No | SendGrid API key for email functionality |
| `NODE_ENV` | Env Var | ❌ No | ❌ No | Node environment (set to `production`) |
| `PORT` | Env Var | ❌ No | ❌ No | Port number (auto-set by Cloud Run) |

**GCP Secret Manager Command for SendGrid**:
```bash
echo -n "SG.xxx..." | gcloud secrets create sendgrid-api-key --data-file=-
```

**Note**: `PORT` is automatically set by Cloud Run. Do not override unless necessary.

---

## Complete Deployment Command with Secrets

### Cloud Run Deployment

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

---

## Secret Manager Setup Checklist

- [ ] Create `database-url` secret with your PostgreSQL connection string
- [ ] Create `openai-api-key` secret with your OpenAI API key
- [ ] Create `anthropic-api-key` secret with your Anthropic API key
- [ ] Create `deepseek-api-key` secret with your DeepSeek API key
- [ ] Create `sendgrid-api-key` secret (optional, for email features)
- [ ] Grant Cloud Run service account access to all secrets
- [ ] Verify secrets are accessible: `gcloud secrets versions access latest --secret=SECRET_NAME`

---

## Granting Secret Access to Cloud Run

After creating secrets, grant access to the Cloud Run service account:

```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

# Grant access to each secret
for secret in database-url openai-api-key anthropic-api-key deepseek-api-key sendgrid-api-key; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

---

## Summary Table

| Variable | Required | Secret Manager | Cloud Run Secret Reference |
|----------|----------|----------------|---------------------------|
| `DATABASE_URL` | ✅ Yes | ✅ Yes | `database-url:latest` |
| `OPENAI_API_KEY` | ✅ Yes | ✅ Yes | `openai-api-key:latest` |
| `ANTHROPIC_API_KEY` | ✅ Yes | ✅ Yes | `anthropic-api-key:latest` |
| `DEEPSEEK_API_KEY` | ✅ Yes | ✅ Yes | `deepseek-api-key:latest` |
| `SENDGRID_API_KEY` | ❌ No | ✅ Yes | `sendgrid-api-key:latest` |
| `NODE_ENV` | ❌ No | ❌ No | Set as env var: `production` |
| `PORT` | ❌ No | ❌ No | Auto-set by Cloud Run |

---

## Testing Secrets

After deployment, verify secrets are accessible:

```bash
# Check if service can access secrets
gcloud run services describe rfp-response-wizard \
  --region us-central1 \
  --format="value(spec.template.spec.containers[0].env)"

# View service logs to verify environment variables are loaded
gcloud run services logs read rfp-response-wizard \
  --region us-central1 \
  --limit 50
```

---

## Updating Secrets

To update a secret value:

```bash
# Add a new version
echo -n "new-secret-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# The service will automatically use the latest version if configured with :latest
# Or redeploy to pick up the new version
```

---

## Security Notes

1. **Never commit secrets** to version control
2. **Always use Secret Manager** for sensitive data
3. **Rotate secrets regularly** for security best practices
4. **Use least privilege** IAM roles
5. **Monitor secret access** using Cloud Audit Logs

---

For detailed deployment instructions, see [GCP_DEPLOYMENT.md](./GCP_DEPLOYMENT.md).

