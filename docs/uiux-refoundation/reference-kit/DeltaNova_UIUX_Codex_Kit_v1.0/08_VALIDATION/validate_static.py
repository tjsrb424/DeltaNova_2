#!/usr/bin/env python3
"""Offline static validation for this design brief package. Python stdlib only."""
from __future__ import annotations
import json
import re
import shutil
import subprocess
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class HtmlCheck(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids: list[str] = []
        self.script_sources: list[str] = []
        self.stylesheets: list[str] = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            self.ids.append(a['id'])
        if tag == 'script' and 'src' in a:
            self.script_sources.append(a['src'])
        if tag == 'link' and a.get('rel') == 'stylesheet':
            self.stylesheets.append(a['href'])

def luminance(color):
    channels = [int(color[i:i+2], 16)/255 for i in (1,3,5)]
    linear = [c/12.92 if c <= 0.04045 else ((c+.055)/1.055)**2.4 for c in channels]
    return sum(a*b for a,b in zip(linear, (.2126,.7152,.0722)))

def contrast(a,b):
    top, bot = sorted((luminance(a),luminance(b)), reverse=True)
    return (top+.05)/(bot+.05)

def main():
    required = [
        'README.md', 'CODEX_PROMPT.txt', 'CODEX_PROMPT_AFTER_APPROVAL.txt',
        '02_DESIGN_SYSTEM/DELTA_NOVA_DESIGN_BIBLE.md',
        '02_DESIGN_SYSTEM/design-tokens.css',
        '03_SCREENS/PLANET_HOME_SPEC.md',
        '03_SCREENS/FLEET_THREAT_EVASION_SPEC.md',
        '04_MOTION/MOTION_SYSTEM.md',
        '05_EXECUTION/QA_SCORECARD.md',
        '07_PROTOTYPE/index.html', '07_PROTOTYPE/style.css', '07_PROTOTYPE/main.js'
    ]
    for f in required:
        assert (ROOT / f).is_file(), f'file missing: {f}'
    tokens = json.loads((ROOT/'02_DESIGN_SYSTEM/design-tokens.json').read_text('utf-8'))
    for fg in tokens['color']['text'].values():
        for bg in tokens['color']['background'].values():
            assert contrast(fg,bg) >= 4.5, f'proposed text contrast below 4.5:1 {fg}/{bg}'
    parser = HtmlCheck()
    parser.feed((ROOT/'07_PROTOTYPE/index.html').read_text('utf-8'))
    assert len(parser.ids) == len(set(parser.ids)), 'duplicate html ids'
    for f in parser.script_sources + parser.stylesheets:
        assert (ROOT/'07_PROTOTYPE'/f).is_file(), f'html reference missing: {f}'
    js = (ROOT/'07_PROTOTYPE/main.js').read_text('utf-8')
    for target in ['threatCard', 'normalCard','planetVisual','drawer','overlay','reviewThreat']:
        assert target in parser.ids and target in js, f'important target missing: {target}'
    node = shutil.which('node')
    if node:
        subprocess.run([node,'--check',str(ROOT/'07_PROTOTYPE/main.js')],check=True)
        print('PASS JS syntax (node --check)')
    else:
        print('SKIP JS syntax (node unavailable)')
    print(f'PASS {len(required)} core files; JSON tokens; HTML ids and linked files; semantic token contrast 4.5:1')
    print('NOTE Full browser rendering, animation behavior, and production integration are NOT covered by static validation.')

if __name__ == '__main__': main()
