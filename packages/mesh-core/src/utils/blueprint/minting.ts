import {
  IMintingBlueprint,
  LanguageVersion,
  PlutusDataType,
} from "@meshsdk/common";

import { applyParamsToScript } from "../..";
import { resolveScriptHash } from "../resolver";

/**
 * Minting blueprint
 * @category Blueprint
 * @implements IMintingBlueprint
 * @class
 * @example
 *
 * const blueprint = new MintingBlueprint("V3");
 * blueprint.paramScript("84xxxxxx", ["params"], "Mesh");
 *
 * const policyId = blueprint.hash;
 * const scriptCbor = blueprint.cbor;
 */
export class MintingBlueprint implements IMintingBlueprint {
  version: LanguageVersion;
  cbor: string;
  hash: string;

  constructor(version: LanguageVersion) {
    this.version = version;
    this.cbor = "";
    this.hash = "";
  }

  /**
   * Initialize the minting blueprint, with the same parameters to `applyParamsToScript`
   * @param compiledCode The raw script CborHex from blueprint.
   * @param params The parameters to apply, in an array.
   * @param paramsType The type of the parameters, default to be Mesh's Data type. It could also be in JSON and raw CBOR.
   * @returns The minting blueprint object
   */
  paramScript(
    compiledCode: string,
    params: string[],
    paramsType: PlutusDataType = "Mesh",
  ): this {
    const cbor = applyParamsToScript(compiledCode, params, paramsType);
    const hash = resolveScriptHash(cbor, this.version);
    this.hash = hash;
    this.cbor = cbor;
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
