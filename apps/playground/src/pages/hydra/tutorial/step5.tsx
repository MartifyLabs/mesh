import { useState } from "react";

import { MeshTxBuilder, MeshWallet } from "@meshsdk/core";
import { HydraInstance, HydraProvider } from "@meshsdk/hydra";

import Button from "~/components/button/button";
import Link from "~/components/link";
import TwoColumnsScroll from "~/components/sections/two-columns-scroll";
import Codeblock from "~/components/text/codeblock";

export default function HydraTutorialStep5({
  hydraInstance,
  aliceNode,
  aliceFunds,
  bobNode,
  bobFunds,
}: {
  hydraInstance: HydraInstance;
  aliceNode: MeshWallet | undefined;
  aliceFunds: MeshWallet | undefined;
  bobNode: MeshWallet | undefined;
  bobFunds: MeshWallet | undefined;
}) {
  return (
    <TwoColumnsScroll
      sidebarTo="step5"
      title="Step 5. Use the Hydra head"
      leftSection={Left(
        hydraInstance,
        aliceNode,
        aliceFunds,
        bobNode,
        bobFunds,
      )}
    />
  );
}

function Left(
  hydraInstance: HydraInstance,
  aliceNode: MeshWallet | undefined,
  aliceFunds: MeshWallet | undefined,
  bobNode: MeshWallet | undefined,
  bobFunds: MeshWallet | undefined,
) {
  const [loading, setLoading] = useState<boolean>(false);
  const [addresses, setAddresses] = useState<string>("");
  const [balance, setBalance] = useState<string>("");

  async function fetchUTxOs() {
    const utxos = await hydraInstance.provider.fetchUTxOs();
    console.log("UTXOs: ", utxos);
  }

  async function fetchAddressUTxOs() {
    const utxosAddress = await hydraInstance.provider.fetchAddressUTxOs(
      "addr_test1vpd5axpq4qsh8sxvzny49cp22gc5tqx0djf6wmjv5cx7q5qyrzuw8",
    );
    console.log("UTXOs Address: ", utxosAddress);
  }

  async function makeTx() {
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
      fetcher: hydraInstance.provider,
      submitter: hydraInstance.provider,
    });

    const pp = await hydraInstance.provider.fetchProtocolParameters();
    const utxos = await wallet.getUtxos("enterprise");
    const changeAddress = walletA.addr;

    const txBuilder = new MeshTxBuilder({
      fetcher: hydraInstance.provider,
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
    const txHash = await hydraInstance.provider.submitTx(signedTx);
    console.log("txHash", txHash);
  }

  return (
    <>
      <p>
        In this step, we'll demonstrate a basic transaction between alice and
        bob using the Hydra head. Hydra Head operates as an isomorphic protocol,
        meaning that functionalities available on the Cardano layer 1 network
        are also available on the layer 2 network. This compatibility allows us
        to use Mesh for transaction creation within the head.
      </p>
      <p>
        In this example, we will transfer 10 ada from Alice to Bob. Adjust the
        transaction amount based on the balances previously committed to the
        head.
      </p>
      <p>
        First, we need to select a UTxO to spend. We can find a UTxO by
        referring to the utxo field in the most recent <code>HeadIsOpen</code>{" "}
        or <code>SnapshotConfirmed</code> messages. Alternatively, we can query
        the current UTxO set directly from the API:
      </p>
      <Codeblock
        data={`const utxos = await hydraInstance.provider.fetchUTxOs();`}
      />
      <Button
        onClick={() => fetchUTxOs()}
        style={loading ? "warning" : "light"}
        disabled={loading}
      >
        Fetch UTxOs
      </Button>
      <p>
        From the response, we would need to select a UTxO that is owned by alice
        to spend:
      </p>
      <Codeblock
        data={`const utxosAddress = await hydraInstance.provider.fetchAddressUTxOs(
  "addr_test1vpd5axpq4qsh8sxvzny49cp22gc5tqx0djf6wmjv5cx7q5qyrzuw8",
);`}
      />
      <Button
        onClick={() => fetchAddressUTxOs()}
        style={loading ? "warning" : "light"}
        disabled={loading}
      >
        Fetch Address UTxOs
      </Button>
      <p>
        Next, similar to the Cardano layer 1, build a transaction using Mesh
        that spends this UTxO and sends it to an address. If you haven't done so
        already, obtain the address of your partner to send the funds to.
      </p>
      <Codeblock data={`code here`} />
      <p>
        Before submission, we need to sign the transaction to authorize spending
        alice's funds:
      </p>
      <Codeblock data={`const signedTx = await wallet.signTx(unsignedTx)`} />
      <p>
        Submit the transaction through the already open WebSocket connection.
        Generate the NewTx command for WebSocket submission:
      </p>
      <Codeblock
        data={`const txHash = await hydraInstance.provider.submitTx(signedTx);`}
      />
      <Button
        onClick={() => makeTx()}
        style={loading ? "warning" : "light"}
        disabled={loading}
      >
        Build Transaction
      </Button>

      <p>
        The transation will be validated by both hydra-nodes and either result
        in a TxInvalid message with a reason, or a TxValid message and a
        SnapshotConfirmed with the new UTxO available in the head shortly after.
      </p>
      <p>
        🎉 Congratulations, you just processed your first Cardano transaction
        off-chain in a Hydra head!
      </p>
    </>
  );
}
