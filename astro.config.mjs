// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { rehypeSectionWrapper } from './src/lib/rehype-section-wrapper.js';

// https://astro.build/config
export default defineConfig({
  integrations: [
    mdx({
      rehypePlugins: [rehypeSectionWrapper],
    }),
  ],
});
