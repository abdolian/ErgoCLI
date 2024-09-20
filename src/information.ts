import { context } from './context';

export const information = async () => {
  process.stdout.write('Balance ...');

  const boxes = await fetch(`${context.api}/boxes/unspent/byAddress/${context.from_changeAddressBase58}`)
    .then((response) => response.json())
    .then((response) => response.items);

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);

  console.log(`Balance ${boxes.reduce((balance, box) => balance += box.value, 0)}`);

  console.log('Addresses');

  console.table([context.from_changeAddressBase58]);
  
  console.log('Assets');
   
  console.table(boxes.map((box) => box.assets).flat(1), ['name', 'amount', 'decimals', 'tokenId']);
}