// @vitest-environment jsdom
import { it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import GuildPanel from "../src/components/GuildPanel.tsx";
import { initialGuildState } from "../src/guild/rules.ts";
import { upgradeWorld } from "../src/empire/migration.ts";
import { guildView, applyWorldGuildCommand } from "../src/empire/world.ts";
import { applyEmpireAction, projectEmpire } from "../src/empire/rules.ts";
import type { GuildApi } from "../src/guild/api.ts";
beforeEach(()=>sessionStorage.clear());afterEach(cleanup);
it("displays constructed inventory in the shared operation fleet selector",async()=>{
  let world=upgradeWorld(initialGuildState(0),0);world.pilots[0].empire=projectEmpire(applyEmpireAction(world.pilots[0].empire,{type:"build-ships",planetId:"nova-prime",shipId:"striker",quantity:1},0,"built"),40000);
  const api:GuildApi={read:async()=>({state:guildView(world),serverTime:40000}),connect:async pilotId=>({pilotId,token:"test"}),command:async(s,c)=>{world=applyWorldGuildCommand(world,s.pilotId,c,40000);return {state:guildView(world),serverTime:40000,receipt:{pilotId:s.pilotId,commandId:c.commandId,revision:world.revision},duplicate:false};}};
  render(<GuildPanel api={api}/>);fireEvent.click(screen.getByRole("button",{name:"참가자로 연결"}));await screen.findByText("노바 · 연결됨");
  fireEvent.click(screen.getByRole("button",{name:"정찰대 예약"}));await screen.findByRole("button",{name:"역할 추천 편성"});
  expect(await screen.findByRole("button",{name:"케스트럴 03 편성"})).toBeTruthy();
  for(const name of ["케스트럴 03 편성","위스프 01 편성","바스티온 01 편성","아틀라스 01 편성"]) fireEvent.click(screen.getByRole("button",{name}));
  fireEvent.click(screen.getByRole("button",{name:"정찰대 수행"}));
  await waitFor(()=>expect(world.operation.slots.recon.completed).toBe(true));
  expect(world.operation.slots.recon.report!.fleet.some(u=>u.id==="built-ship-0")).toBe(true);
});
