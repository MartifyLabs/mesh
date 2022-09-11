import { useState } from 'react';
import Codeblock from '../../../ui/codeblock';
import Card from '../../../ui/card';
import RunDemoButton from '../common/runDemoButton';
import RunDemoResult from '../common/runDemoResult';
import SectionTwoCol from '../common/sectionTwoCol';
import useWallet from '../../../../contexts/wallet';
import ConnectCipWallet from '../common/connectCipWallet';
import Input from '../../../ui/input';

export default function GetPolicyIdAssets() {
  return (
    <SectionTwoCol
      sidebarTo="getPolicyIdAssets"
      header="Get a Collection of Assets"
      leftFn={Left()}
      rightFn={Right()}
    />
  );
}

function Left() {
  return (
    <>
      <p>
        Returns a list of assets from a policy ID. If no assets in wallet
        belongs to the policy ID, an empty list is returned. Query for a list of
        assets&apos; policy ID with <code>wallet.getPolicyIds()</code>.
      </p>
      <Codeblock
        data={`const assets = await wallet.getPolicyIdAssets();`}
        isJson={false}
      />
    </>
  );
}

function Right() {
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<null | any>(null);
  const { wallet, walletConnected, hasAvailableWallets } = useWallet();
  const [policyId, setPolicyId] = useState<string>('');

  async function runDemo() {
    setLoading(true);
    let results = await wallet.getPolicyIdAssets(policyId);
    setResponse(results);
    setLoading(false);
  }
  return (
    <>
      {hasAvailableWallets && (
        <Card>
          {walletConnected ? (
            <>
              <Input
                value={policyId}
                onChange={(e) => setPolicyId(e.target.value)}
                placeholder="Policy ID"
                label="Policy ID"
              />
              <RunDemoButton
                runDemoFn={runDemo}
                loading={loading}
                response={response}
              />
              <RunDemoResult response={response} />
            </>
          ) : (
            <ConnectCipWallet />
          )}
        </Card>
      )}
    </>
  );
}
