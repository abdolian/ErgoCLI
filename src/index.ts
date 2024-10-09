import storage from 'node-persist';

import { start } from './flows/start';

await storage.init({
  dir: 'cache'
});

await start();