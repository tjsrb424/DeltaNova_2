import { useEffect, useRef, useState } from "react";
import type { EmpireApi } from "./api.ts";
import type { EmpireState } from "./types.ts";

interface CompletionNotice { key: string; text: string }
interface ObservedNotice { api: EmpireApi; owner: string; notice: CompletionNotice }
// Retain observations across menu navigation, bounded by the server's event list.
const histories = new WeakMap<EmpireApi, Map<string, Set<string>>>();

export function useCompletionNotice(api: EmpireApi, state: EmpireState | undefined) {
  const [notice, setNotice] = useState<ObservedNotice | null>(null);
  const owner = useRef<{api: EmpireApi; id: string} | null>(null);

  useEffect(() => {
    if (!state) {
      owner.current = null;
      setNotice(null);
      return;
    }
    let actors = histories.get(api);
    if (!actors) { actors = new Map(); histories.set(api, actors); }
    const previous = actors.get(state.homePlanetId);
    actors.set(state.homePlanetId, new Set(state.events.map(event => event.id)));
    if (owner.current?.api !== api || owner.current.id !== state.homePlanetId || !previous) setNotice(null);
    owner.current = {api, id: state.homePlanetId};
    if (!previous) return;

    const completed = state.events.filter(event => event.kind === "completed" && !previous.has(event.id));
    if (completed.length === 0) return;
    setNotice({
      api, owner: state.homePlanetId,
      notice: {
        key: completed.map(event => event.id).join("|"),
        text: completed.map(event => `${state.planets.find(planet => planet.id === event.planetId)?.name || "기지"} · ${event.title}`).join(" / "),
      },
    });
  }, [api, state]);

  return notice?.api === api && notice.owner === state?.homePlanetId ? notice.notice : null;
}
