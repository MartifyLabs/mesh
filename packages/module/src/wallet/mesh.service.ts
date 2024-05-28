import {
  IFetcher,
  IInitiator,
  ISigner,
  ISubmitter,
} from '../common/contracts/index.js';
import { AppWallet } from './app.service.js';
import type { Address, TransactionUnspentOutput } from '../core/index.js';
import type {
  Asset,
  AssetExtended,
  DataSignature,
  UTxO,
} from '../common/types/index.js';
import {
  fromTxUnspentOutput,
  toUTF8,
  resolveFingerprint,
  toTxUnspentOutput,
  resolvePrivateKey,
} from '../common/utils/index.js';
import { POLICY_ID_LENGTH } from '../common/constants.js';
import { EmbeddedWallet, Transaction } from '../index.js';

export type CreateMeshWalletOptions = {
  networkId: number;
  fetcher: IFetcher;
  submitter: ISubmitter;
  key:
    | {
        type: 'root';
        bech32: string;
      }
    | {
        type: 'cli';
        payment: string;
        stake?: string;
      }
    | {
        type: 'mnemonic';
        words: string[];
      };
};

/**
 * Mesh Wallet provides a set of APIs to interact with the blockchain. This wallet is compatible with Mesh transaction builders.
 *
 * It is a single address wallet, a wrapper around the AppWallet class.
 *
 * ```javascript
 * import { MeshWallet, BlockfrostProvider } from '@meshsdk/core';
 *
 * const blockchainProvider = new BlockfrostProvider('<BLOCKFROST_API_KEY>');
 *
 * const wallet = new MeshWallet({
 *   networkId: 0,
 *   fetcher: blockchainProvider,
 *   submitter: blockchainProvider,
 *   key: {
 *     type: 'mnemonic',
 *     words: ["solution","solution","solution","solution","solution","solution","solution","solution","solution","solution","solution","solution","solution","solution","solution","solution","solution","solution","solution","solution","solution","solution","solution","solution"],
 *   },
 * });
 * ```
 */
export class MeshWallet implements IInitiator, ISigner, ISubmitter {
  private readonly _wallet: AppWallet;
  private readonly _network: number;

  constructor(options: CreateMeshWalletOptions) {
    this._network = options.networkId;

    switch (options.key.type) {
      case 'root':
        this._wallet = new AppWallet({
          networkId: options.networkId,
          fetcher: options.fetcher,
          submitter: options.submitter,
          key: {
            type: 'root',
            bech32: options.key.bech32,
          },
        });
        break;
      case 'cli':
        this._wallet = new AppWallet({
          networkId: options.networkId,
          fetcher: options.fetcher,
          submitter: options.submitter,
          key: {
            type: 'cli',
            payment: options.key.payment,
          },
        });
        break;
      case 'mnemonic':
        this._wallet = new AppWallet({
          networkId: options.networkId,
          fetcher: options.fetcher,
          submitter: options.submitter,
          key: {
            type: 'mnemonic',
            words: options.key.words,
          },
        });
        break;
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
    const utxos = await this.getUtxos();

    const assets = new Map<string, number>();
    utxos.map((utxo) => {
      utxo.output.amount.map((asset) => {
        const assetId = asset.unit;
        const amount = Number(asset.quantity);
        if (assets.has(assetId)) {
          const quantity = assets.get(assetId)!;
          assets.set(assetId, quantity + amount);
        } else {
          assets.set(assetId, amount);
        }
      });
    });

    const arrayAssets: Asset[] = Array.from(assets, ([unit, quantity]) => ({
      unit,
      quantity: quantity.toString(),
    }));

    return arrayAssets;
  }

  /**
   * Returns an address owned by the wallet that should be used as a change address to return leftover assets during transaction creation back to the connected wallet.
   *
   * @returns an address
   */
  getChangeAddress(): string {
    return this._wallet.getPaymentAddress();
  }

  /**
   * This function shall return a list of one or more UTXOs (unspent transaction outputs) controlled by the wallet that are required to reach AT LEAST the combined ADA value target specified in amount AND the best suitable to be used as collateral inputs for transactions with plutus script inputs (pure ADA-only UTXOs).
   *
   * If this cannot be attained, an error message with an explanation of the blocking problem shall be returned. NOTE: wallets are free to return UTXOs that add up to a greater total ADA value than requested in the amount parameter, but wallets must never return any result where UTXOs would sum up to a smaller total ADA value, instead in a case like that an error message must be returned.
   *
   * @returns a list of UTXOs
   */

  async getCollateral(): Promise<UTxO[]> {
    const utxos = await this.getUtxos();

    // find utxos that are pure ADA-only
    const pureAdaUtxos = utxos.filter((utxo) => {
      return (
        utxo.output.amount.length === 1 &&
        utxo.output.amount[0].unit === 'lovelace'
      );
    });

    // sort utxos by their lovelace amount
    pureAdaUtxos.sort((a, b) => {
      return (
        Number(a.output.amount[0].quantity) -
        Number(b.output.amount[0].quantity)
      );
    });

    // return the smallest utxo but not less than 5000000 lovelace
    for (const utxo of pureAdaUtxos) {
      if (Number(utxo.output.amount[0].quantity) >= 5000000) {
        return [utxo];
      }
    }

    return [];
  }

  /**
   * Returns the network ID of the currently connected account. 0 is testnet and 1 is mainnet but other networks can possibly be returned by wallets. Those other network ID values are not governed by CIP-30. This result will stay the same unless the connected account has changed.
   *
   * @returns network ID
   */
  getNetworkId(): number {
    return this._network;
  }

  /**
   * Returns a list of reward addresses owned by the wallet. A reward address is a stake address that is used to receive rewards from staking, generally starts from `stake` prefix.
   *
   * @returns a list of reward addresses
   */
  async getRewardAddresses(): Promise<string[]> {
    return [await this._wallet.getRewardAddress()];
  }

  /**
   * Returns a list of unused addresses controlled by the wallet.
   *
   * @returns a list of unused addresses
   */
  getUnusedAddresses(): string[] {
    // todo hinson: shall we do this? used and unused addresses are the same same change address?
    return [this.getChangeAddress()];
  }

  /**
   * Returns a list of used addresses controlled by the wallet.
   *
   * @returns a list of used addresses
   */
  async getUsedAddresses(): Promise<string[]> {
    // todo hinson: shall we do this? used and unused addresses are the same same change address?
    return [this.getChangeAddress()];
  }

  /**
   * Return a list of all UTXOs (unspent transaction outputs) controlled by the wallet.
   *
   * @returns a list of UTXOs
   */
  async getUtxos(): Promise<UTxO[]> {
    const utxos = await this.getUsedUTxOs();
    return utxos.map((c) => fromTxUnspentOutput(c));
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
  signData(payload: string): DataSignature {
    return this._wallet.signData(this.getChangeAddress(), payload);
  }

  /**
   * Requests user to sign the provided transaction (tx). The wallet should ask the user for permission, and if given, try to sign the supplied body and return a signed transaction. partialSign should be true if the transaction provided requires multiple signatures.
   *
   * @param unsignedTx
   * @param partialSign
   * @returns a signed transaction in CBOR
   */
  async signTx(unsignedTx: string, partialSign = false): Promise<string> {
    return await this._wallet.signTx(unsignedTx, partialSign);
  }

  /**
   * Experimental feature - sign multiple transactions at once.
   *
   * @param unsignedTxs - array of unsigned transactions in CborHex string
   * @param partialSign - if the transactions are signed partially
   * @returns array of signed transactions CborHex string
   */
  async signTxs(unsignedTxs: string[], partialSign = false): Promise<string[]> {
    const signedTxs: string[] = [];

    for (const unsignedTx of unsignedTxs) {
      const signedTx = await this.signTx(unsignedTx, partialSign);
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
  async submitTx(tx: string): Promise<string> {
    return await this._wallet.submitTx(tx);
  }

  /**
   * Get a used address of type Address from the wallet.
   *
   * This is used in transaction building.
   *
   * @returns an Address object
   */
  getUsedAddress(): Address {
    return this._wallet.getUsedAddress();
  }

  /**
   * Get a list of UTXOs to be used as collateral inputs for transactions with plutus script inputs.
   *
   * This is used in transaction building.
   *
   * @returns a list of UTXOs
   */
  async getUsedCollateral(): Promise<TransactionUnspentOutput[]> {
    const collateralUtxo = await this.getCollateral();

    const unspentOutput = collateralUtxo.map((utxo) => {
      return toTxUnspentOutput(utxo);
    });

    return unspentOutput;
  }

  /**
   * Get a list of UTXOs to be used for transaction building.
   *
   * This is used in transaction building.
   *
   * @returns a list of UTXOs
   */
  async getUsedUTxOs(): Promise<TransactionUnspentOutput[]> {
    return await this._wallet.getUtxos();
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

  /**
   * A helper function to create a collateral input for a transaction.
   *
   * @returns a transaction hash
   */
  async createCollateral(): Promise<string> {
    const tx = new Transaction({ initiator: this._wallet }).sendLovelace(
      this.getChangeAddress(),
      '5000000'
    );
    const unsignedTx = await tx.build();
    const signedTx = await this.signTx(unsignedTx);
    const txHash = await this.submitTx(signedTx);
    return txHash;
  }

  static brew(privateKey = false, strength = 256): string[] | string {
    const mnemonic = EmbeddedWallet.generateMnemonic(strength);

    if (privateKey) {
      return resolvePrivateKey(mnemonic);
    }

    return mnemonic;
  }
}
