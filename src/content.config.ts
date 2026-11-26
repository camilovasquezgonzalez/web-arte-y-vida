import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.date().or(z.string()),
    categories: z.array(z.string()).optional(),
    coverImage: z.string().optional(),
    editorial: z.object({
      eyebrow: z.string(),
      lead: z.string(),
      location: z.string(),
      coverCaption: z.string(),
      stats: z.array(z.object({ value: z.string(), label: z.string() })),
      sections: z.array(z.object({ id: z.string(), label: z.string() })),
    }).optional(),
  }),
});

export const collections = { posts };
