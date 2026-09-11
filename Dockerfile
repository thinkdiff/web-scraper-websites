# Production Dockerfile for Apify Actor using Node.js 20
FROM apify/actor-node:20 AS builder

# Ensure development dependencies are installed
ENV NODE_ENV=development

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm --quiet set progress=false \
    && npm install --include=dev --omit=optional

# Copy source code and config
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript code
RUN npm run build

# Stage 2: Clean runtime image
FROM apify/actor-node:20

# Copy package files and install only production dependencies
COPY package*.json ./

RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version

# Copy built code from builder
COPY --from=builder /usr/src/app/dist ./dist
COPY .actor ./.actor

# Indicate running in Actor environment
ENV APIFY_IS_AT_HOME=1

# Run the actor
CMD ["npm", "start"]
