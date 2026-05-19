FROM node:20-alpine AS build
WORKDIR /app

COPY Dashboard/package.json Dashboard/package-lock.json* ./
RUN npm install

COPY Dashboard ./
ARG VITE_API_BASE_URL
ARG VITE_STOREFRONT_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_STOREFRONT_URL=$VITE_STOREFRONT_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve@14

COPY --from=build /app/dist ./dist

ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "serve -s dist -l ${PORT}"]
