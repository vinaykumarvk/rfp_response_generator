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
COPY theme.json ./

# Install Node.js dependencies
RUN npm ci --only=production=false

# Copy source files
COPY server ./server
COPY client ./client
COPY shared ./shared
COPY attached_assets ./attached_assets

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
    python3.11-distutils \
    postgresql-client \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install pip for Python 3.11
RUN curl -sS https://bootstrap.pypa.io/get-pip.py | python3.11

# Create symlink for python3 -> python3.11
RUN ln -sf /usr/bin/python3.11 /usr/bin/python3

# Copy Python requirements and install dependencies directly in final stage
COPY python-requirements.txt ./
RUN python3.11 -m pip install --no-cache-dir -r python-requirements.txt

# Copy Node.js application from builder
COPY --from=node-builder /app/dist ./dist
COPY --from=node-builder /app/node_modules ./node_modules
COPY --from=node-builder /app/package*.json ./

# Copy Python scripts and ensure they're executable
COPY *.py ./
RUN chmod +x *.py 2>/dev/null || true

# Set PYTHONPATH to ensure Python can find modules
# Include both /app (for local scripts) and site-packages location
ENV PYTHONPATH=/app:/usr/local/lib/python3.11/dist-packages:/usr/lib/python3.11/dist-packages
ENV PYTHONUNBUFFERED=1

# Copy shared schema
COPY shared ./shared

# Create public directory for static files
RUN mkdir -p public

# Copy built static files (vite builds to dist/public)
COPY --from=node-builder /app/dist/public ./public

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

