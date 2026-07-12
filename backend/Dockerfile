# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the TypeScript project
RUN npm run build

# Expose the API port
EXPOSE 5000

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["npm", "run", "start"]
