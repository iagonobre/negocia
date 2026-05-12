FROM node:22.15-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile
RUN pnpm rebuild bcrypt

COPY . .
RUN pnpm exec prisma generate && pnpm run build

EXPOSE 3000
CMD ["pnpm", "run", "start:prod"]
