# LooK - AI Demo Video Generator
FROM node:20-slim

# Install system dependencies for Playwright and FFmpeg
RUN apt-get update && apt-get install -y \
    # Core utilities
    wget \
    gnupg \
    ca-certificates \
    procps \
    # Fonts
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-freefont-ttf \
    # Playwright/Chromium dependencies
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxkbcommon0 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    # Video processing
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (including dev for playwright install)
RUN npm ci

# Install Playwright browsers with dependencies
RUN npx playwright install chromium --with-deps

# Copy UI package files and install
COPY ui/package*.json ./ui/
RUN cd ui && npm ci

# Copy UI source and build
COPY ui/ ./ui/
RUN cd ui && npm run build

# Copy application source
COPY src/ ./src/
COPY bin/ ./bin/

# Make bin executable
RUN chmod +x bin/repovideo.js

# Create required directories
RUN mkdir -p /root/.repovideo/projects /root/.repovideo/cache

# Remove dev dependencies to reduce image size
RUN npm prune --omit=dev

# Set environment for headless operation
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright

# Expose port (Railway sets PORT dynamically via env var)
EXPOSE 8080

# Start server
CMD ["node", "bin/repovideo.js", "serve"]
