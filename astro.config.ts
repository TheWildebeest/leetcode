import { defineConfig, envField } from "astro/config";

import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";

import { loadEnv } from "vite";

const { ASTRO_SITE_URL: SITE_URL, ASTRO_SITE_BASE: SITE_BASE } = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), 'ASTRO')

export default defineConfig({
  site: SITE_URL,
  base: SITE_BASE,
  integrations: [sitemap(), mdx()],
  markdown: {
    shikiConfig: { theme: "css-variables" }
  },
  env: {
    schema: {
      SITE_URL: envField.string({ context: 'server', access: 'secret' }),
      SITE_BASE: envField.string({ context: 'server', access: 'secret' }),
    },
  },
});
