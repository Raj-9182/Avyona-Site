FROM node:20-alpine
WORKDIR /app

COPY shared ./shared
COPY Backend/package.json Backend/package-lock.json* ./Backend/
RUN cd Backend && npm install --omit=dev

COPY Backend ./Backend

WORKDIR /app/Backend
ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "server.js"]
