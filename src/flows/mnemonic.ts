import {
  DerivationPath,
  ExtSecretKey,
  Mnemonic,
  NetworkAddress,
  NetworkPrefix
} from 'ergo-lib-wasm-nodejs';

import { context } from '../context';
import { menu } from './menu';
import { suggest } from '../utils';

export const mnemonic = async () => {
  context.mnemonic = (await suggest({
    key: 'mnemonic',
    message: 'Enter your mnemonic',
  }))!;

  const from_seed = Mnemonic.to_seed(context.mnemonic, '');
  const from_rootSecret = ExtSecretKey.derive_master(from_seed);
  const from_changePath = DerivationPath.new(0, new Uint32Array([0]));
  const from_changeSecretKey = from_rootSecret.derive(from_changePath);
  const from_changePubKey = from_changeSecretKey.public_key();
  const from_changeAddress = NetworkAddress.new(context.testnet ? NetworkPrefix.Testnet : NetworkPrefix.Mainnet, from_changePubKey.to_address());
  const from_changeAddressBase58 = from_changeAddress.to_base58();

  context.from_changeSecretKey = from_changeSecretKey;
  context.from_changeAddress = from_changeAddress;
  context.from_changeAddressBase58 = from_changeAddressBase58;

  console.log(`Derived the source address ${from_changeAddressBase58}`);

  await menu();
} 