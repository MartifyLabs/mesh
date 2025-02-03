import { useState } from "react";

import { MeshWallet } from "@meshsdk/core";

import Button from "~/components/button/button";
import TwoColumnsScroll from "~/components/sections/two-columns-scroll";
import Codeblock from "~/components/text/codeblock";

export default function HydraTutorialStep6({
  aliceNode,
  aliceFunds,
  bobNode,
  bobFunds,
}: {
  aliceNode: MeshWallet | undefined;
  aliceFunds: MeshWallet | undefined;
  bobNode: MeshWallet | undefined;
  bobFunds: MeshWallet | undefined;
}) {
  return (
    <TwoColumnsScroll
      sidebarTo="step6"
      title="Step 6. Closing the Hydra head"
      leftSection={Left(aliceNode, aliceFunds, bobNode, bobFunds)}
    />
  );
}

function Left(
  aliceNode: MeshWallet | undefined,
  aliceFunds: MeshWallet | undefined,
  bobNode: MeshWallet | undefined,
  bobFunds: MeshWallet | undefined,
) {
  const [loading, setLoading] = useState<boolean>(false);
  const [addresses, setAddresses] = useState<string>("");
  const [balance, setBalance] = useState<string>("");

  async function queryFunds() {}

  return (
    <>
      <p>
        Any participant can initiate closing the Hydra head. Use the WebSocket
        API to submit the closing command:
      </p>

      <Codeblock data={`const txHash = await hydraInstance.provider.close()`} />

      <p>
        The hydra-node will then submit a protocol transaction with the last
        known snapshot to the Cardano network. A smart contract on layer 1 will
        check the snapshot signatures and confirm the head is closed. The
        WebSocket API sends a HeadIsClosed message when this' Close' transaction
        is observed. Note that this can also happen if any other hydra-node
        closes the head.
      </p>

      <p>
        The message will include a <code>contestationDeadline</code>, set using
        the configurable <code>--contestation-period</code>. Until this
        deadline, the closing snapshot can be contested with a more recent,
        multi-signed snapshot. Your hydra-node would contest automatically for
        you if the closed snapshot is not the last known one.
      </p>

      <p>
        We need to wait now until the deadline has passed, which will be
        notified by the hydra-node through the WebSocket API with a
        <code>ReadyToFanout</code> message.
      </p>

      <p>
        At this point, any head member can issue distribution of funds on layer
        1. You can do this through the WebSocket API one last time:
      </p>

      <Codeblock
        data={`const txHash = await hydraInstance.provider.fanout()`}
      />

      <p>
        This will submit a transaction to layer 1. Once successful, it will be
        indicated by a <code>HeadIsFinalized</code> message that includes the
        distributed utxo.
      </p>

      <p>
        To confirm, you can query the funds of both alice and bob on layer 1:
      </p>

      <Codeblock data={`code here`} />

      <Button
        onClick={() => queryFunds()}
        style={loading ? "warning" : "light"}
        disabled={loading}
      >
        Query Funds
      </Button>

      <p>That's it. That's the full life cycle of a Hydra head.</p>
    </>
  );
}
