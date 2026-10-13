import type { CombatUnit, MissionDefinition, ModuleId, ShipDefinition, Support } from './types.ts';
export const SHIPS: ShipDefinition[] = [
  { id:'striker',name:'케스트럴',label:'STRIKE FRIGATE',role:'striker',command:2,hp:90,armor:1,attack:24,cargo:2,description:'빠른 집중 사격으로 경량 함대를 제압합니다.',color:'#8bdbd1' },
  { id:'guardian',name:'바스티온',label:'ESCORT CRUISER',role:'guardian',command:3,hp:160,armor:4,attack:10,cargo:2,description:'화물을 지닌 아군의 피해 절반을 대신 받습니다.',color:'#aebedb' },
  { id:'siege',name:'랜서',label:'SIEGE CORVETTE',role:'siege',command:3,hp:85,armor:1,attack:46,cargo:1,description:'시설 장갑을 관통합니다. 이동형 표적에는 피해 12.',color:'#e9bc86' },
  { id:'support',name:'멘더',label:'REPAIR TENDER',role:'support',command:2,hp:75,armor:1,attack:6,cargo:2,description:'승리 후 생존 함선을 30 수리합니다. 작전당 2회.',color:'#a6d9a2' },
  { id:'salvage',name:'아틀라스',label:'RECOVERY VESSEL',role:'salvage',command:1,hp:70,armor:1,attack:5,cargo:7,description:'대형 화물 모듈로 회수 성과를 높입니다.',color:'#e1c68d' },
  { id:'scout',name:'위스프',label:'PATHFINDER',role:'scout',command:1,hp:55,armor:0,attack:10,cargo:2,description:'적 드론을 피하는 우회 항로를 확보합니다.',color:'#91c6e5' },
  { id:'jammer',name:'베일',label:'ELECTRONIC WARFARE',role:'jammer',command:2,hp:70,armor:0,attack:9,cargo:1,description:'생존한 동안 적 전체의 장갑을 4 낮춥니다.',color:'#b9a5e2' },
  { id:'carrier',name:'아크',label:'LIGHT CARRIER',role:'carrier',command:4,hp:150,armor:3,attack:18,cargo:3,description:'매 라운드 함재 드론이 피해 12를 추가합니다.',color:'#e7a795' },
];
export const ROSTER = SHIPS.flatMap(s => [{ id:`${s.id}-01`, shipId:s.id }, ...(s.id === 'striker' ? [{ id:'striker-02', shipId:'striker' }] : [])]);
const enemy = (type: 'drone' | 'battery' | 'heavy' | 'transport', n: number): CombatUnit => {
  const d = {drone:[45,0,14],battery:[110,8,24],heavy:[190,12,36],transport:[60,2,8]}[type];
  return {id:`${type}-${n}`,shipId:type,name:{drone:'방어 드론',battery:'중계 포대',heavy:'심부 포대',transport:'무인 수송선'}[type],role:'enemy',kind:type==='battery'||type==='heavy'?'facility':'mobile',hp:d[0],maxHp:d[0],armor:d[1],attack:d[2],cargo:0,cargoCapacity:0,repairCharges:0};
};
export const MISSIONS: MissionDefinition[] = [
 {id:'salvage',title:'고요한 잔해지대',tag:'RECOVERY',sector:'LYRA · 04',description:'신호가 끊긴 수송선의 화물을 회수하세요. 전투를 이겨도 돌아올 공간이 필요합니다.',difficulty:'기초 작전',enemies:[enemy('drone',1),enemy('drone',2),enemy('drone',3)],bonusEnemies:[enemy('drone',1),enemy('drone',2),enemy('battery',1)],loot:6,bonusLoot:7,maxRounds:6,x:29,y:37},
 {id:'relay',title:'봉쇄된 중계 거점',tag:'BREACH',sector:'VEGA · 12',description:'장갑 포대를 무력화하고 통신 자산을 확보하세요. 공성과 전자전의 조합이 중요합니다.',difficulty:'강화 방어',enemies:[enemy('drone',1),enemy('battery',1),enemy('battery',2)],bonusEnemies:[enemy('drone',1),enemy('drone',2),enemy('heavy',1)],loot:7,bonusLoot:8,maxRounds:6,x:68,y:28},
 {id:'convoy',title:'새벽 수송선단',tag:'INTERCEPTION',sector:'ORION · 07',description:'수송선단이 이탈하기 전 5라운드 안에 제압하세요. 화력과 화물 공간을 함께 준비해야 합니다.',difficulty:'시간 제한',enemies:[enemy('transport',1),enemy('transport',2),enemy('drone',1),enemy('drone',2)],bonusEnemies:[enemy('drone',1),enemy('drone',2),enemy('drone',3),enemy('battery',1)],loot:8,bonusLoot:6,maxRounds:5,x:57,y:70},
];
export const SUPPORTS: {id:Support; name:string; label:string; description:string}[] = [
 {id:'none',name:'독립 작전',label:'SOLO',description:'지원 없이 함대 자체의 역량으로 수행합니다.'},
 {id:'recon',name:'정찰 지원',label:'PATHFINDER WING',description:'드론 1기를 피하는 우회 항로. 기본 화물 −2.'},
 {id:'jam',name:'교란 지원',label:'SIGNAL DIVISION',description:'첫 교전 첫 라운드의 적 사격을 차단합니다.'},
 {id:'supply',name:'보급 지원',label:'LOGISTICS WING',description:'첫 승리 후 생존 함선마다 HP 20을 회복합니다.'},
];
export const MODULES: {id:ModuleId;name:string;description:string;cost:number}[] = [
 {id:'bulkhead',name:'보강 격벽',description:'출격 함선 최대 HP +10',cost:20},
 {id:'cargo',name:'확장 화물',description:'출격 함선 화물 용량 +1',cost:20},
];
