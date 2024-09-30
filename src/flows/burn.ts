import { confirm, number } from '@inquirer/prompts';
import {
  Address,
  BlockHeaders,
  BoxSelection,
  BoxValue,
  Contract,
  ErgoBoxAssetsDataList,
  ErgoBoxCandidateBuilder,
  ErgoBoxCandidates,
  ErgoBoxes,
  ErgoStateContext,
  I64,
  PreHeader,
  SecretKey,
  SecretKeys,
  Token,
  TokenAmount,
  TokenId,
  Tokens,
  TxBuilder,
  Wallet
} from 'ergo-lib-wasm-nodejs';

import { context } from '../context';
import {
  fetchCurrentHeight,
  getFee,
  fetchLatestBlocks,
  fetchUnspentBoxes,
  fetchAssets,
  getAssetId,
  submitTransaction
} from '../utils';

export const burn = async () => {
  const tokenId = await getAssetId();

  const amount = (await number({
    message: 'Asset amount',
    required: true,
  }))!;

  const fee = await getFee();

  const height = await fetchCurrentHeight(true);

  const blocks = await fetchLatestBlocks(true);

  const boxes = await fetchUnspentBoxes(true);

  const assets = await fetchAssets(true);

  const inputs = new BoxSelection(
    ErgoBoxes.from_boxes_json(boxes),
    new ErgoBoxAssetsDataList()
  );

  const outputs = ErgoBoxCandidates.empty();

  const main = new ErgoBoxCandidateBuilder(
    BoxValue.from_i64(
      I64.from_str(
        boxes.reduce((total, box) => total += box.value, - fee).toString()
      )
    ),
    Contract.pay_to_address(context.testnet ? Address.from_testnet_str(context.from_changeAddressBase58) : Address.from_mainnet_str(context.from_changeAddressBase58)),
    height
  );

  assets.map((asset: any) => {
    if (asset.tokenId == tokenId) {
      const remaining = asset.amount - amount; 

      if (remaining <= 0) return;

      main.add_token(
        TokenId.from_str(asset.tokenId),
        TokenAmount.from_i64(I64.from_str(remaining.toString()))
      );

      return;
    }

    main.add_token(
      TokenId.from_str(asset.tokenId),
      TokenAmount.from_i64(I64.from_str(asset.amount.toString()))
    );
  });

  outputs.add(main.build());

  const builder = TxBuilder.new(
    inputs,
    outputs,
    height,
    BoxValue.from_i64(I64.from_str(fee.toString())),
    context.from_changeAddress.address()
  );

  const burnTokens = new Tokens();

  burnTokens.add(
    new Token(
      TokenId.from_str(tokenId),
      TokenAmount.from_i64(I64.from_str((amount).toString()))
    )
  );

  builder.set_token_burn_permit(burnTokens);

  const unsignedTransaction = builder.build();

  const blockHeaders = BlockHeaders.from_json(blocks);
  const preHeader = PreHeader.from_block_header(blockHeaders.get(0));
  const stateCtx = new ErgoStateContext(preHeader, blockHeaders);

  const from_dlogSecret = SecretKey.dlog_from_bytes(context.from_changeSecretKey.secret_key_bytes());
  const from_secretKeys = new SecretKeys();
  from_secretKeys.add(from_dlogSecret);

  const from_wallet = Wallet.from_secrets(from_secretKeys);

  const inputBoxes = ErgoBoxes.from_boxes_json(boxes);
  const dataInputs = ErgoBoxes.empty();

  const signedTransaction = from_wallet.sign_transaction(stateCtx, unsignedTransaction, inputBoxes, dataInputs);

  console.log('Outputs');

  console.table(signedTransaction.to_js_eip12().outputs, ['boxId', 'value']);

  const sure = await confirm({
    message: 'Are you sure you want to burn the token?',
    default: false
  });

  if (!sure) return;

  await submitTransaction(signedTransaction.to_json());
}