import { MeshTxInitiator, MeshTxInitiatorInput } from '@mesh/common';
import {
  resolvePlutusScriptAddress,
  resolvePaymentKeyHash,
  Transaction,
  PlutusScript,
  Action,
} from '@meshsdk/core';
import {
  serializeBech32Address,
  applyObjParamsToScript,
  builtinByteString,
  list,
} from '@meshsdk/mesh-csl';
import blueprint from './aiken-workspace/plutus.json';

export class MeshPaymentSplitterContract extends MeshTxInitiator {
  wrapPayees = (payees: string[]) =>
    list(
      payees.map((payee) =>
        builtinByteString(serializeBech32Address(payee).pubKeyHash)
      )
    );

  scriptCbor = () =>
    applyObjParamsToScript(blueprint.validators[0].compiledCode, [
      this.wrapPayees(this.payees),
    ]);
  payees: string[] = [];

  constructor(inputs: MeshTxInitiatorInput, payees: string[]) {
    super(inputs);

    if (inputs.wallet) {
      // We add the initiator to the payees list, as only the payees can trigger the payout in the next steps
      inputs.wallet!.getUsedAddresses().then((addresses) => {
        this.payees = [addresses[0], ...payees];
      });
    } else {
      this.payees = payees;
      console.warn(
        'Wallet not provided. Therefore the payment address will not be added to the payees list which makes it impossible to trigger the payout.'
      );
    }
  }

  sendLovelaceToSplitter = async (lovelaceAmount: number) => {
    if (this.wallet === null || this.wallet === undefined) {
      return;
    }

    const { walletAddress } = await this.getWalletInfoForTx();

    const script: PlutusScript = {
      code: this.scriptCbor(),
      version: 'V2',
    };

    const scriptAddress = resolvePlutusScriptAddress(script, 0);

    const hash = resolvePaymentKeyHash(walletAddress);
    const datum = {
      alternative: 0,
      fields: [hash],
    };

    const tx = new Transaction({ initiator: this.wallet }).sendLovelace(
      {
        address: scriptAddress,
        datum: { value: datum },
      },
      lovelaceAmount.toString()
    );

    const unsignedTx = await tx.build();
    const signedTx = await this.wallet.signTx(unsignedTx);
    const txHash = await this.wallet.submitTx(signedTx);
    return txHash;
  };

  triggerPayout = async () => {
    if (this.wallet === null || this.wallet === undefined) {
      return;
    }

    const { walletAddress, collateral } = await this.getWalletInfoForTx();

    const script: PlutusScript = {
      code: this.scriptCbor(),
      version: 'V2',
    };
    const scriptAddress = resolvePlutusScriptAddress(script, 0);
    const utxos = (await this.fetcher?.fetchAddressUTxOs(scriptAddress)) || [];
    const hash = resolvePaymentKeyHash(walletAddress);
    const datum = {
      alternative: 0,
      fields: [hash],
    };

    const redeemerData = 'Hello, World!';
    const redeemer: Action = {
      data: { alternative: 0, fields: [redeemerData] },
    } as Action; // NOTE: cast needed as we're missing `index`, `budget` and `tag`

    let tx = new Transaction({ initiator: this.wallet });
    let split = 0;
    for (const utxo of utxos) {
      const amount = utxo.output?.amount;
      if (amount) {
        let lovelace = amount.find((asset) => asset.unit === 'lovelace');
        if (lovelace) {
          split += Math.floor(Number(lovelace.quantity) / this.payees.length);
        }

        tx = tx.redeemValue({
          value: utxo,
          script: script,
          datum: datum,
          redeemer: redeemer,
        });
      }
    }

    tx = tx.setCollateral([collateral]);
    for (const payee of this.payees) {
      tx = tx.sendLovelace(payee, split.toString());
    }

    tx = tx.setRequiredSigners([walletAddress]);
    const unsignedTx = await tx.build();
    const signedTx = await this.wallet.signTx(unsignedTx, true);
    const txHash = await this.wallet.submitTx(signedTx);
    return txHash;
  };
}
