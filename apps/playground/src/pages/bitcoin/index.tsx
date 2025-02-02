import type { NextPage } from "next";

import {
  BlockstreamProvider,
  BrowserWallet,
  EmbeddedWallet,
} from "@meshsdk/bitcoin";

import Button from "~/components/button/button";
import Metatags from "~/components/site/metatags";

const ReactPage: NextPage = () => {
  async function loadEmbeddedWallet() {
    const provider = new BlockstreamProvider("testnet");

    const mnemonic =
      "birth cannon between under split jewel slow love sugar camera dignity excess";
    const expectAddress = "tb1q3x7c8nuew6ayzmy3fnfx6ydnr8a4kf2267za7y";

    const wallet = new EmbeddedWallet({
      networkId: 1,
      key: {
        type: "mnemonic",
        words: mnemonic.split(" "),
      },
      provider: provider,
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

    console.log("request getBalance", await wallet.request("getBalance"));
  }

  async function provider() {
    const provider = new BlockstreamProvider("testnet");

    const address = "tb1q3x7c8nuew6ayzmy3fnfx6ydnr8a4kf2267za7y";

    // const utxos = await provider.fetchAddressUTxOs(address);
    // console.log("utxos", utxos);

    const fetchAddressTransactions = await provider.fetchAddressTransactions(address);
    console.log("fetchAddressTransactions", fetchAddressTransactions);

  }

  return (
    <>
      <Metatags title={"Bitcoin"} description={"Building in progress"} />
      <Button onClick={() => loadEmbeddedWallet()}>loadEmbeddedWallet</Button>
      <Button onClick={() => loadBrowserWallet()}>loadBrowserWallet</Button>

      <Button onClick={() => provider()}>provider</Button>
    </>
  );
};

export default ReactPage;
