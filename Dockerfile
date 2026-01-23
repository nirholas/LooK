# LooK - AI Demo Video Generator
FROM node:20-slim

# Install dependencies for Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ui/package*.json ./ui/

# Install dependencies
RUN npm ci --only=production

# Install Playwright browsers
RUN npx playwright install chromium

# Build UI
COPY ui/ ./ui/
RUN cd ui && npm ci && npm run build

# Copy source
COPY src/ ./src/
COPY bin/ ./bin/

# Create data directory
RUN mkdir -p /root/.repovideo/projects

# Expose port
ENV PORT=3847
EXPOSE 3847

# Start server
CMD ["node", "bin/repovideo.js", "serve", "--port", "3847"]
