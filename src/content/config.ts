import { defineCollection, z } from 'astro:content';

const researchCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    status: z.enum(['ongoing', 'completed', 'published']),
    methodology: z.array(z.string()),
    collaborators: z.array(z.string()).optional(),
    tags: z.array(z.string()),
    confidence: z.enum(['exploratory', 'developing', 'established']),
    connections: z.array(z.string()).optional(),
  }),
});

const frameworksCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    domain: z.array(z.string()),
    scope: z.enum(['local', 'domain-specific', 'universal']),
    epistemology: z.string(),
    applications: z.array(z.string()),
    tags: z.array(z.string()),
    maturity: z.enum(['hypothesis', 'framework', 'theory']),
    connections: z.array(z.string()).optional(),
  }),
});

const notesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    tags: z.array(z.string()),
    type: z.enum(['atomic', 'synthesis', 'question', 'observation']),
    connections: z.array(z.string()).optional(),
    confidence: z.enum(['speculation', 'working-hypothesis', 'established']),
  }),
});

const applicationsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    institution: z.string(),
    program: z.string(),
    deadline: z.date(),
    status: z.enum(['draft', 'submitted', 'accepted', 'declined']),
    materials: z.array(z.string()),
  }),
});

const bridgesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    cultural_contexts: z.array(z.string()),
    domains: z.array(z.string()),
    insights: z.array(z.string()),
    tags: z.array(z.string()),
  }),
});

const synthesisCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    integrates: z.array(z.string()),
    methodology: z.string(),
    implications: z.array(z.string()),
    tags: z.array(z.string()),
  }),
});

export const collections = {
  'research': researchCollection,
  'frameworks': frameworksCollection,
  'notes': notesCollection,
  'applications': applicationsCollection,
  'bridges': bridgesCollection,
  'synthesis': synthesisCollection,
};