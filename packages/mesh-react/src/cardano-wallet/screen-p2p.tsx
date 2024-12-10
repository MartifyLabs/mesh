import { useEffect, useRef, useState } from "react";

// import { DAppPeerConnect } from "@fabianbormann/cardano-peer-connect";
// import { IWalletInfo } from "@fabianbormann/cardano-peer-connect/dist/src/types";

import { Button } from "../common/button";
import { DAppPeerConnect, IWalletInfo } from "../common/cardano-peer-connect";
import { useWallet } from "../hooks";

export default function ScreenP2P({
  cardanoPeerConnect,
  setOpen,
}: {
  cardanoPeerConnect?: {
    dAppInfo: {
      name: string;
      url: string;
    };
    announce: string[];
  };
  setOpen: Function;
}) {
  const dAppConnect = useRef<DAppPeerConnect | null>(null);
  const qrCodeField = useRef<HTMLDivElement | null>(null);
  const [address, setAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const { connect } = useWallet();

  useEffect(() => {
    if (cardanoPeerConnect) {
      if (dAppConnect.current === null) {
        dAppConnect.current = new DAppPeerConnect({
          dAppInfo: {
            name: cardanoPeerConnect.dAppInfo.name,
            url: cardanoPeerConnect.dAppInfo.url,
          },
          announce: cardanoPeerConnect.announce,
          onApiInject: async (name: string, address: string) => {
            console.log(5, "onApiInject", name, address);
            await connect(name);
            setOpen(false);
          },
          onApiEject: (name: string, address: string) => {
            console.log(5, "onApiEject", name, address);
          },
          onConnect: (address: string, walletInfo?: IWalletInfo) => {
            console.log(5, "Connected to wallet", address, walletInfo);
          },
          onDisconnect: () => {
            console.log(5, "Disconnected from wallet");
          },
          verifyConnection: (
            walletInfo: IWalletInfo,
            callback: (granted: boolean, autoconnect: boolean) => void,
          ) => {
            console.log(5, "verifyConnection", walletInfo);
            callback(true, true);
          },
          useWalletDiscovery: true,
        });

        if (dAppConnect.current) {
          const address = dAppConnect.current.getAddress();
          setAddress(address);
          if (qrCodeField.current !== null) {
            dAppConnect.current.generateQRCode(qrCodeField.current);
          }
        }
      }
    }
  }, []);

  return (
    <div className="mesh-flex mesh-flex-col mesh-items-center mesh-justify-center">
      <div style={{ marginTop: 16, marginBottom: 16 }} ref={qrCodeField}></div>
      <Button
        variant="outline"
        className="mesh-text-white"
        onClick={() => {
          navigator.clipboard.writeText(address);
          setCopied(true);
        }}
      >
        {copied ? "Copied" : "Copy Address"}
      </Button>
    </div>
  );
}
