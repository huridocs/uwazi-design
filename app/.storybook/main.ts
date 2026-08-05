import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp"
  ],
  // The app's public assets, so stories that render real documents (PdfPageThumb)
  // get the same files the app does rather than a permanent blank sheet.
  "staticDirs": ["../public"],
  "framework": "@storybook/react-vite"
};
export default config;