import { input, number, search, select } from '@inquirer/prompts';
import { TxBuilder } from 'ergo-lib-wasm-nodejs';
import storage from 'node-persist';

import { context } from './context';

export const distinct = (value, index, array) => {
  return array.indexOf(value) === index;
}

export const fetchAssets = async (log?: boolean) => {
  log && process.stdout.write('Assets ...');

  const boxes = await fetch(`${context.api}/boxes/unspent/byAddress/${context.from_changeAddressBase58}`)
    .then((response) => response.json())
    .then((response) => response.items);

  const assets = Object.values<any>(boxes
    .map((box) => box.assets)
    .flat(1)
    .reduce((accumulate, box) => {
      if (accumulate[box.tokenId])
        accumulate[box.tokenId].amount += box.amount;
      else
        accumulate[box.tokenId] = box;
      return accumulate;
    }, {}));

  log && process.stdout.clearLine(0);
  log && process.stdout.cursorTo(0);

  log && console.log('Assets');

  log && console.table(assets, ['name', 'amount', 'decimals', 'tokenId']);

  return assets;
}

export const fetchCurrentHeight = async (log?: boolean) => {
  log && process.stdout.write('Current height ...');

  const height = await fetch(`${context.api}/networkState`)
    .then((response) => response.json())
    .then((response) => response.height);

  log && process.stdout.clearLine(0);
  log && process.stdout.cursorTo(0);

  log && console.log(`Current height ${height}`);

  return height;
}

export const fetchLatestBlocks = async (log?: boolean) => {
  log && process.stdout.write('Latest blocks ...');

  const blocks = await fetch(`${context.api}/blocks/headers?limit=10`)
    .then((response) => response.json())
    .then((response) => response.items);

  log && process.stdout.clearLine(0);
  log && process.stdout.cursorTo(0);

  log && console.log('Got latest blocks');

  return blocks as any[];
}

export const fetchUnspentBoxes = async (log?: boolean) => {
  log && process.stdout.write('Unspent boxes ...');

  const boxes = await fetch(`${context.api}/boxes/unspent/byAddress/${context.from_changeAddressBase58}`)
    .then((response) => response.json())
    .then((response) => response.items);

  log && process.stdout.clearLine(0);
  log && process.stdout.cursorTo(0);

  log && console.log('Unspent boxes');

  log && console.table(boxes, ['boxId', 'value']);

  return boxes as any[];
}

export const getAssetId = async () => {
  process.stdout.write('Assets ...');

  const assets = await fetchAssets();

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);

  return await select<string>({
    message: 'Select an asset',
    choices: assets.map((asset, index) => ({
      short: asset.name,
      name: index + ') ' + asset.name.padEnd(16, ' ') + asset.amount.toString().padEnd(16, ' ') + asset.decimals.toString().padEnd(8, ' ') + asset.tokenId.padEnd(16, ' '),
      value: asset.tokenId
    }))
  });
}

export const getFee = async () => {
  return await number({
    default: TxBuilder.SUGGESTED_TX_FEE().as_i64().as_num(),
    message: 'Fee',
    required: true,
  }) as number;
}

export const submitTransaction = async (body: string) => {
  process.stdout.write('Submitting ...');

  const id = await fetch(
    `${context.api}/mempool/transactions/submit`,
    {
      method: 'post',
      body
    }
  )
    .then((response) => response.json())
    .then((response) => response.id);

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);

  console.log(`${context.url + '/' + id}`);
}

export const suggest = async (config: { key: string; message: string; }) => {
  let response;

  const items = await storage.getItem(config.key) || [];

  if (items.length) {
    response = await search({
      message: config.message,
      source(input) {
        if (!input) return items;
        return [input, ...items].filter(distinct);
      },
    });
  } else {
    response = await input({
      message: config.message,
      required: true,
    });
  }

  await storage.setItem(config.key, [response, ...items].filter(distinct));

  return response;
} 
