# Frontend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Expose port
EXPOSE 5173

# Start dev server (for development)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
