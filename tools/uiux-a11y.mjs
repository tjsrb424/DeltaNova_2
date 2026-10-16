// Computed-style contrast on visible DOM text, including alpha-composited ancestors.
// This does not certify screen-reader speech, image contrast or every WCAG criterion.
export function auditVisibleText() {
  const modal = document.querySelector('dialog[open]');
  const root = modal || document.body;
  const rgba = value => value.match(/[\d.]+/g)?.map(Number) || [0,0,0,0];
  const blend = (front, back) => front.slice(0,3).map((v,i)=>v*(front[3]??1)+back[i]*(1-(front[3]??1)));
  const luminance = rgb => rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
  const checked = [], failures = [];
  for (const element of root.querySelectorAll('*')) {
    if (!element.getClientRects().length || element.closest('svg,canvas,[aria-hidden="true"],button:disabled,.sr-only,.skip-link')) continue;
    const text = [...element.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).filter(Boolean).join(' ');
    if (!text) continue;
    const style = getComputedStyle(element);
    if (style.visibility==='hidden') continue;
    const ancestors = [];
    for (let parent=element;parent;parent=parent.parentElement) ancestors.unshift(parent);
    let background = [255,255,255];
    for (const parent of ancestors) background=blend(rgba(getComputedStyle(parent).backgroundColor),background);
    const foreground=blend(rgba(style.color),background);
    const a=luminance(foreground),b=luminance(background),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    const large=parseFloat(style.fontSize)>=24 || (parseFloat(style.fontSize)>=18.66 && parseInt(style.fontWeight)>=700);
    const item={text:text.slice(0,90),ratio:+ratio.toFixed(2),minimum:large?3:4.5};
    checked.push(item);if(ratio<item.minimum)failures.push(item);
  }
  return {checked:checked.length,minimum:checked.length?Math.min(...checked.map(v=>v.ratio)):null,failures};
}

export function auditGeometry() {
  const mobile = getComputedStyle(document.querySelector('.mobile-more')).display!=='none';
  const target = document.querySelector('#threat-banner:not([hidden]) .button') || (mobile?document.querySelector('#mobile-priority .button'):document.querySelector('#context .button'));
  const rect=target.getBoundingClientRect(),at=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
  const touchFailures=[];
  if(mobile) for(const el of document.querySelectorAll('button,a,select,input')) {
    if(!el.getClientRects().length || el.closest('dialog:not([open]),.skip-link'))continue;
    const r=el.getBoundingClientRect();
    if(r.width<44 || r.height<44)touchFailures.push({name:el.getAttribute('aria-label')||el.textContent.trim().slice(0,25),width:+r.width.toFixed(1),height:+r.height.toFixed(1)});
  }
  return {mobile,width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,ctaVisible:rect.top>=0&&rect.bottom<=innerHeight&&(at===target||target.contains(at)),ctaBottom:+rect.bottom.toFixed(1),touchFailures};
}

// Harness-only text resize: override explicit absolute font sizes in their original
// media queries. Inherited sizes enlarge once; closed and future drawer nodes also
// receive the rules. This simulates text resizing, not a browser zoom setting.
export function enlargeText() {
  const collect = rules => [...rules].map(rule => {
    if (rule instanceof CSSStyleRule) {
      const size = rule.style.fontSize;
      return /px|vw|vh|rem/.test(size) ? `${rule.selectorText}{font-size:calc((${size}) * 2)!important}` : '';
    }
    if (rule instanceof CSSMediaRule) return `@media ${rule.conditionText}{${collect(rule.cssRules)}}`;
    if (rule instanceof CSSSupportsRule) return `@supports ${rule.conditionText}{${collect(rule.cssRules)}}`;
    return '';
  }).join('\n');
  const selectors = ['body','#dialog-title','.sidebar .nav-item'];
  const before = selectors.map(selector => parseFloat(getComputedStyle(document.querySelector(selector)).fontSize));
  const style = document.createElement('style');
  style.dataset.qaTextResize = '200';
  style.textContent = [...document.styleSheets].map(sheet=>collect(sheet.cssRules)).join('\n');
  document.head.append(style);
  return selectors.map((selector,i)=>({selector,before:before[i],after:parseFloat(getComputedStyle(document.querySelector(selector)).fontSize)}));
}

export function auditNavigationText() {
  const nav=document.querySelector('.sidebar'),bar=nav.getBoundingClientRect();
  const buttons=[...nav.querySelectorAll('.nav-item')].filter(el=>el.getClientRects().length);
  const items=buttons.map(el=>{
    const r=el.getBoundingClientRect(),rects=[];
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    for(let node=walker.nextNode();node;node=walker.nextNode()){
      if(!node.textContent.trim() || !node.parentElement.getClientRects().length)continue;
      const range=document.createRange();range.selectNodeContents(node);
      rects.push(...range.getClientRects());
    }
    const fits=rects.every(t=>t.top>=r.top-1&&t.bottom<=r.bottom+1&&t.left>=r.left-1&&t.right<=r.right+1);
    return {name:el.textContent.trim(),fits,withinViewport:r.top>=0&&r.bottom<=innerHeight+1,height:r.height,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight};
  });
  return {items,barHeight:bar.height,barOverflow:nav.scrollHeight>nav.clientHeight+1,bottomClearance:parseFloat(getComputedStyle(document.body).paddingBottom)};
}
