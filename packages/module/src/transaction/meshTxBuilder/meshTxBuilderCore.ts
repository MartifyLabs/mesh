import {
  DEFAULT_PROTOCOL_PARAMETERS,
  DEFAULT_REDEEMER_BUDGET,
  LANGUAGE_VERSIONS,
} from '../../common/constants.js';
import {
  Action,
  Asset,
  Data,
  LanguageVersion,
  Protocol,
  Quantity,
  UTxO,
  Unit,
  PoolParams,
} from '../../common/types/index.js';
import {
  buildTxBuilder,
  toValue,
  toPlutusData,
  toAddress,
  buildDataCost,
  toRelay,
} from '../../common/utils/index.js';
import { csl } from '../../core/index.js';
import {
  MintItem,
  TxIn,
  ScriptSourceInfo,
  RequiredWith,
  PubKeyTxIn,
  ScriptTxIn,
  MeshTxBuilderBody,
  RefTxIn,
  Output,
  ValidityRange,
  Metadata,
  BuilderData,
  Certificate,
  TxInParameter,
} from './type.js';
import { selectUtxos } from '../../core/CPS-009.js';
import JSONbig from 'json-bigint';

export class MeshTxBuilderCore {
  txHex = '';
  txBuilder: csl.TransactionBuilder = buildTxBuilder();
  txEvaluationMultiplier = 1.1;
  private _protocolParams: Protocol = DEFAULT_PROTOCOL_PARAMETERS;
  private txOutput?: Output;
  private addingScriptInput = false;
  private addingPlutusMint = false;
  protected isHydra = false;

  meshTxBuilderBody: MeshTxBuilderBody;

  protected mintItem?: MintItem;

  protected txInQueueItem?: TxIn;

  protected collateralQueueItem?: PubKeyTxIn;

  protected refScriptTxInQueueItem?: RefTxIn;

  /**
   * Reset everything in the MeshTxBuilder instance
   * @returns The MeshTxBuilder instance
   */
  reset = () => {
    this.txHex = '';
    this.txBuilder = buildTxBuilder();
    this.txEvaluationMultiplier = 1.1;
    this._protocolParams = DEFAULT_PROTOCOL_PARAMETERS;
    this.txOutput = undefined;
    this.addingScriptInput = false;
    this.addingPlutusMint = false;
    this.mintItem = undefined;
    this.txInQueueItem = undefined;
    this.collateralQueueItem = undefined;
    this.refScriptTxInQueueItem = undefined;
    this.meshTxBuilderBody = this.emptyTxBuilderBody();
    return this;
  };

  /**
   * Make an empty transaction body for building transaction in object
   * @returns An empty transaction body
   */
  emptyTxBuilderBody = (): MeshTxBuilderBody => ({
    inputs: [],
    outputs: [],
    extraInputs: [],
    selectionThreshold: 0,
    collaterals: [],
    requiredSignatures: [],
    referenceInputs: [],
    mints: [],
    changeAddress: '',
    metadata: [],
    validityRange: {},
    certificates: [],
    signingKey: [],
  });

  constructor() {
    this.meshTxBuilderBody = this.emptyTxBuilderBody();
  }

  /**
   * Synchronous functions here
   */

  /**
   * It builds the transaction without dependencies
   * @param customizedTx The optional customized transaction body
   * @returns The signed transaction in hex ready to submit / signed by client
   */
  completeSync = (customizedTx?: MeshTxBuilderBody) => {
    if (customizedTx) {
      this.meshTxBuilderBody = customizedTx;
    } else {
      this.queueAllLastItem();
    }
    return this.serializeTxBody(this.meshTxBuilderBody);
  };

  /**
   * Complete the signing process
   * @returns The signed transaction in hex
   */
  completeSigning = () => {
    const { signingKey } = this.meshTxBuilderBody;
    if (signingKey.length > 0) {
      this.addAllSigningKeys(signingKey);
    }
    return this.txHex;
  };

  private serializeTxBody = (txBody: MeshTxBuilderBody) => {
    const {
      inputs,
      outputs,
      extraInputs,
      selectionThreshold,
      collaterals,
      referenceInputs,
      mints,
      changeAddress,
      certificates,
      validityRange,
      requiredSignatures,
      metadata,
    } = txBody;
    if (this.isHydra) {
      this.protocolParams({
        minFeeA: 0,
        minFeeB: 0,
        priceMem: 0,
        priceStep: 0,
        collateralPercent: 0,
        coinsPerUTxOSize: '0',
      });
    } else {
      this.protocolParams({});
    }

    if (extraInputs.length > 0) {
      this.addUtxosFrom(extraInputs, String(selectionThreshold));
    }

    this.removeDuplicateInputs();

    this.meshTxBuilderBody.mints.sort((a, b) =>
      a.policyId.localeCompare(b.policyId)
    );
    this.meshTxBuilderBody.inputs.sort((a, b) => {
      if (a.txIn.txHash === b.txIn.txHash) {
        return a.txIn.txIndex - b.txIn.txIndex;
      } else {
        return a.txIn.txHash.localeCompare(b.txIn.txHash);
      }
    });

    this.addAllInputs(inputs);
    this.addAllOutputs(outputs);
    this.addAllCollaterals(collaterals);
    this.addAllReferenceInputs(referenceInputs);
    this.addAllMints(mints);
    this.addAllCertificates(certificates);
    this.addValidityRange(validityRange);
    this.addAllRequiredSignatures(requiredSignatures);
    this.addAllMetadata(metadata);

    this.addCostModels();
    if (changeAddress) {
      // Hacky fix to set a dummy collateral return so fees are calculated correctly
      const totalCollateral = this.meshTxBuilderBody.collaterals
        .map(
          (collateral) =>
            collateral.txIn.amount?.find((asset) => asset.unit === 'lovelace')
              ?.quantity || '0'
        )
        .reduce((acc, curr) => acc + parseInt(curr), 0);

      const collateralEstimate = Math.ceil(
        (this._protocolParams.collateralPercent *
          Number(
            Number(
              this.txBuilder
                .min_fee()
                .checked_add(csl.BigNum.from_str('10000'))
                .to_js_value()
            )
          )) /
          100
      );

      let collateralReturnNeeded = false;

      if (totalCollateral - collateralEstimate > 0) {
        const collateralEstimateOutput = csl.TransactionOutput.new(
          csl.Address.from_bech32(changeAddress),
          csl.Value.new(csl.BigNum.from_str(String(collateralEstimate)))
        );

        if (
          totalCollateral - collateralEstimate >
          Number(
            csl
              .min_ada_for_output(
                collateralEstimateOutput,
                csl.DataCost.new_coins_per_byte(
                  csl.BigNum.from_str(this._protocolParams.coinsPerUTxOSize)
                )
              )
              .to_js_value()
          )
        ) {
          this.txBuilder.set_collateral_return(
            csl.TransactionOutput.new(
              csl.Address.from_bech32(changeAddress),
              csl.Value.new(csl.BigNum.from_str(String(totalCollateral)))
            )
          );
          this.txBuilder.set_total_collateral(
            csl.BigNum.from_str(String(totalCollateral))
          );
          collateralReturnNeeded = true;
        }
      }

      this.addChange(changeAddress);
      if (collateralReturnNeeded) this.addCollateralReturn(changeAddress);
    }

    this.buildTx();
    return this;
  };

  /**
   * Set the input for transaction
   * @param txHash The transaction hash of the input UTxO
   * @param txIndex The transaction index of the input UTxO
   * @param amount The asset amount of index of the input UTxO
   * @param address The address of the input UTxO
   * @returns The MeshTxBuilder instance
   */
  txIn = (
    txHash: string,
    txIndex: number,
    amount?: Asset[],
    address?: string
  ) => {
    if (this.txInQueueItem) {
      this.queueInput();
    }
    if (!this.addingScriptInput) {
      this.txInQueueItem = {
        type: 'PubKey',
        txIn: {
          txHash: txHash,
          txIndex: txIndex,
          amount: amount,
          address: address,
        },
      };
    } else {
      this.txInQueueItem = {
        type: 'Script',
        txIn: {
          txHash: txHash,
          txIndex: txIndex,
          amount: amount,
          address: address,
        },
        scriptTxIn: {},
      };
    }
    this.addingScriptInput = false;
    return this;
  };

  /**
   * Set the script for transaction input
   * @param {string} scriptCbor The CborHex of the script
   * @param version Optional - The Plutus script version
   * @returns The MeshTxBuilder instance
   */
  txInScript = (scriptCbor: string, version: LanguageVersion = 'V2') => {
    if (!this.txInQueueItem) throw Error('Undefined input');
    if (this.txInQueueItem.type === 'PubKey')
      throw Error('Datum value attempted to be called a non script input');
    this.txInQueueItem.scriptTxIn.scriptSource = {
      type: 'Provided',
      script: {
        code: scriptCbor,
        version,
      },
    };
    return this;
  };

  /**
   * Set the input datum for transaction input
   * @param datum The datum in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The datum type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @returns The MeshTxBuilder instance
   */
  txInDatumValue = (
    datum: BuilderData['content'],
    type: BuilderData['type'] = 'Mesh'
  ) => {
    if (!this.txInQueueItem) throw Error('Undefined input');
    if (this.txInQueueItem.type === 'PubKey')
      throw Error('Datum value attempted to be called a non script input');

    let content = datum;
    if (type === 'JSON') {
      content = this.castRawDataToJsonString(datum as object | string);
    }
    if (type === 'Mesh') {
      this.txInQueueItem.scriptTxIn.datumSource = {
        type: 'Provided',
        data: {
          type,
          content: datum as Data,
        },
      };
      return this;
    }
    this.txInQueueItem.scriptTxIn.datumSource = {
      type: 'Provided',
      data: {
        type,
        content: content as string,
      },
    };
    return this;
  };

  /**
   * Tell the transaction builder that the input UTxO has inlined datum
   * @returns The MeshTxBuilder instance
   */
  txInInlineDatumPresent = () => {
    if (!this.txInQueueItem) throw Error('Undefined input');
    if (this.txInQueueItem.type === 'PubKey')
      throw Error(
        'Inline datum present attempted to be called a non script input'
      );
    const { txHash, txIndex } = this.txInQueueItem.txIn;
    if (txHash && txIndex.toString()) {
      this.txInQueueItem.scriptTxIn.datumSource = {
        type: 'Inline',
        txHash,
        txIndex,
      };
    }
    return this;
  };

  // /**
  //  * Native script - Set the reference input where it would also be spent in the transaction
  //  * @param txHash The transaction hash of the reference UTxO
  //  * @param txIndex The transaction index of the reference UTxO
  //  * @param spendingScriptHash The script hash of the spending script
  //  * @returns The MeshTxBuilder instance
  //  */
  // simpleScriptTxInReference = (
  //   txHash: string,
  //   txIndex: number,
  //   spendingScriptHash?: string
  // ) => {
  //   if (!this.txInQueueItem) throw Error('Undefined input');
  //   if (this.txInQueueItem.type === 'PubKey')
  //     throw Error(
  //       'Spending tx in reference attempted to be called a non script input'
  //     );
  //   this.txInQueueItem.scriptTxIn.scriptSource = {
  //     type: 'Inline',
  //     txInInfo: {
  //       txHash,
  //       txIndex,
  //       spendingScriptHash,
  //     },
  //   };
  //   return this;
  // };

  /**
   * Set the redeemer for the reference input to be spent in same transaction
   * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param exUnits The execution units budget for the redeemer
   * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @returns The MeshTxBuilder instance
   */
  txInRedeemerValue = (
    redeemer: BuilderData['content'],
    exUnits = { ...DEFAULT_REDEEMER_BUDGET },
    type: BuilderData['type'] = 'Mesh'
  ) => {
    if (!this.txInQueueItem) throw Error('Undefined input');
    if (this.txInQueueItem.type === 'PubKey')
      throw Error(
        'Spending tx in reference redeemer attempted to be called a non script input'
      );
    let content = redeemer;
    if (type === 'Mesh') {
      this.txInQueueItem.scriptTxIn.redeemer = {
        data: {
          type,
          content: redeemer as Data,
        },
        exUnits,
      };
      return this;
    }
    if (type === 'JSON') {
      content = this.castRawDataToJsonString(redeemer as object | string);
    }
    this.txInQueueItem.scriptTxIn.redeemer = {
      data: {
        type,
        content: content as string,
      },
      exUnits,
    };
    return this;
  };

  /**
   * Set the output for transaction
   * @param {string} address The recipient of the output
   * @param {Asset[]} amount The amount of other native assets attached with UTxO
   * @returns The MeshTxBuilder instance
   */
  txOut = (address: string, amount: Asset[]) => {
    if (this.txOutput) {
      this.meshTxBuilderBody.outputs.push(this.txOutput);
      this.txOutput = undefined;
    }
    this.txOutput = {
      address,
      amount,
    };
    return this;
  };

  /**
   * Set the output datum hash for transaction
   * @param datum The datum in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The datum type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @returns The MeshTxBuilder instance
   */
  txOutDatumHashValue = (
    datum: BuilderData['content'],
    type: BuilderData['type'] = 'Mesh'
  ) => {
    let content = datum;
    if (this.txOutput) {
      if (type === 'Mesh') {
        this.txOutput.datum = {
          type: 'Hash',
          data: {
            type,
            content: content as Data,
          },
        };
        return this;
      }
      if (type === 'JSON') {
        content = this.castRawDataToJsonString(datum as object | string);
      }
      this.txOutput.datum = {
        type: 'Hash',
        data: {
          type,
          content: content as string,
        },
      };
    }
    return this;
  };

  /**
   * Set the output inline datum for transaction
   * @param datum The datum in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The datum type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @returns The MeshTxBuilder instance
   */
  txOutInlineDatumValue = (
    datum: BuilderData['content'],
    type: BuilderData['type'] = 'Mesh'
  ) => {
    let content = datum;
    if (this.txOutput) {
      if (type === 'Mesh') {
        this.txOutput.datum = {
          type: 'Inline',
          data: {
            type,
            content: content as Data,
          },
        };
        return this;
      }
      if (type === 'JSON') {
        content = this.castRawDataToJsonString(datum as object | string);
      }
      this.txOutput.datum = {
        type: 'Inline',
        data: {
          type,
          content: content as string,
        },
      };
    }
    return this;
  };

  /**
   * Set the reference script to be attached with the output
   * @param scriptCbor The CBOR hex of the script to be attached to UTxO as reference script
   * @param version Optional - The Plutus script version
   * @returns The MeshTxBuilder instance
   */
  txOutReferenceScript = (
    scriptCbor: string,
    version: LanguageVersion = 'V2'
  ) => {
    if (this.txOutput) {
      this.txOutput.referenceScript = { code: scriptCbor, version };
    }
    return this;
  };

  /**
   * Set the instruction that it is currently using V2 Plutus spending scripts
   * @returns The MeshTxBuilder instance
   */
  spendingPlutusScriptV2 = () => {
    // This flag should signal a start to a script input
    // The next step after will be to add a tx-in
    // After which, we will REQUIRE, script, datum and redeemer info
    // for unlocking this particular input
    this.addingScriptInput = true;
    return this;
  };

  /**
   * Set the reference input where it would also be spent in the transaction
   * @param txHash The transaction hash of the reference UTxO
   * @param txIndex The transaction index of the reference UTxO
   * @param spendingScriptHash The script hash of the spending script
   * @returns The MeshTxBuilder instance
   */
  spendingTxInReference = (
    txHash: string,
    txIndex: number,
    spendingScriptHash?: string,
    version: LanguageVersion = 'V2'
  ) => {
    if (!this.txInQueueItem) throw Error('Undefined input');
    if (this.txInQueueItem.type === 'PubKey')
      throw Error(
        'Spending tx in reference attempted to be called a non script input'
      );
    this.txInQueueItem.scriptTxIn.scriptSource = {
      type: 'Inline',
      txInInfo: {
        txHash,
        txIndex,
        spendingScriptHash,
        version,
      },
    };
    return this;
  };

  /**
   * [Alias of txInInlineDatumPresent] Set the instruction that the reference input has inline datum
   * @returns The MeshTxBuilder instance
   */
  // Unsure how this is different from the --tx-in-inline-datum-present flag
  // It seems to just be different based on if the script is a reference input
  spendingReferenceTxInInlineDatumPresent = () => {
    this.txInInlineDatumPresent();
    return this;
  };

  /**
   * [Alias of txInRedeemerValue] Set the redeemer for the reference input to be spent in same transaction
   * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param exUnits The execution units budget for the redeemer
   * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @returns The MeshTxBuilder instance
   */
  spendingReferenceTxInRedeemerValue = (
    redeemer: BuilderData['content'],
    exUnits = { ...DEFAULT_REDEEMER_BUDGET },
    type: BuilderData['type'] = 'Mesh'
  ) => {
    this.txInRedeemerValue(redeemer, exUnits, type);
    return this;
  };

  /**
   * Specify a read only reference input. This reference input is not witnessing anything it is simply provided in the plutus script context.
   * @param txHash The transaction hash of the reference UTxO
   * @param txIndex The transaction index of the reference UTxO
   * @returns The MeshTxBuilder instance
   */
  readOnlyTxInReference = (txHash: string, txIndex: number) => {
    this.meshTxBuilderBody.referenceInputs.push({ txHash, txIndex });
    return this;
  };

  /**
   * Set the instruction that it is currently using V2 Plutus minting scripts
   * @returns The MeshTxBuilder instance
   */
  mintPlutusScriptV2 = () => {
    this.addingPlutusMint = true;
    return this;
  };

  /**
   * Set the minting value of transaction
   * @param quantity The quantity of asset to be minted
   * @param policy The policy id of the asset to be minted
   * @param name The hex of token name of the asset to be minted
   * @returns The MeshTxBuilder instance
   */
  mint = (quantity: string, policy: string, name: string) => {
    if (this.mintItem) {
      this.queueMint();
    }
    this.mintItem = {
      type: this.addingPlutusMint ? 'Plutus' : 'Native',
      policyId: policy,
      assetName: name,
      amount: quantity,
    };
    this.addingPlutusMint = false;
    return this;
  };

  /**
   * Set the minting script of current mint
   * @param scriptCBOR The CBOR hex of the minting policy script
   * @param version Optional - The Plutus script version
   * @returns The MeshTxBuilder instance
   */
  mintingScript = (scriptCBOR: string, version: LanguageVersion = 'V2') => {
    if (!this.mintItem) throw Error('Undefined mint');
    if (!this.mintItem.type) throw Error('Mint information missing');
    this.mintItem.scriptSource = {
      type: 'Provided',
      script: { code: scriptCBOR, version },
    };
    return this;
  };

  /**
   * Use reference script for minting
   * @param txHash The transaction hash of the UTxO
   * @param txIndex The transaction index of the UTxO
   * @returns The MeshTxBuilder instance
   */
  mintTxInReference = (
    txHash: string,
    txIndex: number,
    version: LanguageVersion = 'V2'
  ) => {
    if (!this.mintItem) throw Error('Undefined mint');
    if (!this.mintItem.type) throw Error('Mint information missing');
    if (this.mintItem.type == 'Native') {
      throw Error(
        'Mint tx in reference can only be used on plutus script tokens'
      );
    }
    if (!this.mintItem.policyId)
      throw Error('PolicyId information missing from mint asset');
    this.mintItem.scriptSource = {
      type: 'Reference Script',
      txHash,
      txIndex,
      version,
    };
    return this;
  };

  /**
   * Set the redeemer for minting
   * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param exUnits The execution units budget for the redeemer
   * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @returns The MeshTxBuilder instance
   */
  mintReferenceTxInRedeemerValue = (
    redeemer: BuilderData['content'],
    exUnits = { ...DEFAULT_REDEEMER_BUDGET },
    type: BuilderData['type'] = 'Mesh'
  ) => {
    if (!this.mintItem) throw Error('Undefined mint');
    if (this.mintItem.type == 'Native') {
      throw Error(
        'Mint tx in reference can only be used on plutus script tokens'
      );
    } else if (this.mintItem.type == 'Plutus') {
      if (!this.mintItem.policyId)
        throw Error('PolicyId information missing from mint asset');
      let content = redeemer;
      if (type === 'Mesh') {
        this.mintItem.redeemer = {
          data: {
            type,
            content: content as Data,
          },
          exUnits,
        };
        return this;
      }
      if (type === 'JSON') {
        content = this.castRawDataToJsonString(redeemer as object | string);
      }
      this.mintItem.redeemer = {
        data: {
          type,
          content: content as string,
        },
        exUnits,
      };
    }
    return this;
  };

  /**
   * Set the redeemer for the reference input to be spent in same transaction
   * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param exUnits The execution units budget for the redeemer
   * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @returns The MeshTxBuilder instance
   */
  mintRedeemerValue = (
    redeemer: BuilderData['content'],
    exUnits = { ...DEFAULT_REDEEMER_BUDGET },
    type: BuilderData['type'] = 'Mesh'
  ) => {
    this.mintReferenceTxInRedeemerValue(redeemer, exUnits, type);
    return this;
  };

  /**
   * Set the required signer of the transaction
   * @param pubKeyHash The PubKeyHash of the required signer
   * @returns The MeshTxBuilder instance
   */
  requiredSignerHash = (pubKeyHash: string) => {
    this.meshTxBuilderBody.requiredSignatures.push(pubKeyHash);
    return this;
  };

  /**
   * Set the collateral UTxO for the transaction
   * @param txHash The transaction hash of the collateral UTxO
   * @param txIndex The transaction index of the collateral UTxO
   * @param amount The asset amount of index of the collateral UTxO
   * @param address The address of the collateral UTxO
   * @returns The MeshTxBuilder instance
   */
  txInCollateral = (
    txHash: string,
    txIndex: number,
    amount?: Asset[],
    address?: string
  ) => {
    if (this.collateralQueueItem) {
      this.meshTxBuilderBody.collaterals.push(this.collateralQueueItem);
    }
    this.collateralQueueItem = {
      type: 'PubKey',
      txIn: {
        txHash: txHash,
        txIndex: txIndex,
        amount,
        address,
      },
    };
    return this;
  };

  /**
   * Creates a pool registration certificate, and adds it to the transaction
   * @param poolParams Parameters for pool registration
   * @returns The MeshTxBuilder instance
   */
  registerPoolCertificate = (poolParams: PoolParams) => {
    this.meshTxBuilderBody.certificates.push({
      type: 'RegisterPool',
      poolParams,
    });
    return this;
  };

  /**
   * Creates a stake registration certificate, and adds it to the transaction
   * @param stakeKeyHash The keyHash of the stake key
   * @returns The MeshTxBuilder instance
   */
  registerStakeCertificate = (stakeKeyHash: string) => {
    this.meshTxBuilderBody.certificates.push({
      type: 'RegisterStake',
      stakeKeyHash,
    });
    return this;
  };

  /**
   * Creates a stake delegation certificate, and adds it to the transaction
   * This will delegate stake from the corresponding stake address to the pool
   * @param stakeKeyHash The keyHash of the stake key
   * @param poolId poolId can be in either bech32 or hex form
   * @returns The MeshTxBuilder instance
   */
  delegateStakeCertificate = (stakeKeyHash: string, poolId: string) => {
    this.meshTxBuilderBody.certificates.push({
      type: 'DelegateStake',
      stakeKeyHash,
      poolId,
    });
    return this;
  };

  /**
   * Creates a stake deregister certificate, and adds it to the transaction
   * @param stakeKeyHash The keyHash of the stake key
   * @returns The MeshTxBuilder instance
   */
  deregisterStakeCertificate = (stakeKeyHash: string) => {
    this.meshTxBuilderBody.certificates.push({
      type: 'DeregisterStake',
      stakeKeyHash,
    });
    return this;
  };

  /**
   * Creates a pool retire certificate, and adds it to the transaction
   * @param poolId poolId can be in either bech32 or hex form
   * @param epoch The intended epoch to retire the pool
   * @returns The MeshTxBuilder instance
   */
  retirePoolCertificate = (poolId: string, epoch: number) => {
    this.meshTxBuilderBody.certificates.push({
      type: 'RetirePool',
      poolId,
      epoch,
    });
    return this;
  };

  /**
   * Configure the address to accept change UTxO
   * @param addr The address to accept change UTxO
   * @returns The MeshTxBuilder instance
   */
  changeAddress = (addr: string) => {
    this.meshTxBuilderBody.changeAddress = addr;
    return this;
  };

  /**
   * Set the transaction valid interval to be valid only after the slot
   * @param slot The transaction is valid only after this slot
   * @returns The MeshTxBuilder instance
   */
  invalidBefore = (slot: number) => {
    this.meshTxBuilderBody.validityRange.invalidBefore = slot;
    return this;
  };

  /**
   * Set the transaction valid interval to be valid only before the slot
   * @param slot The transaction is valid only before this slot
   * @returns The MeshTxBuilder instance
   */
  invalidHereafter = (slot: number) => {
    this.meshTxBuilderBody.validityRange.invalidHereafter = slot;
    return this;
  };

  /**
   * Add metadata to the transaction
   * @param tag The tag of the metadata
   * @param metadata The metadata in object format
   * @returns The MeshTxBuilder instance
   */
  metadataValue = <T extends object>(tag: string, metadata: T) => {
    this.meshTxBuilderBody.metadata.push({ tag, metadata });
    return this;
  };

  /**
   * Set the protocol parameters to be used for the transaction other than the default one
   * @param params (Part of) the protocol parameters to be used for the transaction
   * @returns The MeshTxBuilder instance
   */
  protocolParams = (params: Partial<Protocol>) => {
    const updatedParams = { ...DEFAULT_PROTOCOL_PARAMETERS, ...params };
    this._protocolParams = updatedParams;
    this.txBuilder = buildTxBuilder(updatedParams);
    return this;
  };

  /**
   * Sign the transaction with the private key
   * @param skeyHex The private key in cborHex (with or without 5820 prefix, i.e. the format when generated from cardano-cli)
   * @returns
   */
  signingKey = (skeyHex: string) => {
    this.meshTxBuilderBody.signingKey.push(skeyHex);
    return this;
  };

  /**
   * EXPERIMENTAL - Selects utxos to fill output value and puts them into inputs
   * @param extraInputs The inputs already placed into the object will remain, these extra inputs will be used to fill the remaining  value needed
   * @param threshold Extra value needed to be selected for, usually for paying fees and min UTxO value of change output
   */
  selectUtxosFrom = (extraInputs: UTxO[], threshold = 5000000) => {
    this.meshTxBuilderBody.extraInputs = extraInputs;
    this.meshTxBuilderBody.selectionThreshold = threshold;
    return this;
  };

  private addUtxosFrom = (extraInputs: UTxO[], threshold: Quantity) => {
    const requiredAssets = this.meshTxBuilderBody.outputs.reduce(
      (map, output) => {
        const outputAmount = output.amount;
        outputAmount.forEach((asset) => {
          const { unit, quantity } = asset;
          const existingQuantity = Number(map.get(unit)) || 0;
          map.set(unit, String(existingQuantity + Number(quantity)));
        });
        return map;
      },
      new Map<Unit, Quantity>()
    );
    this.meshTxBuilderBody.inputs.reduce((map, input) => {
      const inputAmount = input.txIn.amount;
      inputAmount?.forEach((asset) => {
        const { unit, quantity } = asset;
        const existingQuantity = Number(map.get(unit)) || 0;
        map.set(unit, String(existingQuantity - Number(quantity)));
      });
      return map;
    }, requiredAssets);
    this.meshTxBuilderBody.mints.reduce((map, mint) => {
      const mintAmount: Asset = {
        unit: mint.policyId + mint.assetName,
        quantity: String(mint.amount),
      };
      const existingQuantity = Number(map.get(mintAmount.unit)) || 0;
      map.set(
        mintAmount.unit,
        String(existingQuantity - Number(mintAmount.quantity))
      );
      return map;
    }, requiredAssets);
    const selectedInputs = selectUtxos(extraInputs, requiredAssets, threshold);
    selectedInputs.forEach((input) => {
      const pubKeyTxIn: PubKeyTxIn = {
        type: 'PubKey',
        txIn: {
          txHash: input.input.txHash,
          txIndex: input.input.outputIndex,
          amount: input.output.amount,
          address: input.output.address,
        },
      };
      this.meshTxBuilderBody.inputs.push(pubKeyTxIn);
      this.addTxIn(pubKeyTxIn as RequiredWith<PubKeyTxIn, 'txIn'>);
    });
  };

  private addAllSigningKeys = (signingKeys: string[]) => {
    if (signingKeys.length > 0) {
      const vkeyWitnesses: csl.Vkeywitnesses = csl.Vkeywitnesses.new();
      const wasmUnsignedTransaction = csl.Transaction.from_hex(this.txHex);
      const wasmTxBody = wasmUnsignedTransaction.body();
      signingKeys.forEach((skeyHex) => {
        const cleanHex =
          skeyHex.slice(0, 4) === '5820' ? skeyHex.slice(4) : skeyHex;
        const skey = csl.PrivateKey.from_hex(cleanHex);
        const vkeyWitness = csl.make_vkey_witness(
          csl.hash_transaction(wasmTxBody),
          skey
        );
        vkeyWitnesses.add(vkeyWitness);
      });
      const wasmWitnessSet = wasmUnsignedTransaction.witness_set();
      wasmWitnessSet.set_vkeys(vkeyWitnesses);
      const wasmSignedTransaction = csl.Transaction.new(
        wasmTxBody,
        wasmWitnessSet,
        wasmUnsignedTransaction.auxiliary_data()
      );
      this.txHex = wasmSignedTransaction.to_hex();
    }
  };

  private buildTx = () => {
    const tx = this.txBuilder.build_tx();
    // const txJson = JSON.parse(tx.to_json());
    this.txHex = tx.to_hex();
  };

  private queueInput = () => {
    if (!this.txInQueueItem) throw Error('Undefined input');
    if (this.txInQueueItem.type === 'Script') {
      if (!this.txInQueueItem.scriptTxIn) {
        throw Error(
          'Script input does not contain script, datum, or redeemer information'
        );
      } else {
        if (!this.txInQueueItem.scriptTxIn.datumSource)
          throw Error('Script input does not contain datum information');
        if (!this.txInQueueItem.scriptTxIn.redeemer)
          throw Error('Script input does not contain redeemer information');
        if (!this.txInQueueItem.scriptTxIn.scriptSource)
          throw Error('Script input does not contain script information');
      }
    }
    this.meshTxBuilderBody.inputs.push(this.txInQueueItem);
    this.txInQueueItem = undefined;
  };

  private queueMint = () => {
    if (!this.mintItem) throw Error('Undefined mint');
    if (!this.mintItem.scriptSource)
      throw Error('Missing mint script information');
    this.meshTxBuilderBody.mints.push(this.mintItem);
    this.mintItem = undefined;
  };

  private makePlutusScriptSource = (
    scriptSourceInfo: Required<ScriptSourceInfo>
  ): csl.PlutusScriptSource => {
    const scriptHash = csl.ScriptHash.from_hex(
      scriptSourceInfo.spendingScriptHash
    );
    const scriptRefInput = csl.TransactionInput.new(
      csl.TransactionHash.from_hex(scriptSourceInfo.txHash),
      scriptSourceInfo.txIndex
    );
    const scriptSource = csl.PlutusScriptSource.new_ref_input_with_lang_ver(
      scriptHash,
      scriptRefInput,
      LANGUAGE_VERSIONS[scriptSourceInfo.version]
    );
    return scriptSource;
  };

  // Below protected functions for completing tx building

  protected removeDuplicateInputs = () => {
    const inputs = this.meshTxBuilderBody.inputs;
    const getTxInId = (txIn: TxInParameter): string => {
      return `${txIn.txHash}#${txIn.txIndex}`;
    };
    const addedInputs: string[] = [];
    for (let i = 0; i < inputs.length; i++) {
      const currentTxInId = getTxInId(inputs[i].txIn);
      if (addedInputs.includes(currentTxInId)) {
        inputs.splice(i, 1);
        i--;
      } else {
        addedInputs.push(currentTxInId);
      }
    }
  };

  private addAllInputs = (inputs: TxIn[]) => {
    for (let i = 0; i < inputs.length; i++) {
      const currentTxIn = inputs[i]; //TODO: add type
      switch (currentTxIn.type) {
        case 'PubKey':
          this.addTxIn(currentTxIn as RequiredWith<PubKeyTxIn, 'txIn'>);
          break;
        case 'Script':
          this.addScriptTxIn(
            currentTxIn as RequiredWith<ScriptTxIn, 'txIn' | 'scriptTxIn'>
          );
          break;
      }
    }
  };

  private addTxIn = (currentTxIn: RequiredWith<PubKeyTxIn, 'txIn'>) => {
    this.txBuilder.add_input(
      csl.Address.from_bech32(currentTxIn.txIn.address),
      csl.TransactionInput.new(
        csl.TransactionHash.from_hex(currentTxIn.txIn.txHash),
        currentTxIn.txIn.txIndex
      ),
      toValue(currentTxIn.txIn.amount)
    );
  };

  private addScriptTxIn = ({
    scriptTxIn,
    txIn,
  }: RequiredWith<ScriptTxIn, 'txIn' | 'scriptTxIn'>) => {
    let cslDatum: csl.DatumSource;
    const { datumSource, scriptSource, redeemer } = scriptTxIn;
    if (datumSource.type === 'Provided') {
      cslDatum = csl.DatumSource.new(
        this.castDataToPlutusData(datumSource.data)
      );
    } else {
      const refTxIn = csl.TransactionInput.new(
        csl.TransactionHash.from_hex(datumSource.txHash),
        datumSource.txIndex
      );
      cslDatum = csl.DatumSource.new_ref_input(refTxIn);
    }
    let cslScript: csl.PlutusScriptSource;
    if (scriptSource.type == 'Inline') {
      cslScript = this.makePlutusScriptSource(
        scriptSource.txInInfo as Required<ScriptSourceInfo>
      );
    } else {
      cslScript = csl.PlutusScriptSource.new(
        csl.PlutusScript.from_hex_with_version(
          scriptSource.script.code,
          LANGUAGE_VERSIONS[scriptSource.script.version]
        )
      );
    }
    const cslRedeemer = csl.Redeemer.new(
      csl.RedeemerTag.new_spend(),
      csl.BigNum.from_str('0'),
      this.castDataToPlutusData(redeemer.data),
      csl.ExUnits.new(
        csl.BigNum.from_str(String(redeemer.exUnits.mem)),
        csl.BigNum.from_str(String(redeemer.exUnits.steps))
      )
    );
    this.txBuilder.add_plutus_script_input(
      csl.PlutusWitness.new_with_ref(cslScript, cslDatum, cslRedeemer),
      csl.TransactionInput.new(
        csl.TransactionHash.from_hex(txIn.txHash),
        txIn.txIndex
      ),
      toValue(txIn.amount)
    );
  };

  private addAllOutputs = (outputs: Output[]) => {
    for (let i = 0; i < outputs.length; i++) {
      const currentOutput = outputs[i];
      this.addOutput(currentOutput);
    }
  };

  private addOutput = ({ amount, address, datum, referenceScript }: Output) => {
    const txValue = toValue(amount);
    const multiAsset = txValue.multiasset();
    if (txValue.is_zero() && multiAsset === undefined)
      throw Error('Invalid output amount');

    let outputBuilder = csl.TransactionOutputBuilder.new().with_address(
      toAddress(address)
    );
    if (datum && datum.type === 'Hash') {
      outputBuilder = outputBuilder.with_data_hash(
        csl.hash_plutus_data(this.castDataToPlutusData(datum.data))
      );
    }
    if (datum && datum.type === 'Inline') {
      outputBuilder = outputBuilder.with_plutus_data(
        this.castDataToPlutusData(datum.data)
      );
    }
    if (referenceScript) {
      outputBuilder = outputBuilder.with_script_ref(
        csl.ScriptRef.new_plutus_script(
          csl.PlutusScript.from_hex_with_version(
            referenceScript.code,
            LANGUAGE_VERSIONS[referenceScript.version]
          )
        )
      );
    }
    const amountBuilder = outputBuilder.next();

    if (multiAsset) {
      const output = txValue.coin().is_zero()
        ? amountBuilder
            .with_asset_and_min_required_coin_by_utxo_cost(
              multiAsset,
              buildDataCost(this._protocolParams.coinsPerUTxOSize)
            )
            .build()
        : amountBuilder.with_coin_and_asset(txValue.coin(), multiAsset).build();
      this.txBuilder.add_output(output);
    } else {
      const output = amountBuilder.with_coin(txValue.coin()).build();
      this.txBuilder.add_output(output);
    }
  };

  private addAllCollaterals = (collaterals: PubKeyTxIn[]) => {
    const collateralBuilder = csl.TxInputsBuilder.new();
    for (let i = 0; i < collaterals.length; i++) {
      const currentCollateral = collaterals[i];
      this.addCollateral(
        collateralBuilder,
        currentCollateral as RequiredWith<PubKeyTxIn, 'txIn'>
      );
    }
    this.txBuilder.set_collateral(collateralBuilder);
  };

  private addCollateral = (
    collateralBuilder: csl.TxInputsBuilder,
    currentCollateral: RequiredWith<PubKeyTxIn, 'txIn'>
  ) => {
    collateralBuilder.add_input(
      csl.Address.from_bech32(currentCollateral.txIn.address),
      csl.TransactionInput.new(
        csl.TransactionHash.from_hex(currentCollateral.txIn.txHash),
        currentCollateral.txIn.txIndex
      ),
      toValue(currentCollateral.txIn.amount)
    );
  };

  private addCollateralReturn = (returnAddress: string) => {
    const currentFee = this.txBuilder.get_fee_if_set()?.to_js_value();
    if (currentFee) {
      const collateralAmount = Math.ceil(
        (this._protocolParams.collateralPercent * Number(currentFee)) / 100
      );
      this.txBuilder.set_total_collateral_and_return(
        csl.BigNum.from_str(String(collateralAmount)),
        csl.Address.from_bech32(returnAddress)
      );
    }
  };

  private addAllReferenceInputs = (refInputs: RefTxIn[]) => {
    refInputs.forEach((refInput) => {
      this.addReferenceInput(refInput);
    });
  };

  private addReferenceInput = ({ txHash, txIndex }: RefTxIn) => {
    const refInput = csl.TransactionInput.new(
      csl.TransactionHash.from_hex(txHash),
      txIndex
    );
    this.txBuilder.add_reference_input(refInput);
  };

  protected addAllMints = (mints: MintItem[]) => {
    const mintBuilder = csl.MintBuilder.new();
    let plutusMintCount = 0;
    for (let i = 0; i < mints.length; i++) {
      const mintItem = mints[i] as Required<MintItem>;
      if (!mintItem.scriptSource)
        throw Error('Mint script is expected to be provided');
      if (mintItem.type === 'Plutus') {
        if (!mintItem.redeemer)
          throw Error('Missing mint redeemer information');
        this.addPlutusMint(mintBuilder, mintItem, plutusMintCount); // TODO: Update after csl update
        plutusMintCount++; // TODO: Remove after csl update
      } else if (mintItem.type === 'Native') {
        this.addNativeMint(mintBuilder, mintItem);
      }
    }
    this.txBuilder.set_mint_builder(mintBuilder);
  };

  private addPlutusMint = (
    mintBuilder: csl.MintBuilder,
    { redeemer, policyId, scriptSource, assetName, amount }: Required<MintItem>,
    redeemerIndex: number
  ) => {
    const newRedeemer: csl.Redeemer = csl.Redeemer.new(
      csl.RedeemerTag.new_mint(),
      csl.BigNum.from_str(String(redeemerIndex)),
      this.castDataToPlutusData(redeemer.data),
      csl.ExUnits.new(
        csl.BigNum.from_str(String(redeemer.exUnits.mem)),
        csl.BigNum.from_str(String(redeemer.exUnits.steps))
      )
    );
    const script =
      scriptSource.type === 'Reference Script'
        ? csl.PlutusScriptSource.new_ref_input_with_lang_ver(
            csl.ScriptHash.from_hex(policyId),
            csl.TransactionInput.new(
              csl.TransactionHash.from_hex(scriptSource.txHash),
              scriptSource.txIndex
            ),
            LANGUAGE_VERSIONS[scriptSource.version]
          )
        : csl.PlutusScriptSource.new(
            csl.PlutusScript.from_hex_with_version(
              scriptSource.script.code,
              LANGUAGE_VERSIONS[scriptSource.script.version]
            )
          );

    mintBuilder.add_asset(
      csl.MintWitness.new_plutus_script(script, newRedeemer),
      csl.AssetName.new(Buffer.from(assetName, 'hex')),
      csl.Int.from_str(amount)
    );
  };

  private addNativeMint = (
    mintBuilder: csl.MintBuilder,
    { scriptSource, assetName, amount }: Required<MintItem>
  ) => {
    if (scriptSource.type === 'Reference Script')
      throw Error('Native mint cannot have reference script');
    mintBuilder.add_asset(
      csl.MintWitness.new_native_script(
        csl.NativeScript.from_hex(scriptSource.script.code)
      ),
      csl.AssetName.new(Buffer.from(assetName, 'hex')),
      csl.Int.from_str(amount)
    );
  };

  private decimalToFraction(
    decimal: number
  ): [numerator: number, denominator: number] {
    const powerOf10 = 10 ** decimal.toString().split('.')[1].length;
    const numerator = decimal * powerOf10;
    const denominator = powerOf10;

    return [numerator, denominator];
  }

  private toPoolParams = (poolParams: PoolParams): csl.PoolParams => {
    const marginFraction = this.decimalToFraction(poolParams.margin);
    const relays = csl.Relays.new();
    poolParams.relays.forEach((relay) => {
      relays.add(toRelay(relay));
    });
    const rewardAddress = csl.RewardAddress.from_address(
      csl.Address.from_bech32(poolParams.rewardAddress)
    );
    if (rewardAddress === undefined) {
      throw new Error('Reward address is invalid');
    }
    const poolOwners = csl.Ed25519KeyHashes.new();
    poolParams.owners.forEach((owner) => {
      poolOwners.add(csl.Ed25519KeyHash.from_hex(owner));
    });
    return csl.PoolParams.new(
      csl.Ed25519KeyHash.from_hex(poolParams.operator),
      csl.VRFKeyHash.from_hex(poolParams.VRFKeyHash),
      csl.BigNum.from_str(poolParams.pledge),
      csl.BigNum.from_str(poolParams.cost),
      csl.UnitInterval.new(
        csl.BigNum.from_str(marginFraction[0].toString()),
        csl.BigNum.from_str(marginFraction[1].toString())
      ),
      rewardAddress,
      poolOwners,
      relays,
      poolParams.metadata
        ? csl.PoolMetadata.from_json(JSONbig.stringify(poolParams.metadata))
        : undefined
    );
  };

  private addCertificate = (
    certificates: csl.Certificates,
    cert: Certificate
  ) => {
    switch (cert.type) {
      case 'RegisterPool':
        certificates.add(
          csl.Certificate.new_pool_registration(
            csl.PoolRegistration.new(this.toPoolParams(cert.poolParams))
          )
        );
        break;
      case 'RegisterStake':
        certificates.add(
          csl.Certificate.new_stake_registration(
            csl.StakeRegistration.new(
              csl.StakeCredential.from_keyhash(
                csl.Ed25519KeyHash.from_hex(cert.stakeKeyHash)
              )
            )
          )
        );
        break;
      case 'DelegateStake':
        certificates.add(
          csl.Certificate.new_stake_delegation(
            csl.StakeDelegation.new(
              csl.StakeCredential.from_keyhash(
                csl.Ed25519KeyHash.from_hex(cert.stakeKeyHash)
              ),
              cert.poolId.startsWith('pool')
                ? csl.Ed25519KeyHash.from_bech32(cert.poolId)
                : csl.Ed25519KeyHash.from_hex(cert.poolId)
            )
          )
        );
        break;
      case 'DeregisterStake':
        certificates.add(
          csl.Certificate.new_stake_deregistration(
            csl.StakeDeregistration.new(
              csl.StakeCredential.from_keyhash(
                csl.Ed25519KeyHash.from_hex(cert.stakeKeyHash)
              )
            )
          )
        );
        break;
      case 'RetirePool':
        certificates.add(
          csl.Certificate.new_pool_retirement(
            csl.PoolRetirement.new(
              cert.poolId.startsWith('pool')
                ? csl.Ed25519KeyHash.from_bech32(cert.poolId)
                : csl.Ed25519KeyHash.from_hex(cert.poolId),
              cert.epoch
            )
          )
        );
    }
  };

  protected queueAllLastItem = () => {
    if (this.txOutput) {
      this.meshTxBuilderBody.outputs.push(this.txOutput);
      this.txOutput = undefined;
    }
    if (this.txInQueueItem) {
      this.queueInput();
    }
    if (this.collateralQueueItem) {
      this.meshTxBuilderBody.collaterals.push(this.collateralQueueItem);
      this.collateralQueueItem = undefined;
    }
    if (this.mintItem) {
      this.queueMint();
    }
  };

  protected addAllCertificates = (allCertificates: Certificate[]) => {
    const certificates = csl.Certificates.new();
    allCertificates.forEach((cert) => {
      this.addCertificate(certificates, cert);
    });
    this.txBuilder.set_certs(certificates);
  };

  protected addCostModels = () => {
    this.txBuilder.calc_script_data_hash(
      csl.TxBuilderConstants.plutus_vasil_cost_models()
    );
  };

  private addChange = (changeAddress: string) => {
    this.txBuilder.add_change_if_needed(csl.Address.from_bech32(changeAddress));
  };

  private addValidityRange = ({
    invalidBefore,
    invalidHereafter,
  }: ValidityRange) => {
    if (invalidBefore) {
      this.txBuilder.set_validity_start_interval_bignum(
        csl.BigNum.from_str(invalidBefore.toString())
      );
    }
    if (invalidHereafter) {
      this.txBuilder.set_ttl_bignum(
        csl.BigNum.from_str(invalidHereafter.toString())
      );
    }
  };

  private addAllRequiredSignatures = (requiredSignatures: string[]) => {
    requiredSignatures.forEach((pubKeyHash) => {
      this.txBuilder.add_required_signer(
        csl.Ed25519KeyHash.from_hex(pubKeyHash)
      );
    });
  };

  private addAllMetadata = (allMetadata: Metadata[]) => {
    allMetadata.forEach(({ tag, metadata }) => {
      this.txBuilder.add_json_metadatum(
        csl.BigNum.from_str(tag),
        JSONbig.stringify(metadata)
      );
    });
  };

  protected updateRedeemer = (
    meshTxBuilderBody: MeshTxBuilderBody,
    txEvaluation: Omit<Action, 'data'>[]
  ) => {
    txEvaluation.forEach((redeemerEvaluation) => {
      switch (redeemerEvaluation.tag) {
        case 'SPEND': {
          const input = meshTxBuilderBody.inputs[redeemerEvaluation.index];
          if (input.type == 'Script' && input.scriptTxIn.redeemer) {
            input.scriptTxIn.redeemer.exUnits.mem = Math.floor(
              redeemerEvaluation.budget.mem * this.txEvaluationMultiplier
            );
            input.scriptTxIn.redeemer.exUnits.steps = Math.floor(
              redeemerEvaluation.budget.steps * this.txEvaluationMultiplier
            );
          }
          break;
        }
        case 'MINT': {
          const mint = meshTxBuilderBody.mints[redeemerEvaluation.index];
          if (mint.type == 'Plutus' && mint.redeemer) {
            mint.redeemer.exUnits.mem = Math.floor(
              redeemerEvaluation.budget.mem * this.txEvaluationMultiplier
            );
            mint.redeemer.exUnits.steps = Math.floor(
              redeemerEvaluation.budget.steps * this.txEvaluationMultiplier
            );
          }
          break;
        }
        case 'CERT':
          // TODO
          break;
        case 'REWARD':
          // TODO
          break;
      }
    });
  };

  protected castRawDataToJsonString = (rawData: object | string) => {
    if (typeof rawData === 'object') {
      return JSONbig.stringify(rawData);
    } else {
      return rawData as string;
    }
  };

  protected castDataToPlutusData = ({ type, content }: BuilderData) => {
    if (type === 'Mesh') {
      return toPlutusData(content);
    }
    if (type === 'CBOR') {
      return csl.PlutusData.from_hex(content as string);
    }
    return csl.PlutusData.from_json(
      content as string,
      csl.PlutusDatumSchema.DetailedSchema
    );
  };
}
