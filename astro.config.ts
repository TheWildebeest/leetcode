import { defineConfig, envField } from "astro/config";

import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";

export default defineConfig({
  site: 'https://thewildebeest.github.io',
  base: '/leetcode',
  integrations: [sitemap(), mdx()],
  markdown: {
    shikiConfig: { theme: "css-variables" }
  },
});
