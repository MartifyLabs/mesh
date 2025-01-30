// https://developer.bitcoin.org/reference/rpc/index.html#wallet-rpcs

import { Address } from "../../types/address";
import { IBitcoinWallet } from "../../interfaces/wallet";

declare const window: {
  BitcoinProvider?: any;
};

export class BrowserWallet implements IBitcoinWallet {
  private readonly _purposes: string[];

  constructor(purposes: string[]) {
    this._purposes = purposes;
  }

  /**
   * This is the entrypoint to start communication with the user's wallet. The wallet should request the user's permission to connect the web page to the user's wallet, and if permission has been granted, the wallet will be returned and exposing the full API for the dApp to use.
   * @param message - A message to display to the user when requesting permission to connect the wallet.
   * @param purposes - An array of purposes for which the wallet is being connected. Default is `["payment"]`. Options are `["payment", "ordinals", "stacks"]`.
   * @returns
   */
  static async enable(
    message: string,
    purposes = ["payment"]
  ): Promise<BrowserWallet> {
    const response = await WalletStaticMethods.request("getAccounts", {
      purposes: purposes,
      message: message,
    });
    if (response.status === "success") {
      return new BrowserWallet(purposes);
    }
    throw new Error("Failed to enable wallet");
  }

  async getAddresses(): Promise<Address[] | undefined> {
    try {
      const response = await this.request("getAddresses", {
        purposes: this._purposes,
      });
      if (response.status === "success") {
        return response.result.addresses as Address[];
      }
    } catch (err) {
      console.error("getAccounts ~ error:", err);
    }
  }

  async getChangeAddress() {
    const addresses = await this.getAddresses();
    const address = addresses?.find((address) => address.purpose === "payment");
    if (address) return address.address;
    throw new Error("No change address found");
  }

  async getCollateral() {
    console.log("Method getCollateral not implemented.");
    return [];
  }

  async getNetworkId(): Promise<0 | 1> {
    return 1;
  }

  async request(method: string, params?: any) {
    return WalletStaticMethods.request(method, params);
  }

  async signData(
    payload: string,
    address?: string,
    addressType: "p2wpkh" | "p2tr" | "stacks" = "p2wpkh"
  ): Promise<
    | {
        address: string;
        signature: string;
        messageHash: string;
      }
    | undefined
  > {
    try {
      let _address = address;
      if (!_address) {
        _address = await this.getAddresses().then((addresses) => {
          const address = addresses?.find(
            (address) => address.addressType === addressType
          );
          return address?.address;
        });
      }

      if (_address) {
        const response = await this.request("signMessage", {
          message: payload,
          address: _address,
        });
        if (response.status === "success") {
          return response.result;
        }
      }
    } catch (err) {
      console.error("signMessage ~ error:", err);
    }
  }

  async signTx(signedTx: string): Promise<string> {
    console.log("Method signTx not implemented.");
    return "";
  }

  async submitTx(signedTx: string): Promise<string> {
    console.log("Method submitTx not implemented.");
    return "";
  }
}

class WalletStaticMethods {
  static async request(
    method: string, // todo define
    params: any, // todo define
    providerId?: string
  ): Promise<any> {
    let provider = window.BitcoinProvider;
    // todo extend to all wallets based on providerId

    if (!provider) {
      throw new Error("No wallet provider was found");
    }
    if (!method) {
      throw new Error("A wallet method is required");
    }

    const response = await provider.request(method, params);

    if (response.result) {
      return {
        status: "success",
        result: response.result,
      };
    }

    return {
      status: "error",
      error: response.error,
    };
  }
}
