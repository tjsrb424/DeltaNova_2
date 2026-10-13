import type { GuildRole } from "./types.ts";
export const LEASE_MS = 300_000;
export const PILOTS = [
  { id: "nova", name: "노바" },
  { id: "lyra", name: "리라" },
  { id: "orion", name: "오리온" },
  { id: "vega", name: "베가" },
];
export const ROLE_IDS: GuildRole[] = ["recon", "jam", "supply", "breach"];
export const GUILD_ROLES: {
  id: GuildRole;
  name: string;
  label: string;
  description: string;
  requirement: string;
  effect: string;
  recommended: string[];
}[] = [
  {
    id: "recon",
    name: "정찰대",
    label: "PATHFINDERS",
    description: "드론 2기를 제압하고 정찰함을 귀환시킵니다.",
    requirement: "위스프 생존",
    effect: "돌파 첫 교전의 드론 1기 우회",
    recommended: ["scout-01", "striker-01", "guardian-01"],
  },
  {
    id: "jam",
    name: "전자전대",
    label: "SIGNAL DIVISION",
    description: "드론과 포대를 무력화하고 교란 신호를 확보합니다.",
    requirement: "베일 생존",
    effect: "돌파 첫 라운드 적 사격 차단",
    recommended: ["jammer-01", "siege-01", "striker-01"],
  },
  {
    id: "supply",
    name: "보급대",
    label: "LOGISTICS",
    description: "수송 항로를 확보하고 보급 화물 3개를 전달합니다.",
    requirement: "아틀라스 생존 · 화물 3개",
    effect: "돌파 교전 사이 생존 함선 HP 최대 20 복구",
    recommended: ["salvage-01", "guardian-01", "striker-01", "striker-02"],
  },
  {
    id: "breach",
    name: "돌파대",
    label: "BREACH WING",
    description: "준비된 지원을 받아 외곽과 핵심 시설을 연속 공략합니다.",
    requirement: "두 교전 모두 승리",
    effect: "도약문 복구 · 기여자 전원 공동 보상",
    recommended: [
      "striker-01",
      "striker-02",
      "siege-01",
      "guardian-01",
      "support-01",
    ],
  },
];
