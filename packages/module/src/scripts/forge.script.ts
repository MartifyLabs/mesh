import { csl } from '../core/index.js';
import {
  buildScriptPubkey,
  deserializeEd25519KeyHash,
  resolvePaymentKeyHash,
  toNativeScript,
} from '../common/utils/index.js';
import type { NativeScript } from '../common/types/index.js';

export class ForgeScript {
  static withOneSignature(address: string): string {
    const keyHash = deserializeEd25519KeyHash(resolvePaymentKeyHash(address));
    return buildScriptPubkey(keyHash).to_hex();
  }

  static withAtLeastNSignatures(
    addresses: string[],
    minimumRequired: number
  ): string {
    const nativeScripts = csl.NativeScripts.new();

    addresses.forEach((address) => {
      const keyHash = deserializeEd25519KeyHash(resolvePaymentKeyHash(address));
      nativeScripts.add(buildScriptPubkey(keyHash));
    });

    const scriptNOfK = csl.ScriptNOfK.new(minimumRequired, nativeScripts);
    return csl.NativeScript.new_script_any(scriptNOfK).to_hex();
  }

  static withAnySignature(addresses: string[]): string {
    const nativeScripts = csl.NativeScripts.new();

    addresses.forEach((address) => {
      const keyHash = deserializeEd25519KeyHash(resolvePaymentKeyHash(address));
      nativeScripts.add(buildScriptPubkey(keyHash));
    });

    const scriptAny = csl.ScriptAny.new(nativeScripts);
    return csl.NativeScript.new_script_any(scriptAny).to_hex();
  }

  static withAllSignatures(addresses: string[]): string {
    const nativeScripts = csl.NativeScripts.new();

    addresses.forEach((address) => {
      const keyHash = deserializeEd25519KeyHash(resolvePaymentKeyHash(address));
      nativeScripts.add(buildScriptPubkey(keyHash));
    });

    const scriptAll = csl.ScriptAll.new(nativeScripts);
    return csl.NativeScript.new_script_any(scriptAll).to_hex();
  }

  static fromNativeScript(script: NativeScript): string {
    return toNativeScript(script).to_hex();
  }
}
