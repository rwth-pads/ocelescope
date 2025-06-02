# syntax=docker.io/docker/dockerfile:1

FROM node:18-alpine

# System dependencies (useful for some packages)
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Install dependencies based on existing lockfiles
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./

RUN \
  if [ -f yarn.lock ]; then yarn install; \
  elif [ -f package-lock.json ]; then npm install; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm install; \
  else echo "No lockfile found." && exit 1; \
  fi

# Copy source code
COPY . .

# Expose Next.js dev server port
EXPOSE 3000

# Run the development server
CMD [ "npm", "run", "dev" ]

