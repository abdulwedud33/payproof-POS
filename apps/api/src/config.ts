import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default(isTest ? 'test' : 'development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().default(isTest ? 'postgres://app_api:CHANGE_ME@localhost:5432/payproof' : ''),
  MIGRATOR_DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().default(isTest ? 'CHANGE_ME_LONG_RANDOM' : ''),
  JWT_REFRESH_SECRET: z.string().default(isTest ? 'CHANGE_ME_LONG_RANDOM' : ''),
  ACCOUNT_ENCRYPTION_KEY: z.string().default('dGVzdF8zMl9ieXRlc19lbmNyeXB0aW9uX2tleV8xMjM='),
  PUBLIC_API_BASE_URL: z.string().default('http://localhost:3000'),
  RECEIPT_RETENTION_DAYS: z.coerce.number().default(30),
});

export type Config = z.infer<typeof ConfigSchema>;

let parsedConfig: Config;
try {
  parsedConfig = ConfigSchema.parse(process.env);
} catch (err) {
  if (isTest) {
    parsedConfig = {
      NODE_ENV: 'test',
      PORT: 3000,
      HOST: '0.0.0.0',
      DATABASE_URL: 'postgres://app_api:CHANGE_ME@localhost:5432/payproof',
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: 'CHANGE_ME_LONG_RANDOM',
      JWT_REFRESH_SECRET: 'CHANGE_ME_LONG_RANDOM',
      ACCOUNT_ENCRYPTION_KEY: 'dGVzdF8zMl9ieXRlc19lbmNyeXB0aW9uX2tleV8xMjM=',
      PUBLIC_API_BASE_URL: 'http://localhost:3000',
      RECEIPT_RETENTION_DAYS: 30,
    };
  } else {
    console.error('Invalid configuration / environment variables:', err);
    process.exit(1);
  }
}

export const config = parsedConfig;
