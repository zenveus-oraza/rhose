import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Load environment variables for drizzle-kit CLI usage
config();

export default defineConfig({
  schema: './src/db/schema',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
