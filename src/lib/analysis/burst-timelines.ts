import type {
  BurstDefinition,
  BurstTimelines,
  BurstWindow,
  FetchedLog,
  LogSlot,
} from "@/types/analysis";

const BURST_DEFINITIONS: Record<string, BurstDefinition> = {
  "Paladin:Holy": {
    className: "Paladin",
    specialization: "Holy",
    triggerAbilityID: 31884,
    durationMs: 20_000,
    label: "Avenging Wrath",
  },
  "Evoker:Preservation": {
    className: "Evoker",
    specialization: "Preservation",
    triggerAbilityID: 370537,
    durationMs: 30_000,
    label: "Stasis",
  },
  "Warlock:Demonology": {
    className: "Warlock",
    specialization: "Demonology",
    triggerAbilityID: 265187,
    durationMs: 15_000,
    label: "Summon Demonic Tyrant",
  },
  "Mage:Arcane": {
    className: "Mage",
    specialization: "Arcane",
    triggerAbilityID: 365350,
    durationMs: 16_000,
    label: "Arcane Surge",
  },
};

/** Resolve a regra de burst cadastrada para a classe e especialização informadas. */
export function getBurstDefinition(
  className?: string,
  specialization?: string,
): BurstDefinition | undefined {
  if (!className || !specialization) return undefined;
  return BURST_DEFINITIONS[`${className}:${specialization}`];
}

/** Calcula as duas primeiras janelas de casts concluídos para o personagem do log. */
export function buildBurstWindows(
  log: FetchedLog,
  definition: BurstDefinition,
): (BurstWindow | null)[] {
  const playerCasts = log.casts
    .filter((event) => event.type === "cast" && event.sourceID === log.metadata.sourceID)
    .sort((left, right) => left.timestamp - right.timestamp);
  const triggers = playerCasts
    .filter((event) => event.abilityID === definition.triggerAbilityID)
    .slice(0, 2);

  return [0, 1].map((index) => {
    const trigger = triggers[index];
    if (!trigger) return null;

    const windowEnd = trigger.timestamp + definition.durationMs;
    const casts = playerCasts
      .filter((event) => event.timestamp >= trigger.timestamp && event.timestamp < windowEnd)
      .map((event) => ({
        offsetMs: event.timestamp - trigger.timestamp,
        abilityID: event.abilityID,
        abilityName: log.abilityNames[event.abilityID] ?? `Habilidade ${event.abilityID}`,
        ...(log.abilityIcons[event.abilityID]
          ? { abilityIcon: log.abilityIcons[event.abilityID] }
          : {}),
      }));

    return { label: definition.label, durationMs: definition.durationMs, casts };
  });
}

/** Calcula janelas independentes para os três logs quando o jogador tem uma regra. */
export function buildBurstTimelines(logs: Record<LogSlot, FetchedLog>): BurstTimelines | undefined {
  const definition = getBurstDefinition(
    logs.player.metadata.className,
    logs.player.metadata.specialization,
  );
  if (!definition) return undefined;

  return {
    durationMs: definition.durationMs,
    player: buildBurstWindows(logs.player, definition),
    referenceOne: buildBurstWindows(logs.referenceOne, definition),
    referenceTwo: buildBurstWindows(logs.referenceTwo, definition),
  };
}
