import { ExtSecretKey, NetworkAddress } from 'ergo-lib-wasm-nodejs';

interface Context {
  testnet: boolean;
  api: string;
  url: string;
  mnemonic: string;
  from_changeAddressBase58: string;
  from_changeAddress: NetworkAddress;
  from_changeSecretKey: ExtSecretKey;
}

export const context: Context = {} as any;