import { confirm, input, number } from '@inquirer/prompts';
import {
  Address,
  BoxSelection,
  BoxValue,
  Contract,
  ErgoBoxAssetsDataList,
  ErgoBoxCandidateBuilder,
  ErgoBoxCandidates,
  ErgoBoxes,
  I64,
  Token,
  TokenAmount,
  TokenId,
  TxBuilder
} from 'ergo-lib-wasm-nodejs';

import { context } from '../context';
import {
  fetchAssets,
  fetchCurrentHeight,
  fetchLatestBlocks,
  fetchUnspentBoxes,
  getFee,
  numberToBoxValue,
  signTransaction,
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

  const height = await fetchCurrentHeight(context.api, true);

  const blocks = await fetchLatestBlocks(context.api, true);

  const boxes = await fetchUnspentBoxes(context.api, context.addressBase58, true);

  const assets = await fetchAssets(context.api, context.addressBase58, true);

  const inputs = new BoxSelection(
    ErgoBoxes.from_boxes_json(boxes),
    new ErgoBoxAssetsDataList()
  );

  const outputs = ErgoBoxCandidates.empty();

  const main = new ErgoBoxCandidateBuilder(
    BoxValue.SAFE_USER_MIN(),
    context.contract,
    height
  );

  const change = new ErgoBoxCandidateBuilder(
    BoxValue.from_i64(
      I64.from_str(
        boxes.reduce((total, box) => total += box.value, - main.value().as_i64().as_num() - fee).toString()
      )
    ),
    context.contract,
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
    numberToBoxValue(fee),
    context.address
  );

  const unsignedTransaction = builder.build();

  const signedTransaction = signTransaction(blocks, boxes, unsignedTransaction, context.secretKey, true); 

  const sure = await confirm({
    message: 'Are you sure you want to submit?',
    default: false
  });

  if (!sure) return;

  await submitTransaction(context.api, signedTransaction.to_json());
}