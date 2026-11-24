import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// A `slug` in frontmatter overrides the entry id, which is the problem's URL
const problems = defineCollection({
  loader: glob({
    base: './src/content/problems',
    pattern: '**/*.{md,mdx}',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    problemNumber: z.string(),
    published: z.boolean().default(false),
  }),
});

export const collections = { problems };
