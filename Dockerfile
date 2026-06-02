# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=5000
# Configure local HuggingFace cache folder inside the container
ENV XENOVA_TRANSFORMERS_CACHE=/app/.cache

# Copy package configuration and installed dependencies from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src

# Create cache directory and grant ownership to non-root node user
RUN mkdir -p /app/.cache && chown -R node:node /app

# Expose the API port
EXPOSE 5000

# Run container as a non-privileged node user for security
USER node

# Start the Express server
CMD ["node", "src/app.js"]
