FROM node:9.3.0
WORKDIR /usr/src/app
EXPOSE 8080
CMD [ "node", "bin/www" ]