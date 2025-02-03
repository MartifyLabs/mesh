import { MeshTxBuilder, MeshWallet } from "@meshsdk/core";
import { HydraProvider } from "@meshsdk/hydra";

import Button from "~/components/button/button";
import LiveCodeDemo from "~/components/sections/live-code-demo";
import TwoColumnsScroll from "~/components/sections/two-columns-scroll";
import Codeblock from "~/components/text/codeblock";

export default function HydraInitializeHead({
  hydraProvider,
  provider,
}: {
  hydraProvider: HydraProvider;
  provider: string;
}) {
  return (
    <TwoColumnsScroll
      sidebarTo="initHead"
      title="Initializes a new Hydra Head"
      leftSection={Left()}
      rightSection={Right(hydraProvider, provider)}
    />
  );
}

function Left() {
  return (
    <>
      <p>
        Initializes a new Head. This command is a no-op when a Head is already
        open and the server will output an <code>CommandFailed</code> message
        should this happen.
      </p>
      <Codeblock data={`await hydraProvider.initializesHead();`} />
    </>
  );
}

function Right(hydraProvider: HydraProvider, provider: string) {
  async function runDemo() {
    hydraProvider.onMessage((message) => {
      console.log("Hydra onMessage", message);
      if (message.tag === "Greetings") {
        console.log("Greetings", JSON.stringify(message));
      }
    });
    hydraProvider.onStatusChange((status) => {
      console.log("Hydra status", status);
    });

    await hydraProvider.connect();
    // await hydraProvider.init();
  }

  async function fetchutxo() {
    const utxos = await hydraProvider.fetchUTxOs();
    console.log("UTXOs: ", utxos);
    const utxosAddress = await hydraProvider.fetchAddressUTxOs(
      "addr_test1vpd5axpq4qsh8sxvzny49cp22gc5tqx0djf6wmjv5cx7q5qyrzuw8",
    );
    console.log("UTXOs Address: ", utxosAddress);
  }

  async function fetchpp() {
    const pp = await hydraProvider.fetchProtocolParameters();
    console.log("pp: ", pp);
  }

  async function maketx() {
    // wallet
    const walletA = {
      addr: "addr_test1vpsthwvxgfkkm2lm8ggy0c5345u6vrfctmug6tdyx4rf4mqn2xcyw",
      key: "58201aae63d93899640e91b51c5e8bd542262df3ecf3246c3854f39c40f4eb83557d",
    };

    const wallet = new MeshWallet({
      networkId: 0,
      key: {
        type: "cli",
        payment: walletA.key,
      },
      fetcher: hydraProvider,
      submitter: hydraProvider,
    });

    const pp = await hydraProvider.fetchProtocolParameters();
    // const utxos = await hydraProvider.fetchAddressUTxOs(walletA.addr);
    // console.log("utxos", utxos);
    const utxos = await wallet.getUtxos("enterprise");
    // console.log("utxos", utxos);
    const changeAddress = walletA.addr;

    const txBuilder = new MeshTxBuilder({
      fetcher: hydraProvider,
      params: pp,
      verbose: true,
    });

    const unsignedTx = await txBuilder
      .txOut(
        "addr_test1vpd5axpq4qsh8sxvzny49cp22gc5tqx0djf6wmjv5cx7q5qyrzuw8",
        [{ unit: "lovelace", quantity: "3000000" }],
      )
      .changeAddress(changeAddress)
      .selectUtxosFrom(utxos)
      .complete();

    const signedTx = await wallet.signTx(unsignedTx);
    // const txHash = await hydraProvider.submitTx(signedTx);
    const txHash = await wallet.submitTx(signedTx);
    console.log("txHash", txHash);
  }

  return (
    <LiveCodeDemo
      title="Initializes Hydra Head"
      subtitle="Initializes a new Head."
      runCodeFunction={runDemo}
      runDemoShowProviderInit={true}
      runDemoProvider={provider}
    >
      <Button onClick={fetchutxo}>fetchutxo</Button>
      <Button onClick={fetchpp}>fetchpp</Button>
      <Button onClick={maketx}>maketx</Button>
    </LiveCodeDemo>
  );
}
