# ── dev stage ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS dev

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# ── build stage ────────────────────────────────────────────────────────────────
FROM dev AS builder
RUN npm run build

# ── prod stage ─────────────────────────────────────────────────────────────────
FROM nginx:alpine AS prod

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
