import { context } from '../context';
import { fetchAssets,fetchUnspentBoxes } from '../utils';

export const information = async () => {
  process.stdout.write('Balance ...');

  const boxes = await fetchUnspentBoxes();

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);

  console.log(`Balance ${boxes.reduce((balance, box) => balance += box.value, 0)}`);

  console.log('Addresses');

  console.table([context.from_changeAddressBase58]);

  await fetchUnspentBoxes(true);

  await fetchAssets(true);
}