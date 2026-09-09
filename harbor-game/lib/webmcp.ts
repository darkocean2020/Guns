import type { Engine } from './engine';
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => unknown;
};
export function registerHarborTools(game: Engine) {
  const context = (
    document as Document & {
      modelContext?: {
        registerTool: (
          tool: Tool,
          options: { signal: AbortSignal },
        ) => void | Promise<void>;
      };
    }
  ).modelContext;
  if (!context?.registerTool) return () => {};
  const life = new AbortController();
  const empty = { type: 'object', properties: {}, additionalProperties: false };
  const validate = (input: unknown) => {
    if (
      !input ||
      typeof input !== 'object' ||
      Array.isArray(input) ||
      Object.keys(input).length
    )
      throw Error('Expected an empty object');
  };
  const tools: Tool[] = [
    {
      name: 'read_harbor_status',
      description:
        'Read current raid status and safe-house stash without changing the game.',
      inputSchema: empty,
      annotations: { readOnlyHint: true },
      execute(input) {
        validate(input);
        const r = game.raid;
        return {
          mode: r.mode,
          health: r.hp,
          time: r.time,
          credits: r.profile.credits,
          stash: r.profile.stash,
          bag: r.bag,
          secure: r.secure,
        };
      },
    },
    {
      name: 'sell_harbor_stash',
      description:
        'Sell all safely extracted stash items for credits. Only available in the safe-house menu; this completes the sale.',
      inputSchema: empty,
      annotations: { readOnlyHint: false },
      execute(input) {
        validate(input);
        if (game.raid.mode !== 'menu')
          throw Error('Return to the safe house before selling');
        const sold = game.raid.sellStash();
        game.refresh();
        return {
          soldValue: sold,
          credits: game.raid.profile.credits,
          stashCount: game.raid.profile.stash.length,
        };
      },
    },
  ];
  for (const tool of tools) {
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: life.signal }),
      ).catch(() => {});
    } catch {}
  }
  return () => life.abort();
}
