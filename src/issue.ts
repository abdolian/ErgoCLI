import { confirm, input, number } from '@inquirer/prompts';

import { context } from './context';
import { BoxValue, TxBuilder } from 'ergo-lib-wasm-nodejs';

export const issue = async () => {
  const name = (await input({
    message: 'Asset name',
    required: true,
  }))!;

  const amount = (await number({
    message: 'Net amount',
    required: true,
  }))!;

  const decimals = (await number({
    message: 'Decimal places',
    required: true,
  }))!;

  const description = (await input({
    message: 'Brief description',
    required: true,
  }))!;

  const fee = (await number({
    default: TxBuilder.SUGGESTED_TX_FEE().as_i64().as_num(),
    message: 'Fee',
    required: true,
  }))!;

  const sure = await confirm({
    message: 'Are you sure you want to submit?',
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
            address: context.from_changeAddressBase58,
            ergValue: BoxValue.SAFE_USER_MIN().as_i64().as_num(),
            amount,
            name,
            description,
            decimals,
          }
        ],
        fee,
      })
    }
  )
    .then((response) => response.json());

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);

  console.log(`${context.url + '/' + id}`);
}