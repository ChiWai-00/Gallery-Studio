/*
 * Gallery Studio / 横滑组图工作室
 * Creator: 池外 ChiWai
 * Copyright (c) 2026 池外 ChiWai
 * MIT License; see LICENSE in the repository root.
 *
 * Note: WeChat paste is experimental; host sanitization may remove styles.
 * Obsidian clipboard output puts compressed image data inside the note, not attachments.
 */

/* DEMO_DATA_START */
const DEMO = [
  {
    "name": "01_清透渐变示例.jpg",
    "src": "./assets/examples/01.jpg",
    "w": 900,
    "h": 1200
  },
  {
    "name": "02_清透渐变示例.jpg",
    "src": "./assets/examples/02.jpg",
    "w": 900,
    "h": 1200
  },
  {
    "name": "03_清透渐变示例.jpg",
    "src": "./assets/examples/03.jpg",
    "w": 900,
    "h": 1200
  }
];
/* DEMO_DATA_END */
const state={pics:[],index:0,ratio:'first',fit:'contain',bg:'#ffffff',caption:'show'};
const $=id=>document.getElementById(id);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const fmt=(n)=>String(n).padStart(2,'0');
const escapeHtml=str=>String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
let timer=null, resizeGuard=false;
function toast(message){const e=$('toast');e.textContent=message;e.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>e.classList.remove('show'),3600)}
function status(message,type='warn'){$('status').textContent=message;$('status').dataset.type=type}
// --- Sample gallery, editing state, and view rendering ---
function useDemo(){state.pics=DEMO.map((p,i)=>({id:`demo-${i}`,name:p.name,src:p.src,w:p.w,h:p.h,hosted:'',demo:true}));state.index=0;render();status('当前是三张无装饰边框的清透文字示例；上传自己的图片会自动替换。公众号横滑仍需在微信手机端验证。','warn')}
function naturalRatio(){const p=state.pics[0];return p&&p.w&&p.h?`${p.w}/${p.h}`:'9/16'}
function activeRatio(){return state.ratio==='first'?naturalRatio():state.ratio}
function ratioToNumber(r){const [w,h]=r.split('/').map(Number);return w/h}
function moveIndex(next,smooth=true){const i=clamp(next,0,state.pics.length-1);state.index=i;let strip=$('strip');if(!strip)return;strip.scrollTo({left:i*strip.clientWidth,behavior:smooth?'smooth':'instant'});updateNav()}
function updateNav(){const n=state.pics.length;$('pageNum').textContent=n?`${fmt(state.index+1)} / ${fmt(n)}`:'00 / 00';$('prev').disabled=!n||state.index===0;$('next').disabled=!n||state.index===n-1;$('dots').innerHTML='';if(n<=18)for(let i=0;i<n;i++){const el=document.createElement('button');el.className='dot'+(state.index===i?' selected':'');el.title=`第 ${i+1} 张`;el.onclick=()=>moveIndex(i);$('dots').append(el)}else {$('dots').textContent=`共 ${n} 张`}
 const hosted=state.pics.filter(p=>p.hosted).length;$('linkBadge').textContent=`微信图片链接：${hosted} / ${n}`;
}
let sortSession=null;
const gripSvg='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="8" cy="5" r="1.65"/><circle cx="16" cy="5" r="1.65"/><circle cx="8" cy="12" r="1.65"/><circle cx="16" cy="12" r="1.65"/><circle cx="8" cy="19" r="1.65"/><circle cx="16" cy="19" r="1.65"/></svg>';
function drawList(){
 const list=$('photoList');list.innerHTML='';
 if(!state.pics.length){list.innerHTML='<div class="photo-empty">还没有图片<br>点击上方添加第一张吧</div>';return}
 state.pics.forEach((p,i)=>{
  const el=document.createElement('div');el.className='item'+(i===state.index?' active':'');el.dataset.id=p.id;
  const handle=document.createElement('button');handle.type='button';handle.className='draghandle';handle.title='按住并拖动调整图片顺序';handle.setAttribute('aria-label',`拖动第 ${i+1} 张图片排序`);handle.innerHTML=gripSvg;
  handle.addEventListener('pointerdown',e=>startSort(e,el,p.id));
  handle.addEventListener('keydown',e=>{if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();const next=i+(e.key==='ArrowUp'?-1:1);swap(i,next);const target=$('photoList').children[next];target?.querySelector('.draghandle')?.focus()});
  const img=document.createElement('img');img.className='thumb';img.src=p.src;img.alt='缩略图';img.draggable=false;
  const main=document.createElement('div');main.className='item-main';const name=document.createElement('span');name.className='fname';name.textContent=p.name;name.title=p.name;
  const meta=document.createElement('div');meta.className='meta';meta.textContent=`${p.w} × ${p.h}${p.hosted?' · 已绑定微信图片':''}`;
  const actions=document.createElement('div');actions.className='item-actions';
  const up=document.createElement('button');up.className='mini-action';up.textContent='↑ 上移';up.disabled=i===0;up.onclick=e=>{e.stopPropagation();swap(i,i-1)};
  const down=document.createElement('button');down.className='mini-action';down.textContent='↓ 下移';down.disabled=i===state.pics.length-1;down.onclick=e=>{e.stopPropagation();swap(i,i+1)};
  actions.append(up,down);main.append(name,meta,actions);
  const del=document.createElement('button');del.className='rm';del.title='移除图片';del.textContent='×';del.onclick=e=>{e.stopPropagation();state.pics.splice(i,1);state.index=clamp(state.index,0,Math.max(0,state.pics.length-1));render()};
  el.append(handle,img,main,del);
  el.addEventListener('click',e=>{if(e.target.closest('button'))return;moveIndex(i);drawList()});
  list.append(el);
 });
}
function animateFLIP(before,list){
 for(const child of list.querySelectorAll('.item')){
  const first=before.get(child.dataset.id);if(!first)continue;
  const dy=first.top-child.getBoundingClientRect().top;
  if(Math.abs(dy)>1){child.getAnimations().forEach(a=>a.cancel());child.animate([{transform:`translate3d(0,${dy}px,0)`},{transform:'translate3d(0,0,0)'}],{duration:245,easing:'cubic-bezier(.20,.82,.23,1)'})}
 }
}
function snapshotList(){const map=new Map();for(const el of $('photoList').querySelectorAll('.item'))map.set(el.dataset.id,el.getBoundingClientRect());return map}
function swap(i,j){
 if(j<0||j>=state.pics.length||sortSession)return;
 const before=snapshotList();[state.pics[i],state.pics[j]]=[state.pics[j],state.pics[i]];state.index=j;
 render();animateFLIP(before,$('photoList'));
}
function startSort(e,item,picId){
 if(sortSession||e.button!==0||state.pics.length<2)return;
 e.preventDefault();e.stopPropagation();
 const list=$('photoList'),r=item.getBoundingClientRect();
 const ghost=item.cloneNode(true);ghost.classList.add('sort-ghost');ghost.classList.remove('active');
 Object.assign(ghost.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',margin:'0',pointerEvents:'none',zIndex:'9999'});
 const placeholder=document.createElement('div');placeholder.className='sort-placeholder';placeholder.style.height=r.height+'px';
 item.replaceWith(placeholder);document.body.appendChild(ghost);
 sortSession={pointerId:e.pointerId,picId,ghost,placeholder,list,offset:e.clientY-r.top,originalIndex:state.pics.findIndex(p=>p.id===picId),lastY:e.clientY,raf:0};
 document.body.classList.add('is-sorting');
 window.addEventListener('pointermove',onSortMove,{passive:false});
 window.addEventListener('pointerup',onSortFinish);window.addEventListener('pointercancel',onSortCancel);window.addEventListener('blur',onSortCancel);
 sortSession.raf=requestAnimationFrame(autoSortScroll);
}
function repositionPlaceholder(s,y){
 const {list,placeholder}=s;
 const nodes=Array.from(list.children).filter(el=>el!==placeholder&&el.classList.contains('item'));
 let before=null;
 for(const node of nodes){const r=node.getBoundingClientRect();if(y<r.top+r.height*.5){before=node;break}}
 if(before===placeholder.nextElementSibling||(!before&&placeholder===list.lastElementChild))return;
 const first=snapshotList();list.insertBefore(placeholder,before);animateFLIP(first,list);
}
function onSortMove(e){
 const s=sortSession;if(!s||e.pointerId!==s.pointerId)return;
 e.preventDefault();s.lastY=e.clientY;
 s.ghost.style.top=(e.clientY-s.offset)+'px';
 repositionPlaceholder(s,e.clientY);
}
function autoSortScroll(){
 const s=sortSession;if(!s)return;
 const r=s.list.getBoundingClientRect(),edge=48,y=s.lastY;
 let step=0;
 if(y<r.top+edge&&y>=r.top-24)step=-Math.min(13,(r.top+edge-y)*.27);
 else if(y>r.bottom-edge&&y<=r.bottom+24)step=Math.min(13,(y-(r.bottom-edge))*.27);
 if(step){const old=s.list.scrollTop;s.list.scrollTop+=step;if(s.list.scrollTop!==old)repositionPlaceholder(s,y)}
 s.raf=requestAnimationFrame(autoSortScroll);
}
function removeSortListeners(){
 window.removeEventListener('pointermove',onSortMove);window.removeEventListener('pointerup',onSortFinish);window.removeEventListener('pointercancel',onSortCancel);window.removeEventListener('blur',onSortCancel);
 document.body.classList.remove('is-sorting');
}
function onSortCancel(){const s=sortSession;if(!s)return;cancelAnimationFrame(s.raf);removeSortListeners();s.ghost.remove();sortSession=null;render()}
function onSortFinish(e){
 const s=sortSession;if(!s||e.pointerId!==s.pointerId)return;
 cancelAnimationFrame(s.raf);removeSortListeners();
 const target=Array.from(s.list.children).indexOf(s.placeholder);
 const from=state.pics.findIndex(p=>p.id===s.picId);
 const [pic]=state.pics.splice(from,1);state.pics.splice(target,0,pic);state.index=target;
 const targetRect=s.placeholder.getBoundingClientRect();
 s.ghost.style.transition='top 185ms cubic-bezier(.2,.8,.2,1),left 185ms ease,transform 185ms ease,opacity 185ms ease';
 s.ghost.style.top=targetRect.top+'px';s.ghost.style.left=targetRect.left+'px';s.ghost.style.transform='scale(1)';
 s.ghost.style.opacity='0.94';
 setTimeout(()=>{if(sortSession===s){s.ghost.remove();sortSession=null;render();toast(from===target?'顺序未改变':`已移至第 ${target+1} 张`)}},195);
}
function render(){drawList();if($('imageCount'))$('imageCount').textContent=state.pics.length+' 张';const r=activeRatio();const aspect=ratioToNumber(r);const sheet=$('sheet');sheet.style.aspectRatio=r;sheet.style.maxHeight='650px';sheet.style.maxWidth='100%';sheet.style.width=`min(100%, ${Math.round(Math.min(560,650*aspect))}px)`;$('sizeInfo').textContent=r.replace('/',' : ');
 $('previewBadge').textContent=state.fit==='contain'?'完整显示 · 不裁切':'铺满展示 · 可能裁切';$('strip').innerHTML='';
 if(!state.pics.length){$('strip').innerHTML='<div class="placeholder"><div><strong>还没有图片</strong><br><small>从左侧添加图片开始制作</small></div></div>'}
 for(const p of state.pics){const slide=document.createElement('div');slide.className='slide';slide.style.background=state.bg;const img=document.createElement('img');img.src=p.src;img.alt=p.name;img.style.objectFit=state.fit;img.draggable=false;slide.append(img);$('strip').append(slide)}
 requestAnimationFrame(()=>moveIndex(state.index,false));}
async function imageFromFile(file){return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onerror=()=>reject(new Error('文件读取失败'));fr.onload=()=>{const src=fr.result;const img=new Image();img.onerror=()=>reject(new Error('图片无法识别'));img.onload=()=>resolve({id:`p-${Date.now()}-${Math.random().toString(36).slice(2)}`,name:file.name,src,w:img.naturalWidth,h:img.naturalHeight,hosted:'',demo:false});img.src=src};fr.readAsDataURL(file)})}
async function addFiles(files){const chosen=Array.from(files).filter(f=>f.type.startsWith('image/'));if(!chosen.length)return toast('请选择 JPG、PNG、WebP 或 GIF 图片');if(state.pics.every(p=>p.demo))state.pics=[];let allowed=Math.max(0,30-state.pics.length);if(!allowed)return toast('一次最多使用 30 张图片');let valid=chosen.slice(0,allowed),success=0;
 for(const file of valid){if(file.size>15*1024*1024){toast(`${file.name} 超过 15MB，已跳过`);continue}try{state.pics.push(await imageFromFile(file));success++}catch(e){toast(`${file.name} 读取失败`)}}
 state.index=0;render();status(`已导入 ${success} 张图片。可预览与导出；公众号复制仍需测试微信的图片接收与横滑兼容性。`,'warn');$('fileInput').value='';}
function allHosted(){return state.pics.length>0&&state.pics.every(p=>Boolean(p.hosted))}
function linkOf(p){return p.hosted||p.src}
function buildMarkup(){
 const n=state.pics.length;if(!n)return '';
 const ratio=activeRatio();const fit=state.fit;const r=ratioToNumber(ratio);const heading=state.caption==='show'?`<section style="text-align:center;font-size:12px;color:#8a9daf;letter-spacing:1px;margin:8px 0 10px">← 左右滑动查看更多 · 共 ${n} 张 →</section>`:'';
 const card=(p)=>`<section style="display:inline-block;vertical-align:top;width:100%;min-width:100%;margin:0;padding:0;white-space:normal;scroll-snap-align:start;background:${state.bg}"><img src="${escapeHtml(linkOf(p))}" alt="${escapeHtml(p.name)}" style="display:block;width:100%;aspect-ratio:${ratio};object-fit:${fit};height:auto;border:0;vertical-align:top;margin:0;padding:0" /></section>`;
 return `<section style="max-width:100%;width:100%;margin:0 auto;padding:0;overflow:hidden">`+
 `<section style="width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;white-space:nowrap;-webkit-overflow-scrolling:touch;scroll-snap-type:x mandatory;box-sizing:border-box;margin:0;padding:0">${state.pics.map(card).join('')}</section>${heading}</section>`;
}
async function copyRich(html){try{if(!navigator.clipboard||!window.ClipboardItem)throw Error('clipboard not ready');const item=new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob(['横滑组图'],{type:'text/plain'})});await navigator.clipboard.write([item]);return true}catch(err){try{const el=document.createElement('div');el.contentEditable='true';el.style='position:fixed;left:-9999px;top:0;width:400px;max-height:200px;overflow:hidden';el.innerHTML=html;document.body.append(el);const range=document.createRange();range.selectNodeContents(el);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);const ok=document.execCommand('copy');selection.removeAllRanges();el.remove();return ok}catch(e){return false}}}
async function copyMode(){
 if(!state.pics.length)return toast('请先添加图片');
 const html=buildMarkup();const ok=await copyRich(html);
 if(ok){const good=allHosted();status(`已复制横滑布局到剪贴板。${good?'图片已绑定你填写的网络链接；':'当前部分图片为本地嵌入，微信可能不接收。'}请到公众号正文 Ctrl+V，保存草稿并在手机微信预览；复制成功不代表公众号保留横滑交互。`,good?'good':'warn');toast('布局已复制，公众号是否兼容请以手机预览为准')}
 else{status('浏览器阻止了富文本复制。请使用 Chrome/Edge，或下载独立 HTML。','warn');toast('复制失败：浏览器未授予富文本剪贴板权限')}
}

// Obsidian paste: renderable, self-contained HTML without scripts, plugins or vault image paths.
// Use compact WebP data URIs so Markdown notes are not excessively large.
function compactForObsidian(pic){
 return new Promise((resolve,reject)=>{
  const im=new Image();im.onload=()=>{
   try{
    const maxW=1300,maxH=1800,scale=Math.min(1,maxW/im.naturalWidth,maxH/im.naturalHeight);
    const w=Math.max(1,Math.round(im.naturalWidth*scale));
    const h=Math.max(1,Math.round(im.naturalHeight*scale));
    const cv=document.createElement('canvas');cv.width=w;cv.height=h;
    const cx=cv.getContext('2d');if(!cx)throw Error('无法创建画布');
    cx.fillStyle='#ffffff';cx.fillRect(0,0,w,h);
    cx.drawImage(im,0,0,w,h);
    let encoded=cv.toDataURL('image/webp',0.86);
    if(!encoded.startsWith('data:image/webp;')) encoded=cv.toDataURL('image/jpeg',0.88);
    resolve(encoded);
   }catch(err){reject(err)}
  };
  im.onerror=()=>reject(new Error('图片读取失败'));
  im.src=pic.src;
 });
}
function obsidianHtml(data){
 const ratio=activeRatio(), fit=state.fit;
 const count=data.length;
 // Use plain inline styles, no JS. One HTML block with no blank lines for Obsidian Markdown parser.
 const text=(state.caption==='show')?`<div style="font-size:12px;color:#93a1b2;margin:0 0 8px 2px">左右滑动查看更多 · 共 ${count} 张</div>`:'';
 const frames=data.map((p,i)=>`<div style="display:inline-block;white-space:normal;vertical-align:top;box-sizing:border-box;scroll-snap-align:start;flex:0 0 84%;width:84%;max-width:520px;margin:0 12px 0 0;padding:0"><img src="${p.src}" alt="第 ${i+1} 张图片" draggable="false" style="display:block;width:100%;height:auto;aspect-ratio:${ratio};object-fit:${fit};border-radius:12px;border:1px solid #e7edf4;box-sizing:border-box;background:${state.bg};max-width:100%"></div>`).join('');
 return `\n\n<!-- 横滑组图制作器 · Obsidian 本地横滑 · ${count} 张 -->\n\n<div style="margin:12px 0 18px;max-width:100%;overflow:hidden">${text}<div style="display:flex;max-width:100%;width:100%;overflow-x:auto;overflow-y:hidden;white-space:nowrap;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;padding:4px 0 12px;box-sizing:border-box">${frames}</div></div>`;
}
// --- Obsidian export: compressed inline image data in Markdown HTML ---
async function copyObsidian(){
 const btn=$('copyObsidian');
 if(!state.pics.length)return toast('请先添加图片');
 if(state.pics.length>12){toast('Obsidian 内嵌模式建议不超过 12 张；请减少图片后再复制');$('obsidianInfo').textContent='当前 '+state.pics.length+' 张。请先分组到每组 12 张以内，避免 Markdown 笔记体积过大。';return}
 const old=btn.textContent;btn.disabled=true;btn.textContent='正在压缩图片…';
 try{
  const data=[];for(let i=0;i<state.pics.length;i++){
   btn.textContent=`处理中 ${i+1}/${state.pics.length}…`;
   data.push({src:await compactForObsidian(state.pics[i])});
  }
  const html=obsidianHtml(data),mb=(new Blob([html]).size/1048576);
  if(mb>8){$('obsidianInfo').textContent=`生成内容 ${mb.toFixed(1)} MB，过大。建议减小图片数量或先压缩原图。`;toast('图片组图过大，请分组复制');return}
  // Prefer plain text: Obsidian should see source markup, not rich-text HTML.
  let ok=false;
  try{await navigator.clipboard.writeText(html);ok=true}catch(e){
   const ta=document.createElement('textarea');ta.value=html;ta.style='position:fixed;top:-2000px;left:-2000px';document.body.appendChild(ta);ta.focus();ta.select();ok=document.execCommand('copy');ta.remove();
  }
  if(ok){
   $('obsidianInfo').textContent=`已复制 ${data.length} 张图片（约 ${mb.toFixed(2)} MB）。在 Obsidian 笔记按 Ctrl+V，再进入阅读模式，左右滑动图片。无需配置插件；图片内嵌到 .md 文件，不单独生成附件。`;
   toast('已复制 Obsidian 横滑块！图片随笔记保存，不单独生成附件');
  }else{
   $('obsidianInfo').textContent='浏览器阻止了复制，请用最新版 Chrome 或 Edge 打开本工具。';
   toast('复制失败，请检查浏览器剪贴板权限');
  }
 }catch(err){$('obsidianInfo').textContent='图片转换出错：'+(err.message||String(err));toast('无法生成 Obsidian 组图');}
 finally{btn.disabled=false;btn.textContent=old;}
}

// --- Independent offline HTML reader export ---
function buildStandalone(){const data=state.pics.map(p=>({name:p.name,src:p.src}));const ratio=activeRatio();const caption=state.caption==='show';const content=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"/><title>图片组图 · 左右翻阅</title><style>*{box-sizing:border-box}body{margin:0;padding:25px 12px;background:#eef4fb;font-family:system-ui,"Microsoft YaHei",sans-serif;color:#254361}.box{max-width:490px;margin:auto}.title{font-size:15px;text-align:center;margin:0 0 15px}.frame{position:relative;background:white;border-radius:15px;overflow:hidden;box-shadow:0 12px 35px #284c7722;aspect-ratio:${ratio}}.track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;height:100%}.track::-webkit-scrollbar{display:none}.page{height:100%;width:100%;flex:0 0 100%;scroll-snap-align:start;display:grid;place-items:center;background:${state.bg}}.page img{width:100%;height:100%;object-fit:${state.fit}}button{cursor:pointer}.arrow{position:absolute;top:50%;transform:translateY(-50%);border:0;border-radius:100%;background:#ffffffde;width:38px;height:38px;box-shadow:0 3px 10px #173b5522;font-size:22px;color:#527895}.prev{left:8px}.next{right:8px}.bottom{display:flex;justify-content:space-between;align-items:center;margin-top:14px;color:#67829d;font-size:13px}.hint{font-size:12px;color:#8fa5b7}
/* 精细矢量拖动手柄 + FLIP / 悬浮拖动反馈 */
.photo-list{contain:layout style;overscroll-behavior:contain}
.draghandle{width:20px;height:32px;display:flex;align-items:center;justify-content:center;border:0;border-radius:7px;padding:0;background:transparent;color:#819bb6;cursor:grab;touch-action:none;user-select:none;outline-offset:2px}
.draghandle svg{fill:currentColor;display:block;shape-rendering:geometricPrecision;pointer-events:none}
.draghandle:hover{background:#eaf3ff;color:#3d85c6}
.draghandle:active{cursor:grabbing}
.draghandle:focus-visible{outline:2px solid #4a97d9;background:#eaf3ff}
.item{position:relative;will-change:transform;transition:background-color .16s ease,border-color .16s ease,box-shadow .16s ease;user-select:none;cursor:default}
.item:hover{border-color:#c7dcf0;background:#fbfdff}
.sort-placeholder{position:relative;min-height:66px;box-sizing:border-box;background:linear-gradient(110deg,#e7f3ff,#f3f8ff);border:1.5px dashed #6ca8de;border-radius:12px;box-shadow:inset 0 1px 6px #7ab0eb22;pointer-events:none}
.sort-placeholder:before{content:'松开鼠标，放到这里';font-size:11px;color:#4d8ac1;font-weight:600;display:grid;place-items:center;position:absolute;inset:0}
.sort-ghost{cursor:grabbing!important;background:#fff!important;border:1px solid #81b5e9!important;border-radius:11px!important;box-shadow:0 20px 44px #295f9c30,0 5px 18px #24476b1f!important;transform:scale(1.035);transform-origin:center center;opacity:.98;will-change:top,transform;}
.sort-ghost .draghandle{cursor:grabbing}
body.is-sorting,body.is-sorting *{cursor:grabbing!important}
.strip{cursor:grab}.strip.is-panning{cursor:grabbing;scroll-snap-type:none;user-select:none}
@media (prefers-reduced-motion:reduce){.item,.sort-ghost{transition:none!important}}
</style></head><body><main class="box"><h1 class="title">图片组图 · 左右翻阅</h1><div class="frame"><div class="track" id="t"></div><button class="arrow prev" id="prev">‹</button><button class="arrow next" id="next">›</button></div><div class="bottom"><span id="pg"></span><span class="hint">${caption?'← 左右滑动查看更多 →':''}</span></div></main><script>const pics=${JSON.stringify(data).replaceAll('<','\\u003c')};let at=0;const t=document.querySelector('#t');pics.forEach(p=>{const s=document.createElement('div');s.className='page';const img=document.createElement('img');img.src=p.src;img.alt=p.name;s.append(img);t.append(s)});const pg=document.querySelector('#pg');function go(i){at=Math.max(0,Math.min(pics.length-1,i));t.scrollTo({left:at*t.clientWidth,behavior:'smooth'});pg.textContent=(at+1)+' / '+pics.length;document.querySelector('#prev').disabled=at===0;document.querySelector('#next').disabled=at===pics.length-1}document.querySelector('#prev').onclick=()=>go(at-1);document.querySelector('#next').onclick=()=>go(at+1);let wait; t.addEventListener('scroll',()=>{clearTimeout(wait);wait=setTimeout(()=>{at=Math.round(t.scrollLeft/t.clientWidth);go(at)},110)});window.addEventListener('keydown',e=>{if(e.key==='ArrowRight')go(at+1);if(e.key==='ArrowLeft')go(at-1)});go(0);<\/script></body></html>`;return content;}
function download(filename,content,type='text/html'){const blob=new Blob([content],{type:type+';charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000)}
function updateLinks(){const parts=$('linkInput').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(parts.length!==state.pics.length){toast(`请填写 ${state.pics.length} 条地址，当前为 ${parts.length} 条`);return}let okay=parts.every(s=>/^https:\/\/[^\s]+$/i.test(s));if(!okay){toast('请输入有效的 HTTPS 图片链接');return}parts.forEach((s,i)=>state.pics[i].hosted=s);render();status('已绑定图片链接。请确认这些链接能在微信文章里加载，复制横滑布局后还需手机预览。','good');toast('已按顺序绑定微信图片地址')}
function parsePasted(evt){const html=evt.clipboardData&&evt.clipboardData.getData('text/html')||'';const plain=evt.clipboardData&&evt.clipboardData.getData('text/plain')||'';const links=[];if(html){const doc=new DOMParser().parseFromString(html,'text/html');doc.querySelectorAll('img').forEach(img=>{const arr=[img.getAttribute('data-src'),img.getAttribute('src'),img.getAttribute('data-original'),img.getAttribute('data-actualsrc')];const link=arr.find(v=>v&&/^https:\/\//i.test(v)&&/mmbiz\.qpic\.cn|wx\.qlogo\.cn/i.test(v));if(link)links.push(link)})}if(!links.length&&plain){for(const s of plain.match(/https:\/\/[^\s"'<>]+/g)||[])if(/mmbiz\.qpic\.cn|wx\.qlogo\.cn/.test(s))links.push(s)}if(!links.length){toast('剪贴板里没有可识别的公众号图片链接');return}evt.preventDefault();$('linkInput').value=links.join('\n');toast(`识别到 ${links.length} 个微信图片链接，请点击「按图片顺序绑定链接」`)}
function setupMousePreview(){
 const strip=$('strip');let pan=null;
 strip.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0||sortSession)return;pan={id:e.pointerId,x:e.clientX,scroll:strip.scrollLeft,moved:false};strip.setPointerCapture(e.pointerId)});
 strip.addEventListener('pointermove',e=>{if(!pan||e.pointerId!==pan.id)return;const dx=e.clientX-pan.x;if(Math.abs(dx)>5){pan.moved=true;strip.classList.add('is-panning');strip.scrollLeft=pan.scroll-dx}});
 const finish=e=>{if(!pan||e.pointerId!==pan.id)return;const moved=pan.moved;pan=null;strip.classList.remove('is-panning');if(moved){const i=clamp(Math.round(strip.scrollLeft/(strip.clientWidth||1)),0,state.pics.length-1);moveIndex(i,true)}};
 strip.addEventListener('pointerup',finish);strip.addEventListener('pointercancel',finish);
}

/* custom accessible dropdowns; native selections remain the single source of truth */
// --- Custom accessible-looking select dropdowns ---
function initPrettySelects(){
 const ids=['ratio','fit','bg','caption'];
 let active=null;
 function close(w){if(!w)return;w.classList.remove('is-open','drop-up');w.querySelector('.pretty-trigger')?.setAttribute('aria-expanded','false');if(active===w)active=null;}
 function open(w){if(active&&active!==w)close(active);active=w;w.classList.add('is-open');const btn=w.querySelector('.pretty-trigger');btn.setAttribute('aria-expanded','true');const rect=btn.getBoundingClientRect(),menu=w.querySelector('.pretty-menu');const est=Math.min(260,menu.children.length*42+12);w.classList.toggle('drop-up',window.innerHeight-rect.bottom<est+12&&rect.top>est+18);}
 ids.forEach(id=>{
  const native=$(id);if(!native)return;
  native.classList.add('native-select');native.tabIndex=-1;native.setAttribute('aria-hidden','true');
  const root=document.createElement('div');root.className='pretty-select';root.dataset.for=id;
  const btn=document.createElement('button');btn.type='button';btn.className='pretty-trigger';btn.setAttribute('aria-haspopup','listbox');btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-label',document.querySelector(`label[for="${id}"]`)?.textContent||id);
  const value=document.createElement('span');value.className='sel-value';
  const chev=document.createElement('span');chev.className='sel-chevron';chev.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  btn.append(value,chev);
  const menu=document.createElement('div');menu.className='pretty-menu';menu.setAttribute('role','listbox');menu.id=id+'-menu';btn.setAttribute('aria-controls',menu.id);
  const choices=[...native.options].map(o=>{
    const b=document.createElement('button');b.type='button';b.className='pretty-choice';b.setAttribute('role','option');b.dataset.value=o.value;
    const title=document.createElement('span');title.textContent=o.textContent;
    const tick=document.createElement('span');tick.className='choice-tick';tick.innerHTML='<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m4 10 4 4 8-8"/></svg>';
    b.append(title,tick);menu.append(b);
    b.addEventListener('click',e=>{e.stopPropagation();native.value=o.value;native.dispatchEvent(new Event('change',{bubbles:true}));sync();close(root);btn.focus()});
    return b;
  });
  function sync(){value.textContent=native.selectedOptions[0]?.textContent||'';for(const b of choices){const yes=b.dataset.value===native.value;b.classList.toggle('selected',yes);b.setAttribute('aria-selected',String(yes));b.querySelector('.choice-tick').style.visibility=yes?'visible':'hidden';}}
  btn.onclick=e=>{e.stopPropagation();root.classList.contains('is-open')?close(root):open(root)};
  btn.addEventListener('keydown',e=>{
   if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
    e.preventDefault();e.stopPropagation();const pos=[...native.options].findIndex(o=>o.value===native.value);
    const index=e.key==='Home'?0:e.key==='End'?native.options.length-1:Math.max(0,Math.min(native.options.length-1,pos+(e.key==='ArrowDown'?1:-1)));
    native.selectedIndex=index;native.dispatchEvent(new Event('change',{bubbles:true}));sync();if(!root.classList.contains('is-open'))open(root);
   } else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(root)}
  });
  native.parentElement.appendChild(root);root.append(btn,menu);
  native.addEventListener('change',sync);sync();
 });
 document.addEventListener('pointerdown',e=>{if(active&&!active.contains(e.target))close(active)},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active)close(active)});
 window.addEventListener('resize',()=>{if(active)close(active)});
}

// --- Initialize controls and event handlers ---
function initialize(){useDemo();initPrettySelects();$('chooseBtn').onclick=()=>$('fileInput').click();$('dropzone').onclick=e=>{if(!e.target.closest('button'))$('fileInput').click()};$('dropzone').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('fileInput').click()}};$('fileInput').onchange=e=>addFiles(e.target.files);['dragenter','dragover'].forEach(x=>$('dropzone').addEventListener(x,e=>{e.preventDefault();$('dropzone').classList.add('dragging')}));['dragleave','drop'].forEach(x=>$('dropzone').addEventListener(x,e=>{e.preventDefault();$('dropzone').classList.remove('dragging')}));$('dropzone').addEventListener('drop',e=>addFiles(e.dataTransfer.files));$('demoBtn').onclick=useDemo;$('resetBtn').onclick=()=>{state.pics=[];state.index=0;render()};$('prev').onclick=()=>moveIndex(state.index-1);$('next').onclick=()=>moveIndex(state.index+1);['ratio','fit','bg','caption'].forEach(id=>{$(id).onchange=e=>{state[id]=e.target.value;render()}});$('copyBtn').onclick=copyMode;$('copyObsidian').onclick=copyObsidian;$('downloadReader').onclick=()=>{if(!state.pics.length)return toast('请先添加图片');download('横滑组图_独立阅读版.html',buildStandalone());toast('独立阅读 HTML 已生成，可以在浏览器本地翻阅')};$('applyLinks').onclick=updateLinks;$('pasteArea').addEventListener('paste',parsePasted);setupMousePreview();$('strip').addEventListener('scroll',()=>{if(resizeGuard)return;clearTimeout($('strip')._scrollTimer);$('strip')._scrollTimer=setTimeout(()=>{const w=$('strip').clientWidth||1;const i=clamp(Math.round($('strip').scrollLeft/w),0,state.pics.length-1);if(i!==state.index){state.index=i;drawList();updateNav()}},100)},{passive:true});document.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea,[contenteditable]'))return;if(e.key==='ArrowRight')moveIndex(state.index+1);if(e.key==='ArrowLeft')moveIndex(state.index-1)});window.addEventListener('resize',()=>{resizeGuard=true;requestAnimationFrame(()=>{moveIndex(state.index,false);resizeGuard=false})});}
initialize();
