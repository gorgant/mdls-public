import * as functions from 'firebase-functions';

// Increase readability in Cloud Logging
require("firebase-functions/lib/logger/compat");

let isProdEnv;

if (functions.config().environment.type = "sandbox") {
  isProdEnv = false 
} else {
  isProdEnv = true;
}

const expressApp = require('../../../app-bundle/main').app(isProdEnv);

const opts = {memory: '512MB', timeoutSeconds: 20};
export const ssrV2 = functions
  .region('us-central1')
  .runWith(opts as functions.RuntimeOptions)
  .https
  .onRequest(expressApp);