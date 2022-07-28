import { useState, useEffect } from 'react';
import Mesh from '@martifylabs/mesh';
import { Button, Card, Codeblock, Input } from '../../components';
import useWallet from '../../contexts/wallet';

export default function LockAssets() {
  return (
    <Card>
      <div className="grid gap-4 grid-cols-2">
        <div className="">
          <h3>Lock assets SC</h3>
          <p>WIP</p>
        </div>
        <div className="mt-8">
          <CodeDemo />
        </div>
      </div>
    </Card>
  );
}

function CodeDemo() {
  const { walletConnected } = useWallet();
  const [state, setState] = useState<number>(0);

  async function debug() {
    console.log('debug');
    // const tx = await Mesh.transaction.buildSC({
    //   ownerAddress: await Mesh.wallet.getWalletAddress(),
    //   assets: [
    //     'ab8a25c96cb18e174d2522ada5f7c7d629724a50f9c200c12569b4e2.Pixos',
    //   ],
    //   blockfrostApiKey:
    //     (await Mesh.wallet.getNetworkId()) === 1
    //       ? process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY_MAINNET!
    //       : process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY_TESTNET!,
    //   network: await Mesh.wallet.getNetworkId(),
    // });
    // console.log('tx', tx);

    const tx = await Mesh.transaction.build({
      outputs: [
        {
          address:
            'addr_test1wpnlxv2xv9a9ucvnvzqakwepzl9ltx7jzgm53av2e9ncv4sysemm8',
          assets: {
            'f57f145fb8dd8373daff7cf55cea181669e99c4b73328531ebd4419a.SOCIETY': 1,
            lovelace: 3000000,
          },
        },
      ],
      hasDatum: true,
      blockfrostApiKey:
        (await Mesh.wallet.getNetworkId()) === 1
          ? process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY_MAINNET!
          : process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY_TESTNET!,
      network: await Mesh.wallet.getNetworkId(),
    });
    console.log('tx', tx);

    const signature = await Mesh.wallet.signTx({ tx });

    const txHash = await Mesh.wallet.submitTransaction({
      tx: tx,
      witnesses: [signature],
    });
    console.log('txHash', txHash);
  }

  return (
    <>
      <Button onClick={() => debug()} disabled={!walletConnected || state == 1}>
        debug
      </Button>
    </>
  );
}
