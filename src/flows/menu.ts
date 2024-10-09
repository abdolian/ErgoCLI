import { select } from '@inquirer/prompts';

import { burn } from './burn';
import { history } from './history';
import { information } from './information';
import { issue } from './issue';
import { payment } from './payment';

export const menu = async () => {
  const response = await select({
    message: 'What do you want to do?',
    default: 'information',
    choices: [
      {
        value: 'information',
        name: 'Wallet Information'
      },
      {
        value: 'payment',
        name: 'Payment'
      },
      {
        value: 'issue',
        name: 'Issue Tokens'
      },
      {
        value: 'burn',
        name: 'Burn Tokens'
      },
      {
        value: 'history',
        name: 'History'
      },
      {
        value: 'exit',
        name: 'Exit'
      }
    ],
  });

  switch (response) {
    case 'burn':
      await burn();
      break;

    case 'history':
      await history();
      break;

    case 'information':
      await information();
      break;

    case 'issue':
      await issue();
      break;

    case 'payment':
      await payment();
      break;

    case 'exit':
      return;
  }
}