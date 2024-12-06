import {
  IWithdrawalBlueprint,
  LanguageVersion,
  PlutusDataType,
} from "@meshsdk/common";

import { applyParamsToScript, serializeRewardAddress } from "../..";
import { resolveScriptHash } from "../resolver";

/**
 * Withdrawal blueprint
 * @category Blueprint
 * @implements IWithdrawalBlueprint
 * @class
 * @example
 *
 * const blueprint = new WithdrawalBlueprint("V3", 0);
 * blueprint.paramScript("84xxxxxx", ["params"], "Mesh");
 *
 * const scriptHash = blueprint.hash;
 * const scriptCbor = blueprint.cbor;
 * const rewardAddress = blueprint.address;
 */
export class WithdrawalBlueprint implements IWithdrawalBlueprint {
  version: LanguageVersion;
  networkId: number;
  cbor: string;
  hash: string;
  address: string;
  isStakeScriptCredential: boolean;

  constructor(
    version: LanguageVersion,
    networkId: number,
    isStakeScriptCredential = false,
  ) {
    this.version = version;
    this.networkId = networkId;
    this.cbor = "";
    this.hash = "";
    this.address = "";
    this.isStakeScriptCredential = isStakeScriptCredential;
  }

  /**
   * Initialize the withdrawal blueprint, with the same parameters to `applyParamsToScript`
   * @param compiledCode The raw script CborHex from blueprint.
   * @param params The parameters to apply, in an array.
   * @param paramsType The type of the parameters, default to be Mesh's Data type. It could also be in JSON and raw CBOR.
   * @returns The withdrawal blueprint object
   */
  paramScript(
    compiledCode: string,
    params: string[],
    paramsType: PlutusDataType = "Mesh",
  ): this {
    const cbor = applyParamsToScript(compiledCode, params, paramsType);
    const hash = resolveScriptHash(cbor, this.version);
    this.address = serializeRewardAddress(
      hash,
      this.isStakeScriptCredential,
      this.networkId as 0 | 1,
    );
    this.hash = hash;
    this.cbor = cbor;
    return this;
  }

  /**
   * Initialize the withdrawal blueprint, with no parameters
   * @param compiledCode The raw script CborHex from blueprint.
   * @returns The withdrawal blueprint object
   */
  noParamScript(compiledCode: string): this {
    return this.paramScript(compiledCode, []);
  }
}
