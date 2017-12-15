FROM node:9.3.0
WORKDIR /usr/src/app
EXPOSE 8080
USER node
CMD [ "node", "bin/www" ]