# Environment Variables Setup Guide

## Overview

This application uses environment variables for configuration. You can define them in a `.env` file in the project root directory.

## Quick Start

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file** with your actual values:
   ```bash
   nano .env
   # or
   code .env
   ```

3. **Restart the server** - Environment variables are automatically loaded from `.env`

## Required Environment Variables

### Database Configuration

**DATABASE_URL** - PostgreSQL connection string

Examples:
- **Local PostgreSQL**: `postgresql://username@localhost:5432/rfp_response_generator`
- **Neon Database**: `postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require`
- **Supabase**: `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres`

### API Keys

**OPENAI_API_KEY** - Your OpenAI API key
- Get it from: https://platform.openai.com/api-keys
- Required for OpenAI model responses

**ANTHROPIC_API_KEY** - Your Anthropic/Claude API key
- Get it from: https://console.anthropic.com/settings/keys
- Required for Claude model responses

**DEEPSEEK_API_KEY** - Your DeepSeek API key
- Get it from: https://platform.deepseek.com/api_keys
- Required for DeepSeek model responses

**SENDGRID_API_KEY** (Optional) - SendGrid API key for email functionality
- Get it from: https://app.sendgrid.com/settings/api_keys
- Optional: Only needed if you want email features

### Node Environment

**NODE_ENV** - Environment mode
- Options: `development`, `production`, `test`
- Default: `development`

## File Locations

### `.env` File
- **Location**: Project root (`/Users/n15318/Downloads/RfpResponseWizard/.env`)
- **Status**: Git ignored (not committed to repository)
- **Purpose**: Contains your actual API keys and configuration

### `.env.example` File
- **Location**: Project root
- **Status**: Committed to repository
- **Purpose**: Template showing required variables (without sensitive data)

## How It Works

1. The application automatically loads environment variables from `.env` using `dotenv`
2. Variables are loaded when the server starts (`server/index.ts`)
3. If `.env` doesn't exist, the app will use system environment variables or fail with clear error messages

## Setting Up Your `.env` File

### Step 1: Create from Template
```bash
cp .env.example .env
```

### Step 2: Edit with Your Values
```bash
# Database
DATABASE_URL=postgresql://your_username@localhost:5432/rfp_response_generator

# API Keys (replace with your actual keys)
OPENAI_API_KEY=sk-your-actual-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-actual-anthropic-key-here
DEEPSEEK_API_KEY=your-actual-deepseek-key-here

# Optional
SENDGRID_API_KEY=SG.your-actual-sendgrid-key-here
NODE_ENV=development
```

### Step 3: Verify
```bash
# Check that variables are loaded
npm run dev
# Look for the environment diagnostics output at startup
```

## Alternative: System Environment Variables

You can also set environment variables in your shell:

```bash
export DATABASE_URL="postgresql://user@localhost:5432/dbname"
export OPENAI_API_KEY="sk-your-key"
export ANTHROPIC_API_KEY="sk-ant-your-key"
export DEEPSEEK_API_KEY="your-key"
npm run dev
```

Or use the startup script which loads from `.env`:
```bash
./start_server.sh
```

## Security Best Practices

1. ✅ **Never commit `.env` to git** - It's already in `.gitignore`
2. ✅ **Use `.env.example`** as a template for documentation
3. ✅ **Rotate API keys** regularly
4. ✅ **Use different keys** for development and production
5. ✅ **Restrict API key permissions** when possible

## Troubleshooting

### Variables Not Loading

1. **Check file exists**: `ls -la .env`
2. **Check file location**: Must be in project root
3. **Check syntax**: No spaces around `=` sign
4. **Restart server**: Environment variables load at startup

### Database Connection Issues

1. **Verify DATABASE_URL format**: Must be valid PostgreSQL connection string
2. **Test connection**: `psql $DATABASE_URL -c 'SELECT 1'`
3. **Check database exists**: Database must be created before connecting

### API Key Issues

1. **Verify keys are set**: Check startup diagnostics output
2. **Test API access**: Keys must be valid and have proper permissions
3. **Check for typos**: Keys are case-sensitive

## Example `.env` File

```env
# Database Configuration
DATABASE_URL=postgresql://n15318@localhost:5432/rfp_response_generator

# API Keys
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NODE_ENV=development
```

## Need Help?

- Check server startup logs for environment diagnostics
- Verify `.env` file syntax (no quotes needed, no spaces around `=`)
- Ensure `.env` file is in the project root directory
- Restart the server after changing `.env` file

