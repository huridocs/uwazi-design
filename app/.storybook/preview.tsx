import type { Preview } from "@storybook/react-vite";
import "../src/index.css";

/** Stories render on the app's real token system: `src/index.css` pulls in
 *  tokens.css (light/dark real vars) + the @theme bridges, so utilities like
 *  bg-paper/text-ink resolve exactly as in the app. The toolbar theme toggle
 *  flips `:root.dark` — the same mechanism the app uses — so every story is
 *  auditable in both modes. */
const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "todo",
    },
  },
  globalTypes: {
    theme: {
      description: "Color mode",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (Story, ctx) => {
      const dark = ctx.globals.theme === "dark";
      document.documentElement.classList.toggle("dark", dark);
      return (
        <div className="min-h-screen bg-parchment p-6 font-sans text-ink">
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
