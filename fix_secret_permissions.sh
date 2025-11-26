#!/bin/bash

# Fix Secret Manager Permissions for Cloud Run
# Based on error: Permission denied on secret openai_api_key

PROJECT_NUMBER=47249889063
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "=== Fixing Secret Manager Permissions ==="
echo "Project Number: $PROJECT_NUMBER"
echo "Service Account: $SERVICE_ACCOUNT"
echo ""

# List all secrets first
echo "Available secrets:"
gcloud secrets list --format="table(name)"
echo ""

# Grant permissions to all secrets (try both naming conventions)
SECRETS_UNDERSCORE=(
  "openai_api_key"
  "anthropic_api_key"
  "deepseek_api_key"
  "database_url"
  "sendgrid_api_key"
)

SECRETS_HYPHEN=(
  "openai-api-key"
  "anthropic-api-key"
  "deepseek-api-key"
  "database-url"
  "sendgrid-api-key"
)

echo "Granting permissions (trying underscore names)..."
for secret in "${SECRETS_UNDERSCORE[@]}"; do
  if gcloud secrets describe "$secret" &>/dev/null; then
    echo "  ✓ Granting access to: $secret"
    gcloud secrets add-iam-policy-binding "$secret" \
      --member="serviceAccount:${SERVICE_ACCOUNT}" \
      --role="roles/secretmanager.secretAccessor" \
      --quiet
  fi
done

echo ""
echo "Granting permissions (trying hyphen names)..."
for secret in "${SECRETS_HYPHEN[@]}"; do
  if gcloud secrets describe "$secret" &>/dev/null; then
    echo "  ✓ Granting access to: $secret"
    gcloud secrets add-iam-policy-binding "$secret" \
      --member="serviceAccount:${SERVICE_ACCOUNT}" \
      --role="roles/secretmanager.secretAccessor" \
      --quiet
  fi
done

echo ""
echo "✅ Permissions granted!"
echo ""
echo "Verify with:"
echo "  gcloud secrets get-iam-policy openai_api_key"
