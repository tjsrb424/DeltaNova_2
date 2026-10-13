import type {
  BattleEvent,
  BattleOptions,
  BattleResult,
  CombatUnit,
} from "./types.ts";
const byId = (a: CombatUnit, b: CombatUnit) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const alive = (units: CombatUnit[]) => units.filter((u) => u.hp > 0);
function targetFor(
  source: CombatUnit,
  targets: CombatUnit[],
  enemySide: boolean,
): CombatUnit {
  return [...targets].sort((a, b) => {
    if (enemySide)
      return (
        b.cargo - a.cargo || b.cargoCapacity - a.cargoCapacity || byId(a, b)
      );
    const preferred = source.role === "siege" ? "facility" : "mobile";
    return (
      Number(b.kind === preferred) - Number(a.kind === preferred) ||
      a.hp - b.hp ||
      byId(a, b)
    );
  })[0];
}
export function resolveBattle(
  inputFleet: CombatUnit[],
  inputEnemies: CombatUnit[],
  options: BattleOptions,
): BattleResult {
  const fleet = structuredClone(inputFleet).sort(byId),
    enemies = structuredClone(inputEnemies).sort(byId);
  const events: BattleEvent[] = [];
  let rounds = 0,
    cargoLost = 0;
  for (
    let round = 1;
    round <= options.maxRounds && alive(fleet).length && alive(enemies).length;
    round++
  ) {
    rounds = round;
    const friends = alive(fleet),
      foes = alive(enemies);
    const damage = new Map<string, number>();
    const recordHit = (
      source: CombatUnit,
      target: CombatUnit,
      amount: number,
      type: "damage" | "drone",
    ) => {
      damage.set(target.id, (damage.get(target.id) || 0) + amount);
      events.push({
        round,
        type,
        actor: source.id,
        target: target.id,
        amount,
        text: `${source.name} → ${target.name} ${amount} 피해`,
      });
    };
    const electronic = friends.some((s) => s.role === "jammer");
    for (const source of friends) {
      const target = targetFor(source, foes, false);
      const siege = source.role === "siege";
      const armor =
        siege && target.kind === "facility"
          ? 0
          : Math.max(0, target.armor - (electronic ? 4 : 0));
      recordHit(
        source,
        target,
        Math.max(
          1,
          (siege && target.kind === "mobile" ? 12 : source.attack) - armor,
        ),
        "damage",
      );
      if (source.role === "carrier")
        recordHit(
          source,
          target,
          Math.max(1, 12 - Math.max(0, target.armor - (electronic ? 4 : 0))),
          "drone",
        );
    }
    const jam =
      options.support === "jam" && options.stage === "primary" && round === 1;
    if (jam)
      events.push({
        round,
        type: "jam",
        amount: foes.length,
        text: `교란 지원 · 적 ${foes.length}기의 첫 사격 차단`,
      });
    else
      for (const source of foes) {
        const target = targetFor(source, friends, true);
        recordHit(
          source,
          target,
          Math.max(1, source.attack - target.armor),
          "damage",
        );
      }
    const guardian = friends.find((u) => u.role === "guardian");
    if (guardian && friends.length > 1) {
      const protectedShip = friends
        .filter((u) => u.id !== guardian.id)
        .sort(
          (a, b) =>
            b.cargo - a.cargo || a.hp * b.maxHp - b.hp * a.maxHp || byId(a, b),
        )[0];
      const redirected = Math.floor((damage.get(protectedShip.id) || 0) / 2);
      if (redirected) {
        damage.set(
          protectedShip.id,
          (damage.get(protectedShip.id) || 0) - redirected,
        );
        damage.set(guardian.id, (damage.get(guardian.id) || 0) + redirected);
        events.push({
          round,
          type: "guard",
          actor: guardian.id,
          target: protectedShip.id,
          amount: redirected,
          text: `${guardian.name} · ${protectedShip.name} 피해 ${redirected} 엄호`,
        });
      }
    }
    for (const u of [...friends, ...foes]) {
      u.hp = Math.max(0, u.hp - (damage.get(u.id) || 0));
      if (!u.hp) {
        if (u.role !== "enemy") {
          cargoLost += u.cargo;
          u.cargo = 0;
        }
        events.push({
          round,
          type: "disable",
          target: u.id,
          amount: 0,
          text: `${u.name} 작전 불능`,
        });
      }
    }
  }
  const outcome = !alive(fleet).length
    ? "destroyed"
    : !alive(enemies).length
      ? "victory"
      : "repelled";
  if (outcome === "victory") {
    const repair = alive(fleet).find(
      (s) => s.role === "support" && s.repairCharges > 0,
    );
    if (repair) {
      const target = alive(fleet).sort(
        (a, b) => b.maxHp - b.hp - (a.maxHp - a.hp) || byId(a, b),
      )[0];
      const amount = Math.min(30, target.maxHp - target.hp);
      if (amount) {
        target.hp += amount;
        repair.repairCharges--;
        events.push({
          round: rounds,
          type: "repair",
          actor: repair.id,
          target: target.id,
          amount,
          text: `${repair.name} · ${target.name} HP ${amount} 복구`,
        });
      }
    }
    if (options.support === "supply" && options.stage === "primary")
      for (const u of alive(fleet)) {
        const amount = Math.min(20, u.maxHp - u.hp);
        if (amount) {
          u.hp += amount;
          events.push({
            round: rounds,
            type: "repair",
            target: u.id,
            amount,
            text: `보급 지원 · ${u.name} HP ${amount} 복구`,
          });
        }
      }
  }
  return { fleet, enemies, outcome, rounds, events, cargoLost };
}
