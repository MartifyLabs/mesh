import TwoColumnsScroll from "~/components/sections/two-columns-scroll";
import Codeblock from "~/components/text/codeblock";

export default function SvelteSetup() {
  return (
    <TwoColumnsScroll
      sidebarTo="svelteSetup"
      title="Setup"
      leftSection={Left()}
    />
  );
}

function Left() {
  let addStyle = ``;
  addStyle += `<script lang="ts">\n`;
  addStyle += `	import '@meshsdk/svelte/styles.css';\n`;
  addStyle += `	let { children } = $props();\n`;
  addStyle += `</script>\n`;
  addStyle += `\n`;
  addStyle += `{@render children()}\n`;

  return (
    <>
      <p>
        The fastest way to get started a new project with Svelte is to use the
        Mesh-CLI, which will scaffold a new project for you. To do this, run the
        following:
      </p>
      <Codeblock data={`npx meshjs your-app-name`} />

      <p>
        During the installation process, you will be asked to choose a template.
        Choose the Svelte template. This will scaffold a new Svelte project with
        Mesh pre-installed.
      </p>

      <p>To manually, install the Mesh Svelte package, run the following:</p>
      <Codeblock data={`npm install @meshsdk/svelte`} />

      <p>
        Next, add the Mesh CSS to your application, doing so will apply the
        default styles to the components. You can add this in{" "}
        <code>+layout.svelte</code>.
      </p>
      <Codeblock data={addStyle} />
    </>
  );
}
