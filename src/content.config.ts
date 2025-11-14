import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Maps: Cross-domain blog posts exploring connections, patterns, and conceptual mappings
const mapsCollection = defineCollection({
  loader: glob({ base: './src/content/maps', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    mapType: z.enum(['moc', 'synthesis', 'literature', 'conceptual']),
    aspects: z.array(z.enum(['cognition', 'computation', 'code', 'culture', 'complexity', 'constraint', 'causation', 'coordination'])),
    patterns: z.array(z.string()).optional(),
    connections: z.array(z.string()).optional(),
    diagram: z.string().optional(),
    visualType: z.array(z.enum(['diagram', 'animation', 'data-viz', 'interactive'])).optional(),
  }),
});

// Meta: Epistemological framework pieces
const metaCollection = defineCollection({
  loader: glob({ base: './src/content/meta', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    framework: z.string(),
    category: z.string(),
    thinkers: z.array(z.string()).optional(),
    relatedMaps: z.array(z.string()).optional(),
    maturity: z.enum(['draft', 'in-use', 'established']),
    tags: z.array(z.string()).optional(),
    diagram: z.string().optional(),
  }),
});

// Process: Lab notebook documenting ongoing work
const processCollection = defineCollection({
  loader: glob({ base: './src/content/process', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    dimension: z.enum(['formal', 'empirical', 'implementation', 'troubleshooting', 'exploration']),
    project: z.string().optional(),
    status: z.enum(['in-progress', 'blocked', 'completed']),
    tools: z.array(z.string()).optional(),
    visualType: z.array(z.enum(['diagram', 'data-viz', 'code', 'animation'])).optional(),
    tags: z.array(z.string()).optional(),
    diagram: z.string().optional(),
    source: z.string().optional(),
  }),
});

// Project: Portfolio of completed research outputs
const projectCollection = defineCollection({
  loader: glob({ base: './src/content/project', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    type: z.enum(['research', 'tool', 'paper', 'application', 'storymap']),
    status: z.enum(['completed', 'published', 'deployed']),
    collaborators: z.array(z.string()).optional(),
    methodology: z.array(z.string()).optional(),
    outputs: z.array(z.object({
      type: z.string(),
      url: z.string().optional(),
      label: z.string().optional(),
    })),
    relatedProcess: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    featured: z.boolean().optional(),
    thumbnail: z.string().optional(),
  }),
});

export const collections = {
  'maps': mapsCollection,
  'meta': metaCollection,
  'process': processCollection,
  'project': projectCollection,
};
