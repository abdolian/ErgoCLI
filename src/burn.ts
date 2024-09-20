import { confirm, number, select } from '@inquirer/prompts';
import { 
  TxBuilder, 
} from 'ergo-lib-wasm-nodejs';

import { context } from './context'; 

export const burn = async () => {
  process.stdout.write('Assets ...');

  const boxes = await fetch(`${context.api}/boxes/unspent/byAddress/${context.from_changeAddressBase58}`)
    .then((response) => response.json())
    .then((response) => response.items);

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);

  const tokenId = (await select<string>({
    message: 'Select an asset',
    choices: boxes
      .map((box) => box.assets)
      .flat(1)
      .map((asset, index) => ({
        short: asset.name,
        name: index + ') ' + asset.name.padEnd(16, ' ') + asset.amount.toString().padEnd(16, ' ') + asset.decimals.toString().padEnd(8, ' ') + asset.tokenId.padEnd(16, ' '),
        value: asset.tokenId
      }))
  }))!;

  const amount = (await number({
    message: 'Asset amount',
    required: true,
  }))!;

  const fee = (await number({
    message: 'Fee',
    default: TxBuilder.SUGGESTED_TX_FEE().as_i64().as_num()
  }))!;


  const sure = await confirm({
    message: 'Are you sure you want to burn the token?',
    default: false
  });

  if (!sure) return;

  process.stdout.write('Submitting ...');

  const id = await fetch(
    `http://176.9.15.237:9052/wallet/transaction/send`,
    {
      method: 'post',
      headers: {
        'api_key': process.env.API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            assetsToBurn: [
              {
                tokenId,
                amount
              }
            ]
          }
        ],
        fee,
      })
    }
  )
    .then((response) => response.json());

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);

  console.log(`${context.url + '/' + id}`, id);
}