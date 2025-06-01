FROM node:22.12-alpine AS builder

# Add wget for health checks
RUN apk add --no-cache wget

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create non-root user david
RUN addgroup -g 1001 -S nodejs && \
    adduser -S david -u 1001 -G nodejs

# Change ownership of the app directory
RUN chown -R david:nodejs /app
USER david

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/sse || exit 1

# Start the server with SSE mode
CMD ["node", "mcpServer.js", "--sse"]