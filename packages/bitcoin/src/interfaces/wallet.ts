export interface IBitcoinWallet {
  getChangeAddress(): Promise<string>;
  getNetworkId(): Promise<0 | 1>;
  signTx(signedTx: string): Promise<string>;
  submitTx(tx: string): Promise<string>;
}
