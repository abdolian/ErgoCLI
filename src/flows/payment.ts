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
  TokenAmount,
  TokenId,
  TxBuilder
} from 'ergo-lib-wasm-nodejs';

import { context } from '../context';
import {
  fetchCurrentHeight,
  getFee,
  fetchLatestBlocks,
  suggest,
  fetchUnspentBoxes,
  fetchAssets,
  getAssetId,
  submitTransaction,
  signTransaction,
  numberToBoxValue
} from '../utils';

export const payment = async () => {
  const recipientAddress = (await suggest({
    key: 'recipientAddress',
    message: 'Recipient address',
  }))!;

  const amount = (await number({
    message: 'Amount',
    default: BoxValue.SAFE_USER_MIN().as_i64().as_num()
  }))!;

  const fee = await getFee();

  const addAsset = await confirm({
    message: 'Do you want to add asset?',
    default: false
  });

  const assetId = addAsset && await getAssetId(context.api, context.addressBase58);

  const assetAmount = addAsset && assetId && (await number({
    message: 'Asset amount',
    required: true,
  }))!;

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
    numberToBoxValue(amount),
    Contract.pay_to_address(context.testnet ? Address.from_testnet_str(recipientAddress) : Address.from_mainnet_str(recipientAddress)),
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
    const tokenId = TokenId.from_str(asset.tokenId);

    if (asset.tokenId == assetId && assetAmount) {
      const remaining = asset.amount - assetAmount;

      main.add_token(
        tokenId,
        TokenAmount.from_i64(I64.from_str(assetAmount.toString()))
      );

      if (remaining <= 0) return;

      change.add_token(
        tokenId,
        TokenAmount.from_i64(I64.from_str(remaining.toString()))
      );

      return;
    }

    change.add_token(
      tokenId,
      TokenAmount.from_i64(I64.from_str(asset.amount.toString()))
    );
  });

  if (change.value().as_i64().as_num() > 0) {
    outputs.add(change.build());
  }

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
    message: 'Are you sure you want to submit the transaction?',
    default: false
  });

  if (!sure) return;

  await submitTransaction(context.api, signedTransaction.to_json());
}