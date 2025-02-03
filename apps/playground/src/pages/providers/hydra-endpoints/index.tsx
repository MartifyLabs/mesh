import { HydraProvider } from "@meshsdk/hydra";

import HydraInitializeHead from "./init-head";
import HydraOnMessage from "./on-message";

export default function ProviderHydra({
  hydraProvider,
  provider,
}: {
  hydraProvider: HydraProvider;
  provider: string;
}) {
  return (
    <>
      <HydraInitializeHead
        hydraProvider={hydraProvider}
        provider={provider}
      />
      <HydraOnMessage
        hydraProvider={hydraProvider}
        provider={provider}
      />
    </>
  );
}
