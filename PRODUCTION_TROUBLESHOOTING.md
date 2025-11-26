# Production Troubleshooting Guide

## Common Production Issues and Solutions

### Issue: 500 Error on `/api/generate-response`

**Symptoms:**
- Frontend shows "Failed to generate response"
- Browser console shows 500 errors
- Cloud Run logs show Python script errors

**Root Causes & Fixes:**

#### 1. Python Scripts Not Found
**Error:** `ENOENT: no such file or directory, open 'call_llm_wrapper.py'`

**Fix Applied:** ✅
- Updated all Python script calls to use absolute paths
- Added `getProjectRoot()` helper function
- Set working directory explicitly to `/app` (Docker WORKDIR)

**Check Logs For:**
```
Python script path: /app/call_llm_wrapper.py
Working directory: /app
```

#### 2. Python Script Execution Failed
**Error:** Python script exits with non-zero code

**Fix Applied:** ✅
- Added error logging for Python script stderr
- Check exit codes and throw errors if script fails
- Log both stdout and stderr for debugging

**Check Logs For:**
```
Python script exit code: 1
Python stderr output: [error details]
```

#### 3. Missing Environment Variables
**Error:** `DATABASE_URL must be set` or API key errors

**Solution:**
- Verify secrets are created in Secret Manager
- Check Cloud Run service has secrets configured
- Verify IAM permissions for secret access

**Check:**
```bash
gcloud run services describe rfp-response-wizard \
  --region europe-west1 \
  --format="value(spec.template.spec.containers[0].env)"
```

#### 4. Python Dependencies Missing
**Error:** `ModuleNotFoundError: No module named 'anthropic'`

**Fix Applied:** ✅
- Updated `python-requirements.txt` with correct versions
- Python dependencies installed in Docker build

**Verify:**
- Check Docker build logs for Python package installation
- Ensure `python-requirements.txt` has all required packages

#### 5. Database Connection Issues
**Error:** `could not connect to server` or `connection refused`

**Solution:**
- Verify `DATABASE_URL` secret is correctly set
- Check database firewall allows Cloud Run IPs
- Ensure SSL mode is set (`?sslmode=require`)

---

## Debugging Production Issues

### 1. Check Cloud Run Logs

```bash
# View recent logs
gcloud run services logs read rfp-response-wizard \
  --region europe-west1 \
  --limit 100

# Follow logs in real-time
gcloud run services logs tail rfp-response-wizard \
  --region europe-west1
```

### 2. Check for Python Script Errors

Look for these log patterns:
```
Python script path: /app/call_llm_wrapper.py
Python script exit code: [0 = success, non-zero = error]
Python stderr output: [error details]
```

### 3. Verify Environment Variables

```bash
# Check if secrets are configured
gcloud run services describe rfp-response-wizard \
  --region europe-west1 \
  --format="yaml(spec.template.spec.containers[0].env)"
```

### 4. Test Python Scripts Manually

If you have shell access to the container:
```bash
# List Python scripts
ls -la /app/*.py

# Test Python script directly
python3 /app/call_llm_wrapper.py 1010 openAI false

# Check Python dependencies
python3 -c "import anthropic; import openai; import sqlalchemy; print('All imports OK')"
```

### 5. Check File Permissions

```bash
# Verify Python scripts are executable
ls -la /app/call_llm_wrapper.py
# Should show: -rwxr-xr-x
```

---

## Recent Fixes Applied

### ✅ Fixed Python Script Path Resolution
- **Issue:** Python scripts called with relative paths failed in production
- **Fix:** Use absolute paths (`/app/call_llm_wrapper.py`)
- **Commit:** `ed2cf8f`

### ✅ Improved Error Logging
- **Issue:** Python script errors not visible in logs
- **Fix:** Added stderr logging and exit code checking
- **Commit:** `ed2cf8f`

### ✅ Fixed Anthropic Package Version
- **Issue:** `anthropic==0.12.1` doesn't exist
- **Fix:** Updated to `anthropic>=0.37.0`
- **Commit:** `adf89b7`

### ✅ Fixed Vite Build Output Path
- **Issue:** Dockerfile copied from wrong build output directory
- **Fix:** Changed `dist/client` to `dist/public`
- **Commit:** `de2ecc5`

### ✅ Added Missing Assets
- **Issue:** `intellect_logo.png` missing during build
- **Fix:** Created `attached_assets/` directory and updated Dockerfile
- **Commit:** `b77e158`

---

## Next Steps After Deployment

1. **Monitor Logs:**
   ```bash
   gcloud run services logs tail rfp-response-wizard --region europe-west1
   ```

2. **Test Response Generation:**
   - Try generating a response for a requirement
   - Check browser console for errors
   - Verify Cloud Run logs show successful Python script execution

3. **Verify Secrets:**
   - Ensure all secrets are accessible
   - Check IAM permissions if errors persist

4. **Check Database Connection:**
   - Verify database is accessible from Cloud Run
   - Check firewall rules if connection fails

---

## Common Error Patterns

### Pattern 1: Python Script Not Found
```
Error: spawn python3 ENOENT
```
**Solution:** ✅ Fixed - using absolute paths

### Pattern 2: Module Import Error
```
ModuleNotFoundError: No module named 'X'
```
**Solution:** Check `python-requirements.txt` includes the module

### Pattern 3: Permission Denied
```
PermissionError: [Errno 13] Permission denied
```
**Solution:** ✅ Fixed - scripts are executable

### Pattern 4: Database Connection Error
```
could not connect to server
```
**Solution:** Check `DATABASE_URL` secret and firewall rules

### Pattern 5: API Key Error
```
401 Unauthorized - Incorrect API key provided
```
**Solution:** Verify API key secrets are correctly set

---

## Quick Health Check

Run these commands to verify deployment:

```bash
# 1. Check service is running
gcloud run services describe rfp-response-wizard \
  --region europe-west1 \
  --format="value(status.url)"

# 2. Test health endpoint
curl https://rfp-response-generator-47249889063.europe-west1.run.app/api/health

# 3. Check recent errors
gcloud run services logs read rfp-response-wizard \
  --region europe-west1 \
  --limit 50 \
  | grep -i error
```

---

For more details, see [GCP_DEPLOYMENT.md](./GCP_DEPLOYMENT.md)

