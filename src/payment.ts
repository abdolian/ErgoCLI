import { confirm, number, select } from '@inquirer/prompts';
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

import { context } from './context';
import { suggest } from './utils';

export const payment = async () => {
  const recipientAddress = (await suggest({
    key: 'recipientAddress',
    message: 'Recipient address',
  }))!;

  const amount = (await number({
    message: 'Amount',
    default: BoxValue.SAFE_USER_MIN().as_i64().as_num()
  }))!;

  const fee = (await number({
    message: 'Fee',
    default: TxBuilder.SUGGESTED_TX_FEE().as_i64().as_num()
  }))!;

  process.stdout.write('Assets ...');

  const boxes = await fetch(`${context.api}/boxes/unspent/byAddress/${context.from_changeAddressBase58}`)
    .then((response) => response.json())
    .then((response) => response.items);

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);

  const addAsset = await confirm({
    message: 'Do you want to add asset?',
    default: false
  });

  const assetId = addAsset && (await select<string>({
    message: 'Select an asset',
    choices: boxes
      .map((box) => box.assets)
      .flat(1)
      .map((asset, index) => ({
        short: asset.name,
        name: index + ') ' + asset.name.padEnd(16, ' ') + asset.amount.toString().padEnd(16, ' ') + asset.decimals.toString().padEnd(8, ' ') + asset.tokenId.padEnd(16, ' '),
        value: asset.tokenId
      }))
  }))!;

  const assetAmount = addAsset && assetId && (await number({
    message: 'Asset amount',
    required: true,
  }))!;

  process.stdout.write('Current height ...');

  const height = await fetch(`${context.api}/networkState`)
    .then((response) => response.json())
    .then((response) => response.height);

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);

  console.log(`Current height ${height}`);

  process.stdout.write('Latest blocks ...');

  const blocks = await fetch(`${context.api}/blocks/headers?limit=10`)
    .then((response) => response.json())
    .then((response) => response.items);

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);

  console.log('Got latest blocks');

  console.log('Boxes');

  console.table(boxes, ['boxId', 'value']);

  console.log('Assets');

  console.table(boxes.map((box) => box.assets).flat(1), ['name', 'amount', 'decimals', 'tokenId']);

  const inputs = new BoxSelection(
    ErgoBoxes.from_boxes_json(boxes),
    new ErgoBoxAssetsDataList()
  );

  const outputs = ErgoBoxCandidates.empty();

  const main = new ErgoBoxCandidateBuilder(
    BoxValue.from_i64(I64.from_str(amount.toString())),
    Contract.pay_to_address(Address.from_testnet_str(recipientAddress)),
    height
  );

  outputs.add(main.build());

  const change = new ErgoBoxCandidateBuilder(
    BoxValue.from_i64(
      I64.from_str(
        boxes.reduce((total, box) => total += box.value, - main.value().as_i64().as_num() - fee).toString()
      )
    ),
    Contract.pay_to_address(context.from_changeAddress.address()),
    height
  )

  boxes
    .map((box) => box.assets)
    .flat(1)
    .map((asset) => {
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

  process.stdout.write('Submitting ...');

  const id = await fetch(
    `${context.api}/mempool/transactions/submit`,
    {
      method: 'post',
      body: signedTransaction.to_json()
    }
  )
    .then((response) => response.json())
    .then((response) => response.id);

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);

  console.log(`${context.url + '/' + id}`);
}