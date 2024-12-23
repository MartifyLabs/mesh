import { useEffect, useRef } from "react";

import { CardanoWallet, useWallet, useWalletList } from "@meshsdk/react";

import { getProvider } from "./mesh-wallet";

export default function ConnectBrowserWallet() {
  const wallets = useWalletList();
  const hasAvailableWallets = wallets.length > 0;

  return (
    <>
      {hasAvailableWallets ? (
        <CommonCardanoWallet />
      ) : (
        <>No wallets installed</>
      )}
    </>
  );
}

export function CommonCardanoWallet() {
  const provider = getProvider();

  return (
    <CardanoWallet
      label={"Connect a Wallet"}
      extensions={[95]}
      metamask={{ network: "preprod" }}
      cardanoPeerConnect={{
        dAppInfo: {
          name: "Mesh SDK",
          url: "https://meshjs.dev/",
        },
        announce: [
          "wss://dev.btt.cf-identity-wallet.metadata.dev.cf-deployments.org",
          "wss://dev.tracker.cf-identity-wallet.metadata.dev.cf-deployments.org",
          "wss://tracker.de-0.eternl.art",
          "wss://tracker.de-5.eternl.art",
          "wss://tracker.de-6.eternl.art",
          "wss://tracker.us-5.eternl.art",
        ],
      }}
      burnerWallet={{
        networkId: 0,
        provider: provider,
      }}
    />
  );
}
