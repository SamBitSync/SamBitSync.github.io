// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { rehypeSectionWrapper } from './src/lib/rehype-section-wrapper.js';
import wikiLinkPlugin from 'remark-wiki-link';

// https://astro.build/config
export default defineConfig({
  integrations: [
    mdx({
      remarkPlugins: [
        [wikiLinkPlugin, {
          pageResolver: (name) => [name.toLowerCase().replace(/\s+/g, '-')],
          hrefTemplate: (permalink) => `/meta/${permalink}`,
          wikiLinkClassName: 'wiki-link',
          newClassName: 'new'
        }]
      ],
      rehypePlugins: [rehypeSectionWrapper],
    }),
  ],
});
