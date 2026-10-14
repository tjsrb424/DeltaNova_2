import { EmpireIcon } from "./EmpireUI.tsx";
import { useLayoutEffect, useRef } from "react";
export type NavigationSection = "planet" | "construction" | "fleet" | "research" | "career" | "guild" | "reports" | "practice";
const menus: [NavigationSection, string, string][] = [["planet", "대시보드", "planet"], ["construction", "건설", "build"], ["fleet", "함대", "fleet"], ["research", "연구", "research"], ["career", "개인 작전", "fleet"], ["guild", "동맹", "guild"], ["reports", "보고서", "reports"]];
export default function OperationsNav({ active, onNavigate, locked = false, guild = true, practice = true }: { active: NavigationSection; onNavigate: (section: NavigationSection) => void; locked?: boolean; guild?: boolean; practice?: boolean }) {
  const current=useRef<HTMLButtonElement>(null);
  useLayoutEffect(()=>{const group=current.current?.parentElement;const reveal=()=>{if(group&&group.scrollWidth>group.clientWidth) current.current?.scrollIntoView?.({block:"nearest",inline:"nearest",behavior:"instant"});};reveal();const observer=group&&typeof ResizeObserver!=="undefined"?new ResizeObserver(reveal):null;if(group) observer?.observe(group);return ()=>observer?.disconnect();},[active]);
  return <nav className="planet-nav" aria-label="제국 메뉴">
    <div className="empire-brand"><span aria-hidden="true">Δ</span><strong>DELTA<br/>NOVA</strong></div>
    <div className="planet-navigation">{menus.filter(([id]) => id !== "guild" || guild).map(([id, name, icon]) => <button key={id} ref={active===id?current:undefined} aria-label={name} aria-current={active === id ? "page" : undefined} className={active === id ? "active" : ""} disabled={locked} title={locked ? "작전 보고서를 마무리한 뒤 이동할 수 있습니다." : name} onClick={() => onNavigate(id)}><EmpireIcon kind={icon}/>{name}</button>)}</div>
    <div className="planet-navigation nav-secondary">{practice && <button aria-label="편성 연습" aria-current={active === "practice" ? "page" : undefined} className={active === "practice" ? "active" : ""} disabled={locked} onClick={() => onNavigate("practice")}><EmpireIcon kind="fleet"/>편성 연습</button>}<p>PLANET OPERATIONS</p></div>
  </nav>;
}
