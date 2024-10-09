import { confirm } from '@inquirer/prompts';

import { environment } from './environment';
import { menu } from './menu';
import { mnemonic } from './mnemonic';

export const start = async () => {
  await environment();

  await mnemonic();

  await menu();

  const exit = await confirm({
    message: 'Do you want to exit?',
    default: false
  });

  if (exit) return;

  await start();
}