FROM iojs

ADD . /app

WORKDIR /app
RUN npm install

EXPOSE 8125

CMD ["npm", "start"]
