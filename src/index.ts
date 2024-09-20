import storage from 'node-persist';

import { environment } from './environment';

await storage.init({
  dir: 'cache'
});

await environment();