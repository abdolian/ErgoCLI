import {
  Contract,
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

  const seed = Mnemonic.to_seed(context.mnemonic, '');
  const rootSecret = ExtSecretKey.derive_master(seed);
  const path = DerivationPath.new(0, new Uint32Array([0]));
  const secretKey = rootSecret.derive(path);
  const pubKey = secretKey.public_key();
  const networkAddress = NetworkAddress.new(context.testnet ? NetworkPrefix.Testnet : NetworkPrefix.Mainnet, pubKey.to_address());
  const address = networkAddress.address();

  context.address = address;
  context.addressBase58 = networkAddress.to_base58();
  context.contract = Contract.pay_to_address(address);
  context.secretKey = secretKey; 

  console.log(`Derived the source address ${context.addressBase58}`);

  await menu();
} 