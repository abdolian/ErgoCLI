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
  TokenAmount,
  TokenId,
  TxBuilder,
  Wallet
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
  submitTransaction
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

  const assetId = addAsset && await getAssetId();

  const assetAmount = addAsset && assetId && (await number({
    message: 'Asset amount',
    required: true,
  }))!;

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
    BoxValue.from_i64(I64.from_str(amount.toString())),
    Contract.pay_to_address(context.testnet ? Address.from_testnet_str(recipientAddress) : Address.from_mainnet_str(recipientAddress)),
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
    message: 'Are you sure you want to submit the transaction?',
    default: false
  });

  if (!sure) return;

  await submitTransaction(signedTransaction.to_json());
}