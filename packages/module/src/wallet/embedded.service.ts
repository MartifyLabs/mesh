import { generateMnemonic, mnemonicToEntropy } from 'bip39';
import { customAlphabet } from 'nanoid';
import { csl, deriveAccountKeys, signMessage } from '../core/index.js';
import {
  buildBaseAddress,
  buildBip32PrivateKey,
  buildRewardAddress,
  buildEnterpriseAddress,
  deserializeTx,
  deserializeTxHash,
  fromBytes,
  fromUTF8,
  resolveTxHash,
} from '../common/utils/index.js';
import type {
  Address,
  Certificates,
  Ed25519KeyHashes,
  Message,
  NativeScripts,
  PrivateKey,
  Signer,
  TransactionBody,
  TransactionInputs,
  TransactionWitnessSet,
  Vkeywitnesses,
  Withdrawals,
} from '../core/index.js';
import type { Account, DataSignature, UTxO } from '../common/types/index.js';

export class EmbeddedWallet {
  constructor(
    private readonly _networkId: number,
    private readonly _encryptedSecret: string | [string, string]
  ) {}

  getAccount(accountIndex: number, password: string): Account {
    return this.accountContext(
      accountIndex,
      password,
      (paymentKey, stakeKey) => {
        const baseAddress = buildBaseAddress(
          this._networkId,
          paymentKey.to_public().hash(),
          stakeKey.to_public().hash()
        )
          .to_address()
          .to_bech32();

        const enterpriseAddress = buildEnterpriseAddress(
          this._networkId,
          paymentKey.to_public().hash()
        )
          .to_address()
          .to_bech32();

        const rewardAddress = buildRewardAddress(
          this._networkId,
          stakeKey.to_public().hash()
        )
          .to_address()
          .to_bech32();

        return <Account>{
          baseAddress,
          enterpriseAddress,
          rewardAddress,
        };
      }
    );
  }

  signData(
    accountIndex: number,
    password: string,
    address: string,
    payload: string
  ): DataSignature {
    try {
      return this.accountContext(
        accountIndex,
        password,
        (paymentKey, stakeKey) => {
          const message: Message = { payload };

          const signer: Signer = {
            address: EmbeddedWallet.resolveAddress(
              this._networkId,
              address,
              paymentKey,
              stakeKey
            ),
            key: address.startsWith('stake') ? stakeKey : paymentKey,
          };

          const { coseSign1: signature, coseKey: key } = signMessage(
            message,
            signer
          );

          return <DataSignature>{ signature, key };
        }
      );
    } catch (error) {
      throw new Error(`An error occurred during signData: ${error}.`);
    }
  }

  signTx(
    accountIndex: number,
    password: string,
    utxos: UTxO[],
    unsignedTx: string,
    partialSign: boolean
  ): Vkeywitnesses {
    try {
      const txHash = deserializeTxHash(resolveTxHash(unsignedTx));

      return this.accountContext(
        accountIndex,
        password,
        (paymentKey, stakeKey) => {
          const signatures = csl.Vkeywitnesses.new();
          const signers = EmbeddedWallet.resolveSigners(
            unsignedTx,
            utxos,
            paymentKey.to_public().hash().to_hex()
          );

          signers.forEach((tkh: string) => {
            if (tkh === paymentKey.to_public().hash().to_hex()) {
              signatures.add(csl.make_vkey_witness(txHash, paymentKey));
            } else if (tkh === stakeKey.to_public().hash().to_hex()) {
              signatures.add(csl.make_vkey_witness(txHash, stakeKey));
            } else if (partialSign === false) {
              throw new Error(`Missing key witness for: ${tkh}`);
            }
          });

          return signatures;
        }
      );
    } catch (error) {
      throw new Error(`An error occurred during signTx: ${error}.`);
    }
  }

  static encryptMnemonic(words: string[], password: string): string {
    const entropy = mnemonicToEntropy(words.join(' '));
    const bip32PrivateKey = buildBip32PrivateKey(entropy);
    const cborBip32PrivateKey = fromBytes(bip32PrivateKey.as_bytes());

    bip32PrivateKey.free();

    return EmbeddedWallet.encrypt(cborBip32PrivateKey, password);
  }

  static encryptPrivateKey(bech32: string, password: string): string {
    const bip32PrivateKey = csl.Bip32PrivateKey.from_bech32(bech32);
    const cborBip32PrivateKey = fromBytes(bip32PrivateKey.as_bytes());

    bip32PrivateKey.free();

    return EmbeddedWallet.encrypt(cborBip32PrivateKey, password);
  }

  static encryptSigningKeys(
    cborPaymentKey: string,
    cborStakeKey: string,
    password: string
  ): [string, string] {
    const encryptedPaymentKey = EmbeddedWallet.encrypt(
      cborPaymentKey.slice(4),
      password
    );

    const encryptedStakeKey = EmbeddedWallet.encrypt(
      cborStakeKey.slice(4),
      password
    );

    return [encryptedPaymentKey, encryptedStakeKey];
  }

  static generateMnemonic(strength = 256): string[] {
    const mnemonic = generateMnemonic(strength);
    return mnemonic.split(' ');
  }

  private accountContext<T>(
    accountIndex: number,
    password: string,
    callback: (paymentKey: PrivateKey, stakeKey: PrivateKey) => T
  ): T {
    const { paymentKey, stakeKey } = EmbeddedWallet.resolveKeys(
      accountIndex,
      password,
      this._encryptedSecret
    );

    const result = callback(paymentKey, stakeKey);

    paymentKey.free();
    stakeKey.free();

    return result;
  }

  private static decrypt(data: string, password: string): string {
    try {
      return csl.decrypt_with_password(fromUTF8(password), data);
    } catch (error) {
      throw new Error('The password is incorrect.');
    }
  }

  private static encrypt(data: string, password: string): string {
    const generateRandomHex = customAlphabet('0123456789abcdef');
    const salt = generateRandomHex(64);
    const nonce = generateRandomHex(24);
    return csl.encrypt_with_password(fromUTF8(password), salt, nonce, data);
  }

  private static resolveAddress(
    networkId: number,
    bech32: string,
    payment: PrivateKey,
    stake: PrivateKey
  ): Address {
    const address = [
      buildBaseAddress(
        networkId,
        payment.to_public().hash(),
        stake.to_public().hash()
      ),
      buildEnterpriseAddress(networkId, payment.to_public().hash()),
      buildRewardAddress(networkId, stake.to_public().hash()),
    ].find((a) => a.to_address().to_bech32() === bech32);

    if (address !== undefined) return address.to_address();

    throw new Error(`Address: ${bech32} doesn't belong to this account.`);
  }

  private static resolveKeys(
    accountIndex: number,
    password: string,
    encryptedSecret: string | [string, string]
  ): { paymentKey: PrivateKey; stakeKey: PrivateKey } {
    if (typeof encryptedSecret === 'string') {
      const rootKey = EmbeddedWallet.decrypt(encryptedSecret, password);

      return deriveAccountKeys(rootKey, accountIndex);
    }

    const cborPaymentKey = EmbeddedWallet.decrypt(encryptedSecret[0], password);

    const cborStakeKey = EmbeddedWallet.decrypt(encryptedSecret[1], password);

    return {
      paymentKey: csl.PrivateKey.from_hex(cborPaymentKey),
      stakeKey: csl.PrivateKey.from_hex(cborStakeKey),
    };
  }

  private static resolveSigners(
    cborTx: string,
    utxos: UTxO[],
    paymentKeyHash: string
  ): Set<string> {
    const resolveTxBodySigners = (txBody: TransactionBody) => {
      const resolveCertificatesSigners = (
        certificates: Certificates | undefined,
        signers: string[] = [],
        index = 0
      ): string[] => {
        if (certificates === undefined || index >= certificates.len())
          return signers;

        const c = certificates.get(index);
        const cSigners = new Array<string>();
        switch (c.kind()) {
          case csl.CertificateKind.StakeDeregistration: {
            const credential = c.as_stake_deregistration()?.stake_credential();
            const keyHash =
              credential?.kind() === csl.StakeCredKind.Key
                ? credential.to_keyhash()
                : undefined;

            if (keyHash) cSigners.push(keyHash.to_hex());
            break;
          }
          case csl.CertificateKind.StakeDelegation: {
            const credential = c.as_stake_delegation()?.stake_credential();
            const keyHash =
              credential?.kind() === csl.StakeCredKind.Key
                ? credential.to_keyhash()
                : undefined;

            if (keyHash) cSigners.push(keyHash.to_hex());
            break;
          }
          case csl.CertificateKind.PoolRegistration: {
            const poolOwners = c
              .as_pool_registration()
              ?.pool_params()
              .pool_owners();

            cSigners.push(...resolveRequiredSigners(poolOwners));
            break;
          }
          case csl.CertificateKind.PoolRetirement: {
            const poolKeyhash = c.as_pool_retirement()?.pool_keyhash();

            if (poolKeyhash) cSigners.push(poolKeyhash.to_hex());
            break;
          }
          case csl.CertificateKind.MoveInstantaneousRewardsCert: {
            const credentials = c
              .as_move_instantaneous_rewards_cert()
              ?.move_instantaneous_reward()
              .as_to_stake_creds();

            if (credentials) {
              for (let index = 0; index < credentials.len(); index += 1) {
                const credential = credentials.keys().get(index);
                const keyHash =
                  credential.kind() === csl.StakeCredKind.Key
                    ? credential.to_keyhash()
                    : undefined;

                if (keyHash) cSigners.push(keyHash.to_hex());
              }
            }
            break;
          }
        }

        return resolveCertificatesSigners(
          certificates,
          [...signers, ...cSigners],
          index + 1
        );
      };

      const resolveTxInputsSigners = (
        inputs: TransactionInputs | undefined,
        signers: string[] = [],
        index = 0
      ): string[] => {
        if (inputs === undefined || index >= inputs.len()) return signers;

        const inputIndex = inputs.get(index).index();
        const inputHash = inputs.get(index).transaction_id();

        const signer =
          utxos.find(
            (u) =>
              u.input.outputIndex === inputIndex &&
              u.input.txHash === inputHash.to_hex()
          ) !== undefined
            ? paymentKeyHash
            : 'OUR_PRINCESS_IS_IN_ANOTHER_CASTLE';

        return resolveTxInputsSigners(inputs, [...signers, signer], index + 1);
      };

      const resolveRequiredSigners = (
        keyHashes: Ed25519KeyHashes | undefined,
        signers: string[] = [],
        index = 0
      ): string[] => {
        if (keyHashes === undefined || index >= keyHashes.len()) return signers;

        return resolveRequiredSigners(
          keyHashes,
          [...signers, keyHashes.get(index).to_hex()],
          index + 1
        );
      };

      const resolveWithdrawalsSigners = (
        withdrawals: Withdrawals | undefined,
        signers: string[] = [],
        index = 0
      ): string[] => {
        if (withdrawals === undefined || index >= withdrawals.len())
          return signers;

        const credential = withdrawals.keys().get(index).payment_cred();
        const keyHash =
          credential.kind() === csl.StakeCredKind.Key
            ? credential.to_keyhash()
            : undefined;

        return resolveWithdrawalsSigners(
          withdrawals,
          keyHash ? [...signers, keyHash.to_hex()] : signers,
          index + 1
        );
      };

      const certificates = txBody.certs();
      const collateral = txBody.collateral();
      const inputs = txBody.inputs();
      const requiredSigners = txBody.required_signers();
      const withdrawals = txBody.withdrawals();

      return [
        ...resolveCertificatesSigners(certificates),
        ...resolveTxInputsSigners(collateral),
        ...resolveTxInputsSigners(inputs),
        ...resolveRequiredSigners(requiredSigners),
        ...resolveWithdrawalsSigners(withdrawals),
      ];
    };

    const resolveTxWitnessSetSigners = (
      txWitnessSet: TransactionWitnessSet
    ) => {
      const resolveNativeScriptsSigners = (
        scripts: NativeScripts | undefined,
        signers: string[] = []
      ): string[] => {
        if (scripts) {
          for (let index = 0; index < scripts.len(); index += 1) {
            const ns = scripts.get(index);
            switch (ns.kind()) {
              case csl.NativeScriptKind.ScriptPubkey: {
                const keyHash = ns.as_script_pubkey()?.addr_keyhash().to_hex();
                return keyHash ? [...signers, keyHash] : signers;
              }
              case csl.NativeScriptKind.ScriptAll:
                return resolveNativeScriptsSigners(
                  ns.as_script_all()?.native_scripts(),
                  signers
                );
              case csl.NativeScriptKind.ScriptAny:
                return resolveNativeScriptsSigners(
                  ns.as_script_any()?.native_scripts(),
                  signers
                );
              case csl.NativeScriptKind.ScriptNOfK:
                return resolveNativeScriptsSigners(
                  ns.as_script_n_of_k()?.native_scripts(),
                  signers
                );
            }
          }
        }
        return signers;
      };

      const nativeScripts = txWitnessSet.native_scripts();

      return [...resolveNativeScriptsSigners(nativeScripts)];
    };

    const tx = deserializeTx(cborTx);

    return new Set<string>([
      ...resolveTxBodySigners(tx.body()),
      ...resolveTxWitnessSetSigners(tx.witness_set()),
    ]);
  }
}
