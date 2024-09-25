import storage from 'node-persist';

export const history = async () => {
  console.table(await storage.getItem('history'))
}