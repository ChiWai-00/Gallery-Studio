#!/usr/bin/env python3
"""Build an offline, self-contained HTML release from editable project sources.

No third-party Python or Node dependencies are required. The output is deterministic.
Run: python scripts/build.py
"""
from __future__ import annotations
import base64
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src'
OUTPUT = ROOT / 'dist' / 'index.html'


def build() -> Path:
    html = (SOURCE/'index.html').read_text(encoding='utf-8')
    css = (SOURCE/'styles.css').read_text(encoding='utf-8')
    js = (SOURCE/'app.js').read_text(encoding='utf-8')

    start = '/* DEMO_DATA_START */'
    end = '/* DEMO_DATA_END */'
    if js.count(start) != 1 or js.count(end) != 1:
        raise RuntimeError('Expected one sample-data block in src/app.js')
    sample_data = []
    for i in range(1, 4):
        file = SOURCE/'assets'/'examples'/f'{i:02d}.jpg'
        if not file.is_file():
            raise FileNotFoundError(f'Missing sample artwork: {file}')
        sample_data.append({
            'name':f'{i:02d}_清透渐变示例.jpg',
            'src':'data:image/jpeg;base64,'+base64.b64encode(file.read_bytes()).decode('ascii'),
            'w':900, 'h':1200
        })
    data_js = f'{start}\nconst DEMO = '+json.dumps(sample_data,ensure_ascii=False,separators=(',', ':'))+f';\n{end}'
    js = re.sub(re.escape(start)+r'.*?'+re.escape(end),lambda _:data_js,js,count=1,flags=re.S)

    style_tag = '<link rel="stylesheet" href="./styles.css" />'
    script_tag = '<script src="./app.js"></script>'
    if html.count(style_tag)!=1 or html.count(script_tag)!=1:
        raise RuntimeError('Source index.html is missing expected CSS/JS references')
    # Keep the entire result portable by replacing external local files with inline assets.
    html = html.replace(style_tag, '<style>\n'+css+'\n</style>')
    html = html.replace(script_tag, '<script>\n'+js+'\n</script>')
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(html,encoding='utf-8')
    return OUTPUT

if __name__=='__main__':
    p=build()
    print(f'Built: {p} ({p.stat().st_size:,} bytes)')
