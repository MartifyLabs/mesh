import JSONBig from "json-bigint";

import {
  Action,
  Anchor,
  Asset,
  Budget,
  BuilderData,
  Data,
  DEFAULT_PROTOCOL_PARAMETERS,
  DEFAULT_REDEEMER_BUDGET,
  DRep,
  DREP_DEPOSIT,
  emptyTxBuilderBody,
  LanguageVersion,
  MeshTxBuilderBody,
  Metadatum,
  MintItem,
  Network,
  Output,
  PoolParams,
  Protocol,
  PubKeyTxIn,
  Quantity,
  Redeemer,
  RefTxIn,
  TxIn,
  TxInParameter,
  Unit,
  UTxO,
  UtxoSelection,
  UtxoSelectionStrategy,
  Vote,
  Voter,
  VotingProcedure,
  Withdrawal,
} from "@meshsdk/common";

import { metadataObjToMap } from "../utils";

export class MeshTxBuilderCore {
  txEvaluationMultiplier = 1.1;
  private txOutput?: Output;
  private addingPlutusScriptInput = false;
  private plutusSpendingScriptVersion: LanguageVersion | undefined;
  private addingPlutusMint = false;
  private plutusMintingScriptVersion: LanguageVersion | undefined;
  private addingPlutusWithdrawal = false;
  private plutusWithdrawalScriptVersion: LanguageVersion | undefined;
  private addingPlutusVote = false;
  private plutusVoteScriptVersion: LanguageVersion | undefined;

  protected _protocolParams: Protocol = DEFAULT_PROTOCOL_PARAMETERS;

  protected mintItem?: MintItem;

  protected txInQueueItem?: TxIn;

  protected withdrawalItem?: Withdrawal;

  protected voteItem?: Vote;

  protected collateralQueueItem?: PubKeyTxIn;

  protected refScriptTxInQueueItem?: RefTxIn;

  meshTxBuilderBody: MeshTxBuilderBody;

  constructor() {
    this.meshTxBuilderBody = emptyTxBuilderBody();
  }

  /**
   * Set the input for transaction
   * @param txHash The transaction hash of the input UTxO
   * @param txIndex The transaction index of the input UTxO
   * @param amount The asset amount of index of the input UTxO
   * @param address The address of the input UTxO
   * @param scriptSize The size of the ref script at this input (if there isn't one, explicitly put 0 as scriptSize for offline tx building)
   * @returns The MeshTxBuilder instance
   */
  txIn = (
    txHash: string,
    txIndex: number,
    amount?: Asset[],
    address?: string,
    scriptSize?: number,
  ) => {
    if (this.txInQueueItem) {
      this.queueInput();
    }
    if (!this.addingPlutusScriptInput) {
      this.txInQueueItem = {
        type: "PubKey",
        txIn: {
          txHash: txHash,
          txIndex: txIndex,
          amount: amount,
          address: address,
          scriptSize: scriptSize,
        },
      };
    } else {
      this.txInQueueItem = {
        type: "Script",
        txIn: {
          txHash: txHash,
          txIndex: txIndex,
          amount: amount,
          address: address,
          scriptSize: scriptSize,
        },
        scriptTxIn: {},
      };
    }
    this.addingPlutusScriptInput = false;
    return this;
  };

  /**
   * Set the script for transaction input
   * @param {string} scriptCbor The CborHex of the script
   * @param version Optional - The Plutus script version
   * @returns The MeshTxBuilder instance
   */
  txInScript = (scriptCbor: string) => {
    if (!this.txInQueueItem) throw Error("Undefined input");
    if (this.txInQueueItem.type === "PubKey") {
      this.txInQueueItem = {
        type: "SimpleScript",
        txIn: this.txInQueueItem.txIn,
        simpleScriptTxIn: {
          scriptSource: {
            type: "Provided",
            scriptCode: scriptCbor,
          },
        },
      };
    }
    if (this.txInQueueItem.type === "Script") {
      this.txInQueueItem.scriptTxIn.scriptSource = {
        type: "Provided",
        script: {
          code: scriptCbor,
          version: this.plutusSpendingScriptVersion || "V2",
        },
      };
    }
    return this;
  };

  /**
   * Set the input datum for transaction input
   * @param datum The datum in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The datum type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string. Default to be Mesh type
   * @returns The MeshTxBuilder instance
   */
  txInDatumValue = (
    datum: BuilderData["content"],
    type: BuilderData["type"] = "Mesh",
  ) => {
    if (!this.txInQueueItem) throw Error("Undefined input");
    if (this.txInQueueItem.type === "PubKey")
      throw Error("Datum value attempted to be called a non script input");
    if (this.txInQueueItem.type === "SimpleScript")
      throw Error(
        "Datum value attempted to be called on a simple script input",
      );

    let content = datum;
    if (type === "JSON") {
      content = this.castRawDataToJsonString(datum as object | string);
    }
    if (type === "Mesh") {
      this.txInQueueItem.scriptTxIn.datumSource = {
        type: "Provided",
        data: {
          type,
          content: datum as Data,
        },
      };
      return this;
    }
    this.txInQueueItem.scriptTxIn.datumSource = {
      type: "Provided",
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
    if (!this.txInQueueItem) throw Error("Undefined input");
    if (this.txInQueueItem.type === "PubKey")
      throw Error(
        "Inline datum present attempted to be called a non script input",
      );
    if (this.txInQueueItem.type === "SimpleScript")
      throw Error(
        "Inline datum present attempted to be called on a simple script input",
      );
    const { txHash, txIndex } = this.txInQueueItem.txIn;
    if (txHash && txIndex.toString()) {
      this.txInQueueItem.scriptTxIn.datumSource = {
        type: "Inline",
        txHash,
        txIndex,
      };
    }
    return this;
  };

  /**
   * Native script - Set the reference input where it would also be spent in the transaction
   * @param txHash The transaction hash of the reference UTxO
   * @param txIndex The transaction index of the reference UTxO
   * @param spendingScriptHash The script hash of the spending script
   * @returns The MeshTxBuilder instance
   */
  simpleScriptTxInReference = (
    txHash: string,
    txIndex: number,
    spendingScriptHash?: string,
    scriptSize?: string,
  ) => {
    if (!this.txInQueueItem) throw Error("Undefined input");
    if (this.txInQueueItem.type === "Script") {
      throw Error(
        "simpleScriptTxInReference called on a plutus script, use spendingTxInReference instead",
      );
    }
    if (this.txInQueueItem.type === "SimpleScript") {
      throw Error(
        "simpleScriptTxInReference called on a native script input that already has a script defined",
      );
    }
    if (this.txInQueueItem.type === "PubKey") {
      this.txInQueueItem = {
        type: "SimpleScript",
        txIn: this.txInQueueItem.txIn,
        simpleScriptTxIn: {
          scriptSource: {
            type: "Inline",
            txHash,
            txIndex,
            simpleScriptHash: spendingScriptHash,
            scriptSize,
          },
        },
      };
    }
    return this;
  };

  /**
   * Set the redeemer for the reference input to be spent in same transaction
   * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string. Default to be Mesh type
   * @param exUnits The execution units budget for the redeemer
   * @returns The MeshTxBuilder instance
   */
  txInRedeemerValue = (
    redeemer: BuilderData["content"],
    type: BuilderData["type"] = "Mesh",
    exUnits = { ...DEFAULT_REDEEMER_BUDGET },
  ) => {
    if (!this.txInQueueItem) throw Error("Undefined input");
    if (this.txInQueueItem.type === "PubKey")
      throw Error(
        "Spending tx in reference redeemer attempted to be called a non script input",
      );
    if (this.txInQueueItem.type === "SimpleScript")
      throw Error(
        "Spending tx in reference redeemer attempted to be called on a simple script input",
      );
    this.txInQueueItem.scriptTxIn.redeemer = this.castBuilderDataToRedeemer(
      redeemer,
      type,
      exUnits,
    );
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
   * @param type The datum type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string. Default to be Mesh type
   * @returns The MeshTxBuilder instance
   */
  txOutDatumHashValue = (
    datum: BuilderData["content"],
    type: BuilderData["type"] = "Mesh",
  ) => {
    let content = datum;
    if (this.txOutput) {
      if (type === "Mesh") {
        this.txOutput.datum = {
          type: "Hash",
          data: {
            type,
            content: content as Data,
          },
        };
        return this;
      }
      if (type === "JSON") {
        content = this.castRawDataToJsonString(datum as object | string);
      }
      this.txOutput.datum = {
        type: "Hash",
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
   * @param type The datum type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string. Default to be Mesh type
   * @returns The MeshTxBuilder instance
   */
  txOutInlineDatumValue = (
    datum: BuilderData["content"],
    type: BuilderData["type"] = "Mesh",
  ) => {
    let content = datum;
    if (this.txOutput) {
      if (type === "Mesh") {
        this.txOutput.datum = {
          type: "Inline",
          data: {
            type,
            content: content as Data,
          },
        };
        return this;
      }
      if (type === "JSON") {
        content = this.castRawDataToJsonString(datum as object | string);
      }
      this.txOutput.datum = {
        type: "Inline",
        data: {
          type,
          content: content as string,
        },
      };
    }
    return this;
  };

  /**
   * Set the output embed datum for transaction
   * @param datum The datum in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The datum type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string. Default to be Mesh type
   * @returns The MeshTxBuilder instance
   */

  txOutDatumEmbedValue = (
    datum: BuilderData["content"],
    type: BuilderData["type"] = "Mesh",
  ) => {
    let content = datum;
    if (this.txOutput) {
      if (type === "Mesh") {
        this.txOutput.datum = {
          type: "Embedded",
          data: {
            type,
            content: content as Data,
          },
        };
        return this;
      }
      if (type === "JSON") {
        content = this.castRawDataToJsonString(datum as object | string);
      }
      this.txOutput.datum = {
        type: "Embedded",
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
   * @param version Optional - The Plutus script version. Default to be V3 (Plutus V3)
   * @returns The MeshTxBuilder instance
   */
  txOutReferenceScript = (
    scriptCbor: string,
    version: LanguageVersion = "V3",
  ) => {
    if (this.txOutput) {
      this.txOutput.referenceScript = { code: scriptCbor, version };
    }
    return this;
  };

  /**
   * Set the reference script to be attached with the output
   * @param languageVersion The Plutus script version
   * @returns The MeshTxBuilder instance
   */
  spendingPlutusScript = (languageVersion: LanguageVersion) => {
    // This flag should signal a start to a script input
    // The next step after will be to add a tx-in
    // After which, we will REQUIRE, script, datum and redeemer info
    // for unlocking this particular input
    this.addingPlutusScriptInput = true;
    this.plutusSpendingScriptVersion = languageVersion;
    return this;
  };
  /**
   * Set the instruction that it is currently using V1 Plutus spending scripts
   * @returns The MeshTxBuilder instance
   */
  spendingPlutusScriptV1 = () => {
    // This flag should signal a start to a script input
    // The next step after will be to add a tx-in
    // After which, we will REQUIRE, script, datum and redeemer info
    // for unlocking this particular input
    this.addingPlutusScriptInput = true;
    this.plutusSpendingScriptVersion = "V1";
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
    this.addingPlutusScriptInput = true;
    this.plutusSpendingScriptVersion = "V2";
    return this;
  };
  /**
   * Set the instruction that it is currently using V3 Plutus spending scripts
   * @returns The MeshTxBuilder instance
   */
  spendingPlutusScriptV3 = () => {
    // This flag should signal a start to a script input
    // The next step after will be to add a tx-in
    // After which, we will REQUIRE, script, datum and redeemer info
    // for unlocking this particular input
    this.addingPlutusScriptInput = true;
    this.plutusSpendingScriptVersion = "V3";
    return this;
  };

  /**
   * Set the reference input where it would also be spent in the transaction
   * @param txHash The transaction hash of the reference UTxO
   * @param txIndex The transaction index of the reference UTxO
   * @param scriptSize The script size in bytes of the spending script (can be obtained by script hex length / 2)
   * @param scriptHash The script hash of the spending script
   * @returns The MeshTxBuilder instance
   */
  spendingTxInReference = (
    txHash: string,
    txIndex: number,
    scriptSize?: string,
    scriptHash?: string,
  ) => {
    if (!this.txInQueueItem) throw Error("Undefined input");
    if (this.txInQueueItem.type === "PubKey")
      throw Error(
        "Spending tx in reference attempted to be called a non script input",
      );
    if (this.txInQueueItem.type === "SimpleScript")
      throw Error(
        "Spending tx in reference attempted to be called on a simple script input",
      );
    this.txInQueueItem.scriptTxIn.scriptSource = {
      type: "Inline",
      txHash,
      txIndex,
      scriptHash,
      version: this.plutusSpendingScriptVersion || "V2",
      scriptSize,
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
   * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string. Default to be Mesh type
   * @param exUnits The execution units budget for the redeemer
   * @returns The MeshTxBuilder instance
   */
  spendingReferenceTxInRedeemerValue = (
    redeemer: BuilderData["content"],
    type: BuilderData["type"] = "Mesh",
    exUnits = { ...DEFAULT_REDEEMER_BUDGET },
  ) => {
    this.txInRedeemerValue(redeemer, type, exUnits);
    return this;
  };

  /**
   * Specify a read only reference input. This reference input is not witnessing anything it is simply provided in the plutus script context.
   * @param txHash The transaction hash of the reference UTxO
   * @param txIndex The transaction index of the reference UTxO
   * @returns The MeshTxBuilder instance
   */
  readOnlyTxInReference = (
    txHash: string,
    txIndex: number,
    scriptSize?: number,
  ) => {
    this.meshTxBuilderBody.referenceInputs.push({
      txHash,
      txIndex,
      scriptSize,
    });
    return this;
  };

  /**
   * Set the minting script for the current mint
   * @param languageVersion The Plutus script version
   * @returns The MeshTxBuilder instance
   */
  mintPlutusScript = (languageVersion: LanguageVersion) => {
    this.addingPlutusMint = true;
    this.plutusMintingScriptVersion = languageVersion;
    return this;
  };
  /**
   * Set the instruction that it is currently using V1 Plutus minting scripts
   * @returns The MeshTxBuilder instance
   */
  mintPlutusScriptV1 = () => {
    this.addingPlutusMint = true;
    this.plutusMintingScriptVersion = "V1";
    return this;
  };
  /**
   * Set the instruction that it is currently using V2 Plutus minting scripts
   * @returns The MeshTxBuilder instance
   */
  mintPlutusScriptV2 = () => {
    this.addingPlutusMint = true;
    this.plutusMintingScriptVersion = "V2";
    return this;
  };
  /**
   * Set the instruction that it is currently using V3 Plutus minting scripts
   * @returns The MeshTxBuilder instance
   */
  mintPlutusScriptV3 = () => {
    this.addingPlutusMint = true;
    this.plutusMintingScriptVersion = "V3";
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
      type: this.addingPlutusMint ? "Plutus" : "Native",
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
  mintingScript = (scriptCBOR: string) => {
    if (!this.mintItem) throw Error("Undefined mint");
    if (!this.mintItem.type) throw Error("Mint information missing");
    if (this.mintItem.type === "Native") {
      this.mintItem.scriptSource = {
        type: "Provided",
        scriptCode: scriptCBOR,
      };
    }
    if (this.mintItem.type === "Plutus") {
      this.mintItem.scriptSource = {
        type: "Provided",
        script: {
          code: scriptCBOR,
          version: this.plutusMintingScriptVersion || "V2",
        },
      };
    }

    return this;
  };

  /**
   * Use reference script for minting
   * @param txHash The transaction hash of the UTxO
   * @param txIndex The transaction index of the UTxO
   * @param scriptSize The script size in bytes of the script (can be obtained by script hex length / 2)
   * @param scriptHash The script hash of the script
   * @returns The MeshTxBuilder instance
   */
  mintTxInReference = (
    txHash: string,
    txIndex: number,
    scriptSize?: string,
    scriptHash?: string,
  ) => {
    if (!this.mintItem) throw Error("Undefined mint");
    if (!this.mintItem.type) throw Error("Mint information missing");
    if (this.mintItem.type == "Native") {
      throw Error(
        "Mint tx in reference can only be used on plutus script tokens",
      );
    }
    if (!this.mintItem.policyId)
      throw Error("PolicyId information missing from mint asset");
    this.mintItem.scriptSource = {
      type: "Inline",
      txHash,
      txIndex,
      version: this.plutusMintingScriptVersion,
      scriptSize,
      scriptHash,
    };
    return this;
  };

  /**
   * Set the redeemer for minting
   * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string. Default to be Mesh type
   * @param exUnits The execution units budget for the redeemer
   * @returns The MeshTxBuilder instance
   */
  mintReferenceTxInRedeemerValue = (
    redeemer: BuilderData["content"],
    type: BuilderData["type"] = "Mesh",
    exUnits = { ...DEFAULT_REDEEMER_BUDGET },
  ) => {
    if (!this.mintItem) throw Error("Undefined mint");
    if (this.mintItem.type == "Native") {
      throw Error(
        "Mint tx in reference can only be used on plutus script tokens",
      );
    } else if (this.mintItem.type == "Plutus") {
      if (!this.mintItem.policyId)
        throw Error("PolicyId information missing from mint asset");
    }
    this.mintItem.redeemer = this.castBuilderDataToRedeemer(
      redeemer,
      type,
      exUnits,
    );
    return this;
  };

  /**
   * Set the redeemer for the reference input to be spent in same transaction
   * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string. Default to be Mesh type
   * @param exUnits The execution units budget for the redeemer
   * @returns The MeshTxBuilder instance
   */
  mintRedeemerValue = (
    redeemer: BuilderData["content"],
    type: BuilderData["type"] = "Mesh",
    exUnits = { ...DEFAULT_REDEEMER_BUDGET },
  ) => {
    this.mintReferenceTxInRedeemerValue(redeemer, type, exUnits);
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
    address?: string,
  ) => {
    if (this.collateralQueueItem) {
      this.meshTxBuilderBody.collaterals.push(this.collateralQueueItem);
    }
    this.collateralQueueItem = {
      type: "PubKey",
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
   * Set the instruction that it is currently using V1 Plutus withdrawal scripts
   * @param languageVersion The Plutus script version
   * @returns The MeshTxBuilder instance
   */
  withdrawalPlutusScript = (languageVersion: LanguageVersion) => {
    this.addingPlutusWithdrawal = true;
    this.plutusWithdrawalScriptVersion = languageVersion;
    return this;
  };
  /**
   * Set the instruction that it is currently using a Plutus withdrawal scripts
   * @returns The MeshTxBuilder instance
   */
  withdrawalPlutusScriptV1 = () => {
    this.addingPlutusWithdrawal = true;
    this.plutusWithdrawalScriptVersion = "V1";
    return this;
  };

  /**
   * Set the instruction that it is currently using V2 Plutus withdrawal scripts
   * @returns The MeshTxBuilder instance
   */
  withdrawalPlutusScriptV2 = () => {
    this.addingPlutusWithdrawal = true;
    this.plutusWithdrawalScriptVersion = "V2";
    return this;
  };

  /**
   * Set the instruction that it is currently using V3 Plutus withdrawal scripts
   * @returns The MeshTxBuilder instance
   */
  withdrawalPlutusScriptV3 = () => {
    this.addingPlutusWithdrawal = true;
    this.plutusWithdrawalScriptVersion = "V3";
    return this;
  };

  /**
   * Withdraw stake rewards in the MeshTxBuilder instance
   * @param rewardAddress The bech32 reward address (i.e. start with `stake_xxxxx`)
   * @param coin The amount of lovelaces in the withdrawal
   * @returns The MeshTxBuilder instance
   */
  withdrawal = (rewardAddress: string, coin: string) => {
    if (this.withdrawalItem) {
      this.queueWithdrawal();
    }
    if (this.addingPlutusWithdrawal) {
      const withdrawal: Withdrawal = {
        type: "ScriptWithdrawal",
        address: rewardAddress,
        coin: coin,
      };
      this.withdrawalItem = withdrawal;
      return this;
    }

    const withdrawal: Withdrawal = {
      type: "PubKeyWithdrawal",
      address: rewardAddress,
      coin: coin,
    };
    this.withdrawalItem = withdrawal;
    return this;
  };

  /**
   * Add a withdrawal script to the MeshTxBuilder instance
   * @param scriptCbor The script in CBOR format
   * @returns The MeshTxBuilder instance
   */
  withdrawalScript = (scriptCbor: string) => {
    if (!this.withdrawalItem)
      throw Error("withdrawalScript: Undefined withdrawal");
    if (this.withdrawalItem.type === "PubKeyWithdrawal") {
      this.withdrawalItem = {
        type: "SimpleScriptWithdrawal",
        address: this.withdrawalItem.address,
        coin: this.withdrawalItem.coin,
        scriptSource: {
          type: "Provided",
          scriptCode: scriptCbor,
        },
      };
    } else {
      this.withdrawalItem.scriptSource = {
        type: "Provided",
        script: {
          code: scriptCbor,
          version: this.plutusWithdrawalScriptVersion || "V2",
        },
      };
    }
    return this;
  };

  /**
   * Add a withdrawal reference to the MeshTxBuilder instance
   * @param txHash The transaction hash of reference UTxO
   * @param txIndex The transaction index of reference UTxO
   * @param scriptSize The script size in bytes of the withdrawal script (can be obtained by script hex length / 2)
   * @param scriptHash The script hash of the withdrawal script
   * @returns The MeshTxBuilder instance
   */
  withdrawalTxInReference = (
    txHash: string,
    txIndex: number,
    scriptSize?: string,
    scriptHash?: string,
  ) => {
    if (!this.withdrawalItem)
      throw Error("withdrawalTxInReference: Undefined withdrawal");
    if (this.withdrawalItem.type === "PubKeyWithdrawal")
      throw Error(
        "withdrawalTxInReference: Adding script reference to pub key withdrawal",
      );
    this.withdrawalItem.scriptSource = {
      type: "Inline",
      txHash,
      txIndex,
      scriptHash,
      version: this.plutusWithdrawalScriptVersion || "V2",
      scriptSize,
    };
    return this;
  };

  /**
   * Set the transaction withdrawal redeemer value in the MeshTxBuilder instance
   * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string. Default to be Mesh type
   * @param exUnits The execution units budget for the redeemer
   * @returns The MeshTxBuilder instance
   */
  withdrawalRedeemerValue = (
    redeemer: BuilderData["content"],
    type: BuilderData["type"] = "Mesh",
    exUnits = { ...DEFAULT_REDEEMER_BUDGET },
  ) => {
    if (!this.withdrawalItem)
      throw Error("withdrawalRedeemerValue: Undefined withdrawal");
    if (!(this.withdrawalItem.type === "ScriptWithdrawal"))
      throw Error(
        "withdrawalRedeemerValue: Adding redeemer to non plutus withdrawal",
      );
    this.withdrawalItem.redeemer = this.castBuilderDataToRedeemer(
      redeemer,
      type,
      exUnits,
    );

    return this;
  };

  /**
   * Set the instruction that it is currently using a Plutus voting scripts
   * @param languageVersion The Plutus script version
   * @returns The MeshTxBuilder instance
   */
  votePlutusScript = (languageVersion: LanguageVersion) => {
    this.addingPlutusVote = true;
    this.plutusVoteScriptVersion = languageVersion;
    return this;
  };
  /**
   * Set the instruction that it is currently using V1 Plutus voting scripts
   * @returns The MeshTxBuilder instance
   */
  votePlutusScriptV1 = () => {
    this.addingPlutusVote = true;
    this.plutusVoteScriptVersion = "V1";
    return this;
  };

  /**
   * Set the instruction that it is currently using V2 Plutus voting scripts
   * @returns The MeshTxBuilder instance
   */
  votePlutusScriptV2 = () => {
    this.addingPlutusVote = true;
    this.plutusVoteScriptVersion = "V2";
    return this;
  };

  /**
   * Set the instruction that it is currently using V3 Plutus voting scripts
   * @returns The MeshTxBuilder instance
   */
  votePlutusScriptV3 = () => {
    this.addingPlutusVote = true;
    this.plutusVoteScriptVersion = "V3";
    return this;
  };

  /**
   * Add a vote in the MeshTxBuilder instance
   * @param voter The voter, can be a ConstitutionalCommitee, a DRep or a StakePool
   * @param govActionId - The transaction hash and transaction id of the governance action
   * @param votingProcedure - The voting kind (Yes, No, Abstain) with an optional anchor
   * @returns The MeshTxBuilder instance
   */
  vote = (
    voter: Voter,
    govActionId: RefTxIn,
    votingProcedure: VotingProcedure,
  ) => {
    if (this.voteItem) {
      this.queueVote();
    }

    if (this.addingPlutusVote) {
      const vote: Vote = {
        type: "ScriptVote",
        vote: {
          voter,
          govActionId,
          votingProcedure,
        },
      };
      this.voteItem = vote;
    } else {
      const vote: Vote = {
        type: "BasicVote",
        vote: {
          voter,
          govActionId,
          votingProcedure,
        },
      };
      this.voteItem = vote;
    }
    return this;
  };

  /**
   * Add a voting script to the MeshTxBuilder instance
   * @param scriptCbor The script in CBOR format
   * @returns The MeshTxBuilder instance
   */
  voteScript = (scriptCbor: string) => {
    if (!this.voteItem) throw Error("voteScript: Undefined vote");
    if (this.voteItem.type === "BasicVote") {
      this.voteItem = {
        type: "SimpleScriptVote",
        vote: this.voteItem.vote,
        simpleScriptSource: {
          type: "Provided",
          scriptCode: scriptCbor,
        },
      };
    } else if (this.voteItem.type === "ScriptVote") {
      this.voteItem.scriptSource = {
        type: "Provided",
        script: {
          code: scriptCbor,
          version: this.plutusVoteScriptVersion || "V2",
        },
      };
    } else if (this.voteItem.type === "SimpleScriptVote") {
      throw Error("voteScript: Script is already defined for current vote");
    }
    return this;
  };

  /**
   * Add a vote reference to the MeshTxBuilder instance
   * @param txHash The transaction hash of reference UTxO
   * @param txIndex The transaction index of reference UTxO
   * @param scriptSize The script size in bytes of the vote script (can be obtained by script hex length / 2)
   * @param scriptHash The script hash of the vote script
   * @returns The MeshTxBuilder instance
   */
  voteTxInReference = (
    txHash: string,
    txIndex: number,
    scriptSize?: string,
    scriptHash?: string,
  ) => {
    if (!this.voteItem) throw Error("voteTxInReference: Undefined vote");
    if (this.voteItem.type === "BasicVote")
      throw Error("voteTxInReference: Adding script reference to a basic vote");
    if (this.voteItem.type === "ScriptVote") {
      this.voteItem.scriptSource = {
        type: "Inline",
        txHash,
        txIndex,
        scriptHash,
        version: this.plutusWithdrawalScriptVersion || "V2",
        scriptSize,
      };
    } else if (this.voteItem.type === "SimpleScriptVote") {
      this.voteItem.simpleScriptSource = {
        type: "Inline",
        txHash,
        txIndex,
        scriptSize,
        simpleScriptHash: scriptHash,
      };
    }

    return this;
  };

  /**
   * Set the transaction vote redeemer value in the MeshTxBuilder instance
   * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param exUnits The execution units budget for the redeemer
   * @returns The MeshTxBuilder instance
   */
  voteRedeemerValue = (
    redeemer: BuilderData["content"],
    type: BuilderData["type"] = "Mesh",
    exUnits = { ...DEFAULT_REDEEMER_BUDGET },
  ) => {
    if (!this.voteItem) throw Error("voteRedeemerValue: Undefined vote");
    if (!(this.voteItem.type === "ScriptVote"))
      throw Error("voteRedeemerValue: Adding redeemer to non plutus vote");
    this.voteItem.redeemer = this.castBuilderDataToRedeemer(
      redeemer,
      type,
      exUnits,
    );

    return this;
  };

  /**
   * Creates a pool registration certificate, and adds it to the transaction
   * @param poolParams Parameters for pool registration
   * @returns The MeshTxBuilder instance
   */
  registerPoolCertificate = (poolParams: PoolParams) => {
    this.meshTxBuilderBody.certificates.push({
      type: "BasicCertificate",
      certType: {
        type: "RegisterPool",
        poolParams,
      },
    });
    return this;
  };

  /**
   * Creates a stake registration certificate, and adds it to the transaction
   * @param rewardAddress The bech32 reward address (i.e. start with `stake_xxxxx`)
   * @returns The MeshTxBuilder instance
   */
  registerStakeCertificate = (rewardAddress: string) => {
    this.meshTxBuilderBody.certificates.push({
      type: "BasicCertificate",
      certType: {
        type: "RegisterStake",
        stakeKeyAddress: rewardAddress,
      },
    });
    return this;
  };

  /**
   * Creates a stake delegation certificate, and adds it to the transaction
   * This will delegate stake from the corresponding stake address to the pool
   * @param rewardAddress The bech32 reward address (i.e. start with `stake_xxxxx`)
   * @param poolId poolId can be in either bech32 or hex form
   * @returns The MeshTxBuilder instance
   */
  delegateStakeCertificate = (rewardAddress: string, poolId: string) => {
    this.meshTxBuilderBody.certificates.push({
      type: "BasicCertificate",
      certType: {
        type: "DelegateStake",
        stakeKeyAddress: rewardAddress,
        poolId,
      },
    });
    return this;
  };

  /**
   * Creates a stake deregister certificate, and adds it to the transaction
   * @param rewardAddress The bech32 reward address (i.e. start with `stake_xxxxx`)
   * @returns The MeshTxBuilder instance
   */
  deregisterStakeCertificate = (rewardAddress: string) => {
    this.meshTxBuilderBody.certificates.push({
      type: "BasicCertificate",
      certType: {
        type: "DeregisterStake",
        stakeKeyAddress: rewardAddress,
      },
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
      type: "BasicCertificate",
      certType: {
        type: "RetirePool",
        poolId,
        epoch,
      },
    });
    return this;
  };

  /**
   * Registers DRep certificate, and adds it to the transaction
   * @param drepId The bech32 drep id (i.e. starts with `drep1xxxxx`)
   * @param anchor The DRep anchor, consists of a URL and a hash of the doc
   * @param coin DRep registration deposit
   * @returns The MeshTxBuilder instance
   */
  drepRegistrationCertificate = (
    drepId: string,
    anchor?: Anchor,
    coin: string = DREP_DEPOSIT,
  ) => {
    this.meshTxBuilderBody.certificates.push({
      type: "BasicCertificate",
      certType: {
        type: "DRepRegistration",
        drepId,
        coin: Number(coin),
        anchor,
      },
    });
    return this;
  };

  /**
   * Dregister DRep certificate, and adds it to the transaction
   * @param drepId The bech32 drep id (i.e. starts with `drep1xxxxx`)
   * @param coin DRep registration deposit
   * @returns The MeshTxBuilder instance
   */
  drepDeregistrationCertificate = (
    drepId: string,
    coin: string = DREP_DEPOSIT,
  ) => {
    this.meshTxBuilderBody.certificates.push({
      type: "BasicCertificate",
      certType: {
        type: "DRepDeregistration",
        drepId,
        coin: Number(coin),
      },
    });
    return this;
  };

  /**
   * Update DRep certificate, and adds it to the transaction
   * @param drepId The bech32 drep id (i.e. starts with `drep1xxxxx`)
   * @param anchor The DRep anchor, consists of a URL and a hash of the doc
   */
  drepUpdateCertificate = (drepId: string, anchor?: Anchor) => {
    this.meshTxBuilderBody.certificates.push({
      type: "BasicCertificate",
      certType: {
        type: "DRepUpdate",
        drepId,
        anchor,
      },
    });
    return this;
  };

  /**
   * Dregister DRep certificate, and adds it to the transaction
   * @param drepId The bech32 drep id (i.e. starts with `drep1xxxxx`)
   * @param rewardAddress The bech32 reward address (i.e. start with `stake_xxxxx`)
   * @returns The MeshTxBuilder instance
   */
  voteDelegationCertificate = (drep: DRep, rewardAddress: string) => {
    this.meshTxBuilderBody.certificates.push({
      type: "BasicCertificate",
      certType: {
        type: "VoteDelegation",
        drep,
        stakeKeyAddress: rewardAddress,
      },
    });
    return this;
  };

  /**
   * Adds a script witness to the certificate
   * @param scriptCbor The CborHex of the script
   * @param version Optional - The plutus version of the script, null version implies Native Script
   */
  certificateScript = (scriptCbor: string, version?: LanguageVersion) => {
    const currentCert = this.meshTxBuilderBody.certificates.pop();
    if (!currentCert) {
      throw Error(
        "Certificate script attempted to be defined, but no certificate was found",
      );
    }
    if (!version) {
      this.meshTxBuilderBody.certificates.push({
        type: "SimpleScriptCertificate",
        certType: currentCert.certType,
        simpleScriptSource: {
          type: "Provided",
          scriptCode: scriptCbor,
        },
      });
    } else {
      this.meshTxBuilderBody.certificates.push({
        type: "ScriptCertificate",
        certType: currentCert.certType,
        scriptSource: {
          type: "Provided",
          script: {
            code: scriptCbor,
            version,
          },
        },
        redeemer:
          currentCert.type === "ScriptCertificate"
            ? currentCert.redeemer
            : undefined,
      });
    }
    return this;
  };

  /**
   * Adds a script witness to the certificate
   * @param txHash The transaction hash of the reference UTxO
   * @param txIndex The transaction index of the reference UTxO
   * @param scriptSize The size of the plutus script in bytes referenced (can be obtained by script hex length / 2)
   * @param scriptHash The script hash of the spending script
   * @param version The plutus version of the script, null version implies Native Script
   */
  certificateTxInReference = (
    txHash: string,
    txIndex: number,
    scriptSize?: string,
    scriptHash?: string,
    version?: LanguageVersion,
  ) => {
    const currentCert = this.meshTxBuilderBody.certificates.pop();
    if (!currentCert) {
      throw Error(
        "Certificate script reference attempted to be defined, but no certificate was found",
      );
    }
    if (!version) {
      this.meshTxBuilderBody.certificates.push({
        type: "SimpleScriptCertificate",
        certType: currentCert.certType,
        simpleScriptSource: {
          type: "Inline",
          txHash,
          txIndex,
          simpleScriptHash: scriptHash,
        },
      });
    } else {
      this.meshTxBuilderBody.certificates.push({
        type: "ScriptCertificate",
        certType: currentCert.certType,
        scriptSource: {
          type: "Inline",
          txHash,
          txIndex,
          scriptHash,
          scriptSize,
        },
        redeemer:
          currentCert.type === "ScriptCertificate"
            ? currentCert.redeemer
            : undefined,
      });
    }
    return this;
  };

  certificateRedeemerValue = (
    redeemer: BuilderData["content"],
    type: BuilderData["type"] = "Mesh",
    exUnits = { ...DEFAULT_REDEEMER_BUDGET },
  ) => {
    const currentCert = this.meshTxBuilderBody.certificates.pop();
    if (!currentCert) {
      throw Error(
        "Certificate redeemer value attempted to be defined, but no certificate was found",
      );
    }
    if (currentCert.type === "ScriptCertificate") {
      currentCert.redeemer = this.castBuilderDataToRedeemer(
        redeemer,
        type,
        exUnits,
      );
    } else {
      throw Error(
        "Redeemer value attempted to be defined, but certificate has no script defined, or no script version was defined",
      );
    }
    this.meshTxBuilderBody.certificates.push(currentCert);
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
   * @param label The label of the metadata, preferably number
   * @param metadata The metadata in any format
   * @returns The MeshTxBuilder instance
   */
  metadataValue = (
    label: number | bigint | string,
    metadata: Metadatum | object,
  ) => {
    label = BigInt(label);
    if (typeof metadata === "object" && !(metadata instanceof Map)) {
      this.meshTxBuilderBody.metadata.set(label, metadataObjToMap(metadata));
    } else {
      this.meshTxBuilderBody.metadata.set(label, metadata);
    }
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
   * Selects utxos to fill output value and puts them into inputs
   * @param extraInputs The inputs already placed into the object will remain, these extra inputs will be used to fill the remaining  value needed
   * @param strategy The strategy to be used in utxo selection
   * @param threshold Extra value needed to be selected for, usually for paying fees and min UTxO value of change output (default to 5000000)
   * @param includeTxFees Whether to include transaction fees in the threshold (default to true)
   */
  selectUtxosFrom = (
    extraInputs: UTxO[],
    strategy: UtxoSelectionStrategy = "experimental",
    threshold = "5000000",
    includeTxFees = true,
  ) => {
    this.meshTxBuilderBody.extraInputs = extraInputs;
    const newConfig = {
      threshold,
      strategy,
      includeTxFees,
    };
    this.meshTxBuilderBody.selectionConfig = {
      ...this.meshTxBuilderBody.selectionConfig,
      ...newConfig,
    };
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
    return this;
  };

  /**
   * Sets a specific fee for the transaction to use
   * @param fee The specified fee
   * @returns The MeshTxBuilder instance
   */
  setFee = (fee: string) => {
    this.meshTxBuilderBody.fee = fee;
    return this;
  };

  /**
   * Sets the network to use, this is mainly to know the cost models to be used to calculate script integrity hash
   * @param network The specific network this transaction is being built for ("testnet" | "preview" | "preprod" | "mainnet")
   * @returns The MeshTxBuilder instance
   */
  setNetwork = (network: Network | number[][]) => {
    this.meshTxBuilderBody.network = network;
    return this;
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
    if (this.withdrawalItem) {
      this.queueWithdrawal();
    }
    if (this.voteItem) {
      this.queueVote();
    }
  };

  private queueInput = () => {
    if (!this.txInQueueItem) throw Error("queueInput: Undefined input");
    if (this.txInQueueItem.type === "Script") {
      if (!this.txInQueueItem.scriptTxIn) {
        throw Error(
          "queueInput: Script input does not contain script, datum, or redeemer information",
        );
      } else {
        if (!this.txInQueueItem.scriptTxIn.datumSource)
          throw Error(
            "queueInput: Script input does not contain datum information",
          );
        if (!this.txInQueueItem.scriptTxIn.redeemer)
          throw Error(
            "queueInput: Script input does not contain redeemer information",
          );
        if (!this.txInQueueItem.scriptTxIn.scriptSource)
          throw Error(
            "queueInput: Script input does not contain script information",
          );
      }
    }
    this.meshTxBuilderBody.inputs.push(this.txInQueueItem);
    this.txInQueueItem = undefined;
  };

  private queueMint = () => {
    if (!this.mintItem) throw Error("queueMint: Undefined mint");
    if (!this.mintItem.scriptSource)
      throw Error("queueMint: Missing mint script information");
    this.meshTxBuilderBody.mints.push(this.mintItem);
    this.mintItem = undefined;
  };

  private queueWithdrawal = () => {
    if (!this.withdrawalItem)
      throw Error("queueWithdrawal: Undefined withdrawal");
    if (this.withdrawalItem.type === "ScriptWithdrawal") {
      if (!this.withdrawalItem.scriptSource) {
        throw Error("queueWithdrawal: Missing withdrawal script information");
      }
      if (!this.withdrawalItem.redeemer) {
        throw Error("queueWithdrawal: Missing withdrawal redeemer information");
      }
    } else if (this.withdrawalItem.type === "SimpleScriptWithdrawal") {
      if (!this.withdrawalItem.scriptSource) {
        throw Error("queueWithdrawal: Missing withdrawal script information");
      }
    }
    this.meshTxBuilderBody.withdrawals.push(this.withdrawalItem);
    this.withdrawalItem = undefined;
  };

  private queueVote = () => {
    if (!this.voteItem) {
      throw Error("queueVote: Undefined vote");
    }
    if (this.voteItem.type === "ScriptVote") {
      if (!this.voteItem.scriptSource) {
        throw Error("queueVote: Missing vote script information");
      }
      if (!this.voteItem.redeemer) {
        throw Error("queueVote: Missing vote redeemer information");
      }
    } else if (this.voteItem.type === "SimpleScriptVote") {
      if (!this.voteItem.simpleScriptSource) {
        throw Error("queueVote: Missing vote script information");
      }
    }
    this.meshTxBuilderBody.votes.push(this.voteItem);
    this.voteItem = undefined;
  };

  protected castRawDataToJsonString = (rawData: object | string) => {
    if (typeof rawData === "object") {
      return JSONBig.stringify(rawData);
    } else {
      return rawData as string;
    }
  };

  protected castBuilderDataToRedeemer = (
    redeemer: BuilderData["content"],
    type: BuilderData["type"] = "Mesh",
    exUnits = { ...DEFAULT_REDEEMER_BUDGET },
  ): Redeemer => {
    let red: Redeemer;
    let content = redeemer;
    if (type === "Mesh") {
      red = {
        data: {
          type,
          content: content as Data,
        },
        exUnits,
      };
      return red;
    }
    if (type === "JSON") {
      content = this.castRawDataToJsonString(redeemer as object | string);
    }
    red = {
      data: {
        type,
        content: content as string,
      },
      exUnits,
    };
    return red;
  };

  protected updateRedeemer = (
    meshTxBuilderBody: MeshTxBuilderBody,
    txEvaluation: Omit<Action, "data">[],
  ) => {
    txEvaluation.forEach((redeemerEvaluation) => {
      switch (redeemerEvaluation.tag) {
        case "SPEND": {
          const input = meshTxBuilderBody.inputs[redeemerEvaluation.index]!;
          if (input.type == "Script" && input.scriptTxIn.redeemer) {
            input.scriptTxIn.redeemer.exUnits.mem = Math.floor(
              redeemerEvaluation.budget.mem * this.txEvaluationMultiplier,
            );
            input.scriptTxIn.redeemer.exUnits.steps = Math.floor(
              redeemerEvaluation.budget.steps * this.txEvaluationMultiplier,
            );
          }
          break;
        }
        case "MINT": {
          const mint = meshTxBuilderBody.mints[redeemerEvaluation.index]!;
          if (mint.type == "Plutus" && mint.redeemer) {
            let newExUnits: Budget = {
              mem: Math.floor(
                redeemerEvaluation.budget.mem * this.txEvaluationMultiplier,
              ),
              steps: Math.floor(
                redeemerEvaluation.budget.steps * this.txEvaluationMultiplier,
              ),
            };
            // It's possible to have multiple mints with the same policy id but different
            // asset name, so we need to loop over the mints after evaluation
            for (
              let i = redeemerEvaluation.index;
              i < meshTxBuilderBody.mints.length;
              i++
            ) {
              if (meshTxBuilderBody.mints[i]!.policyId === mint.policyId) {
                meshTxBuilderBody.mints[i]!.redeemer!.exUnits = newExUnits;
              }
            }
          }
          break;
        }
        case "CERT":
          const cert =
            meshTxBuilderBody.certificates[redeemerEvaluation.index]!;
          if (cert.type === "ScriptCertificate" && cert.redeemer) {
            cert.redeemer.exUnits.mem = Math.floor(
              redeemerEvaluation.budget.mem * this.txEvaluationMultiplier,
            );
            cert.redeemer.exUnits.steps = Math.floor(
              redeemerEvaluation.budget.steps * this.txEvaluationMultiplier,
            );
          }
          break;
        case "REWARD":
          const withdrawal =
            meshTxBuilderBody.withdrawals[redeemerEvaluation.index]!;
          if (withdrawal.type === "ScriptWithdrawal" && withdrawal.redeemer) {
            withdrawal.redeemer.exUnits.mem = Math.floor(
              redeemerEvaluation.budget.mem * this.txEvaluationMultiplier,
            );
            withdrawal.redeemer.exUnits.steps = Math.floor(
              redeemerEvaluation.budget.steps * this.txEvaluationMultiplier,
            );
          }
          break;
      }
    });
  };

  addUtxosFromSelection = () => {
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
      new Map<Unit, Quantity>(),
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
        String(existingQuantity - Number(mintAmount.quantity)),
      );
      return map;
    }, requiredAssets);

    const selectionConfig = this.meshTxBuilderBody.selectionConfig;

    const utxoSelection = new UtxoSelection(
      selectionConfig.threshold,
      selectionConfig.includeTxFees,
    );

    let selectedInputs: UTxO[] = [];
    switch (selectionConfig.strategy) {
      case "keepRelevant":
        selectedInputs = utxoSelection.keepRelevant(
          requiredAssets,
          this.meshTxBuilderBody.extraInputs,
        );
      case "largestFirst":
        selectedInputs = utxoSelection.largestFirst(
          requiredAssets,
          this.meshTxBuilderBody.extraInputs,
        );
        break;

      case "largestFirstMultiAsset":
        selectedInputs = utxoSelection.largestFirstMultiAsset(
          requiredAssets,
          this.meshTxBuilderBody.extraInputs,
        );
        break;

      default:
        selectedInputs = utxoSelection.experimental(
          requiredAssets,
          this.meshTxBuilderBody.extraInputs,
        );
        break;
    }

    selectedInputs.forEach((input) => {
      const pubKeyTxIn: PubKeyTxIn = {
        type: "PubKey",
        txIn: {
          txHash: input.input.txHash,
          txIndex: input.input.outputIndex,
          amount: input.output.amount,
          address: input.output.address,
        },
      };
      this.meshTxBuilderBody.inputs.push(pubKeyTxIn);
      // If an input selected has script ref, then we must
      // provide the script size to the tx builder also
      if (input.output.scriptRef) {
        this.meshTxBuilderBody.referenceInputs.push({
          txHash: input.input.txHash,
          txIndex: input.input.outputIndex,
          scriptSize: input.output.scriptRef!.length / 2,
        });
      }
    });
  };

  removeDuplicateInputs = () => {
    const { inputs } = this.meshTxBuilderBody;
    const getTxInId = (txIn: TxInParameter): string =>
      `${txIn.txHash}#${txIn.txIndex}`;
    const currentTxInIds: string[] = [];
    const addedInputs: TxIn[] = [];
    for (let i = 0; i < inputs.length; i += 1) {
      const currentInput = inputs[i]!;
      const currentTxInId = getTxInId(currentInput.txIn);
      if (currentTxInIds.includes(currentTxInId)) {
        inputs.splice(i, 1);
        i -= 1;
      } else {
        addedInputs.push(currentInput);
      }
    }
    this.meshTxBuilderBody.inputs = addedInputs;
  };

  emptyTxBuilderBody = () => {
    this.meshTxBuilderBody = emptyTxBuilderBody();
    return emptyTxBuilderBody;
  };

  reset = () => {
    this.meshTxBuilderBody = emptyTxBuilderBody();
    this.txEvaluationMultiplier = 1.1;
    this.txOutput = undefined;
    this.addingPlutusScriptInput = false;
    this.plutusSpendingScriptVersion = undefined;
    this.addingPlutusMint = false;
    this.plutusMintingScriptVersion = undefined;
    this.addingPlutusWithdrawal = false;
    this.addingPlutusVote = false;
    this.plutusWithdrawalScriptVersion = undefined;
    this._protocolParams = DEFAULT_PROTOCOL_PARAMETERS;
    this.mintItem = undefined;
    this.txInQueueItem = undefined;
    this.withdrawalItem = undefined;
    this.voteItem = undefined;
    this.collateralQueueItem = undefined;
    this.refScriptTxInQueueItem = undefined;
  };

  protected _cloneCore<T extends MeshTxBuilderCore>(createInstance: () => T): T {
    this.queueAllLastItem();

    const newBuilder = createInstance();

    const tmpBody = JSONBig.parse(JSONBig.stringify(this.meshTxBuilderBody));
    const newMetadataMap = new Map<
        BigInt | number | string,
        Metadatum | object
    >();
    if (tmpBody.metadata) {
      for (const [k, v] of Object.entries(tmpBody.metadata) as [
        string,
            object | Metadatum,
      ][]) {
        const bigKey = (() => {
          try {
            return BigInt(k);
          } catch {
            return k;
          }
        })();
        newMetadataMap.set(bigKey, v);
      }
    }
    tmpBody.metadata = newMetadataMap;
    newBuilder.meshTxBuilderBody = tmpBody;

    newBuilder.txEvaluationMultiplier = this.txEvaluationMultiplier;
    newBuilder.txOutput = this.txOutput
        ? JSONBig.parse(JSONBig.stringify(this.txOutput))
        : undefined;

    newBuilder.addingPlutusScriptInput = this.addingPlutusScriptInput;
    newBuilder.plutusSpendingScriptVersion = this.plutusSpendingScriptVersion;

    newBuilder.addingPlutusMint = this.addingPlutusMint;
    newBuilder.plutusMintingScriptVersion = this.plutusMintingScriptVersion;

    newBuilder.addingPlutusWithdrawal = this.addingPlutusWithdrawal;
    newBuilder.plutusWithdrawalScriptVersion = this.plutusWithdrawalScriptVersion;

    newBuilder.addingPlutusVote = this.addingPlutusVote;
    newBuilder.plutusVoteScriptVersion = this.plutusVoteScriptVersion;

    newBuilder._protocolParams = JSONBig.parse(
        JSONBig.stringify(this._protocolParams),
    );

    newBuilder.mintItem = this.mintItem
        ? JSONBig.parse(JSONBig.stringify(this.mintItem))
        : undefined;
    newBuilder.txInQueueItem = this.txInQueueItem
        ? JSONBig.parse(JSONBig.stringify(this.txInQueueItem))
        : undefined;
    newBuilder.withdrawalItem = this.withdrawalItem
        ? JSONBig.parse(JSONBig.stringify(this.withdrawalItem))
        : undefined;
    newBuilder.voteItem = this.voteItem
        ? JSONBig.parse(JSONBig.stringify(this.voteItem))
        : undefined;
    newBuilder.collateralQueueItem = this.collateralQueueItem
        ? JSONBig.parse(JSONBig.stringify(this.collateralQueueItem))
        : undefined;
    newBuilder.refScriptTxInQueueItem = this.refScriptTxInQueueItem
        ? JSONBig.parse(JSONBig.stringify(this.refScriptTxInQueueItem))
        : undefined;

    return newBuilder;
  }
}
