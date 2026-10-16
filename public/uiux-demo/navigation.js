// URL history contains view state only. No storage, network or game commands.
export function createDemoNavigation(onChange, {views, details, targets = [], missions = [], roles = [], browser = window}) {
  const session = `${Date.now()}-${Math.random()}`;
  let serial = 0, current, currentKey, lastHash, closing = false;
  const facilities = ['alloyMine','crystalMine','fuelRefinery','powerPlant','shipyard','laboratory'];
  const defaultTarget = targets.includes('tarsis') ? 'tarsis' : targets[0] || null;
  const defaultMission = missions.includes('salvage') ? 'salvage' : missions[0] || null;
  const defaultRole = roles.includes('breach') ? 'breach' : roles[0] || null;
  const intents=['attack','scout','move','reinforce'],contexts=['solo','alliance','defense'],steps=['fleet','confirm'];
  const read = () => {
    const params = new URLSearchParams(browser.location.hash.slice(1));
    return {
      view: views.includes(params.get('view')) ? params.get('view') : 'home',
      detail: details.includes(params.get('detail')) ? params.get('detail') : null,
      facility: facilities.includes(params.get('facility')) ? params.get('facility') : 'fuelRefinery',
      target: targets.includes(params.get('target')) ? params.get('target') : defaultTarget,
      mission: missions.includes(params.get('mission')) ? params.get('mission') : defaultMission,
      role: roles.includes(params.get('role')) ? params.get('role') : defaultRole,
      intent:intents.includes(params.get('intent'))?params.get('intent'):'attack',
      context:contexts.includes(params.get('context'))?params.get('context'):'solo',
      step:steps.includes(params.get('step'))?params.get('step'):'fleet',
    };
  };
  const hash = route => {
    const params = new URLSearchParams({view:route.view});
    if (route.detail) params.set('detail', route.detail);
    if (route.detail === 'planet') params.set('facility',route.facility);
    if ((['galaxy','command'].includes(route.view) || route.detail === 'intel') && route.target) params.set('target',route.target);
    if(['career','command'].includes(route.view))params.set('intent',route.intent);
    if(route.view==='command'){params.set('context',route.context);params.set('step',route.step);}
    if (['career','practice'].includes(route.view) && route.mission) params.set('mission',route.mission);
    if (route.view === 'guild' && route.role) params.set('role',route.role);
    return '#' + params.toString();
  };
  const metadata = () => browser.history.state?.__dnDemoNavigation;
  function apply(route, key, info) {
    const previous = current, previousKey = currentKey;
    current = route; currentKey = key; lastHash = browser.location.hash;
    onChange({...route}, previous, {...info, key, previousKey});
  }
  function go(patch, {replace = false} = {}) {
    closing = false;
    const route = {...current, ...patch};
    if (Object.hasOwn(patch,'view') && !Object.hasOwn(patch,'detail')) route.detail = null;
    if (!views.includes(route.view)) route.view = 'home';
    if (!details.includes(route.detail)) route.detail = null;
    if (!targets.includes(route.target)) route.target = defaultTarget;
    if (!missions.includes(route.mission)) route.mission = defaultMission;
    if (!roles.includes(route.role)) route.role = defaultRole;
    if(!intents.includes(route.intent))route.intent='attack';
    if(!contexts.includes(route.context))route.context='solo';
    if(!steps.includes(route.step))route.step='fleet';
    if (hash(route) === hash(current)) return;
    const previousMeta = metadata();
    const meta = replace ? previousMeta : {
      session, key:++serial, parent:currentKey, parentView:current.view, parentDetail:current.detail,
    };
    browser.history[replace ? 'replaceState' : 'pushState']({__dnDemoNavigation:meta}, '', hash(route));
    apply(route, meta.key, {history:false, replace});
  }
  function onHistory() {
    closing = false;
    if (lastHash === browser.location.hash && metadata()?.key === currentKey) return;
    const route = read(), meta = metadata();
    const own = meta?.session === session;
    const nextMeta = own ? meta : {session,key:++serial};
    browser.history.replaceState({__dnDemoNavigation:nextMeta}, '', hash(route));
    apply(route,nextMeta.key,{history:true});
  }
  const initial = read(), first = {session,key:++serial};
  browser.history.replaceState({__dnDemoNavigation:first}, '', hash(initial));
  apply(initial,first.key,{initial:true,history:false});
  browser.addEventListener('popstate',onHistory);
  browser.addEventListener('hashchange',onHistory);
  return {
    get current() { return {...current}; }, go,
    closeDetail() {
      if (!current.detail || closing) return;
      const meta = metadata();
      if (meta?.session === session && meta.parent && meta.parentView === current.view && !meta.parentDetail) { closing = true; browser.history.back(); }
      else go({detail:null},{replace:true});
    },
    dispose() {
      browser.removeEventListener('popstate',onHistory);
      browser.removeEventListener('hashchange',onHistory);
    },
  };
}
