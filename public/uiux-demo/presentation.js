// Read-only comparison cards for this design study. These are example values,
// never an alternative economy implementation or a command quote.
export const facilityCards = {
  alloyMine: {name:'합금 광산', icon:'alloy', effect:'이 시설의 합금 생산', values:['—','+6','+12','+18','+24'], unit:'/분', condition:'발전소 Lv.1 · 시설 공간 1', note:'선체와 시설에 필요한 합금을 생산합니다.'},
  crystalMine: {name:'결정 채굴소', icon:'crystal', effect:'이 시설의 결정 생산', values:['—','+4','+8','+12','+16'], unit:'/분', condition:'발전소 Lv.1 · 시설 공간 1', note:'연구와 정밀 장비에 필요한 결정을 생산합니다.'},
  fuelRefinery: {name:'연료 합성소', icon:'fuel', effect:'이 시설의 연료 생산', values:['—','+4','+8','+12','+16'], unit:'/분', condition:'발전소 Lv.1 · 시설 공간 1', note:'함대 운용에 사용할 연료를 생산합니다.'},
  powerPlant: {name:'발전소', icon:'build', effect:'전력 공급', values:['—','60','120','180','240'], unit:'전력', condition:'시설 공간 1', note:'생산 시설과 조선소를 가동할 전력을 공급합니다.'},
  shipyard: {name:'궤도 조선소', icon:'station', effect:'건조 설비', values:['미설치','기본 함종','호위·공성','항모 설비','확장 설비'], unit:'', condition:'필요 기술은 함종별로 확인 · 시설 공간 1', note:'함종별 기술 조건과 함께 건조 가능한 함선이 늘어납니다.'},
  laboratory: {name:'연구소', icon:'research', effect:'지원 연구 수준', values:['미설치','Lv.1','Lv.2','Lv.3','Lv.3'], unit:'', condition:'시설 공간 1 · 다음 연구 수준 이상의 연구소', note:'제국 공통 기술을 연구하는 현지 기반 시설입니다.'},
};
const exampleCosts = [
  {alloy:40,crystal:10,fuel:10,time:'1분'},
  {alloy:40,crystal:10,fuel:10,time:'1분'},
  {alloy:80,crystal:20,fuel:20,time:'2분'},
  {alloy:120,crystal:30,fuel:30,time:'3분'},
];
const labCosts = [
  {alloy:60,crystal:30,fuel:10,time:'1분 30초'},
  {alloy:60,crystal:30,fuel:10,time:'1분 30초'},
  {alloy:120,crystal:60,fuel:20,time:'3분'},
  {alloy:180,crystal:90,fuel:30,time:'4분 30초'},
];
export function facilityPreview(planet, key) {
  if (!facilityCards[key]) key = 'fuelRefinery';
  const card = facilityCards[key], level = planet.facilities[key];
  const cost = (['shipyard','laboratory'].includes(key) ? labCosts : exampleCosts)[Math.min(level,3)];
  return {...card, key, level, next:level+1, before:card.values[Math.min(level,4)], after:card.values[Math.min(level+1,4)], cost,
    affordable:Object.entries(cost).filter(([k])=>k!=='time').every(([k,v])=>planet.resources[k]>=v)};
}
