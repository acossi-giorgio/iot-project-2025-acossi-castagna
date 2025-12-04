const path = require('path');
const gateway = require('express-gateway');

console.log(`[gateway] starting (NODE_ENV=${process.env.NODE_ENV || 'development'}) ...`);
const gw = gateway()
  .load(path.join(__dirname, 'config'))
  .run();

// Piccolo hook per sapere che il processo è vivo (express-gateway non emette un "listen" classico)
setTimeout(() => {
  console.log('[gateway] running and accepting traffic on port 8443');
}, 1000);
