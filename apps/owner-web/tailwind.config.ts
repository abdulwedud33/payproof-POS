import type { Config } from 'tailwindcss';
import { tailwindPreset } from '@payproof/ui-tokens';

const config: Config = {
  presets: [tailwindPreset as any],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
