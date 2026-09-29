import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { LangSwitch } from "../components/settings/pages/site/shared";
import { SyntaxBadge } from "../components/settings/pages/site/CodePageEditor";
import { PublicPreview } from "../components/site/PublicPreview";
import type { SiteLang } from "../data/sitePages";

/** The Pages editor's primitives (Settings › Pages).
 *
 *  `LangSwitch` picks the language being edited; the dot marks a language that
 *  already has content, so an empty one is visible before you open it.
 *  `SyntaxBadge` says which of Uwazi's two component syntaxes a component takes.
 *  `PublicPreview` renders page HTML, CSS and JS into a sandboxed frame. */
const meta = {
  title: "Settings/Pages",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function LangDemo() {
  const [lang, setLang] = useState<SiteLang>("en");
  return <LangSwitch value={lang} onChange={setLang} filled={(l) => l === "en" || l === "es"} />;
}

export const Default: Story = { render: () => <LangDemo /> };

export const AllStates: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <SyntaxBadge syntax="jsx" />
      <SyntaxBadge syntax="ext" />
    </div>
  ),
};

export const Preview: Story = {
  render: () => (
    <div className="h-[28rem] flex">
      <PublicPreview
        className="flex-1"
        html={`<section class="u-hero"><h1>About this collection</h1><p>Who keeps it and how to use it.</p></section>\n<Counter query="" /> entities`}
        css=""
        js=""
        chrome={{ name: "Collection", logoText: "", accent: "#1A1A1A", headingFont: "serif", nav: ["Home", "Library"], lang: "en", rtl: false, banner: "Draft — only you see this" }}
        ctx={{ entities: [] }}
        path="/en/page/about"
      />
    </div>
  ),
};
