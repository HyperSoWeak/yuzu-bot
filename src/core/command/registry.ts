import type { Command, CommandCategory } from './types.js';

class CommandRegistry {
  private readonly commands = new Map<string, Command>();

  register(command: Command): void {
    const name = command.data.name;
    if (!name) throw new Error('command.data.name is required');
    if (this.commands.has(name)) {
      throw new Error(`duplicate command registered: ${name}`);
    }
    this.commands.set(name, command);
  }

  registerAll(commands: readonly Command[]): void {
    for (const c of commands) this.register(c);
  }

  get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  list(): Command[] {
    return [...this.commands.values()];
  }

  listByCategory(category: CommandCategory): Command[] {
    return this.list().filter((c) => c.category === category);
  }

  size(): number {
    return this.commands.size;
  }
}

export const commandRegistry = new CommandRegistry();
