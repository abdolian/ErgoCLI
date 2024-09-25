import { confirm, input, number } from '@inquirer/prompts';
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
  TxBuilder,
  Wallet
} from 'ergo-lib-wasm-nodejs';

import { context } from '../context';
import {
  fetchAssets,
  fetchCurrentHeight,
  fetchLatestBlocks,
  fetchUnspentBoxes,
  getFee,
  submitTransaction
} from '../utils';

export const issue = async () => {
  const name = (await input({
    message: 'Asset name',
    required: true,
  }))!;

  const amount = (await number({
    message: 'Net amount',
    required: true,
  }))!;

  const decimals = (await number({
    message: 'Decimal places',
    required: true,
  }))!;

  const description = (await input({
    message: 'Brief description',
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
    BoxValue.SAFE_USER_MIN(),
    Contract.pay_to_address(context.testnet ? Address.from_testnet_str(context.from_changeAddressBase58) : Address.from_mainnet_str(context.from_changeAddressBase58)),
    height
  );

  const change = new ErgoBoxCandidateBuilder(
    BoxValue.from_i64(
      I64.from_str(
        boxes.reduce((total, box) => total += box.value, - main.value().as_i64().as_num() - fee).toString()
      )
    ),
    Contract.pay_to_address(context.from_changeAddress.address()),
    height
  );

  assets.map((asset: any) => {
    change.add_token(
      TokenId.from_str(asset.tokenId),
      TokenAmount.from_i64(I64.from_str(asset.amount.toString()))
    );
  });

  if (change.value().as_i64().as_num() > 0) {
    outputs.add(change.build());
  }

  const token = new Token(
    TokenId.from_box_id(inputs.boxes().get(0).box_id()),
    TokenAmount.from_i64(I64.from_str(amount.toString()))
  );

  main.mint_token(token, name, description, decimals);

  outputs.add(main.build());

  const builder = TxBuilder.new(
    inputs,
    outputs,
    height,
    BoxValue.from_i64(I64.from_str(fee.toString())),
    context.from_changeAddress.address()
  );

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
    message: 'Are you sure you want to submit?',
    default: false
  });

  if (!sure) return;

  await submitTransaction(signedTransaction.to_json());
}