import { input, search } from '@inquirer/prompts';
import storage from 'node-persist';

export const distinct = (value, index, array) => {
  return array.indexOf(value) === index;
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
