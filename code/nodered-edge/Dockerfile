FROM nodered/node-red:latest-22-minimal
COPY settings.js /usr/src/node-red/settings.js
RUN npm install ajv
CMD ["-s", "/usr/src/node-red/settings.js"]
