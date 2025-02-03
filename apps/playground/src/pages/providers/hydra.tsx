import type { NextPage } from "next";

import { HydraProvider } from "@meshsdk/hydra";

import ButtonFloatDocumentation from "~/components/button/button-float-documentation";
import SidebarFullwidth from "~/components/layouts/sidebar-fullwidth";
import Link from "~/components/link";
import TitleIconDescriptionBody from "~/components/sections/title-icon-description-body";
import Metatags from "~/components/site/metatags";
import Codeblock from "~/components/text/codeblock";
import { metaHydra } from "~/data/links-providers";
import { useProviders } from "~/hooks/useProviders";
import ProviderHydra from "./hydra-endpoints";

const ReactPage: NextPage = () => {
  const sidebarItems = [
    { label: "Initializes Hydra Head", to: "initHead" },
    { label: "On Message", to: "onMessage" },
    { label: "Abort Hydra Head", to: "AA" },
    { label: "Submit Transaction", to: "AA" },
    { label: "Decommit UTxO", to: "AA" },
    { label: "Close Hydra Head", to: "AA" },
    { label: "Contest latest snapshot", to: "AA" },
    { label: "Fanout", to: "AA" },
    { label: "Get UTxO", to: "AA" },
    { label: "Commit Transaction", to: "AA" },
    { label: "Decommit Transaction", to: "AA" },
    { label: "Get protocol parameters", to: "AA" },
  ];

  let code1 = `import { HydraProvider } from "@meshsdk/core";\n\n`;
  code1 += `const hydraProvider = new HydraProvider('<URL>');`;
  code1 += `\nawait hydraProvider.connect();`;

  const hydraUrl = useProviders((state) => state.hydraUrl);

  const hydraProvider = new HydraProvider({
    url: hydraUrl,
  });

  return (
    <>
      <Metatags title={metaHydra.title} description={metaHydra.desc} />
      <SidebarFullwidth sidebarItems={sidebarItems}>
        <TitleIconDescriptionBody
          title={metaHydra.title}
          description={metaHydra.desc}
        >
          <p>
            The{" "}
            <Link href="https://hydra.family/head-protocol/">
              Hydra Head protocol
            </Link>{" "}
            is a layer 2 scaling solution for Cardano rooted in peer-reviewed
            research that increases transaction throughput and ensures cost
            efficiency while maintaining rigorous security.
          </p>
          <p>Get started:</p>
          <Codeblock data={code1} />
        </TitleIconDescriptionBody>
        <ButtonFloatDocumentation href="https://docs.meshjs.dev/providers/classes/HydraProvider" />

        <ProviderHydra hydraProvider={hydraProvider} provider="hydra" />
      </SidebarFullwidth>
    </>
  );
};

export default ReactPage;
