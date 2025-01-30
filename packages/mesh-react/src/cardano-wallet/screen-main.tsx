import { BrowserWallet } from "@meshsdk/bitcoin";

import IconBitcoin from "../common/icons/icon-bitcoin";
import IconBookDashed from "../common/icons/icon-book-dashed";
import IconDownload from "../common/icons/icon-download";
import IconFingerprint from "../common/icons/icon-fingerprint";
import IconMonitorSmartphone from "../common/icons/icon-monitor-smartphone";
import { TooltipProvider } from "../common/tooltip";
import { useWallet, useWalletList } from "../hooks";
import { screens } from "./data";
import WalletIcon from "./wallet-icon";

export default function ScreenMain({
  injectFn,
  extensions,
  setOpen,
  setScreen,
  persist,
  cardanoPeerConnect,
  burnerWallet,
  webauthn,
}: {
  injectFn?: () => Promise<void>;
  extensions: number[];
  setOpen: Function;
  setScreen: Function;
  persist: boolean;
  cardanoPeerConnect: boolean;
  burnerWallet: boolean;
  webauthn: boolean;
}) {
  const wallets = useWalletList({ injectFn });
  const { connect, setBitcoinWallet } = useWallet();

  return (
    <TooltipProvider>
      <div className="mesh-grid mesh-gap-4 mesh-py-4 mesh-grid-cols-5 mesh-place-items-center mesh-gap-y-8">
        {wallets.map((wallet, index) => (
          <WalletIcon
            key={index}
            icon={wallet.icon}
            name={wallet.name}
            action={() => {
              connect(wallet.id, extensions, persist);
              setOpen(false);
            }}
          />
        ))}

        {webauthn && (
          <WalletIcon
            iconReactNode={IconFingerprint()}
            name={screens.webauthn.title}
            action={() => {
              setScreen("webauthn");
            }}
          />
        )}
        {cardanoPeerConnect && (
          <WalletIcon
            iconReactNode={IconMonitorSmartphone()}
            name={screens.p2p.title}
            action={() => {
              setScreen("p2p");
            }}
          />
        )}
        {burnerWallet && (
          <WalletIcon
            iconReactNode={IconBookDashed()}
            name={screens.burner.title}
            action={() => {
              setScreen("burner");
            }}
          />
        )}

        <WalletIcon
          iconReactNode={IconBitcoin()}
          name={"Bitcoin"}
          action={async () => {
            const wallet = await BrowserWallet.enable(
              "Mesh SDK want to connect",
            );
            setBitcoinWallet(wallet, "Bitcoin");
            setOpen(false);
          }}
        />

        <WalletIcon
          iconReactNode={IconDownload()}
          name={`Download`}
          action={() => {
            window.open(
              "https://developers.cardano.org/showcase/?tags=wallet",
              "_blank",
            );
          }}
        />
      </div>
    </TooltipProvider>
  );
}
