import { confirm, number } from '@inquirer/prompts';
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
  Tokens,
  TxBuilder
} from 'ergo-lib-wasm-nodejs';

import { context } from '../context';
import {
  fetchCurrentHeight,
  getFee,
  fetchLatestBlocks,
  fetchUnspentBoxes,
  fetchAssets,
  getAssetId,
  submitTransaction,
  signTransaction,
  numberToBoxValue
} from '../utils';

export const burn = async () => {
  const tokenId = await getAssetId(context.api, context.addressBase58);

  const amount = (await number({
    message: 'Asset amount',
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
    BoxValue.from_i64(
      I64.from_str(
        boxes.reduce((total, box) => total += box.value, - fee).toString()
      )
    ),
    context.contract,
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
    numberToBoxValue(fee),
    context.address
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

  const signedTransaction = signTransaction(blocks, boxes, unsignedTransaction, context.secretKey, true); 

  const sure = await confirm({
    message: 'Are you sure you want to burn the token?',
    default: false
  });

  if (!sure) return;

  await submitTransaction(context.api, signedTransaction.to_json());
}