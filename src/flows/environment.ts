import { confirm } from '@inquirer/prompts';

import { context } from '../context';
import { mnemonic } from './mnemonic';

export const environment = async () => {
  const testnet = await confirm({
    message: 'Do you want to use Testnet?',
  });

  context.testnet = testnet;

  context.api = context.testnet ? 'https://api-testnet.ergoplatform.com/api/v1' : 'https://api.ergoplatform.com/api/v1';

  context.url = context.testnet ? 'https://testnet.ergoplatform.com/en/transactions' : 'https://ergoplatform.com/en/transactions';

  await mnemonic();
}