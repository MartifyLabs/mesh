import {
  ISpendingBlueprint,
  LanguageVersion,
  PlutusDataType,
} from "@meshsdk/common";

import {
  applyParamsToScript,
  resolveScriptHash,
  serializePlutusScript,
} from "../..";

/**
 * Spending blueprint
 * @category Blueprint
 * @implements ISpendingBlueprint
 * @class
 * @example
 *
 * const blueprint = new SpendingBlueprint("V3", 0, stakeHash);
 * blueprint.paramScript("84xxxxxx", ["params"], "Mesh");
 *
 * const scriptHash = blueprint.hash;
 * const scriptCbor = blueprint.cbor;
 * const scriptAddress = blueprint.address;
 */
export class SpendingBlueprint implements ISpendingBlueprint {
  version: LanguageVersion;
  networkId: number;
  cbor: string;
  hash: string;
  address: string;
  stakeHash?: string;
  isStakeScriptCredential: boolean;

  constructor(
    version: LanguageVersion,
    networkId: number,
    stakeHash: string,
    isStakeScriptCredential: boolean = false,
  ) {
    this.version = version;
    this.networkId = networkId;
    this.stakeHash = stakeHash;
    this.cbor = "";
    this.hash = "";
    this.address = "";
    this.isStakeScriptCredential = isStakeScriptCredential;
  }

  /**
   * Initialize the minting blueprint, with the same parameters to `applyParamsToScript`
   * @param compiledCode The raw script CborHex from blueprint.
   * @param params The parameters to apply, in an array.
   * @param paramsType The type of the parameters, default to be Mesh's Data type. It could also be in JSON and raw CBOR.
   * @returns
   */
  paramScript(
    compiledCode: string,
    params: string[],
    paramsType: PlutusDataType = "Mesh",
  ): this {
    const cbor = applyParamsToScript(compiledCode, params, paramsType);
    const hash = resolveScriptHash(cbor, this.version);
    const plutusScript = {
      code: cbor,
      version: this.version,
    };
    const address = serializePlutusScript(
      plutusScript,
      this.stakeHash,
      this.networkId,
      this.isStakeScriptCredential,
    ).address;
    this.hash = hash;
    this.cbor = cbor;
    this.address = address;
    return this;
  }

  /**
   * Initialize the minting blueprint, with no parameters
   * @param compiledCode The raw script CborHex from blueprint.
   * @returns The minting blueprint object
   */
  noParamScript(compiledCode: string): this {
    return this.paramScript(compiledCode, []);
  }
}
