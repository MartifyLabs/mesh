import type { NextPage } from "next";

import { BrowserWallet, EmbeddedWallet } from "@meshsdk/bitcoin";

import Button from "~/components/button/button";
import Metatags from "~/components/site/metatags";

const ReactPage: NextPage = () => {
  async function loadEmbeddedWallet() {
    const mnemonic =
      "birth cannon between under split jewel slow love sugar camera dignity excess";
    const expectAddress = "tb1q3x7c8nuew6ayzmy3fnfx6ydnr8a4kf2267za7y";

    const wallet = new EmbeddedWallet({
      networkId: 1,
      key: {
        type: "mnemonic",
        words: mnemonic.split(" "),
      },
    });

    const address = wallet.getPaymentAddress();
    console.log("address", address, expectAddress === address.address);
    console.log("network", wallet.getNetworkId());
    console.log("utxos", await wallet.getUtxos());

    console.log("brew", EmbeddedWallet.brew());
  }

  async function loadBrowserWallet() {
    const wallet = await BrowserWallet.enable("Mesh SDK want to connect");
    console.log("getaddress", await wallet.getAddresses());
    // console.log("signMessage", await wallet.signData("test message"));

    console.log("request getBalance", await wallet.request('getBalance'));
  }

  return (
    <>
      <Metatags title={"Bitcoin"} description={"Building in progress"} />
      <Button onClick={() => loadEmbeddedWallet()}>loadEmbeddedWallet</Button>
      <Button onClick={() => loadBrowserWallet()}>loadBrowserWallet</Button>
    </>
  );
};

export default ReactPage;
