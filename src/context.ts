import { Address, Contract, ExtSecretKey, NetworkAddress } from 'ergo-lib-wasm-nodejs';

interface Context {
  testnet: boolean;
  api: string;
  url: string;
  mnemonic: string;
  contract: Contract;
  address: Address;
  addressBase58: string;
  secretKey: ExtSecretKey;
}

export const context: Context = {} as any;