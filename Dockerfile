# Multi-stage Dockerfile for RFP Response Wizard
# Supports both Node.js backend and Python scripts

# Stage 1: Build Node.js application
FROM node:20-slim AS node-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY drizzle.config.ts ./

# Install Node.js dependencies
RUN npm ci --only=production=false

# Copy source files
COPY server ./server
COPY client ./client
COPY shared ./shared

# Build the application
RUN npm run build

# Stage 2: Python runtime
FROM python:3.11-slim AS python-runtime

WORKDIR /app

# Install system dependencies for PostgreSQL and Python packages
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements
COPY python-requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r python-requirements.txt

# Stage 3: Final runtime image
FROM node:20-slim

WORKDIR /app

# Install Python 3.11 and system dependencies
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-dev \
    python3-pip \
    postgresql-client \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for python3 -> python3.11
RUN ln -sf /usr/bin/python3.11 /usr/bin/python3

# Copy Python site-packages from python-runtime stage (contains all installed packages)
COPY --from=python-runtime /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=python-runtime /usr/local/bin /usr/local/bin

# Copy Node.js application from builder
COPY --from=node-builder /app/dist ./dist
COPY --from=node-builder /app/node_modules ./node_modules
COPY --from=node-builder /app/package*.json ./

# Copy Python scripts
COPY *.py ./

# Copy shared schema
COPY shared ./shared

# Create public directory for static files
RUN mkdir -p public

# Copy built static files if they exist
COPY --from=node-builder /app/dist/client ./public

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port (GCP Cloud Run uses PORT env var)
EXPOSE 8080

# Health check (use PORT env var or default to 8080)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.PORT || '8080'; require('http').get('http://localhost:' + port + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]

