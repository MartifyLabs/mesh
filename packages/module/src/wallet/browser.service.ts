import { csl } from '../core/index.js';
import {
  DEFAULT_PROTOCOL_PARAMETERS,
  POLICY_ID_LENGTH,
  SUPPORTED_WALLETS,
} from '../common/constants.js';
import { IInitiator, ISigner, ISubmitter } from '../common/contracts/index.js';
import { mergeSignatures } from '../common/helpers/index.js';
import {
  deserializeAddress,
  deserializeTx,
  deserializeTxWitnessSet,
  deserializeTxUnspentOutput,
  deserializeValue,
  fromBytes,
  fromTxUnspentOutput,
  fromUTF8,
  fromValue,
  resolveFingerprint,
  toAddress,
  toUTF8,
  toValue,
} from '../common/utils/index.js';
import type { Address, TransactionUnspentOutput } from '../core/index.js';
import type {
  Asset,
  AssetExtended,
  DataSignature,
  UTxO,
  Wallet,
} from '../common/types/index.js';

/**
 * These wallets APIs are in accordance to CIP-30, which defines the API for dApps to communicate with the user's wallet. Additional utility functions provided for developers that are useful for building dApps.
 *
 * ```javascript
 * // import BrowserWallet
 * import { BrowserWallet } from '@meshsdk/core';
 *
 * // connect to a wallet
 * const wallet = await BrowserWallet.enable('eternl');
 *
 * // get assets in wallet
 * const assets = await wallet.getAssets();
 * ```
 */
export class BrowserWallet implements IInitiator, ISigner, ISubmitter {
  walletInstance: WalletInstance;

  private constructor(
    readonly _walletInstance: WalletInstance,
    readonly _walletName: string
  ) {
    this.walletInstance = { ..._walletInstance };
  }

  /**
   * Returns a list of wallets installed on user's device. Each wallet is an object with the following properties:
   * - A name is provided to display wallet's name on the user interface.
   * - A version is provided to display wallet's version on the user interface.
   * - An icon is provided to display wallet's icon on the user interface.
   *
   * @returns a list of wallet names
   */
  static getInstalledWallets(): Wallet[] {
    if (window.cardano === undefined) return [];

    return SUPPORTED_WALLETS.filter(
      (sw) => window.cardano[sw] !== undefined
    ).map((sw) => ({
      name: window.cardano[sw].name,
      icon: window.cardano[sw].icon,
      version: window.cardano[sw].apiVersion,
    }));
  }

  /**
   * This is the entrypoint to start communication with the user's wallet. The wallet should request the user's permission to connect the web page to the user's wallet, and if permission has been granted, the wallet will be returned and exposing the full API for the dApp to use.
   *
   * Query BrowserWallet.getInstalledWallets() to get a list of available wallets, then provide the wallet name for which wallet the user would like to connect with.
   *
   * @param walletName
   * @returns WalletInstance
   */
  static async enable(walletName: string): Promise<BrowserWallet> {
    try {
      const walletInstance = await BrowserWallet.resolveInstance(walletName);

      if (walletInstance !== undefined)
        return new BrowserWallet(walletInstance, walletName);

      throw new Error(`Couldn't create an instance of wallet: ${walletName}`);
    } catch (error) {
      throw new Error(
        `[BrowserWallet] An error occurred during enable: ${JSON.stringify(
          error
        )}.`
      );
    }
  }

  /**
   * Returns a list of assets in the wallet. This API will return every assets in the wallet. Each asset is an object with the following properties:
   * - A unit is provided to display asset's name on the user interface.
   * - A quantity is provided to display asset's quantity on the user interface.
   *
   * @returns a list of assets and their quantities
   */
  async getBalance(): Promise<Asset[]> {
    const balance = await this._walletInstance.getBalance();
    return fromValue(deserializeValue(balance));
  }

  /**
   * Returns an address owned by the wallet that should be used as a change address to return leftover assets during transaction creation back to the connected wallet.
   *
   * @returns an address
   */
  async getChangeAddress(): Promise<string> {
    const changeAddress = await this._walletInstance.getChangeAddress();
    return deserializeAddress(changeAddress).to_bech32();
  }

  /**
   * This function shall return a list of one or more UTXOs (unspent transaction outputs) controlled by the wallet that are required to reach AT LEAST the combined ADA value target specified in amount AND the best suitable to be used as collateral inputs for transactions with plutus script inputs (pure ADA-only UTXOs).
   *
   * If this cannot be attained, an error message with an explanation of the blocking problem shall be returned. NOTE: wallets are free to return UTXOs that add up to a greater total ADA value than requested in the amount parameter, but wallets must never return any result where UTXOs would sum up to a smaller total ADA value, instead in a case like that an error message must be returned.
   *
   * @param limit
   * @returns a list of UTXOs
   */
  async getCollateral(
    limit = DEFAULT_PROTOCOL_PARAMETERS.maxCollateralInputs
  ): Promise<UTxO[]> {
    const deserializedCollateral = await this.getUsedCollateral(limit);
    return deserializedCollateral.map((dc) => fromTxUnspentOutput(dc));
  }

  /**
   * Returns the network ID of the currently connected account. 0 is testnet and 1 is mainnet but other networks can possibly be returned by wallets. Those other network ID values are not governed by CIP-30. This result will stay the same unless the connected account has changed.
   *
   * @returns network ID
   */
  getNetworkId(): Promise<number> {
    return this._walletInstance.getNetworkId();
  }

  /**
   * Returns a list of reward addresses owned by the wallet. A reward address is a stake address that is used to receive rewards from staking, generally starts from `stake` prefix.
   *
   * @returns a list of reward addresses
   */
  async getRewardAddresses(): Promise<string[]> {
    const rewardAddresses = await this._walletInstance.getRewardAddresses();
    return rewardAddresses.map((ra) => deserializeAddress(ra).to_bech32());
  }

  /**
   * Returns a list of unused addresses controlled by the wallet.
   *
   * @returns a list of unused addresses
   */
  async getUnusedAddresses(): Promise<string[]> {
    const unusedAddresses = await this._walletInstance.getUnusedAddresses();
    return unusedAddresses.map((una) => deserializeAddress(una).to_bech32());
  }

  /**
   * Returns a list of used addresses controlled by the wallet.
   *
   * @returns a list of used addresses
   */
  async getUsedAddresses(): Promise<string[]> {
    const usedAddresses = await this._walletInstance.getUsedAddresses();
    return usedAddresses.map((usa) => deserializeAddress(usa).to_bech32());
  }

  /**
   * Return a list of all UTXOs (unspent transaction outputs) controlled by the wallet.
   *
   * @param amount
   * @returns a list of UTXOs
   */
  async getUtxos(amount: Asset[] | undefined = undefined): Promise<UTxO[]> {
    const deserializedUTxOs = await this.getUsedUTxOs(amount);
    return deserializedUTxOs.map((du) => fromTxUnspentOutput(du));
  }

  /**
   * This endpoint utilizes the [CIP-8 - Message Signing](https://github.com/cardano-foundation/CIPs/tree/master/CIP-0030) to sign arbitrary data, to verify the data was signed by the owner of the private key.
   *
   * Here, we get the first wallet's address with wallet.getUsedAddresses(), alternativelly you can use reward addresses (getRewardAddresses()) too. It's really up to you as the developer which address you want to use in your application.
   *
   * @param address
   * @param payload
   * @returns a signature
   */
  signData(address: string, payload: string): Promise<DataSignature> {
    const signerAddress = toAddress(address).to_hex();
    return this._walletInstance.signData(signerAddress, fromUTF8(payload));
  }

  /**
   * Requests user to sign the provided transaction (tx). The wallet should ask the user for permission, and if given, try to sign the supplied body and return a signed transaction. partialSign should be true if the transaction provided requires multiple signatures.
   *
   * @param unsignedTx
   * @param partialSign
   * @returns a signed transaction in CBOR
   */
  async signTx(unsignedTx: string, partialSign = false): Promise<string> {
    try {
      const tx = deserializeTx(unsignedTx);
      const txWitnessSet = tx.witness_set();

      const newWitnessSet = await this._walletInstance.signTx(
        unsignedTx,
        partialSign
      );

      const newSignatures =
        deserializeTxWitnessSet(newWitnessSet).vkeys() ??
        csl.Vkeywitnesses.new();

      const txSignatures = mergeSignatures(txWitnessSet, newSignatures);

      txWitnessSet.set_vkeys(txSignatures);

      const signedTx = fromBytes(
        csl.Transaction.new(
          tx.body(),
          txWitnessSet,
          tx.auxiliary_data()
        ).to_bytes()
      );

      return signedTx;
    } catch (error) {
      throw new Error(
        `[BrowserWallet] An error occurred during signTx: ${JSON.stringify(
          error
        )}.`
      );
    }
  }

  /**
   * Experimental feature - sign multiple transactions at once (Supported wallet(s): Typhon)
   *
   * @param unsignedTxs - array of unsigned transactions in CborHex string
   * @param partialSign - if the transactions are signed partially
   * @returns array of signed transactions CborHex string
   */
  async signTxs(unsignedTxs: string[], partialSign = false): Promise<string[]> {
    let witnessSets: string[] | undefined = undefined;
    // Hardcoded behavior customized for different wallet for now as there is no standard confirmed
    switch (this._walletName) {
      case 'Typhon Wallet':
        if (this._walletInstance.signTxs) {
          witnessSets = await this._walletInstance.signTxs(
            unsignedTxs,
            partialSign
          );
        }
        break;
      default:
        if (this._walletInstance.signTxs) {
          witnessSets = await this._walletInstance.signTxs(
            unsignedTxs.map((cbor) => ({
              cbor,
              partialSign,
            }))
          );
        } else if (this._walletInstance.experimental.signTxs) {
          witnessSets = await this._walletInstance.experimental.signTxs(
            unsignedTxs.map((cbor) => ({
              cbor,
              partialSign,
            }))
          );
        }
        break;
    }

    if (!witnessSets) throw new Error('Wallet does not support signTxs');

    const signedTxs: string[] = [];
    for (let i = 0; i < witnessSets.length; i++) {
      const tx = deserializeTx(unsignedTxs[i]);
      const txWitnessSet = tx.witness_set();

      const newSignatures =
        deserializeTxWitnessSet(witnessSets[i]).vkeys() ??
        csl.Vkeywitnesses.new();

      const txSignatures = mergeSignatures(txWitnessSet, newSignatures);

      txWitnessSet.set_vkeys(txSignatures);

      const signedTx = fromBytes(
        csl.Transaction.new(
          tx.body(),
          txWitnessSet,
          tx.auxiliary_data()
        ).to_bytes()
      );

      signedTxs.push(signedTx);
    }
    return signedTxs;
  }

  /**
   * Submits the signed transaction to the blockchain network.
   *
   * As wallets should already have this ability to submit transaction, we allow dApps to request that a transaction be sent through it. If the wallet accepts the transaction and tries to send it, it shall return the transaction ID for the dApp to track. The wallet can return error messages or failure if there was an error in sending it.
   *
   * @param tx
   * @returns a transaction hash
   */
  submitTx(tx: string): Promise<string> {
    return this._walletInstance.submitTx(tx);
  }

  /**
   * Get a used address of type Address from the wallet.
   *
   * This is used in transaction building.
   *
   * @returns an Address object
   */
  async getUsedAddress(): Promise<Address> {
    const usedAddresses = await this._walletInstance.getUsedAddresses();
    return deserializeAddress(usedAddresses[0]);
  }

  /**
   * Get a list of UTXOs to be used as collateral inputs for transactions with plutus script inputs.
   *
   * This is used in transaction building.
   *
   * @returns a list of UTXOs
   */
  async getUsedCollateral(
    limit = DEFAULT_PROTOCOL_PARAMETERS.maxCollateralInputs
  ): Promise<TransactionUnspentOutput[]> {
    const collateral =
      (await this._walletInstance.experimental.getCollateral()) ?? [];
    return collateral.map((c) => deserializeTxUnspentOutput(c)).slice(0, limit);
  }

  /**
   * Get a list of UTXOs to be used for transaction building.
   *
   * This is used in transaction building.
   *
   * @returns a list of UTXOs
   */
  async getUsedUTxOs(
    amount: Asset[] | undefined = undefined
  ): Promise<TransactionUnspentOutput[]> {
    const valueCBOR = amount ? toValue(amount).to_hex() : undefined;
    const utxos = (await this._walletInstance.getUtxos(valueCBOR)) ?? [];
    return utxos.map((u) => deserializeTxUnspentOutput(u));
  }

  /**
   * A helper function to get the assets in the wallet.
   *
   * @returns a list of assets
   */
  async getAssets(): Promise<AssetExtended[]> {
    const balance = await this.getBalance();
    return balance
      .filter((v) => v.unit !== 'lovelace')
      .map((v) => {
        const policyId = v.unit.slice(0, POLICY_ID_LENGTH);
        const assetName = v.unit.slice(POLICY_ID_LENGTH);
        const fingerprint = resolveFingerprint(policyId, assetName);

        return {
          unit: v.unit,
          policyId,
          assetName: toUTF8(assetName),
          fingerprint,
          quantity: v.quantity,
        };
      });
  }

  /**
   * A helper function to get the lovelace balance in the wallet.
   *
   * @returns lovelace balance
   */
  async getLovelace(): Promise<string> {
    const balance = await this.getBalance();
    const nativeAsset = balance.find((v) => v.unit === 'lovelace');

    return nativeAsset !== undefined ? nativeAsset.quantity : '0';
  }

  /**
   * A helper function to get the assets of a specific policy ID in the wallet.
   *
   * @param policyId
   * @returns a list of assets
   */
  async getPolicyIdAssets(policyId: string): Promise<AssetExtended[]> {
    const assets = await this.getAssets();
    return assets.filter((v) => v.policyId === policyId);
  }

  /**
   * A helper function to get the policy IDs of all the assets in the wallet.
   *
   * @returns a list of policy IDs
   */
  async getPolicyIds(): Promise<string[]> {
    const balance = await this.getBalance();
    return Array.from(
      new Set(balance.map((v) => v.unit.slice(0, POLICY_ID_LENGTH)))
    ).filter((p) => p !== 'lovelace');
  }

  private static resolveInstance(walletName: string) {
    if (window.cardano === undefined) return undefined;

    const wallet = SUPPORTED_WALLETS.map((sw) => window.cardano[sw])
      .filter((sw) => sw !== undefined)
      .find((sw) => sw.name.toLowerCase() === walletName.toLowerCase());

    return wallet?.enable();
  }
}

declare global {
  interface Window {
    cardano: Cardano;
  }
}

type Cardano = {
  [key: string]: {
    name: string;
    icon: string;
    apiVersion: string;
    enable: () => Promise<WalletInstance>;
  };
};

type TransactionSignatureRequest = {
  cbor: string;
  partialSign: boolean;
};

type WalletInstance = {
  experimental: ExperimentalFeatures;
  getBalance(): Promise<string>;
  getChangeAddress(): Promise<string>;
  getNetworkId(): Promise<number>;
  getRewardAddresses(): Promise<string[]>;
  getUnusedAddresses(): Promise<string[]>;
  getUsedAddresses(): Promise<string[]>;
  getUtxos(amount: string | undefined): Promise<string[] | undefined>;
  signData(address: string, payload: string): Promise<DataSignature>;
  signTx(tx: string, partialSign: boolean): Promise<string>;
  signTxs?(txs: TransactionSignatureRequest[]): Promise<string[]>; // Overloading interface as currently no standard
  signTxs?(txs: string[], partialSign: boolean): Promise<string[]>; // Overloading interface as currently no standard
  submitTx(tx: string): Promise<string>;
};

type ExperimentalFeatures = {
  getCollateral(): Promise<string[] | undefined>;
  signTxs?(txs: TransactionSignatureRequest[]): Promise<string[]>; // Overloading interface as currently no standard
  signTxs?(txs: string[], partialSign: boolean): Promise<string[]>; // Overloading interface as currently no standard
};
