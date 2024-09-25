import { confirm, number } from '@inquirer/prompts';

import { getAssetId, getFee, submitTransaction } from '../utils';

export const burn = async () => {
  const tokenId = await getAssetId();

  const amount = (await number({
    message: 'Asset amount',
    required: true,
  }))!;

  const fee = await getFee();

  const sure = await confirm({
    message: 'Are you sure you want to burn the token?',
    default: false
  });

  if (!sure) return;

  const body = JSON.stringify({
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
  });

  await submitTransaction(body);
}