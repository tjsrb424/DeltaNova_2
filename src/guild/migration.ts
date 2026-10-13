import { validateGuildState, validateLegacyGuildState } from "./validation.ts";
import { initialBase } from "../base/rules.ts";
import type { GuildState } from "./types.ts";
export function upgradeGuildState(value: unknown, now: number): GuildState {
  const old = validateLegacyGuildState(value);
  return validateGuildState({
    ...old,
    schemaVersion: 2,
    rulesVersion: "base-operations-v2",
    pilots: old.pilots.map((p) => ({ ...p, base: initialBase(now) })),
  });
}
