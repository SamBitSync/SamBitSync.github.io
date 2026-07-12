// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { rehypeSectionWrapper } from './src/lib/rehype-section-wrapper.js';
import wikiLinkPlugin from 'remark-wiki-link';

// https://astro.build/config
export default defineConfig({
  site: 'https://sambit.com.np',
  redirects: {
    '/research': '/project',
    '/research-static': '/project',
    '/frameworks': '/meta',
    '/notes': '/meta',
    '/notes/critical-realism': '/meta/critical-realism',
  },
  integrations: [
    sitemap(),
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
