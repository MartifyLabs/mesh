import type { NextPage } from "next";
import { useState } from "react";

import { MeshWallet } from "@meshsdk/core";
import { HydraInstance, HydraProvider } from "@meshsdk/hydra";

import SidebarFullwidth from "~/components/layouts/sidebar-fullwidth";
import Link from "~/components/link";
import TitleIconDescriptionBody from "~/components/sections/title-icon-description-body";
import Metatags from "~/components/site/metatags";
import { metaHydraTutorial } from "~/data/links-hydra";
import { getPageLinks } from "../common";
import HydraTutorialPrerequisites from "./prerequisites";
import HydraTutorialStep2 from "./step2";
import HydraTutorialStep3 from "./step3";
import HydraTutorialStep4 from "./step4";
import HydraTutorialStep5 from "./step5";

const ReactPage: NextPage = () => {
  const [aliceNode, setAliceNode] = useState<MeshWallet | undefined>(undefined);
  const [aliceFunds, setAliceFunds] = useState<MeshWallet | undefined>(
    undefined,
  );
  const [bobNode, setBobNode] = useState<MeshWallet | undefined>(undefined);
  const [bobFunds, setBobFunds] = useState<MeshWallet | undefined>(undefined);

  const hydraProvider = new HydraProvider({
    url: "http://35.189.158.126:4001",
  });
  const hydraInstance = new HydraInstance({
    provider: hydraProvider,
  });

  return (
    <>
      <Metatags
        title={metaHydraTutorial.title}
        description={metaHydraTutorial.desc}
      />
      <SidebarFullwidth sidebarItems={getPageLinks()}>
        <TitleIconDescriptionBody
          title={metaHydraTutorial.title}
          description={metaHydraTutorial.desc}
        >
          <>
            <p>
              This tutorial demonstrates how to use hydra-node on Cardano's
              preprod testing environment to open a layer 2 state channel
              between two participants using the Hydra Head protocol.
            </p>
            <p>
              This tutorial is adapted from{" "}
              <Link href="https://hydra.family/head-protocol/docs/tutorial/">
                the Hydra documentation
              </Link>
              .
            </p>
          </>
        </TitleIconDescriptionBody>

        <HydraTutorialPrerequisites />
        <HydraTutorialStep2
          aliceNode={aliceNode}
          aliceFunds={aliceFunds}
          bobNode={bobNode}
          bobFunds={bobFunds}
          setAliceNode={setAliceNode}
          setAliceFunds={setAliceFunds}
          setBobNode={setBobNode}
          setBobFunds={setBobFunds}
        />
        <HydraTutorialStep3
          aliceNode={aliceNode}
          aliceFunds={aliceFunds}
          bobNode={bobNode}
          bobFunds={bobFunds}
        />
        <HydraTutorialStep4
          hydraInstance={hydraInstance}
          aliceNode={aliceNode}
          aliceFunds={aliceFunds}
          bobNode={bobNode}
          bobFunds={bobFunds}
        />
        <HydraTutorialStep5
          hydraInstance={hydraInstance}
          aliceNode={aliceNode}
          aliceFunds={aliceFunds}
          bobNode={bobNode}
          bobFunds={bobFunds}
        />
      </SidebarFullwidth>
    </>
  );
};

export default ReactPage;
