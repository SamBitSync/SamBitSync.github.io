import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { validateForest } from './lib/forest';
import { createInquirySchema } from './lib/process-schema';
import { processJsonLoader } from './lib/process-json-loader';

// Maps: Cross-domain blog posts exploring connections, patterns, and conceptual mappings
const mapsCollection = defineCollection({
  loader: glob({ base: './src/content/maps', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    mapType: z.enum(['moc', 'synthesis', 'literature', 'conceptual']),
    aspects: z.array(z.enum(['cognition', 'computation', 'code', 'culture', 'complexity', 'constraint', 'causation', 'coordination', 'meta-theory', 'methodology'])),
    patterns: z.array(z.string()).optional(),
    connections: z.array(z.string()).optional(),
    diagram: z.string().optional(),
    visualType: z.array(z.enum(['diagram', 'animation', 'data-viz', 'interactive', 'text'])).optional(),
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
    maturity: z.enum(['seedling', 'budding', 'evergreen']),
    tags: z.array(z.string()).optional(),
    diagram: z.string().optional(),
  }),
});

// Process: Lab notebook documenting ongoing work
const processCollection = defineCollection({
  loader: glob({ base: './src/content/process', pattern: '*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    dimension: z.enum([
      'formal',
      'empirical',
      'implementation',
      'troubleshooting',
      'exploration',
      'canon',
      'structured-learning',
      'readings'
    ]),
    project: z.string().optional(),
    status: z.enum(['in-progress', 'blocked', 'completed']),
    tools: z.array(z.string()).optional(),
    visualType: z.array(z.enum(['diagram', 'data-viz', 'code', 'animation'])).optional(),
    tags: z.array(z.string()).optional(),
    diagram: z.string().optional(),
    source: z.string().optional(),
    series: z.string().optional(),
    seriesTitle: z.string().optional(),
    seriesFocus: z.string().optional(),
    forest: z.string().optional(),
  }),
});

const judgment = z.object({ date: z.string().date(), reason: z.string().min(1) });
const forestCollection = defineCollection({
 loader: processJsonLoader('./src/content/forest'),
 schema: z.object({
  version: z.literal(2), example: z.boolean().optional(),
  nodes: z.array(z.object({
   id: z.string().regex(/^[a-z0-9-]+$/), label: z.string().min(1), question: z.string().min(1), first_encountered: z.string().date(),
   process_note: z.string().optional(), dissolved: judgment.optional(),
   domain: z.enum(['technical','philosophical']).optional(), closure: z.enum(['convergent','divergent']).optional(),
   thought_i_knew: z.boolean().optional(), due: z.string().date().optional(), predicament: z.enum(['p','b']).optional(), note: z.string().optional(),
  }).strict()),
  edges: z.array(z.object({ id: z.string().min(1), from: z.string(), to: z.string(), type: z.literal('sharpens'), attempt: z.string() }).strict()),
  dissolutions: z.array(judgment.extend({ edge: z.string() })),
  attempts: z.array(z.object({
   id: z.string().regex(/^[a-z0-9-]+$/), root: z.string(), date: z.string().date(), root_commit: z.string().regex(/^[a-f0-9]{40}$/i).optional(),
   duration_minutes: z.number().positive().optional(), title: z.string().min(1).optional(), note: z.string().optional(),
   events: z.array(z.discriminatedUnion('type',[
    z.object({ type: z.literal('push'), node: z.string() }).strict(),
    z.object({ type: z.literal('pop'), node: z.string(), note: z.string().optional() }).strict(),
    z.object({ type: z.literal('reflect'), node: z.string(), note: z.string().min(1) }).strict(),
    z.object({ type: z.literal('expose'), from: z.string(), node: z.string() }).strict(),
    z.object({ type: z.literal('stop'), reason: z.enum(['time_budget','deferred','popped_to_root']), note: z.string().optional() }).strict(),
   ])).min(1),
  }).strict()),
 }).strict().superRefine((data,ctx) => { for (const message of validateForest(data)) ctx.addIssue({ code: 'custom', message }); }),
});

// Project: Portfolio of completed research outputs
const projectCollection = defineCollection({
  loader: glob({ base: './src/content/project', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    datePrecision: z.enum(["day", "month"]).default("day"),
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
    partner: z.object({
      name: z.string(),
      url: z.string().optional(),
      logo: z.string(),
    }).optional(),
  }),
});

const inquiriesCollection=defineCollection({
 loader:processJsonLoader('./src/content/inquiries'),
 schema:createInquirySchema(z),
});
export const collections = {
 'inquiries':inquiriesCollection,
  'maps': mapsCollection,
  'meta': metaCollection,
  'process': processCollection,
  'forest': forestCollection,
  'project': projectCollection,
};
