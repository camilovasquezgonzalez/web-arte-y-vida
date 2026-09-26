// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  adapter: vercel({
    includeFiles: ['TCULTURA_API_KEY.txt']
  }),
  vite: {
    plugins: [tailwindcss()]
  }
});
