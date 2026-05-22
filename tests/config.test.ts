import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadConfig } from '../src/config/config.js';

describe('loadConfig', () => {
  it('parses the example config with defaults', () => {
    const cfg = loadConfig(resolve(process.cwd(), 'config/config.example.toml'));
    expect(cfg.bot.name).toBe('Yuzu');
    expect(cfg.command.default_cooldown_seconds).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(cfg.keyword.group)).toBe(true);
    expect(cfg.color_role.role_name_prefix).toBe('color:');
  });
});
