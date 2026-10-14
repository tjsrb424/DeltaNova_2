// Design-only authoring data. Nothing in src/ or server/ imports this module.
const req = (value = '') => Object.fromEntries(value.split(',').filter(Boolean).map(pair => {
  const [id, level] = pair.split(':'); return [id, Number(level)];
}));
const facility = (id, name, group, maxLevel, baseCost, costGrowth, baseHours, space, need, effect) =>
  ({ id, name, group, maxLevel, baseCost, costGrowth, baseHours, timeGrowth: 1.45, space, prerequisites: req(need), effect });
const research = (id, name, branch, maxLevel, baseCost, lab, need, effect, bonus = null) =>
  ({ id, name, branch, maxLevel, baseCost, costGrowth: 1.8, baseHours: lab <= 2 ? 1 : lab <= 4 ? 3 : 8,
     timeGrowth: 1.5, labLevel: lab, prerequisites: req(need), effect, bonus });
const ship = (id, name, tier, role, size, weapon, cost, hp, shield, armor, attack, speed, fuel, cargo, command, yard, need, trait, weakness) =>
  ({ id, name, tier, role, size, weapon, cost, hp, shield, armor, attack, speed, fuel, cargo, command,
     yardLevel: yard, prerequisites: req(need), trait, weakness, buildHours: Math.max(0.25, cost.reduce((a,b)=>a+b,0)/6000) });
const defense = (id, name, weapon, cost, hp, shield, armor, attack, power, foundry, need, role) =>
  ({ id, name, weapon, cost, hp, shield, armor, attack, power, foundryLevel: foundry, prerequisites: req(need), role });

export const catalog = {
  version: 'season-content-draft-2', status: 'planning-proposal', date: '2026-10-14',
  resources: ['alloy', 'crystal', 'fuel'], resourceNames: ['합금', '결정', '연료'],
  seasonDays: 84, recommendedVisitsPerDay: [1,2], sensitivityVisitsPerDay: [1,2,4],
  initialResources: [8000,5000,3500], initialLevels: {
    alloy_mine:1, crystal_mine:1, fuel_refinery:1, power_plant:1, warehouse:1, shipyard:1, laboratory:1
  },
  initialShips: { scout:1, courier:1, striker:1 },
  economy: { baseHourly: [120,90,70], productionGrowth:1.1, warehouseBase:8000, warehouseGrowth:1.6,
    energyBase:[8,9,10], powerBase:100, powerGrowth:1.15, offlineHoursCap:null,
    constructionQueue:3, researchQueue:3, productionReserveHours:36, planetFields:120,
    buildSpeedPerYardLevel:0.12, researchSpeedPerLabLevel:0.10 },
  targeting: {
    kinetic:{L:1.25,M:1,H:0.65,F:0.35}, beam:{L:0.75,M:1.15,H:1,F:0.70},
    missile:{L:0.35,M:0.90,H:1.35,F:1.10}, siege:{L:0.15,M:0.35,H:0.70,F:1.60},
    drone:{L:0.80,M:1.05,H:0.65,F:0.45}
  },
  facilities: [
    facility('alloy_mine','합금 광산','생산',15,[2400,800,0],1.58,0.5,1,'','합금 시간당 120 × L × 1.10^(L-1)'),
    facility('crystal_mine','결정 채굴소','생산',15,[1600,1400,0],1.58,0.5,1,'','결정 시간당 90 × L × 1.10^(L-1)'),
    facility('fuel_refinery','연료 합성소','생산',15,[1400,1000,600],1.58,0.5,1,'','연료 시간당 70 × L × 1.10^(L-1)'),
    facility('power_plant','발전소','전력',12,[1600,600,0],1.6,0.5,1,'','전력 100 × L × 1.15^(L-1)'),
    facility('fusion_plant','융합 발전소','전력',8,[8000,6000,3000],1.7,3,2,'fusion_drive:1,power_efficiency:3','전력 250 × L; 시간당 연료 12 × L 소비. 기본 발전 대체가 아닌 고밀도 선택'),
    facility('warehouse','통합 저장고','저장',12,[1200,800,200],1.55,0.5,1,'','자원별 8,000 × 1.60^(L-1); 저장 연구 보너스 별도'),
    facility('protected_vault','보호 창고','저장',8,[2000,1200,300],1.6,1,1,'encryption:1','자원별 500 × 1.5^(L-1) 보호, 각 저장 상한의 최대 30%'),
    facility('shipyard','궤도 조선소','산업',10,[2600,1600,400],1.65,1,2,'','함종 단계 해금; 건조 속도 +12% × (L-1)'),
    facility('laboratory','연구소','산업',10,[1800,2400,400],1.65,1,2,'','연구 해금; 연구 속도 +10% × (L-1), 연구 큐는 제국 공통 1개'),
    facility('assembly_plant','자동 조립 시설','산업',8,[6000,3000,1000],1.65,2,2,'automation:3,shipbuilding:2','현지 건조 속도 +5%/레벨, 비용 할인 없음'),
    facility('repair_dock','정비 도크','산업',8,[4000,2200,800],1.6,1.5,2,'field_repair:1','선체 수리 속도 +10%/레벨; 영구 파괴 함선은 복구하지 않음'),
    facility('orbital_dock','궤도 집결항','산업',6,[10000,6000,2400],1.7,3,2,'coordination:2','동맹 증원 편대 대기 용량 +100 지휘/레벨; 함선 복제 없음'),
    facility('sensor_array','행성 센서 배열','정보',10,[1400,2200,400],1.6,1,1,'sensors:1','접근 탐지 지수 +10/레벨; 정확한 상대 재고 노출과 별개'),
    facility('observatory','성계 관측소','정보',8,[3000,4000,1000],1.65,2,2,'astrography:1','탐사 후보 범위 +1 항로 단위/레벨, 탐사 임무 필요'),
    facility('signal_center','통신 분석실','정보',8,[3600,5400,1000],1.65,2,1,'espionage:2','정찰 보고 보존·공유, 분석 지수 +5/레벨'),
    facility('jump_beacon','항로 유도 비콘','정보',6,[12000,10000,4000],1.7,4,2,'long_range:2','공개한 아군 항로의 항행 보정 최대 15%; 순간 이동 없음'),
    facility('spaceport','우주항','물류',10,[2200,1200,400],1.6,1,1,'navigation:1','동시 비행 슬롯 기본 3 + 레벨; 조선 큐와 별개'),
    facility('fuel_depot','연료 보급소','물류',8,[2000,1000,1000],1.6,1,1,'fuel_efficiency:1','현지 작전 예비 연료 저장 +2,000/레벨, 기본 저장고와 중복 자산 없음'),
    facility('salvage_yard','잔해 처리장','물류',8,[3000,1800,500],1.6,1.5,1,'salvage_processing:1','잔해 정제 속도 +10%/레벨; 회수율 상한은 별도 45%'),
    facility('freight_hub','화물 분배 허브','물류',8,[5000,3000,1000],1.65,2,2,'cargo_compression:2,supply_network:1','정해진 수송 계획 최대 1 + 레벨; 부족·위험 시 중단'),
    facility('colony_admin','식민지 행정소','개척',8,[4000,2200,800],1.6,2,1,'navigation:2','현지 작업 계획 수 3 + floor(L/2); 무제한 행성 보너스 없음'),
    facility('terraformer','환경 조정소','개척',4,[15000,12000,5000],1.8,6,2,'terraforming:1','현지 시설 공간 +15/레벨; 기본 공간을 소급 복제하지 않음'),
    facility('command_hub','함대 지휘본부','지휘',8,[4000,2600,800],1.65,2,2,'fleet_command:1','현지 출격 지휘 용량 +50/레벨'),
    facility('defense_foundry','방어 설비 제작소','방어',8,[3000,1600,400],1.65,1.5,2,'armor:1','현지 방어 설비 해금·제작; 별도 방어 건조 라인 1개')
  ],
  researches: [
    research('automation','산업 자동화','산업',8,[900,700,200],1,'','모든 자원 생산 +3%/레벨, 최대 24%',{group:'production',perLevel:0.03,cap:0.24}),
    research('refining','정밀 정제','산업',6,[1200,1800,400],2,'automation:2','결정·연료 생산 +2%/레벨, 자동화와 가산; 추가 최대 12%',{group:'refining',perLevel:0.02,cap:0.12}),
    research('power_efficiency','전력 효율','산업',8,[1000,900,200],1,'','생산시설 전력 수요 -3%/레벨, 최대 24%',{group:'power',perLevel:0.03,cap:0.24}),
    research('storage','압축 저장','산업',10,[800,600,200],1,'','기본 저장 상한 +5%/레벨, 최대 50%',{group:'storage',perLevel:0.05,cap:0.50}),
    research('construction','건설 공학','산업',8,[1200,800,200],1,'automation:1','현지 시설 건설 속도 +7%/레벨, 최대 56%',{group:'construction',perLevel:0.07,cap:0.56}),
    research('shipbuilding','선체 조립 공학','산업',8,[2000,1600,400],2,'construction:2','함선·방어 건조 속도 +7%/레벨, 최대 56%',{group:'shipbuilding',perLevel:0.07,cap:0.56}),
    research('chemical_drive','화학 추진','추진',10,[800,500,500],1,'','경량·초기 물류 함선 속도 +4%/레벨, 최대 40%'),
    research('ion_drive','이온 추진','추진',8,[1800,2000,1200],3,'chemical_drive:2,power_efficiency:2','중형 함선 속도 +5%/레벨, 최대 40%'),
    research('fusion_drive','융합 추진','추진',6,[6000,7000,5000],5,'ion_drive:3,power_efficiency:4','대형 함선 속도 +6%/레벨, 최대 36%'),
    research('navigation','항행 계산','추진',8,[1000,1000,300],1,'chemical_drive:1','항행 속도 +2%/레벨; 엔진·비콘 포함 총 속도 보너스 최대 50%'),
    research('fuel_efficiency','연료 분사 제어','추진',8,[1400,1000,1000],2,'chemical_drive:2','비행 연료 -4%/레벨, 최대 32%'),
    research('long_range','장거리 항행','추진',6,[4000,5000,3000],4,'navigation:3,fuel_efficiency:2','장거리 출격·항로 비콘 해금; 원거리 비행 비용은 유지'),
    research('kinetic','운동탄 병기','전투',10,[1200,600,200],1,'','운동탄 공격 +3%/레벨, 최대 30%'),
    research('beam','집속 에너지','전투',10,[1800,2400,400],3,'power_efficiency:2','빔 공격 +3%/레벨, 최대 30%'),
    research('missile','유도탄 체계','전투',10,[2000,1200,1000],3,'kinetic:2','미사일 공격 +3%/레벨, 최대 30%'),
    research('armor','복합 장갑','전투',10,[1400,800,200],1,'','기본 선체 HP +3%/레벨, 최대 30%; 장갑 공식 별도'),
    research('shield','방어막 이론','전투',8,[2000,2400,600],3,'power_efficiency:2','기본 방어막 +4%/레벨, 최대 32%'),
    research('tracking','다중 표적 추적','전투',8,[1400,2200,400],2,'sensors:2,kinetic:2','경량 표적 피해 계수 +0.025/레벨, 최대 +0.20; 원래 약점은 유지'),
    research('sensors','센서 해상도','정보',10,[800,1400,200],1,'','정찰 정보 지수 +5/레벨; 센서 시설은 접근 탐지 담당'),
    research('espionage','침투 정보학','정보',8,[1200,2200,400],2,'sensors:2','정찰 정보 지수 +5/레벨; 보고서 단계와 방첩으로 판정'),
    research('encryption','신호 암호화','정보',8,[1200,1600,400],1,'sensors:1','방첩 지수 +5/레벨; 침입 탐지 확률과 분리'),
    research('electronic_warfare','전자전','정보',6,[2400,3600,800],4,'espionage:2,beam:1','실제 교란선 투자 비중 ×0.5의 효율 +10%/레벨, 편대 전체 방어막 약화 상한 20%'),
    research('counter_ew','주파수 복원','정보',6,[2400,3200,800],3,'encryption:2,power_efficiency:2','피해 교란 효과 -2%p/레벨, 최대 12%p'),
    research('astrography','성계 지도학','정보',6,[1800,2400,600],2,'sensors:2,navigation:1','탐색 거리·식민지 후보 해상도 해금, 자산 자동 공개 없음'),
    research('cargo_compression','화물 압축','병참',10,[1000,800,200],1,'storage:1','함선 적재량 +5%/레벨, 최대 50%'),
    research('salvage_processing','잔해 분리','병참',6,[1200,1000,400],1,'cargo_compression:1','영구 파괴 합금·결정 회수율 30% +2.5%p/레벨, 최대 45%'),
    research('field_repair','현장 정비','병참',8,[1800,1400,600],2,'armor:2,automation:1','수리 자원 계수 기본 20%를 레벨당 0.5%p 낮춤, 최저 16%'),
    research('supply_network','보급망','병참',8,[2200,1600,1000],3,'cargo_compression:2,navigation:2','보급·계획 수송 해금; 생산 자원 복제나 무상 이동 없음'),
    research('colony_management','식민지 운영','병참',4,[4000,3000,2000],3,'astrography:2,navigation:2','추가 식민지 +1/레벨; 본성 포함 최대 5개'),
    research('terraforming','환경 개조','병참',4,[10000,12000,4000],5,'colony_management:1,construction:3','환경 조정소 해금; 행성 자원·입지 특성은 바꾸지 않음'),
    research('fleet_command','함대 지휘','지휘',10,[1400,1000,400],1,'navigation:1','출격 지휘 용량 기본 100 +50/레벨, 제국 재고 상한 아님'),
    research('coordination','협공 조율','지휘',8,[2200,2600,800],3,'fleet_command:2,sensors:2','예약 협공 도착 허용 창 기본 90초 +30초/레벨, 최대 330초'),
    research('siege_protocol','공성 교리','지휘',8,[3000,1600,1000],3,'kinetic:3,tracking:2','공성 공격 +3%/레벨, 최대 24%; 이동 함대 약점 유지'),
    research('carrier_ops','함재 편대 운용','지휘',6,[5000,6000,1800],5,'coordination:3,electronic_warfare:1','함재 드론 공격 +4%/레벨, 최대 24%; 탄도 병기와 중복 가산 없음'),
    research('retreat','철수 절차','지휘',6,[2200,1600,800],2,'fleet_command:1,navigation:2','사전 철수 정책 임계값 해금; 도착 전 순간 귀환 없음'),
    research('formation','방호 편대','지휘',6,[2600,1800,800],3,'coordination:2,armor:2','실제 호위·방어막 지원 투자 비중 ×0.5의 효율 +10%/레벨, 편대 피해 경감 합계 최대 15%')
  ],
  ships: [
    ship('scout','위스프',1,'정찰','L','kinetic',[500,400,200],65,15,0,8,180,1,100,1,1,'sensors:1','탐사·정찰 정보 지수 +5/척, 실제 정찰 조건 적용','전투 효율 낮음·방첩에 노출'),
    ship('courier','캐러밴',1,'수송','L','kinetic',[1000,400,200],130,20,3,10,100,2,2000,1,1,'','초기 행성 수송과 작전 보급','저화력·호위 필요'),
    ship('interceptor','스위프트',1,'요격','L','kinetic',[1400,600,200],120,20,5,38,150,2,100,1,1,'kinetic:1','경량 정찰·함재 편대 대응','장갑 함대·시설에 약함'),
    ship('striker','케스트럴',1,'타격','L','kinetic',[1800,1000,400],220,40,12,54,110,3,150,2,1,'kinetic:1','일반 국지전의 초기 주력','중장갑·강한 시설 방어에 약함'),
    ship('salvage','아틀라스',1,'회수','L','kinetic',[1200,500,300],150,20,5,12,75,2,1600,1,1,'salvage_processing:1','합금·결정 잔해 회수','느림·전투를 대신하지 못함'),
    ship('raider','레이븐',2,'급습','L','kinetic',[2300,1300,600],160,30,6,55,160,6,900,2,2,'chemical_drive:2,tracking:1','빠른 목표 접근·소량 고가 화물 회수','연료 비효율·지속 교전 약함'),
    ship('guardian','바스티온',2,'호위','M','beam',[5000,2800,1200],720,240,35,75,75,7,180,3,3,'armor:2,shield:1','호위 기여에 비례한 편대 경감, 총 15% 상한','순수 화력 효율 낮음'),
    ship('support','멘더',2,'정비','M','kinetic',[3000,2500,1000],480,140,18,30,80,5,700,2,2,'field_repair:1','승리 후 생존 선체 수리, 소모 부품 필요; 작전당 최대 2회','파괴 함선 부활 불가·전투 약함'),
    ship('jammer','베일',2,'전자전','L','beam',[2600,3600,800],260,160,8,35,100,5,120,2,3,'electronic_warfare:1','투자 비중에 비례한 적 방어막 약화, 전체 20% 상한','무방어막 상대·주파수 복원에 약함'),
    ship('colony','파이오니어',2,'개척','M','kinetic',[6000,4000,2500],420,80,10,10,55,12,3000,3,3,'colony_management:1','성공 개척 시 소비; 실제 초기 화물 필요','전투 취약·긴 이동·한 번 사용'),
    ship('destroyer','하머',2,'대함','M','missile',[6200,3200,2100],620,180,25,240,80,10,200,3,3,'missile:2,ion_drive:1','대형 함선 대응 미사일 플랫폼','경량 요격 편대에 약함'),
    ship('siege','랜서',2,'공성','M','siege',[5200,3000,1800],440,120,18,200,60,11,80,3,3,'siege_protocol:1','고정 시설 파괴','이동 함대·요격에 약함'),
    ship('heavy_cargo','헤비 캐러밴',2,'대형 수송','M','kinetic',[4800,2000,1200],700,180,18,20,55,7,12000,3,3,'cargo_compression:2,ion_drive:1','화물/비용 효율 우수','느린 귀환·전투 효율 낮음'),
    ship('carrier','아크',3,'함재 운용','M','drone',[11000,7500,3500],1100,360,25,420,55,20,500,5,5,'carrier_ops:1,ion_drive:2','경량·중형 상대 함재 편대','방공·중장갑 표적에 약함'),
    ship('cruiser','센티널',3,'전선 타격','M','beam',[9000,6500,2500],1000,420,35,350,70,16,300,4,4,'beam:3,ion_drive:2','중형 편대 상대 균형 화력','경량 운동탄 군집·고비용'),
    ship('shield_ship','에이지스',3,'방어막 지원','H','beam',[11000,9500,2500],1500,900,30,80,55,22,400,5,5,'shield:3,formation:2','편대 방어 지원; 호위와 합쳐 경감 15% 상한','순수 화력 낮음·교란 취약'),
    ship('bomber','시어',3,'시설 타격','H','siege',[14000,6000,4000],980,250,28,500,45,28,100,5,5,'siege_protocol:3,missile:2','강한 방어시설 공격','느림·이동 함대에 약함'),
    ship('supply_ship','릴레이',3,'보급','M','kinetic',[5000,3500,3500],800,240,20,35,70,10,8000,3,4,'supply_network:2','증원 작전의 실제 연료·부품 수송','혼자 싸우기 어려움'),
    ship('tug','앵커',3,'구조·예인','M','kinetic',[5000,4000,1500],900,180,35,40,50,9,1200,3,4,'field_repair:3,retreat:2','파괴되지 않은 작전 불능 선체의 귀환 지원','느림·영구 파괴 복구 불가'),
    ship('stealth_scout','쉐이드',3,'침투 정찰','L','beam',[2500,6000,1500],140,120,2,18,170,4,80,2,4,'espionage:3,encryption:2','높은 정보 지수·저탐지 접근','전투 약함·고급 센서에 대응됨'),
    ship('battlecruiser','템페스트',4,'중장갑 타격','H','missile',[34000,18000,12000],3000,1500,55,1400,50,50,700,8,7,'fusion_drive:1,missile:4,armor:4','대형 적 전력 제압','연료·경량 편대·증원 거리'),
    ship('dreadnought','모노리스',4,'전선 유지','H','beam',[65000,35000,20000],6600,3300,80,2100,30,110,1000,12,8,'fusion_drive:2,beam:5,shield:4','고내구 중형·대형 교전','느림·유도탄 집중·높은 복구 비용'),
    ship('heavy_carrier','헤일로',4,'대규모 함재','H','drone',[42000,33000,15000],4400,1600,40,2000,40,75,1000,10,7,'carrier_ops:3,fusion_drive:1','넓은 함재 전력 투사','방공 편대·중장갑·고비용'),
    ship('siege_platform','오벨리스크',4,'장기 공성','H','siege',[90000,35000,25000],7500,2000,70,5200,20,150,200,12,8,'siege_protocol:5,fusion_drive:2','거점 공성의 대형 포격 플랫폼','기동전·경량 요격·장거리 연료')
  ],
  defenses: [
    defense('light_battery','요격 포대','kinetic',[1000,400,100],210,20,12,50,2,1,'kinetic:1','경량 함대 접근 방어'),
    defense('laser_array','레이저 포대','beam',[1800,1700,300],390,150,20,95,4,2,'beam:1','중형 함대 대응'),
    defense('missile_silo','유도탄 진지','missile',[3000,1500,900],480,90,25,180,4,3,'missile:2','대형 함대 대응; 정비·재무장 비용 포함'),
    defense('plasma_turret','플라스마 포대','beam',[8000,6500,1500],1500,500,45,430,9,5,'beam:4,shield:2','고투자 전선 방어'),
    defense('siege_cannon','궤도 방공포','missile',[9000,4200,2800],1400,220,55,520,8,5,'missile:4,tracking:3','대형 공성 전력 대응'),
    defense('shield_dome','행성 방어막','beam',[6000,7000,1000],2000,3000,20,0,12,4,'shield:3','피해 경감 지원; 편대·시설 합계 15% 상한'),
    defense('sensor_net','방어 센서망','kinetic',[1600,2600,300],260,100,10,5,3,2,'sensors:2','접근·침입 탐지 지수, 전투 주력 아님'),
    defense('decoy_array','기만 신호기','beam',[2200,4000,800],400,240,12,8,5,3,'counter_ew:1','적 교란 완화; 중복 효과 상한 유지')
  ]
};

const idlePower = {warehouse:0,protected_vault:1,shipyard:10,laboratory:12,assembly_plant:6,repair_dock:4,orbital_dock:5,
  sensor_array:3,observatory:4,signal_center:4,jump_beacon:8,spaceport:2,fuel_depot:1,salvage_yard:3,freight_hub:3,
  colony_admin:2,terraformer:6,command_hub:3,defense_foundry:4};
for(const f of catalog.facilities)f.idlePowerPerLevel=idlePower[f.id]??0;

export function resourceCost(definition, targetLevel) {
  return definition.baseCost.map(base => base === 0 ? 0 : Math.ceil(base * definition.costGrowth ** (targetLevel - 1)));
}
export function levelHours(definition, targetLevel) {
  return definition.baseHours * definition.timeGrowth ** (targetLevel - 1);
}
export const total = values => values.reduce((a,b)=>a+b,0);
export const byId = values => new Map(values.map(value=>[value.id,value]));
