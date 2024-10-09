import { context } from '../context';
import { fetchAssets, fetchUnspentBoxes } from '../utils';

export const information = async () => {
  process.stdout.write('Balance ...');

  const boxes = await fetchUnspentBoxes(context.api, context.addressBase58);

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);

  console.log(`Balance ${boxes.reduce((balance, box) => balance += box.value, 0)}`);

  console.log('Addresses');

  console.table([context.addressBase58]);

  await fetchUnspentBoxes(context.api, context.addressBase58, true);

  await fetchAssets(context.api, context.addressBase58, true);
}