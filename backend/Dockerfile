# Backend: Node + Express + Sequelize
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Application code
COPY . .

EXPOSE 4000

CMD ["node", "src/server.js"]
