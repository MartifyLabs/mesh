import TwoColumnsScroll from "~/components/sections/two-columns-scroll";
import Codeblock from "~/components/text/codeblock";

export default function ReactSetup() {
  return (
    <TwoColumnsScroll
      sidebarTo="reactSetup"
      title="Setup"
      leftSection={Left()}
    />
  );
}

function Left() {
  return (
    <>
      <p>
        The fastest way to get started a new project with React is to use the
        Mesh-CLI, which will scaffold a new project for you. To do this, run the
        following:
      </p>
      <Codeblock data={`npx meshjs your-app-name`} />

      <p>
        During the installation process, you will be asked to choose a template.
        Choose the React template. This will scaffold a new React project with
        Mesh pre-installed.
      </p>

      <p>To manually, install the Mesh React package, run the following:</p>
      <Codeblock data={`npm install @meshsdk/react`} />

      <p>
        Next, add the Mesh CSS to your application, doing so will apply the
        default styles to the components. You can add this in{" "}
        <code>/pages/_app.tsx</code>.
      </p>
      <Codeblock data={`import "@meshsdk/react/styles.css";`} />
    </>
  );
}
