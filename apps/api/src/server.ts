import { buildApp } from './app.js';
import { config } from './config.js';

async function start() {
  const app = buildApp();
  try {
    const address = await app.listen({ port: config.PORT, host: config.HOST });
    console.log(`PayProof POS API listening at ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  start();
}
