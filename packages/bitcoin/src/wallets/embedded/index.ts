import { bitcoin, ECPair, bip32, bip39 } from "../../";
import { BIP32Interface } from "bip32";
import axios from "axios";
import { UTxO } from "../../types/utxo";
import { Address } from "../../types/address";
import { IBitcoinProvider } from "../../interfaces/provider";

export type CreateBitcoinEmbeddedWalletOptions = {
  networkId: 0 | 1;
  key: {
    type: "mnemonic";
    words: string[];
  };
  provider?: IBitcoinProvider;
};

/**
 * 0': Indicates the Bitcoin mainnet.
 * 1': Indicates the Bitcoin testnet.
 * 
 * EmbeddedWallet is a class that provides a simple interface to interact with Bitcoin wallets.
 * 
 * @params options - The options to create an EmbeddedWallet.
 * networkId - The network ID of the wallet.
 * key - The key to create the wallet.
 * provider - The Bitcoin provider to interact with the Bitcoin network.
 */
export class EmbeddedWallet {
  private readonly _networkId: 0 | 1;
  private readonly _bIP32Interface: BIP32Interface;
  private readonly _p2wpkh: bitcoin.payments.Payment;
  private readonly _provider?: IBitcoinProvider;

  constructor(options: CreateBitcoinEmbeddedWalletOptions) {
    this._networkId = options.networkId;

    const bIP32Interface = WalletStaticMethods.fromMnemonic(
      options.key.words.join(" "),
      options.networkId
    );
    this._bIP32Interface = bIP32Interface;

    this._p2wpkh = bitcoin.payments.p2wpkh({
      pubkey: this._bIP32Interface.publicKey,
      network:
        this._networkId === 0
          ? bitcoin.networks.bitcoin
          : bitcoin.networks.testnet,
    });

    this._provider = options.provider;
  }

  /**
   * Get wallet network ID.
   *
   * @returns network ID
   */
  getNetworkId(): 0 | 1 {
    return this._networkId;
  }

  /*
   * Get wallet address.
   *
   * @returns wallet address
   */
  getPaymentAddress(): Address {
    const address: Address = {
      address: this._p2wpkh.address!,
      publicKey: this._bIP32Interface.publicKey.toString("hex"),
      purpose: "payment",
      addressType: "p2wpkh",
    };
    return address;
  }

  /**
   * Get UTXOs for the wallet address.
   * @returns An array of UTXOs.
   */
  async getUtxos(): Promise<UTxO[]> {
    console.log("getUtxos");
    const address = this.getPaymentAddress();
    if (this._provider === undefined) {
      throw new Error("`provider` is not defined. Provide a BitcoinProvider.");
    }

    return await this._provider?.fetchAddressUTxOs(address.address);
  }

  /**
   * Sign a transaction payload.
   * @param payload - The transaction payload to sign.
   * @returns The signed transaction in hex format.
   */
  signTx(payload: bitcoin.Transaction): string {
    return "";
  }

  /**
   * Generate mnemonic or private key
   *
   * @param privateKey return private key if true
   * @returns a transaction hash
   */
  static brew(strength = 128): string[] {
    const mnemonic = bip39.generateMnemonic(strength);
    return mnemonic.split(" ");
  }
}

class WalletStaticMethods {
  static fromMnemonic(
    mnemonic: string,
    networkId: 0 | 1,
    accountIndex: number = 0,
    change: 0 | 1 = 0,
    addressIndex: number = 0
  ): BIP32Interface {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(
      seed,
      WalletStaticMethods.getNetwork(networkId)
    );

    // path
    const purpose = 84; // BIP84 - Indicates that the addresses are P2WPKH (native SegWit) addresses
    const coinType = networkId;
    const path = `m/${purpose}'/${coinType}'/${accountIndex}'/${change}/${addressIndex}`;
    const child = root.derivePath(path);

    return child;
  }

  static getNetwork(network: 0 | 1) {
    return network === 0 ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
  }
}
