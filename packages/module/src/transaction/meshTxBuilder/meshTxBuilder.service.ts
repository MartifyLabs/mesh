import {
  IEvaluator,
  IFetcher,
  ISubmitter,
} from '../../common/contracts/index.js';
import { UTxO } from '../../common/types/index.js';
import { MeshTxBuilderCore } from './meshTxBuilderCore.js';
import {
  MeshTxBuilderBody,
  TxIn,
  ScriptSourceInfo,
  ScriptTxIn,
} from './type.js';

// Delay action at complete
// 1. Query blockchain for any missing information
// 2. Redeemer indexes for spending and minting

type MeshTxBuilderOptions = {
  fetcher?: IFetcher;
  submitter?: ISubmitter;
  evaluator?: IEvaluator;
  isHydra?: boolean;
};

/**
 * MeshTxBuilder is a lower level api for building transaction
 * @param {IFetcher} [fetcher] an optional parameter for fetching utxo
 * @param {ISubmitter} [submitter] an optional parameter for submitting transaction
 * @param {IEvaluator} [evaluator] an optional parameter for evaluating transaction
 * @param {boolean} [isHydra] an optional parameter for using hydra transaction building for configuring 0 fee in protocol parameters
 */
export class MeshTxBuilder extends MeshTxBuilderCore {
  private _fetcher?: IFetcher;
  private _submitter?: ISubmitter;
  private _evaluator?: IEvaluator;
  private queriedTxHashes: Set<string> = new Set();
  private queriedUTxOs: { [x: string]: UTxO[] } = {};

  constructor({
    fetcher,
    submitter,
    evaluator,
    isHydra = false,
  }: MeshTxBuilderOptions) {
    super();
    if (fetcher) this._fetcher = fetcher;
    if (submitter) this._submitter = submitter;
    if (evaluator) this._evaluator = evaluator;
    if (isHydra) this.isHydra = true;
  }

  /**
   * It builds the transaction and query the blockchain for missing information
   * @param customizedTx The optional customized transaction body
   * @returns The signed transaction in hex ready to submit / signed by client
   */
  complete = async (customizedTx?: MeshTxBuilderBody) => {
    if (customizedTx) {
      this.meshTxBuilderBody = customizedTx;
    } else {
      // Handle last items in queue
      this.queueAllLastItem();
    }

    // Checking if all inputs are complete
    const { inputs, collaterals } = this.meshTxBuilderBody;
    const incompleteTxIns = [...inputs, ...collaterals].filter(
      (txIn) => !this.isInputComplete(txIn)
    );

    // Getting all missing utxo information
    await this.queryAllTxInfo(incompleteTxIns);

    // Completing all inputs
    incompleteTxIns.forEach((txIn) => {
      this.completeTxInformation(txIn);
    });

    this.completeSync(customizedTx);

    // Evaluating the transaction
    if (this._evaluator) {
      const txEvaluation = await this._evaluator.evaluateTx(this.txHex);
      this.updateRedeemer(this.meshTxBuilderBody, txEvaluation);
      this.completeSync(customizedTx);
    }
    return this;
  };

  /**
   * Submit transactions to the blockchain using the fetcher instance
   * @param txHex The signed transaction in hex
   * @returns
   */
  submitTx = async (txHex: string): Promise<string | undefined> => {
    const txHash = await this._submitter?.submitTx(txHex);
    return txHash;
  };

  /**
   * Get the UTxO information from the blockchain
   * @param TxHash The TxIn object that contains the txHash and txIndex, while missing amount and address information
   */
  private getUTxOInfo = async (txHash: string): Promise<void> => {
    let utxos: UTxO[] = [];
    if (!this.queriedTxHashes.has(txHash)) {
      this.queriedTxHashes.add(txHash);
      utxos = (await this._fetcher?.fetchUTxOs(txHash)) || [];
      this.queriedUTxOs[txHash] = utxos;
    }
  };

  private queryAllTxInfo = (incompleteTxIns: TxIn[]) => {
    const queryUTxOPromises: Promise<void>[] = [];
    if (incompleteTxIns.length > 0 && !this._fetcher)
      throw Error(
        'Transaction information is incomplete while no fetcher instance is provided'
      );
    for (let i = 0; i < incompleteTxIns.length; i++) {
      const currentTxIn = incompleteTxIns[i];
      if (!this.isInputInfoComplete(currentTxIn)) {
        queryUTxOPromises.push(this.getUTxOInfo(currentTxIn.txIn.txHash));
      }
      if (
        currentTxIn.type === 'Script' &&
        currentTxIn.scriptTxIn.scriptSource?.type === 'Inline' &&
        !this.isRefScriptInfoComplete(currentTxIn)
      ) {
        queryUTxOPromises.push(
          this.getUTxOInfo(currentTxIn.scriptTxIn.scriptSource.txInInfo.txHash)
        );
      }
    }
    return Promise.all(queryUTxOPromises);
  };

  private completeTxInformation = (input: TxIn) => {
    // Adding value and address information for inputs if missing
    if (!this.isInputInfoComplete(input)) {
      const utxos: UTxO[] = this.queriedUTxOs[input.txIn.txHash];
      const utxo = utxos?.find(
        (utxo) => utxo.input.outputIndex === input.txIn.txIndex
      );
      const amount = utxo?.output.amount;
      const address = utxo?.output.address;
      if (!amount || amount.length === 0)
        throw Error(
          `Couldn't find value information for ${input.txIn.txHash}#${input.txIn.txIndex}`
        );
      input.txIn.amount = amount;
      if (input.type === 'PubKey') {
        if (!address || address === '')
          throw Error(
            `Couldn't find address information for ${input.txIn.txHash}#${input.txIn.txIndex}`
          );
        input.txIn.address = address;
      }
    }
    // Adding spendingScriptHash for script inputs' scriptSource if missing
    if (
      input.type === 'Script' &&
      input.scriptTxIn.scriptSource?.type == 'Inline' &&
      !this.isRefScriptInfoComplete(input)
    ) {
      const scriptSourceInfo = input.scriptTxIn.scriptSource
        .txInInfo as ScriptSourceInfo;
      const refUtxos = this.queriedUTxOs[scriptSourceInfo.txHash];
      const scriptRefUtxo = refUtxos.find(
        (utxo) => utxo.input.outputIndex === scriptSourceInfo.txIndex
      );
      if (!scriptRefUtxo)
        throw Error(
          `Couldn't find script reference utxo for ${scriptSourceInfo.txHash}#${scriptSourceInfo.txIndex}`
        );
      scriptSourceInfo.spendingScriptHash = scriptRefUtxo?.output.scriptHash;
    }
  };

  private isInputComplete = (txIn: TxIn): boolean => {
    if (txIn.type === 'PubKey') return this.isInputInfoComplete(txIn);
    if (txIn.type === 'Script') {
      return (
        this.isInputInfoComplete(txIn) && this.isRefScriptInfoComplete(txIn)
      );
    }
    return true;
  };

  private isInputInfoComplete = (txIn: TxIn): boolean => {
    const { amount, address } = txIn.txIn;
    if (txIn.type === 'PubKey' && (!amount || !address)) return false;
    if (txIn.type === 'Script') {
      if (!amount) return false;
    }
    return true;
  };

  private isRefScriptInfoComplete = (scriptTxIn: ScriptTxIn): boolean => {
    const { scriptSource } = scriptTxIn.scriptTxIn;
    if (
      scriptSource?.type === 'Inline' &&
      !scriptSource.txInInfo?.spendingScriptHash
    )
      return false;
    return true;
  };
}
