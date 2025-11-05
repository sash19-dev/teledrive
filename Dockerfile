FROM node:18.16.0 as build
WORKDIR /app

COPY package.json yarn.lock ./
COPY api/package.json api/package.json
COPY web/package.json web/package.json

RUN yarn install --frozen-lockfile
COPY . .

RUN yarn workspaces run build
RUN cd api && npx prisma generate

FROM node:18.16.0 as runtime
WORKDIR /app

COPY --from=build /app .
COPY api/entrypoint.sh /app/api/entrypoint.sh
RUN chmod +x /app/api/entrypoint.sh

EXPOSE 3000
ENV NODE_ENV=production

ENTRYPOINT ["/app/api/entrypoint.sh"]
