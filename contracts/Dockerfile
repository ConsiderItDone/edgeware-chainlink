FROM node:14.16.0-stretch

# Create app directory
WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

ENV NODE_ENV production

CMD ["npm", "start"]
