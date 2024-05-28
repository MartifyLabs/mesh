import axios from 'axios';
import type { UTxO } from '../common/types/index.js';
import { deserializeTx } from '../common/utils/index.js';
import { csl } from '../core/index.js';
const minaFrontendUrl = 'http://localhost:4000/';
const minaBackendUrl = 'http://localhost:5000/';
const loginUrl = `${minaFrontendUrl}access`;
const signtxUrl = `${minaFrontendUrl}transaction/signtx`;

export class MinaWallet {
  static getAxiosInstance() {
    return axios.create({
      baseURL: minaBackendUrl,
      withCredentials: true,
    });
  }

  static getAppId() {
    const location = window.location;
    const appId = location.hostname;
    return appId;
  }

  // TODO, popup blocker issue, need to create html modal instead
  static async openMinaFrontend(url: string) {
    const appId = this.getAppId();
    if (url.includes('?')) {
      url = `${url}&appId=${appId}`;
    } else {
      url = `${url}?appId=${appId}`;
    }
    const windowFeatures = 'left=100,top=100,width=540,height=540';
    const handle = window.open(url, 'meshWindow', windowFeatures);
    if (!handle) {
      console.error('the window did not open', handle);
    }
    return await (async () => {
      return new Promise((res) => {
        window.addEventListener('message', async (e) => {
          if (e.data.target == 'minaWallet') {
            res(e.data);
          }
        });
      });
    })();
  }

  static async get(route: string, params = {}) {
    const appId = this.getAppId();

    params = {
      ...params,
      appId: appId,
    };

    try {
      const res = await this.getAxiosInstance().get(route, {
        params: params,
      });
      return res.data;
    } catch (error) {
      console.error('Not logged in');
      return undefined;
    }
  }

  static async enable() {
    const userWalletsMeta = await this.get('wallet/getuserwalletsmeta');
    if (userWalletsMeta === undefined) {
      return await this.openMinaFrontend(loginUrl);
      // const appId = this.getAppId();
      // const windowFeatures = 'left=100,top=100,width=540,height=540';
      // const handle = window.open(
      //   `${loginUrl}?appId=${appId}`,
      //   'meshWindow',
      //   windowFeatures
      // );
      // if (!handle) {
      //   console.error('the window did not open', handle);
      // }
      // return await (async () => {
      //   return new Promise((res) => {
      //     window.addEventListener('message', async (e) => {
      //       if (e.data.target == 'minaWalletLogin') {
      //         res(e.data.data);
      //       }
      //     });
      //   });
      // })();
    } else {
      return true;
    }
  }

  static async getChangeAddress(
    walletId = undefined,
    accountIndex = undefined
  ): Promise<string | undefined> {
    return await this.get('wallet/getchangeaddress', {
      walletId,
      accountIndex,
    });
  }

  static async getUtxos(
    walletId = undefined,
    accountIndex = undefined
  ): Promise<UTxO[]> {
    return await this.get('wallet/getutxo', {
      walletId,
      accountIndex,
    });
  }

  static async signTx(unsignedTx: string, partialSign = false) {
    const userWalletsMeta = await this.get('wallet/getuserwalletsmeta');
    console.log('userWalletsMeta', userWalletsMeta);
    if (userWalletsMeta) {
      const txSignatures = await this.openMinaFrontend(
        `${signtxUrl}?unsignedTx=${unsignedTx}&partialSign=${partialSign}`
      );

      if (txSignatures instanceof csl.Vkeywitnesses) {
        const tx = deserializeTx(unsignedTx);
        const txWitnessSet = tx.witness_set();

        txWitnessSet.set_vkeys(txSignatures);

        const signedTx = csl.Transaction.new(
          tx.body(),
          txWitnessSet,
          tx.auxiliary_data()
        ).to_hex();
        console.log('signedTx', signedTx);
        return signedTx;
      }
    }
    return undefined;
  }
}
