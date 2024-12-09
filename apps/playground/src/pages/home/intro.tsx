import {
  ChevronRightIcon,
  CommandLineIcon,
  DocumentCheckIcon,
  PlayIcon,
  TruckIcon,
} from "@heroicons/react/24/solid";

import Link from "~/components/link";
import Codeblock from "~/components/text/codeblock";

const features = [
  {
    icon: CommandLineIcon,
    name: "Get started with one command",
    description:
      "Instant setup a new project with a single command using Mesh CLI and start building.",
    code: "npx meshjs your-app-name",
  },
  {
    icon: PlayIcon,
    name: "Explore documentation with live demos",
    description:
      "In Mesh Playground, most endpoints have live demo for you to try to see how it works, then copy the code snippet and use it.",
    link: "/apis",
    linkText: "Explore Mesh APIs",
  },
  {
    icon: DocumentCheckIcon,
    name: "Pre-built smart contracts",
    description:
      "Most popular smart contracts are available for you to use in your app. End-to-end implementation useful for learning too.",
    link: "/smart-contracts",
    linkText: "Start using smart contracts",
  },
  {
    icon: TruckIcon,
    name: "Resources to learn more and go deeper",
    description:
      "Whether you are a new or seasoned full-stack developer, these guides and resources are here to help you.",
    link: "/resources",
    linkText: "Check out resources",
  },
];

export default function SectionIntro() {
  return (
    <section className="bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-screen-xl items-center gap-8 px-4 py-8 sm:py-16 lg:grid lg:grid-cols-2 lg:px-6 xl:gap-16 ">
        <img
          className="mb-4 hidden w-full rounded-lg lg:mb-0 lg:block"
          src="/home/developer-8764521_640.jpg"
          alt="feature image"
        />
        <div className="text-gray-500 sm:text-lg dark:text-gray-400">
          <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            How to get started with Cardano
          </h2>
          <p className="mb-8 font-light lg:text-xl"></p>
          <div className="mb-6 border-b border-t border-gray-200 py-8 dark:border-gray-700">
            {features.map((feature, i) => (
              <div className="flex pb-8" key={i}>
                <div className="bg-primary-100 dark:bg-primary-900 mr-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                  <feature.icon className="text-primary-600 dark:text-primary-300 h-5 w-5" />
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                    {feature.name}
                  </h3>
                  <p className="mb-2 font-light text-gray-500 dark:text-gray-400">
                    {feature.description}
                  </p>
                  {feature.code && <Codeblock data={feature.code} />}
                  {feature.link && (
                    <Link
                      href={feature.link}
                      className="inline-flex items-center"
                    >
                      {feature.linkText}
                      <ChevronRightIcon className="ml-1 h-6 w-6" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm"></p>
        </div>
      </div>
    </section>
  );
}
