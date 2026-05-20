import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import toml from '@iarna/toml';
import { z } from 'zod';

const ConfigSchema = z.object({
  bot: z.object({
    name: z.string().default('Yuzu'),
    github_url: z.string().url().default('https://github.com/HyperSoWeak/yuzu-bot'),
  }),
  command: z.object({
    default_cooldown_seconds: z.number().int().nonnegative().default(3),
  }),
  keyword: z.object({
    max_triggers_per_guild: z.number().int().positive().default(1000),
  }),
  achievement: z.object({
    announce_enabled: z.boolean().default(true),
  }),
  color_role: z.object({
    role_name_prefix: z.string().default('color:'),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

let cached: Config | null = null;

export function loadConfig(path = resolve(process.cwd(), 'config/config.toml')): Config {
  if (cached) return cached;

  const target = existsSync(path) ? path : resolve(process.cwd(), 'config/config.example.toml');
  const raw = readFileSync(target, 'utf8');
  const parsed = toml.parse(raw);
  const result = ConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid config at ${target}:\n${issues}`);
  }
  cached = result.data;
  return cached;
}
