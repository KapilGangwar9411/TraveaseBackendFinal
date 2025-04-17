FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install build essentials
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install ALL dependencies including dev dependencies for build
RUN npm install

# Copy app source
COPY . .

# Build the application
RUN npm run build

# Cleanup dev dependencies
RUN npm prune --omit=dev --no-optional

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Start the server
CMD ["node", "dist/server.js"]
