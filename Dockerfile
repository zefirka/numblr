FROM node:16

WORKDIR /app
EXPOSE 8081

COPY . .

RUN npm install
RUN npm run build

CMD npm start
