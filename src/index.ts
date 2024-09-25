import storage from 'node-persist';

import { environment } from './flows/environment';

await storage.init({
  dir: 'cache'
});

await environment();