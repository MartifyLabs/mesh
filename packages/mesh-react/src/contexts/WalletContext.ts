import { createContext, useCallback, useEffect, useState } from "react";

import { IBitcoinWallet } from "@meshsdk/bitcoin";
import { IWallet } from "@meshsdk/common";
import { BrowserWallet } from "@meshsdk/wallet";

interface WalletContext {
  hasConnectedWallet: boolean;
  connectedWalletInstance: IWallet;
  connectedBitcoinWallet: IBitcoinWallet;
  connectedWalletName: string | undefined;
  connectingWallet: boolean;
  connectWallet: (
    walletName: string,
    extensions?: number[],
    persist?: boolean,
  ) => Promise<void>;
  disconnect: () => void;
  setWallet: (walletInstance: IWallet, walletName: string) => void;
  setBitcoinWallet: (
    walletInstance: IBitcoinWallet,
    walletName: string,
  ) => void;
  setPersist: (persist: boolean) => void;
  error?: unknown;
  address: string;
  state: WalletState;
}

export enum WalletState {
  NOT_CONNECTED = "NOT_CONNECTED",
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
}

const INITIAL_STATE = {
  walletName: undefined,
  walletInstance: {} as IWallet,
};

const localstoragePersist = "mesh-wallet-persist";

export const useWalletStore = () => {
  const [error, setError] = useState<unknown>(undefined);
  const [state, setState] = useState<WalletState>(WalletState.NOT_CONNECTED);
  const [connectingWallet, setConnectingWallet] = useState<boolean>(false);
  const [persistSession, setPersistSession] = useState<boolean>(false);
  const [address, setAddress] = useState("");
  const [connectedWalletInstance, setConnectedWalletInstance] =
    useState<IWallet>(INITIAL_STATE.walletInstance);
  const [connectedWalletName, setConnectedWalletName] = useState<
    string | undefined
  >(INITIAL_STATE.walletName);
  const [connectedBitcoinWallet, setConnectedBitcoinWallet] =
    useState<IBitcoinWallet>({} as IBitcoinWallet);

  const connectWallet = useCallback(
    async (walletName: string, extensions?: number[], persist?: boolean) => {
      setConnectingWallet(true);
      setState(WalletState.CONNECTING);

      try {
        const walletInstance = await BrowserWallet.enable(
          walletName,
          extensions,
        );
        setConnectedWalletInstance(walletInstance);
        setConnectedWalletName(walletName);
        setError(undefined);

        // if persist, set localstorage
        if (persist) {
          localStorage.setItem(
            localstoragePersist,
            JSON.stringify({ walletName }),
          );
        }
        setState(WalletState.CONNECTED);
      } catch (error) {
        setError(error);
        setState(WalletState.NOT_CONNECTED);
        setConnectedWalletName(INITIAL_STATE.walletName);
        setConnectedWalletInstance(INITIAL_STATE.walletInstance);
      }

      setConnectingWallet(false);
    },
    [],
  );

  const disconnect = useCallback(() => {
    setConnectedWalletName(INITIAL_STATE.walletName);
    setConnectedWalletInstance(INITIAL_STATE.walletInstance);
    setState(WalletState.NOT_CONNECTED);
    localStorage.removeItem(localstoragePersist);
  }, []);

  const setWallet = useCallback(
    async (walletInstance: IWallet, walletName: string) => {
      setConnectedWalletInstance(walletInstance);
      setConnectedWalletName(walletName);
      setState(WalletState.CONNECTED);
    },
    [],
  );

  const setBitcoinWallet = useCallback(
    async (walletInstance: IBitcoinWallet, walletName: string) => {
      setConnectedBitcoinWallet(walletInstance);
      setConnectedWalletName(walletName);
      setState(WalletState.CONNECTED);
    },
    [],
  );

  const setPersist = useCallback((persist: boolean) => {
    setPersistSession(persist);
  }, []);

  // after connected
  useEffect(() => {
    async function load() {
      if (
        Object.keys(connectedWalletInstance).length > 0 &&
        address.length === 0
      ) {
        let address = (await connectedWalletInstance.getUnusedAddresses())[0];
        if (!address)
          address = await connectedWalletInstance.getChangeAddress();
        setAddress(address);
      }

      if (
        Object.keys(connectedBitcoinWallet).length > 0 &&
        address.length === 0
      ) {
        let address = await connectedBitcoinWallet.getChangeAddress();
        setAddress(address);
      }
    }
    load();
  }, [connectedWalletInstance, connectedBitcoinWallet]);

  // if persist
  useEffect(() => {
    const persist = localStorage.getItem(localstoragePersist);
    if (persistSession && persist) {
      const persist = JSON.parse(
        localStorage.getItem(localstoragePersist) || "",
      );
      connectWallet(persist.walletName);
    }
  }, [persistSession]);

  return {
    hasConnectedWallet: INITIAL_STATE.walletName !== connectedWalletName,
    connectedWalletInstance,
    connectedBitcoinWallet,
    connectedWalletName,
    connectingWallet,
    connectWallet,
    disconnect,
    setWallet,
    setBitcoinWallet,
    setPersist,
    error,
    address,
    state,
  };
};

export const WalletContext = createContext<WalletContext>({
  hasConnectedWallet: false,
  connectedWalletInstance: INITIAL_STATE.walletInstance,
  connectedBitcoinWallet: {} as IBitcoinWallet,
  connectedWalletName: INITIAL_STATE.walletName,
  connectingWallet: false,
  connectWallet: async () => {},
  disconnect: () => {},
  setWallet: async () => {},
  setBitcoinWallet: async () => {},
  setPersist: () => {},
  address: "",
  state: WalletState.NOT_CONNECTED,
});
