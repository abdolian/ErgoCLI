import { input, number, search, select } from '@inquirer/prompts';
import {
  BlockHeaders,
  BoxValue,
  ErgoBoxes,
  ErgoStateContext,
  ExtSecretKey,
  I64,
  PreHeader,
  SecretKey,
  SecretKeys,
  TxBuilder,
  UnsignedTransaction,
  Wallet
} from 'ergo-lib-wasm-nodejs';
import storage from 'node-persist';

import { context } from './context';

export const distinct = (value, index, array) => {
  return array.indexOf(value) === index;
}

export const fetchAssets = async (api: string, address: string, log?: boolean) => {
  log && process.stdout.write('Assets ...');

  const boxes = await fetch(`${api}/boxes/unspent/byAddress/${address}`)
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

export const fetchCurrentHeight = async (api: string, log?: boolean) => {
  log && process.stdout.write('Current height ...');

  const height = await fetch(`${api}/networkState`)
    .then((response) => response.json())
    .then((response) => response.height);

  log && process.stdout.clearLine(0);
  log && process.stdout.cursorTo(0);

  log && console.log(`Current height ${height}`);

  return height;
}

export const fetchLatestBlocks = async (api: string, log?: boolean) => {
  log && process.stdout.write('Latest blocks ...');

  const blocks = await fetch(`${api}/blocks/headers?limit=10`)
    .then((response) => response.json())
    .then((response) => response.items);

  log && process.stdout.clearLine(0);
  log && process.stdout.cursorTo(0);

  log && console.log('Got latest blocks');

  return blocks as any[];
}

export const fetchUnspentBoxes = async (api: string, address: string, log?: boolean) => {
  log && process.stdout.write('Unspent boxes ...');

  const boxes = await fetch(`${api}/boxes/unspent/byAddress/${address}`)
    .then((response) => response.json())
    .then((response) => response.items);

  log && process.stdout.clearLine(0);
  log && process.stdout.cursorTo(0);

  log && console.log('Unspent boxes');

  log && console.table(boxes, ['boxId', 'value']);

  return boxes as any[];
}

export const getAssetId = async (api: string, address: string) => {
  process.stdout.write('Assets ...');

  const assets = await fetchAssets(api, address);

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

export const numberToBoxValue = (amount: number) => {
  return BoxValue.from_i64(I64.from_str(amount.toString()))
}

export const signTransaction = (blocks: any[], boxes: any[], unsignedTransaction: UnsignedTransaction, secretKey: ExtSecretKey, log?: boolean) => {
  const blockHeaders = BlockHeaders.from_json(blocks);
  const preHeader = PreHeader.from_block_header(blockHeaders.get(0));
  const stateCtx = new ErgoStateContext(preHeader, blockHeaders);

  const from_dlogSecret = SecretKey.dlog_from_bytes(secretKey.secret_key_bytes());
  const from_secretKeys = new SecretKeys();
  from_secretKeys.add(from_dlogSecret);

  const from_wallet = Wallet.from_secrets(from_secretKeys);

  const inputBoxes = ErgoBoxes.from_boxes_json(boxes);
  const dataInputs = ErgoBoxes.empty();

  const signedTransaction = from_wallet.sign_transaction(stateCtx, unsignedTransaction, inputBoxes, dataInputs);

  log && console.log('Outputs');

  log && console.table(signedTransaction.to_js_eip12().outputs, ['boxId', 'value']);

  return signedTransaction;
}

export const submitTransaction = async (api: string, body: string) => {
  process.stdout.write('Submitting ...');

  const id = await fetch(
    `${api}/mempool/transactions/submit`,
    {
      method: 'post',
      body
    }
  )
    .then((response) => response.json())
    .then((response) => response.id);

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);

  const url = `${context.url + '/' + id}`;

  const items = await storage.getItem('history') || [];

  await storage.setItem('history', [url, ...items].filter(distinct));

  console.log(url);
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
