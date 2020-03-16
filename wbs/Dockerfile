FROM node:10

WORKDIR /usr/src/app

COPY package*.json /usr/src/app/

RUN npm install
# RUN npm ci --only=production

COPY . /usr/src/app

EXPOSE 3000

CMD [ "node", "app.js" ]