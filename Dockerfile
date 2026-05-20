FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm prisma generate
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod
RUN pnpm prisma generate
COPY --from=build /app/dist ./dist
COPY config ./config
RUN chown -R node:node /app

USER node
CMD ["sh", "-c", "pnpm prisma:migrate && pnpm start"]
