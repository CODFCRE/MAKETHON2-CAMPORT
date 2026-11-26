FROM node:22-alpine AS build

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npx tsc -p tsconfig.json
RUN npm prune --omit=dev

FROM node:22-alpine

ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN mkdir -p /app/temp && chown -R node:node /app
USER node

EXPOSE 3001

CMD ["node", "dist/index.js"]
