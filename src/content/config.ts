import { defineCollection, z } from 'astro:content';

// Maps: Cross-domain blog posts exploring connections, patterns, and conceptual mappings
const mapsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    domains: z.array(z.string()), // e.g., ["cognitive-science", "complexity", "epistemology"]
    patterns: z.array(z.string()).optional(), // Pattern types being explored
    connections: z.array(z.string()).optional(), // Links to other content
    diagram: z.string().optional(), // Path to Excalidraw file
    visualType: z.array(z.enum(['diagram', 'animation', 'data-viz', 'interactive'])).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

// Meta: Epistemological framework pieces (critical realism, Strevens, Keller, Bayesian epistemology)
const metaCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    framework: z.string(), // e.g., "critical-realism", "bayesian-epistemology"
    thinkers: z.array(z.string()).optional(), // ["Strevens", "Keller", etc.]
    relatedMaps: z.array(z.string()).optional(), // Connections to Maps posts
    maturity: z.enum(['draft', 'working', 'established']),
    tags: z.array(z.string()).optional(),
    diagram: z.string().optional(),
  }),
});

// Process: Lab notebook documenting ongoing work across three dimensions
const processCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    dimension: z.enum(['empirical', 'formal', 'implementation']), // Primary dimension
    project: z.string().optional(), // Link to Project if applicable
    status: z.enum(['in-progress', 'blocked', 'completed']),
    tools: z.array(z.string()).optional(), // e.g., ["mousetracking", "Excalidraw", "R"]
    visualType: z.array(z.enum(['diagram', 'data-viz', 'code', 'animation'])).optional(),
    tags: z.array(z.string()).optional(),
    diagram: z.string().optional(),
  }),
});

// Project: Portfolio of completed research outputs and polished deliverables
const projectCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    type: z.enum(['research', 'tool', 'paper', 'application', 'storymap']),
    status: z.enum(['completed', 'published', 'deployed']),
    collaborators: z.array(z.string()).optional(),
    methodology: z.array(z.string()).optional(),
    outputs: z.array(z.object({
      type: z.string(), // "paper", "github", "demo", "website", etc.
      url: z.string().optional(),
      label: z.string().optional(),
    })),
    relatedProcess: z.array(z.string()).optional(), // Links to Process posts
    tags: z.array(z.string()).optional(),
    featured: z.boolean().optional(), // For highlighting key projects
    thumbnail: z.string().optional(), // Path to preview image
  }),
});

export const collections = {
  'maps': mapsCollection,
  'meta': metaCollection,
  'process': processCollection,
  'project': projectCollection,
};
