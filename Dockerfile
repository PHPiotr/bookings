FROM mhart/alpine-node:9.3.0
WORKDIR /usr/src/app
EXPOSE 8080
RUN adduser -D node
USER node
CMD [ "node", "bin/www" ]