import {
  Asset, Certificate, CertificateType,
  IEvaluator,
  IFetcher,
  IMeshTxSerializer,
  ISubmitter,
  MeshTxBuilderBody,
  MintItem,
  Protocol,
  ScriptSource,
  SimpleScriptSourceInfo,
  TxIn,
  UTxO, Vote, Withdrawal,
} from "@meshsdk/common";

import JSONBig from "json-bigint";

import {
  Address as CstAddress,
  AddressType as CstAddressType,
  CardanoSDKSerializer,
  CredentialType as CstCredentialType,
  Script as CstScript,
  NativeScript as CstNativeScript,
  CardanoSDKUtil,
  toDRep as coreToCstDRep,
} from "@meshsdk/core-cst";

import { MeshTxBuilderCore } from "./tx-builder-core";

export interface MeshTxBuilderOptions {
  fetcher?: IFetcher;
  submitter?: ISubmitter;
  evaluator?: IEvaluator;
  serializer?: IMeshTxSerializer;
  isHydra?: boolean;
  params?: Partial<Protocol>;
  verbose?: boolean;
}

export class MeshTxBuilder extends MeshTxBuilderCore {
  serializer: IMeshTxSerializer;
  fetcher?: IFetcher;
  submitter?: ISubmitter;
  evaluator?: IEvaluator;
  txHex: string = "";
  protected queriedTxHashes: Set<string> = new Set();
  protected queriedUTxOs: { [x: string]: UTxO[] } = {};
  protected utxosWithRefScripts: UTxO[] = [];

  constructor({
    serializer,
    fetcher,
    submitter,
    evaluator,
    params,
    isHydra = false,
    verbose = false,
  }: MeshTxBuilderOptions = {}) {
    super();
    if (serializer) {
      this.serializer = serializer;
    } else {
      this.serializer = new CardanoSDKSerializer();
      // this.serializer = new CSLSerializer();
    }
    this.serializer.verbose = verbose;
    if (fetcher) this.fetcher = fetcher;
    if (submitter) this.submitter = submitter;
    if (evaluator) this.evaluator = evaluator;
    if (params) this.protocolParams(params);
    if (isHydra)
      this.protocolParams({
        minFeeA: 0,
        minFeeB: 0,
        priceMem: 0,
        priceStep: 0,
        collateralPercent: 0,
        coinsPerUtxoSize: 0,
      });
  }

  /**
   * It builds the transaction and query the blockchain for missing information
   * @param customizedTx The optional customized transaction body
   * @returns The signed transaction in hex ready to submit / signed by client
   */
  complete = async (customizedTx?: Partial<MeshTxBuilderBody>) => {
    if (customizedTx) {
      this.meshTxBuilderBody = { ...this.meshTxBuilderBody, ...customizedTx };
    } else {
      this.queueAllLastItem();
    }
    this.removeDuplicateInputs();

    // We can set scriptSize of collaterals as 0, because the ledger ignores this for fee calculations
    for (let collateral of this.meshTxBuilderBody.collaterals) {
      collateral.txIn.scriptSize = 0;
    }

    // Checking if all inputs are complete
    const { inputs, collaterals, mints } = this.meshTxBuilderBody;
    const incompleteTxIns = [...inputs, ...collaterals].filter(
      (txIn) => !this.isInputComplete(txIn),
    );
    const incompleteMints = mints.filter((mint) => !this.isMintComplete(mint));
    // Getting all missing utxo information
    await this.queryAllTxInfo(incompleteTxIns, incompleteMints);
    // Completing all inputs
    incompleteTxIns.forEach((txIn) => {
      this.completeTxInformation(txIn);
    });
    incompleteMints.forEach((mint) => {
      if (mint.type === "Plutus") {
        const scriptSource = mint.scriptSource as ScriptSource;
        this.completeScriptInfo(scriptSource);
      }
      if (mint.type === "Native") {
        const scriptSource = mint.scriptSource as SimpleScriptSourceInfo;
        this.completeSimpleScriptInfo(scriptSource);
      }
    });
    this.meshTxBuilderBody.inputs.forEach((input) => {
      if (input.txIn.scriptSize && input.txIn.scriptSize > 0) {
        if (
          this.meshTxBuilderBody.referenceInputs.find((refTxIn) => {
            refTxIn.txHash === input.txIn.txHash &&
              refTxIn.txIndex === input.txIn.txIndex;
          }) === undefined
        ) {
          this.meshTxBuilderBody.referenceInputs.push({
            txHash: input.txIn.txHash,
            txIndex: input.txIn.txIndex,
            scriptSize: input.txIn.scriptSize,
          });
        }
      }
    });
    this.addUtxosFromSelection();

    // Sort inputs based on txHash and txIndex
    this.meshTxBuilderBody.inputs.sort((a, b) => {
      if (a.txIn.txHash < b.txIn.txHash) return -1;
      if (a.txIn.txHash > b.txIn.txHash) return 1;
      if (a.txIn.txIndex < b.txIn.txIndex) return -1;
      if (a.txIn.txIndex > b.txIn.txIndex) return 1;
      return 0;
    });

    // Sort mints based on policy id and asset name
    this.meshTxBuilderBody.mints.sort((a, b) => {
      if (a.policyId < b.policyId) return -1;
      if (a.policyId > b.policyId) return 1;
      if (a.assetName < b.assetName) return -1;
      if (a.assetName > b.assetName) return 1;
      return 0;
    });

    let txHex = this.serializer.serializeTxBody(
      this.meshTxBuilderBody,
      this._protocolParams,
    );

    // Evaluating the transaction
    if (this.evaluator) {
      const txEvaluation = await this.evaluator
        .evaluateTx(txHex)
        .catch((error) => {
          throw Error(`Tx evaluation failed: ${error} \n For txHex: ${txHex}`);
        });
      this.updateRedeemer(this.meshTxBuilderBody, txEvaluation);
      txHex = this.serializer.serializeTxBody(
        this.meshTxBuilderBody,
        this._protocolParams,
      );
    }

    this.txHex = txHex;
    return txHex;
  };

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
    this.addUtxosFromSelection();
    return this.serializer.serializeTxBody(
      this.meshTxBuilderBody,
      this._protocolParams,
    );
  };

  /**
   * Complete the signing process
   * @returns The signed transaction in hex
   */
  completeSigning = () => {
    const signedTxHex = this.serializer.addSigningKeys(
      this.txHex,
      this.meshTxBuilderBody.signingKey,
    );
    this.txHex = signedTxHex;
    return signedTxHex;
  };

  /**
   * Submit transactions to the blockchain using the fetcher instance
   * @param txHex The signed transaction in hex
   * @returns
   */
  submitTx = async (txHex: string): Promise<string | undefined> => {
    const txHash = await this.submitter?.submitTx(txHex);
    return txHash;
  };

  /**
   * Get the UTxO information from the blockchain
   * @param txHash The TxIn object that contains the txHash and txIndex, while missing amount and address information
   */
  protected getUTxOInfo = async (txHash: string): Promise<void> => {
    let utxos: UTxO[] = [];
    if (!this.queriedTxHashes.has(txHash)) {
      this.queriedTxHashes.add(txHash);
      utxos = (await this.fetcher?.fetchUTxOs(txHash)) || [];
      this.queriedUTxOs[txHash] = utxos;
    }
  };

  protected queryAllTxInfo = (
    incompleteTxIns: TxIn[],
    incompleteMints: MintItem[],
  ) => {
    const queryUTxOPromises: Promise<void>[] = [];
    if (
      (incompleteTxIns.length > 0 || incompleteMints.length > 0) &&
      !this.fetcher
    )
      throw Error(
        "Transaction information is incomplete while no fetcher instance is provided. Provide a `fetcher`.",
      );
    for (let i = 0; i < incompleteTxIns.length; i++) {
      const currentTxIn = incompleteTxIns[i]!;
      if (!this.isInputInfoComplete(currentTxIn)) {
        queryUTxOPromises.push(this.getUTxOInfo(currentTxIn.txIn.txHash));
      }
      if (
        currentTxIn.type === "Script" &&
        currentTxIn.scriptTxIn.scriptSource?.type === "Inline" &&
        !this.isRefScriptInfoComplete(currentTxIn.scriptTxIn.scriptSource)
      ) {
        queryUTxOPromises.push(
          this.getUTxOInfo(currentTxIn.scriptTxIn.scriptSource.txHash),
        );
      }
    }
    for (let i = 0; i < incompleteMints.length; i++) {
      const currentMint = incompleteMints[i]!;
      if (currentMint.type === "Plutus") {
        const scriptSource = currentMint.scriptSource as ScriptSource;
        if (scriptSource.type === "Inline") {
          if (!this.isRefScriptInfoComplete(scriptSource)) {
            queryUTxOPromises.push(this.getUTxOInfo(scriptSource.txHash));
          }
        }
      }
    }
    return Promise.all(queryUTxOPromises);
  };

  protected completeTxInformation = (input: TxIn) => {
    // Adding value and address information for inputs if missing
    if (!this.isInputInfoComplete(input)) {
      this.completeInputInfo(input);
    }
    // Adding spendingScriptHash for script inputs' scriptSource if missing
    if (
      input.type === "Script" &&
      !this.isRefScriptInfoComplete(input.scriptTxIn.scriptSource!)
    ) {
      const scriptSource = input.scriptTxIn.scriptSource;
      this.completeScriptInfo(scriptSource!);
    }
  };

  protected completeInputInfo = (input: TxIn) => {
    const utxos: UTxO[] = this.queriedUTxOs[input.txIn.txHash]!;
    const utxo = utxos?.find(
      (utxo) => utxo.input.outputIndex === input.txIn.txIndex,
    );
    const amount = utxo?.output.amount;
    const address = utxo?.output.address;
    if (!amount || amount.length === 0)
      throw Error(
        `Couldn't find value information for ${input.txIn.txHash}#${input.txIn.txIndex}`,
      );
    input.txIn.amount = amount;

    if (!address || address === "")
      throw Error(
        `Couldn't find address information for ${input.txIn.txHash}#${input.txIn.txIndex}`,
      );
    input.txIn.address = address;

    if (utxo?.output.scriptRef) {
      input.txIn.scriptSize = utxo.output.scriptRef.length / 2;
    } else {
      input.txIn.scriptSize = 0;
    }
  };

  protected completeScriptInfo = (scriptSource: ScriptSource) => {
    if (scriptSource?.type != "Inline") return;
    const refUtxos = this.queriedUTxOs[scriptSource.txHash]!;
    const scriptRefUtxo = refUtxos.find(
      (utxo) => utxo.input.outputIndex === scriptSource.txIndex,
    );
    if (!scriptRefUtxo)
      throw Error(
        `Couldn't find script reference utxo for ${scriptSource.txHash}#${scriptSource.txIndex}`,
      );
    scriptSource.scriptHash = scriptRefUtxo?.output.scriptHash!;
    scriptSource.scriptSize = (
      scriptRefUtxo?.output.scriptRef!.length / 2
    ).toString();
  };

  protected completeSimpleScriptInfo = (
    simpleScript: SimpleScriptSourceInfo,
  ) => {
    if (simpleScript.type !== "Inline") return;
    const refUtxos = this.queriedUTxOs[simpleScript.txHash]!;
    const scriptRefUtxo = refUtxos.find(
      (utxo) => utxo.input.outputIndex === simpleScript.txIndex,
    );
    if (!scriptRefUtxo)
      throw Error(
        `Couldn't find script reference utxo for ${simpleScript.txHash}#${simpleScript.txIndex}`,
      );
    simpleScript.simpleScriptHash = scriptRefUtxo?.output.scriptHash!;
  };

  protected isInputComplete = (txIn: TxIn): boolean => {
    if (txIn.type === "PubKey") return this.isInputInfoComplete(txIn);
    if (txIn.type === "Script") {
      const { scriptSource } = txIn.scriptTxIn;
      return (
        this.isInputInfoComplete(txIn) &&
        this.isRefScriptInfoComplete(scriptSource!)
      );
    }
    return true;
  };

  protected isInputInfoComplete = (txIn: TxIn): boolean => {
    const { amount, address, scriptSize } = txIn.txIn;
    if (!amount || !address || scriptSize === undefined) return false;
    return true;
  };

  protected isMintComplete = (mint: MintItem): boolean => {
    if (mint.type === "Plutus") {
      const scriptSource = mint.scriptSource as ScriptSource;
      return this.isRefScriptInfoComplete(scriptSource);
    }
    if (mint.type === "Native") {
      const scriptSource = mint.scriptSource as SimpleScriptSourceInfo;
      if (scriptSource.type === "Inline") {
        if (!scriptSource?.simpleScriptHash) return false;
      }
    }
    return true;
  };

  protected isRefScriptInfoComplete = (scriptSource: ScriptSource): boolean => {
    if (scriptSource?.type === "Inline") {
      if (!scriptSource?.scriptHash || !scriptSource?.scriptSize) return false;
    }
    return true;
  };

  protected collectAllRequiredSignatures = (): {
    keyHashes: Set<string>;
    byronAddresses: Set<string>;
  } => {
    const { paymentCreds, byronAddresses } = this.getInputsRequiredSignatures();
    const withdrawalCreds = this.getWithdrawalRequiredSignatures();
    const certCreds = this.getCertificatesRequiredSignatures();
    const voteCreds = this.getVoteRequiredSignatures();
    const requiredSignatures = this.meshTxBuilderBody.requiredSignatures;
    const allCreds = new Set([
      ...paymentCreds,
      ...withdrawalCreds,
      ...certCreds,
      ...voteCreds,
      ...requiredSignatures,
    ]);
    return { keyHashes: allCreds, byronAddresses };
  }

  protected getInputsRequiredSignatures(): {
    paymentCreds: Set<string>;
    byronAddresses: Set<string>;
  } {
    const byronAddresses = new Set<string>();
    const paymentCreds = new Set<string>();
    for (let input of this.meshTxBuilderBody.inputs) {
      if (input.type === "PubKey") {
        if (input.txIn.address) {
          const address = CstAddress.fromString(input.txIn.address);
          if (!address) {
            continue;
          }
          const addressDetails = address.getProps();
          const paymentCred = addressDetails.paymentPart;
          if (paymentCred?.type === CstCredentialType.KeyHash) {
            paymentCreds.add(paymentCred.hash);
          }
          if (addressDetails.type === CstAddressType.Byron) {
            byronAddresses.add(input.txIn.address);
          }
        }
      } else if (input.type === "SimpleScript") {
        const nativeScript = this.getInputNativeScript(input);
        if (nativeScript) {
          let pubKeys = this.getNativeScriptPubKeys(nativeScript);
            for (let pubKey of pubKeys) {
              paymentCreds.add(pubKey);
            }
        }
      }
    }
    return { paymentCreds, byronAddresses };
  }

  protected getWithdrawalRequiredSignatures(): Set<string> {
    const withdrawalCreds = new Set<string>();
    for (let withdrawal of this.meshTxBuilderBody.withdrawals) {
      if (withdrawal.type === "PubKeyWithdrawal") {
        const address = CstAddress.fromBech32(withdrawal.address);
        const addressDetails = address.getProps();
        const paymentCred = addressDetails.paymentPart;
        if (paymentCred?.type === CstCredentialType.KeyHash) {
          withdrawalCreds.add(paymentCred.hash);
        }
      }
      if (withdrawal.type === "SimpleScriptWithdrawal") {
        const nativeScript = this.getWithdrawalNativeScript(withdrawal);
        if (nativeScript) {
          let pubKeys = this.getNativeScriptPubKeys(nativeScript);
          for (let pubKey of pubKeys) {
            withdrawalCreds.add(pubKey);
          }
        }
      }
    }
    return withdrawalCreds;
  }

  protected getCertificatesRequiredSignatures(): Set<string> {
    const certCreds = new Set<string>();
    for (let cert of this.meshTxBuilderBody.certificates) {

      if (cert.type !== "BasicCertificate" && cert.type !== "SimpleScriptCertificate") {
        continue;
      }

      const certNativeScript = this.getCertificateNativeScript(cert);

      const certType = cert.certType;

      if (certType.type === "RegisterPool") {
        certCreds.add(certType.poolParams.operator);
        for (let owner of certType.poolParams.owners) {
          certCreds.add(owner);
        }
      } else if (certType.type === "RetirePool") {
        certCreds.add(certType.poolId);
      } else if (certType.type === "DRepRegistration") {
        if(cert.type === "BasicCertificate") {
            const cstDrep = coreToCstDRep(certType.drepId);
            const keyHash = cstDrep.toKeyHash();
            if (keyHash) {
              certCreds.add(keyHash);
            }
        } else if (certNativeScript) {
          let pubKeys = this.getNativeScriptPubKeys(certNativeScript);
          for (let pubKey of pubKeys) {
            certCreds.add(pubKey);
          }
        }
      } else if (certType.type === "StakeRegistrationAndDelegation" ||
                 certType.type === "VoteRegistrationAndDelegation" ||
                 certType.type === "StakeVoteRegistrationAndDelegation" ||
                 certType.type === "DeregisterStake") {
        if(cert.type === "BasicCertificate") {
          const address = CstAddress.fromString(certType.stakeKeyAddress);
          if (address) {
            const addressDetails = address.getProps();
            const paymentCred = addressDetails.paymentPart;
            if (paymentCred?.type === CstCredentialType.KeyHash) {
              certCreds.add(paymentCred.hash);
            }
          }
        } else if (certNativeScript) {
          let pubKeys = this.getNativeScriptPubKeys(certNativeScript);
          for (let pubKey of pubKeys) {
            certCreds.add(pubKey);
          }
        }
      } else if (certType.type === "CommitteeHotAuth" || certType.type === "CommitteeColdResign") {
          if (cert.type === "BasicCertificate") {
            const address = CstAddress.fromString(certType.committeeColdKeyAddress);
            if (address) {
              const addressDetails = address.getProps();
              const paymentCred = addressDetails.paymentPart;
              if (paymentCred?.type === CstCredentialType.KeyHash) {
                certCreds.add(paymentCred.hash);
              }
            }
          } else if (certNativeScript) {
            let pubKeys = this.getNativeScriptPubKeys(certNativeScript);
            for (let pubKey of pubKeys) {
              certCreds.add(pubKey);
            }
          }
      }
    }
    return certCreds;
  }

  protected getVoteRequiredSignatures(): Set<string> {
    const voteCreds = new Set<string>();
    for (let vote of this.meshTxBuilderBody.votes) {
      if (vote.type !== "SimpleScriptVote") {
        const nativeScript = this.getVoteNativeScript(vote);
        if (nativeScript) {
          let pubKeys = this.getNativeScriptPubKeys(nativeScript);
          for (let pubKey of pubKeys) {
            voteCreds.add(pubKey);
          }
        } else if (vote.type === "BasicVote") {
          const voter = vote.vote.voter;
          if (voter.type === "DRep") {
            const drep = coreToCstDRep(voter.drepId);
            const keyHash = drep.toKeyHash();
            if (keyHash) {
              voteCreds.add(keyHash);
            }
          } else if (voter.type === "StakingPool") {
            voteCreds.add(voter.keyHash);
          } else if (voter.type === "ConstitutionalCommittee") {
            const hotCred = voter.hotCred;
            if (hotCred.type === "KeyHash") {
              voteCreds.add(hotCred.keyHash);
            }
          }
        }
      }
    }
    return voteCreds;
  }

  protected getTotalWithdrawal = (): bigint => {
    let accum = 0n;
    for (let withdrawal of this.meshTxBuilderBody.withdrawals) {
      accum += BigInt(withdrawal.coin);
    }
    return accum
  }

  protected getTotalDeposit = () => {
    let accum = 0n;
    for (let cert of this.meshTxBuilderBody.certificates) {
      const certType = cert.certType;
      if (certType.type === "RegisterStake") {
        if (cert.certType) {
          accum += BigInt(this._protocolParams.keyDeposit);
        }
      } else if (certType.type === "RegisterPool") {
        accum += BigInt(this._protocolParams.poolDeposit);
      } else if (certType.type === "DRepRegistration") {
        accum += BigInt(certType.coin);
      } else if (certType.type === "StakeRegistrationAndDelegation") {
        accum += BigInt(certType.coin);
      } else if (certType.type === "VoteRegistrationAndDelegation") {
        accum += BigInt(certType.coin);
      } else if (certType.type === "StakeVoteRegistrationAndDelegation") {
        accum += BigInt(certType.coin);
      }
    }
    return accum;
  }

  protected getTotalRefund = (): bigint => {
    let accum = 0n;
    for (let cert of this.meshTxBuilderBody.certificates) {
      const certType = cert.certType;
        if (certType.type === "DeregisterStake") {
          if (cert.certType) {
            accum += BigInt(this._protocolParams.keyDeposit);
          }
        } else if (certType.type === "DRepDeregistration") {
          accum += BigInt(certType.coin);
        }
    }
    return accum
  }

  protected getTotalMint = (): Asset[] => {
    const assets = new Map<string, bigint>();
    for (let mint of this.meshTxBuilderBody.mints) {
      const assetId = `${mint.policyId}${mint.assetName}`;
      let amount = assets.get(assetId) ?? 0n;
      amount += BigInt(mint.amount);
    }

    return Array.from(assets).map(([assetId, amount]) => (
        {
          unit: assetId,
          quantity: amount.toString()
        }
    ));
  }

  protected getNativeScriptPubKeys = (nativeScript: CstNativeScript): Set<string> => {
    const pubKeys = new Set<string>();
    const nativeScriptStack = []
    nativeScriptStack.push(nativeScript);
    while (nativeScriptStack.length > 0) {
      const script = nativeScriptStack.pop();
      if (script === undefined) {
        continue;
      }
      const nOfK = script.asScriptNOfK();
      if (nOfK) {
        for (let script of nOfK.nativeScripts()) {
          nativeScriptStack.push(script);
        }
      }
      const scriptAll = script.asScriptAll();
      if (scriptAll) {
        for (let script of scriptAll.nativeScripts()) {
          nativeScriptStack.push(script);
        }
      }
      const scriptAny = script.asScriptAny();
      if (scriptAny) {
        for (let script of scriptAny.nativeScripts()) {
          nativeScriptStack.push(script);
        }
      }
      const scriptPubkey = script.asScriptPubkey();
      if (scriptPubkey) {
        pubKeys.add(scriptPubkey.keyHash());
      }
    }
    return pubKeys;
  }

  protected getVoteNativeScript = (cert: Vote): CstNativeScript | undefined => {
    if (cert.type !== "SimpleScriptVote") {
      return undefined;
    }

    const scriptSource = cert.simpleScriptSource;
    if(scriptSource === undefined) {
      return undefined;
    }

    if (scriptSource.type === "Inline") {
      return this.getInlinedNativeScript(scriptSource.txHash, scriptSource.txIndex);
    }
    if (scriptSource.type === "Provided") {
      return CstNativeScript.fromCbor(<CardanoSDKUtil.HexBlob>scriptSource.scriptCode);
    }
  }

  protected getCertificateNativeScript = (cert: Certificate): CstNativeScript | undefined => {
    if (cert.type !== "SimpleScriptCertificate") {
      return undefined;
    }

    const scriptSource = cert.simpleScriptSource;
    if(scriptSource === undefined) {
      return undefined;
    }

    if (scriptSource.type === "Inline") {
      return this.getInlinedNativeScript(scriptSource.txHash, scriptSource.txIndex);
    }
    if (scriptSource.type === "Provided") {
      return CstNativeScript.fromCbor(<CardanoSDKUtil.HexBlob>scriptSource.scriptCode);
    }
  }

  protected getMintNativeScript = (mint: MintItem): CstNativeScript | undefined => {
    if (mint.type !== "Native") {
      return undefined;
    }

    const scriptSource = mint.scriptSource as SimpleScriptSourceInfo;
    const scriptSourceAlternative = mint.scriptSource as ScriptSource;
    if(scriptSource === undefined) {
      return undefined;
    }

    if (scriptSource.type === "Inline") {
      return this.getInlinedNativeScript(scriptSource.txHash, scriptSource.txIndex);
    }
    if (scriptSource.type === "Provided") {
      if(scriptSource.scriptCode != undefined) {
        return CstNativeScript.fromCbor(<CardanoSDKUtil.HexBlob>scriptSource.scriptCode);
      }
    }

    if (scriptSourceAlternative.type === "Provided") {
      if(scriptSourceAlternative.script != undefined) {
        return CstNativeScript.fromCbor(<CardanoSDKUtil.HexBlob>scriptSourceAlternative.script.code);
      }
    }
  }

  protected getWithdrawalNativeScript = (withdrawal: Withdrawal): CstNativeScript | undefined => {
    if (withdrawal.type !== "SimpleScriptWithdrawal") {
      return undefined;
    }

    const scriptSource = withdrawal.scriptSource;
    if(scriptSource === undefined) {
      return undefined;
    }

    if (scriptSource.type === "Inline") {
      return this.getInlinedNativeScript(scriptSource.txHash, scriptSource.txIndex);
    }
    if (scriptSource.type === "Provided") {
      return CstNativeScript.fromCbor(<CardanoSDKUtil.HexBlob>scriptSource.scriptCode);
    }
  }

  protected getInputNativeScript(txIn: TxIn): CstNativeScript | undefined {
    if (txIn.type !== "SimpleScript") {
      return undefined;
    }

    const scriptSource = txIn.simpleScriptTxIn.scriptSource;
    if(scriptSource === undefined) {
        return undefined;
    }

    if (scriptSource.type === "Inline") {
      return this.getInlinedNativeScript(scriptSource.txHash, scriptSource.txIndex);
    }
    if (scriptSource.type === "Provided") {
        return CstNativeScript.fromCbor(<CardanoSDKUtil.HexBlob>scriptSource.scriptCode);
    }
  }

  protected getInlinedNativeScript = (txHash: string, index: number): CstNativeScript | undefined => {
    const utxos = this.queriedUTxOs[txHash];
    if (!utxos) {
      return undefined;
    }

    const utxo = utxos.find((utxo) => utxo.input.outputIndex === index);
    if (utxo?.output.scriptRef) {
      const script = CstScript.fromCbor(<CardanoSDKUtil.HexBlob>utxo.output.scriptRef)
      return script.asNative();
    }
    return undefined
  }

  protected makeTxId = (txHash: string, index: number): string => {
    return `${txHash}-${index}`;
  }

  protected getTotalReferenceInputsSize = (): bigint => {
    let accum = 0n;
    const allReferenceInputs = this.getAllReferenceInputsSizes();
    for (const [_, scriptSize] of allReferenceInputs) {
      accum += scriptSize;
    }
    return accum;
  }

  protected getAllReferenceInputsSizes = (): Map<string, bigint> => {
    const referenceInputs = new Map<string, bigint>();
    const bodyReferenceInputs = this.getBodyReferenceInputsSizes();
    for (const [txId, scriptSize] of bodyReferenceInputs) {
      referenceInputs.set(txId, scriptSize);
    }
    const inputsReferenceInputs = this.getInputsReferenceInputsSizes();
    for (const [txId, scriptSize] of inputsReferenceInputs) {
      referenceInputs.set(txId, scriptSize);
    }
    const mintsReferenceInputs = this.getMintsReferenceInputsSizes();
    for (const [txId, scriptSize] of mintsReferenceInputs) {
      referenceInputs.set(txId, scriptSize);
    }
    const withdrawalsReferenceInputs = this.getWithdrawalsReferenceInputsSizes();
    for (const [txId, scriptSize] of withdrawalsReferenceInputs) {
      referenceInputs.set(txId, scriptSize);
    }
    const votesReferenceInputs = this.getVotesReferenceInputsSizes();
    for (const [txId, scriptSize] of votesReferenceInputs) {
      referenceInputs.set(txId, scriptSize);
    }
    const certificatesReferenceInputs = this.getCertificatesReferenceInputsSizes();
    for (const [txId, scriptSize] of certificatesReferenceInputs) {
      referenceInputs.set(txId, scriptSize);
    }
    return referenceInputs;
  }

  protected getBodyReferenceInputsSizes = (): [string, bigint][] => {
    const referenceInputs: [string, bigint][] = [];
    for (const refTxIn of this.meshTxBuilderBody.referenceInputs) {
      referenceInputs.push([this.makeTxId(refTxIn.txHash, refTxIn.txIndex), BigInt(refTxIn.scriptSize ?? 0)]);
    }
    return referenceInputs;
  }

  protected getInputsReferenceInputsSizes = (): [string, bigint][] => {
    const referenceInputs: [string, bigint][] = [];
    for (const input of this.meshTxBuilderBody.inputs) {
      if (input.type === "Script") {
        const scriptSource = input.scriptTxIn.scriptSource;
        if (scriptSource?.type === "Inline") {
          referenceInputs.push([this.makeTxId(scriptSource.txHash, scriptSource.txIndex), BigInt(scriptSource.scriptSize ?? 0)]);
        }
      } else if (input.type === "SimpleScript") {
        const scriptSource = input.simpleScriptTxIn.scriptSource;
        if (scriptSource?.type === "Inline") {
          referenceInputs.push([this.makeTxId(scriptSource.txHash, scriptSource.txIndex), BigInt(scriptSource.scriptSize ?? 0)]);
        }
      }
    }
    return referenceInputs;
  }

  protected getMintsReferenceInputsSizes = (): [string, bigint][] => {
    const referenceInputs: [string, bigint][] = [];
    for (const mint of this.meshTxBuilderBody.mints) {
      if (mint.type === "Plutus" || mint.type === "Native") {
        const scriptSource = mint.scriptSource;
        if (scriptSource?.type == "Inline") {
          referenceInputs.push([this.makeTxId(scriptSource.txHash, scriptSource.txIndex), BigInt(scriptSource.scriptSize ?? 0)]);
        }
      }
    }
    return referenceInputs;
  }

  protected getWithdrawalsReferenceInputsSizes = (): [string, bigint][] => {
    const referenceInputs: [string, bigint][] = [];
    for (const withdrawal of this.meshTxBuilderBody.withdrawals) {
      if (withdrawal.type === "SimpleScriptWithdrawal" || withdrawal.type === "ScriptWithdrawal") {
        const scriptSource = withdrawal.scriptSource;
        if (scriptSource?.type === "Inline") {
          referenceInputs.push([this.makeTxId(scriptSource.txHash, scriptSource.txIndex), BigInt(scriptSource.scriptSize ?? 0)]);
        }
      }
    }
    return referenceInputs;
  }

  protected getVotesReferenceInputsSizes = (): [string, bigint][] => {
    const referenceInputs: [string, bigint][] = [];
    for (const vote of this.meshTxBuilderBody.votes) {
      if (vote.type === "SimpleScriptVote") {
        const scriptSource = vote.simpleScriptSource;
        if (scriptSource?.type === "Inline") {
          referenceInputs.push([this.makeTxId(scriptSource.txHash, scriptSource.txIndex), BigInt(scriptSource.scriptSize ?? 0)]);
        }
      } else if (vote.type === "ScriptVote") {
        const scriptSource = vote.scriptSource;
        if (scriptSource?.type === "Inline") {
          referenceInputs.push([this.makeTxId(scriptSource.txHash, scriptSource.txIndex), BigInt(scriptSource.scriptSize ?? 0)]);
        }
      }
    }
    return referenceInputs;
  }

  protected getCertificatesReferenceInputsSizes = (): [string, bigint][] => {
    const referenceInputs: [string, bigint][] = [];
    for (const cert of this.meshTxBuilderBody.certificates) {
      if (cert.type === "SimpleScriptCertificate") {
        const scriptSource = cert.simpleScriptSource;
        if (scriptSource?.type === "Inline") {
          referenceInputs.push([this.makeTxId(scriptSource.txHash, scriptSource.txIndex), BigInt(scriptSource.scriptSize ?? 0)]);
        }
      } else if (cert.type === "ScriptCertificate") {
        const scriptSource = cert.scriptSource;
        if (scriptSource?.type === "Inline") {
          referenceInputs.push([this.makeTxId(scriptSource.txHash, scriptSource.txIndex), BigInt(scriptSource.scriptSize ?? 0)]);
        }
      }
    }
    return referenceInputs;
  }

  protected clone(): MeshTxBuilder {
    const newBuilder = super._cloneCore<MeshTxBuilder>(() => {
      return new MeshTxBuilder({
        serializer: this.serializer,
        fetcher: this.fetcher,
        submitter: this.submitter,
        evaluator: this.evaluator,
        verbose: this.serializer.verbose,
        params: { ...this._protocolParams },
      });
    });

    newBuilder.txHex = this.txHex;

    newBuilder.queriedTxHashes = new Set<string>(this.queriedTxHashes);

    newBuilder.queriedUTxOs = JSONBig.parse(
        JSONBig.stringify(this.queriedUTxOs),
    );
    newBuilder.utxosWithRefScripts = JSONBig.parse(
        JSONBig.stringify(this.utxosWithRefScripts),
    );

    return newBuilder;
  }
}

export * from "./utils";
