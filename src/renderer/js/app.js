if (!window.electronAPI) document.documentElement.classList.add('not-electron');
const HE=window.DailyHaikuEngine;
const AE=window.DailyHaikuArchive;
const StateClient=window.DailyHaikuStateClient;
let haikus=[];
const DEFAULT_TIME_WINDOW_SETTINGS={
  quietHoursEnabled:false,
  quietHoursStart:'22:00',
  quietHoursEnd:'08:00',
  workHoursOnly:false,
  workdayStart:'09:00',
  workdayEnd:'17:00',
  workdays:[1,2,3,4,5]
};
const MOOD_ACCENTS={
  default:['#d6aa62','214,170,98'],
  calm:['#89a891','137,168,145'],
  peaceful:['#89a891','137,168,145'],
  quiet:['#89a891','137,168,145'],
  gentle:['#89a891','137,168,145'],
  reflective:['#89a891','137,168,145'],
  clear:['#89a891','137,168,145'],
  resolve:['#d39a5f','211,154,95'],
  courage:['#d39a5f','211,154,95'],
  brave:['#d39a5f','211,154,95'],
  bold:['#d39a5f','211,154,95'],
  fierce:['#d39a5f','211,154,95'],
  determined:['#d39a5f','211,154,95'],
  powerful:['#d39a5f','211,154,95'],
  ambitious:['#d39a5f','211,154,95'],
  hopeful:['#d6aa62','214,170,98'],
  uplifted:['#d6aa62','214,170,98'],
  encouraged:['#d6aa62','214,170,98'],
  reassuring:['#d6aa62','214,170,98'],
  grateful:['#d6aa62','214,170,98'],
  light:['#d6aa62','214,170,98'],
  warm:['#d6aa62','214,170,98'],
  steady:['#aaa16f','170,161,111'],
  grounded:['#aaa16f','170,161,111'],
  steadfast:['#aaa16f','170,161,111'],
  patient:['#aaa16f','170,161,111'],
  satisfied:['#aaa16f','170,161,111'],
  healing:['#c58b75','197,139,117'],
  comforted:['#c58b75','197,139,117'],
  connected:['#c58b75','197,139,117'],
  open:['#c58b75','197,139,117'],
  affirming:['#c58b75','197,139,117'],
  inspired:['#7ea7a5','126,167,165']
};
const SHARE_THEMES={
  midnight:{name:'Midnight Ink',bg1:'#15120f',bg2:'#2b241b',ink:'#f6ecdc',muted:'#b8a98f',accent:'#d6aa62',paper:'#241e17'},
  morning:{name:'Morning Paper',bg1:'#efe3ce',bg2:'#d8c49e',ink:'#33261a',muted:'#786653',accent:'#b88448',paper:'#f4ead8'},
  autumn:{name:'Autumn Gold',bg1:'#2a1810',bg2:'#7b4525',ink:'#fff0d8',muted:'#d8b98b',accent:'#e0a24d',paper:'#3b2316'},
  forest:{name:'Forest Quiet',bg1:'#111b15',bg2:'#354231',ink:'#edf0df',muted:'#aab69a',accent:'#8faf76',paper:'#1d2a20'},
  winter:{name:'Winter Mist',bg1:'#dfe5e3',bg2:'#aab8bb',ink:'#203036',muted:'#68787c',accent:'#6e8f9b',paper:'#edf1ef'}
};
const APP_THEMES={
  midnight:{
    name:'Midnight Ink',background:'#15120f',surface:'#272119',surfaceHover:'#31291f',
    paper:'#332b20',paperLight:'#3a3024',text:'#f2e9dc',ink:'#f5ecdc',muted:'#baa98f',
    dim:'#86745d',accent:'#d6aa62',accentSoft:'rgba(214,170,98,0.16)',accentStrong:'#b98345',
    border:'#453a2c',borderLight:'#5b4c39',titlebar:'rgba(31,26,20,.72)',
    glow:'rgba(214,170,98,.12)',texture:.58,moodOverlay:.09,light:false
  },
  morning:{
    name:'Morning Paper',background:'#e8dcc7',surface:'#f4eadb',surfaceHover:'#fff6e7',
    paper:'#fff7e8',paperLight:'#f8edd9',text:'#2d2118',ink:'#2a1f17',muted:'#665847',
    dim:'#8a7962',accent:'#9d6b31',accentSoft:'rgba(157,107,49,0.16)',accentStrong:'#7f5527',
    border:'#c7b28f',borderLight:'#b09a76',titlebar:'rgba(242,232,214,.86)',
    glow:'rgba(157,107,49,.18)',texture:.34,moodOverlay:.11,light:true
  },
  autumn:{
    name:'Autumn Gold',background:'#1d130e',surface:'#2f1d14',surfaceHover:'#412718',
    paper:'#3b2316',paperLight:'#4b2c1b',text:'#fff0d8',ink:'#fff4df',muted:'#d8b98b',
    dim:'#9f7951',accent:'#e0a24d',accentSoft:'rgba(224,162,77,0.17)',accentStrong:'#bd7132',
    border:'#60402a',borderLight:'#7b5638',titlebar:'rgba(35,21,14,.74)',
    glow:'rgba(224,162,77,.16)',texture:.62,moodOverlay:.12,light:false
  },
  forest:{
    name:'Forest Quiet',background:'#111b15',surface:'#1d2a20',surfaceHover:'#27372b',
    paper:'#223126',paperLight:'#2d3f31',text:'#edf0df',ink:'#f3f0dc',muted:'#aab69a',
    dim:'#76846d',accent:'#8faf76',accentSoft:'rgba(143,175,118,0.17)',accentStrong:'#6f965d',
    border:'#3b4a38',borderLight:'#51654c',titlebar:'rgba(18,29,22,.76)',
    glow:'rgba(143,175,118,.14)',texture:.56,moodOverlay:.1,light:false
  },
  winter:{
    name:'Winter Mist',background:'#dfe5e3',surface:'#eef3f0',surfaceHover:'#f8fbf9',
    paper:'#f4f7f4',paperLight:'#ffffff',text:'#203036',ink:'#17282e',muted:'#68787c',
    dim:'#849196',accent:'#6e8f9b',accentSoft:'rgba(110,143,155,0.17)',accentStrong:'#52717c',
    border:'#b9c7c8',borderLight:'#9facaf',titlebar:'rgba(232,239,237,.86)',
    glow:'rgba(110,143,155,.16)',texture:.28,moodOverlay:.09,light:true
  }
};
function applyMoodAccent(mood){
  const key=String(mood||'').toLowerCase();
  const accent=MOOD_ACCENTS[key]||MOOD_ACCENTS.default;
  document.documentElement.style.setProperty('--mood',accent[0]);
  document.documentElement.style.setProperty('--mood-rgb',accent[1]);
}
function legacyAccentTheme(accent){
  const c=String(accent||'').toLowerCase();
  if(c==='#6a9e5c')return'forest';
  if(c==='#5c8e9e')return'winter';
  if(c==='#c45c4a'||c==='#c47a5c')return'autumn';
  return'midnight';
}
function applyTheme(key){
  const theme=APP_THEMES[key]||APP_THEMES.midnight;
  const root=document.documentElement;
  root.style.setProperty('--bg',theme.background);
  root.style.setProperty('--bg-el',theme.surface);
  root.style.setProperty('--card',theme.surface);
  root.style.setProperty('--card-h',theme.surfaceHover);
  root.style.setProperty('--paper',theme.paper);
  root.style.setProperty('--paper-l',theme.paperLight);
  root.style.setProperty('--ink',theme.ink);
  root.style.setProperty('--fg',theme.text);
  root.style.setProperty('--fg-m',theme.muted);
  root.style.setProperty('--fg-d',theme.dim);
  root.style.setProperty('--accent',theme.accent);
  root.style.setProperty('--accent-g',theme.accentSoft);
  root.style.setProperty('--accent-s',theme.accentStrong);
  root.style.setProperty('--bdr',theme.border);
  root.style.setProperty('--bdr-l',theme.borderLight);
  root.style.setProperty('--titlebar',theme.titlebar);
  root.style.setProperty('--theme-glow',theme.glow);
  root.style.setProperty('--texture-alpha',theme.texture);
  root.style.setProperty('--mood-overlay-alpha',theme.moodOverlay);
  document.body.classList.remove(...Object.keys(APP_THEMES).map(k=>`theme-${k}`),'theme-light');
  document.body.classList.add(`theme-${key}`);
  if(theme.light)document.body.classList.add('theme-light');
  const sel=document.getElementById('themeSel');
  if(sel)sel.value=key;
}
function setTheme(key,showToast){
  S.themeKey=APP_THEMES[key]?key:'midnight';
  applyTheme(S.themeKey);
  save();
  if(showToast)toast(`Theme: ${APP_THEMES[S.themeKey].name}`);
}

// ===================== STATE =====================
let S={
  cur:null,idx:-1,currentArchiveEntryId:null,history:[],archiveEntries:[],archiveMigrated:false,
  archiveView:{scope:'today',search:'',mood:'',theme:''},
  favs:[],interval:60,popup:true,notificationStyle:'native',sound:true,themeKey:'midnight',
  onboardingComplete:false,shownHaikuIds:[],
  timeWindowSettings:{...DEFAULT_TIME_WINDOW_SETTINGS}
};

async function load(){
  await StateClient.loadIntoState(S,{
    electronAPI:window.electronAPI,
    localStorage,
    themes:APP_THEMES,
    defaultTimeWindowSettings:DEFAULT_TIME_WINDOW_SETTINGS,
    normalizeArchiveEntries:AE.normalizeArchiveEntries
  });
}
function save(){
  StateClient.saveState(S,window.electronAPI);
}

// ===================== TABS =====================
function switchTab(t){
  document.querySelectorAll('.tb-tab').forEach(e=>e.classList.toggle('active',e.dataset.tab===t));
  document.querySelectorAll('.tp').forEach(e=>e.classList.toggle('active',e.id==='panel-'+t));
  if(t==='archive')renderArchive();
}

// ===================== HAIKU LOGIC =====================
async function loadHaikuData(){
  try{
    const raw=await window.electronAPI.getHaikus();
    haikus=HE.normalizeHaikus(raw);
  }catch(e){
    haikus=[];
    toast('Could not load haikus');
  }
}
function selectHaiku(){
  const r=HE.selectNextHaiku(haikus,{shownIds:S.shownHaikuIds},{currentId:S.cur&&S.cur.id});
  S.shownHaikuIds=r.queueState.shownIds;
  return{h:r.haiku,i:r.index};
}
function haikuRecord(h,i,entry){
  return{
    entryId:entry.id,id:entry.haikuId,t:entry.lines.join('\n'),i,shownAt:entry.shownAt,source:entry.source,
    time:new Date(entry.shownAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),
    mood:h.mood,theme:h.theme,reflection:entry.reflection
  };
}
function recordHaikuDisplay(h,i,source){
  const entry=AE.createArchiveEntry(h,{source});
  S.archiveEntries=AE.normalizeArchiveEntries([entry,...S.archiveEntries]);
  S.currentArchiveEntryId=entry.id;
  S.history.unshift(haikuRecord(h,i,entry));
  S.history=S.history.slice(0,8);
  updHist();renderArchive();save();
  return entry;
}
function display(h,i,anim,entryId){
  if(!h)return;
  S.cur=h;S.idx=i;
  if(entryId!==undefined)S.currentArchiveEntryId=entryId;
  applyMoodAccent(h.mood);
  const c=document.getElementById('haikuText');
  c.innerHTML=HE.getHaikuLines(h).map(l=>`<span class="ln${anim?'':' na'}">${l}</span>`).join('');
  document.getElementById('haikuDate').textContent=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  document.getElementById('haikuMeta').textContent=HE.getHaikuMeta(h);
  document.getElementById('haikuIndex').textContent=`Haiku ${i+1} of ${haikus.length}`;
  updFavBtn();syncCurrentReflection();
}
function newHaiku(){
  const{h,i}=selectHaiku();
  if(!h)return;
  const entry=recordHaikuDisplay(h,i,'manual');
  display(h,i,true,entry.id);resetMainTimer();
}
function initHaiku(){
  const{h,i}=selectHaiku();
  if(!h){updHist();updFavs();renderArchive();return}
  const entry=recordHaikuDisplay(h,i,'manual');
  display(h,i,true,entry.id);
  updFavs();save();
}

// ===================== FAVORITES =====================
function toggleFavorite(){
  if(!S.cur)return;
  const x=S.favs.findIndex(f=>favId(f)===S.cur.id);
  if(x>-1){S.favs.splice(x,1);toast('Removed from favorites')}
  else{S.favs.unshift({id:S.cur.id,t:HE.getHaikuText(S.cur),i:S.idx,mood:S.cur.mood,theme:S.cur.theme,
    time:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),
    date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})});
    toast('Saved to favorites')}
  updFavBtn();updFavs();renderArchive();save();
}
function saveHaikuAsFavorite(h,showNotice=true){
  if(!h)return false;
  const normalized=HE.normalizeHaikus([h])[0];
  if(!normalized)return false;
  if(S.favs.some(f=>favId(f)===normalized.id)){
    if(showNotice)toast('Already saved');
    return false;
  }
  const i=haikus.findIndex(x=>x.id===normalized.id);
  S.favs.unshift({id:normalized.id,t:HE.getHaikuText(normalized),i:i>-1?i:undefined,mood:normalized.mood,theme:normalized.theme,
    time:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),
    date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})});
  updFavBtn();updFavs();renderArchive();save();
  if(showNotice)toast('Saved to favorites');
  return true;
}
function updFavBtn(){
  const b=document.getElementById('favBtn'),f=S.favs.some(x=>favId(x)===S.cur?.id);
  b.classList.toggle('fav',f);
  b.innerHTML=f?'<i class="fa-solid fa-heart"></i><span>Saved</span>':'<i class="fa-regular fa-heart"></i><span>Save</span>';
}
function favId(f){return f.id||legacyHaiku(f.i)?.id||null}
function legacyHaiku(i){return HE.findHaikuByLegacyRef(haikus,i)}
function entryText(x){return x.t||(legacyHaiku(x.i)?HE.getHaikuText(legacyHaiku(x.i)):'')}
function updFavs(){
  const c=document.getElementById('favContent');
  if(!S.favs.length){c.innerHTML='<div class="fe"><i class="fa-regular fa-bookmark"></i><p>The shelf is quiet.<br>Save a haiku when one finds you.</p></div>';return}
  c.innerHTML='<div class="fl">'+S.favs.map((f,j)=>`<div class="fi"><div class="ft">${esc(entryText(f)).replace(/\n/g,'<br>')}</div><div class="fb"><span class="fv">${f.date||''} ${f.time||''}</span><span><button class="mini-link" data-action="share-favorite" data-index="${j}">Share Card</button><button class="fr" data-action="remove-favorite" data-index="${j}" aria-label="Remove"><i class="fa-solid fa-xmark"></i></button></span></div></div>`).join('')+'</div>';
}
function rmFav(j){S.favs.splice(j,1);updFavBtn();updFavs();renderArchive();save();toast('Removed')}

function favoriteHaiku(f){
  const h=legacyHaiku(f.id||f.i);
  if(h)return h;
  return HE.normalizeHaikus([{id:f.id||`favorite-${f.i||0}`,lines:entryText(f).split('\n'),mood:f.mood,theme:f.theme,tags:f.tags||[]}])[0];
}

// ===================== HISTORY =====================
function updHist(){
  const list=document.getElementById('historyList');
  if(!S.history.length){list.innerHTML='<div class="history-empty">No ink has settled here yet.</div>';return}
  list.innerHTML=S.history.slice(0,5).map((x,j)=>`<div class="hi" data-action="load-history" data-index="${j}">${esc(entryText(x)).replace(/\n/g,'<br>')}<div class="tm">${x.time||''}</div></div>`).join('');
}
function loadHist(j){
  const x=S.history[j];
  let entry=x&&x.entryId?S.archiveEntries.find(e=>e.id===x.entryId):null;
  const h=entry?archiveEntryHaiku(entry):HE.findHaikuByLegacyRef(haikus,x&&x.id?x.id:x&&x.i);
  if(!entry&&h)entry=S.archiveEntries.find(e=>e.haikuId===h.id&&e.lines.join('\n')===HE.getHaikuText(h))||null;
  const i=haikus.findIndex(v=>v.id===h?.id);
  if(h)display(h,i,true,entry?entry.id:null);
}

// ===================== ARCHIVE =====================
function esc(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function js(v){return JSON.stringify(String(v||''))}
function title(v){return String(v||'').split(/[\s-]+/).filter(Boolean).map(p=>p[0].toUpperCase()+p.slice(1)).join(' ')}
function favoriteIds(){return S.favs.map(f=>favId(f)).filter(Boolean)}
function archiveEntryHaiku(entry){
  return haikus.find(h=>h.id===entry.haikuId)||{id:entry.haikuId,lines:entry.lines,mood:entry.mood,theme:entry.theme,tags:entry.tags};
}
function migrateArchiveState(){
  if(S.archiveMigrated)return;
  S.archiveEntries=AE.migrateHistoryToArchive(S.history,haikus,S.archiveEntries);
  S.archiveMigrated=true;
  save();
}
function archiveDate(iso){
  const d=new Date(iso);
  if(Number.isNaN(d.getTime()))return'Unknown time';
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' at '+d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
}
function renderArchiveFilters(){
  const mood=document.getElementById('archiveMoodFilter'),theme=document.getElementById('archiveThemeFilter'),search=document.getElementById('archiveSearch');
  if(!mood||!theme||!search)return;
  const moodValue=S.archiveView.mood,themeValue=S.archiveView.theme;
  mood.innerHTML='<option value="">All moods</option>'+AE.getUniqueValues(S.archiveEntries,'mood').map(v=>`<option value="${esc(v)}">${esc(title(v))}</option>`).join('');
  theme.innerHTML='<option value="">All themes</option>'+AE.getUniqueValues(S.archiveEntries,'theme').map(v=>`<option value="${esc(v)}">${esc(title(v))}</option>`).join('');
  mood.value=moodValue;theme.value=themeValue;search.value=S.archiveView.search||'';
  document.querySelectorAll('.scope-btn').forEach(b=>b.classList.toggle('active',b.dataset.scope===S.archiveView.scope));
}
function renderArchive(){
  const list=document.getElementById('archiveList'),count=document.getElementById('archiveCount');
  if(!list||!count)return;
  renderArchiveFilters();
  const entries=AE.filterArchiveEntries(S.archiveEntries,{...S.archiveView,favoriteIds:favoriteIds()});
  count.textContent=`${entries.length} entr${entries.length===1?'y':'ies'}`;
  if(!entries.length){
    const hasFilters=S.archiveView.search||S.archiveView.mood||S.archiveView.theme||S.archiveView.scope==='favorites';
    list.innerHTML=`<div class="archive-empty">${hasFilters?'Nothing answers this quiet search.':'The archive is still blank.<br>Let a haiku find you first.'}</div>`;
    return;
  }
  list.innerHTML=entries.map(entry=>{
    const meta=[title(entry.mood),title(entry.theme)].filter(Boolean).join(' · ');
    const tags=entry.tags&&entry.tags.length?`<span class="archive-pill">${esc(entry.tags.slice(0,3).join(' · '))}</span>`:'';
    const source=entry.source==='scheduled'?'Scheduled':'Manual';
    return `<div class="archive-card">
      <div class="archive-lines" data-action="load-archive-entry" data-entry-id="${esc(entry.id)}">${esc(entry.lines.join('\n')).replace(/\n/g,'<br>')}</div>
      <div class="archive-meta"><span>${esc(archiveDate(entry.shownAt))}</span><span class="archive-pill">${esc(source)}</span><span>${esc(meta)}</span>${tags}</div>
      <button class="mini-link" data-action="share-archive" data-entry-id="${esc(entry.id)}">Share Card</button>
      <div class="archive-reflection">
        <label>What does this bring to mind?</label>
        <div class="reflection-row">
          <input class="reflection-input" maxlength="160" autocomplete="off" value="${esc(entry.reflection)}" placeholder="Optional one-line reflection" data-action="archive-reflection" data-entry-id="${esc(entry.id)}">
          <button class="mini-link" data-action="clear-archive-reflection" data-entry-id="${esc(entry.id)}">Clear</button>
        </div>
      </div>
    </div>`;
  }).join('');
}
function setArchiveScope(scope){S.archiveView.scope=scope;renderArchive();save()}
function updateArchiveSearch(value){S.archiveView.search=value;renderArchive();save()}
function updateArchiveFilter(key,value){S.archiveView[key]=value;renderArchive();save()}
function loadArchiveEntry(entryId){
  const entry=S.archiveEntries.find(e=>e.id===entryId);
  if(!entry)return;
  const h=archiveEntryHaiku(entry),i=haikus.findIndex(v=>v.id===h.id);
  display(h,i,true,entry.id);switchTab('haiku');
}
function updateEntryReflection(entryId,value,rerender){
  S.archiveEntries=AE.updateReflection(S.archiveEntries,entryId,value);
  S.history=S.history.map(item=>item.entryId===entryId?{...item,reflection:String(value||'').trim()}:item);
  save();
  if(rerender)renderArchive();
  if(S.currentArchiveEntryId===entryId)syncCurrentReflection(false);
}
function saveArchiveReflection(entryId,value){updateEntryReflection(entryId,value,false)}
function deleteArchiveReflection(entryId){updateEntryReflection(entryId,'',true);toast('Reflection cleared')}
function syncCurrentReflection(setValue=true){
  const input=document.getElementById('currentReflection'),clear=document.getElementById('clearReflectionBtn');
  if(!input)return;
  const entry=S.archiveEntries.find(e=>e.id===S.currentArchiveEntryId);
  if(setValue)input.value=entry&&entry.reflection?entry.reflection:'';
  if(clear)clear.style.visibility=entry&&entry.reflection?'visible':'hidden';
}
function updateCurrentReflection(value){
  if(!S.currentArchiveEntryId)return;
  updateEntryReflection(S.currentArchiveEntryId,value,false);
}
function clearCurrentReflection(){
  const input=document.getElementById('currentReflection');
  if(input)input.value='';
  if(S.currentArchiveEntryId)deleteArchiveReflection(S.currentArchiveEntryId);
}

// ===================== COPY =====================
function copyHaiku(){
  if(!S.cur)return;const t=HE.getHaikuText(S.cur);
  navigator.clipboard.writeText(t).then(()=>toast('Copied to clipboard')).catch(()=>{
    const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');document.body.removeChild(a);toast('Copied to clipboard');
  });
}

// ===================== SHARE CARD =====================
let shareTarget=null;
function hexToRgb(hex){
  const value=String(hex||'').replace('#','');
  const n=parseInt(value.length===3?value.split('').map(x=>x+x).join(''):value,16);
  return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};
}
function rgba(hex,a){const c=hexToRgb(hex);return`rgba(${c.r},${c.g},${c.b},${a})`}
function hashText(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function seeded(seed){let s=seed||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function shareThemeFor(haiku){
  const selected=document.getElementById('shareTheme').value;
  if(selected!=='mood')return SHARE_THEMES[selected]||SHARE_THEMES.midnight;
  const accent=(MOOD_ACCENTS[String(haiku.mood||'').toLowerCase()]||MOOD_ACCENTS.default)[0];
  const appTheme=APP_THEMES[S.themeKey]||APP_THEMES.midnight;
  return{name:'Current mood theme',accent,bg1:appTheme.background,bg2:appTheme.surfaceHover,ink:appTheme.ink,muted:appTheme.muted,paper:appTheme.paper};
}
function shareHaikuFromEntry(entry){return archiveEntryHaiku(entry)}
function openShareComposerForCurrent(){if(S.cur)openShareComposer(S.cur)}
function openShareComposerForFavorite(index){const h=favoriteHaiku(S.favs[index]);if(h)openShareComposer(h)}
function openShareComposerForArchive(entryId){const entry=S.archiveEntries.find(e=>e.id===entryId);if(entry)openShareComposer(shareHaikuFromEntry(entry))}
function openShareComposer(haiku){
  shareTarget=HE.normalizeHaikus([haiku])[0];
  if(!shareTarget)return;
  document.getElementById('shareTheme').value='mood';
  document.getElementById('shareFormat').value='square';
  document.getElementById('shareShowMeta').checked=true;
  document.getElementById('shareShowBrand').checked=true;
  document.getElementById('shareModal').classList.add('show');
  renderSharePreview();
}
function closeShareComposer(){document.getElementById('shareModal').classList.remove('show');shareTarget=null}
function shareSize(){
  return document.getElementById('shareFormat').value==='portrait'?{w:1080,h:1920}:{w:1080,h:1080};
}
function drawShareTexture(ctx,w,h,theme,seed){
  const rnd=seeded(seed);
  ctx.save();
  for(let i=0;i<520;i++){
    const x=rnd()*w,y=rnd()*h,l=18+rnd()*80;
    ctx.strokeStyle=rnd()>.5?rgba(theme.ink,.035):rgba(theme.accent,.03);
    ctx.lineWidth=.8+rnd()*1.4;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+l,y+(rnd()-.5)*8);ctx.stroke();
  }
  for(let i=0;i<900;i++){
    ctx.fillStyle=rnd()>.6?rgba(theme.ink,.025):rgba(theme.accent,.028);
    ctx.fillRect(rnd()*w,rnd()*h,1+rnd()*1.6,1+rnd()*1.6);
  }
  ctx.restore();
}
function fitFont(ctx,lines,maxWidth,start,min){
  let size=start;
  while(size>min){
    ctx.font=`italic ${size}px Georgia, "Times New Roman", serif`;
    if(lines.every(line=>ctx.measureText(line).width<=maxWidth))break;
    size-=2;
  }
  return size;
}
function drawCenteredLines(ctx,lines,w,h,theme,format){
  const maxWidth=w*.74;
  const start=format==='portrait'?76:66;
  const size=fitFont(ctx,lines,maxWidth,start,42);
  const lineHeight=size*1.62;
  const total=(lines.length-1)*lineHeight;
  const centerY=format==='portrait'?h*.47:h*.50;
  ctx.fillStyle=theme.ink;
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.font=`italic ${size}px Georgia, "Times New Roman", serif`;
  lines.forEach((line,i)=>ctx.fillText(line,w/2,centerY-total/2+i*lineHeight));
}
function drawShareCard(canvas,haiku,options){
  const {w,h}=shareSize();
  const format=document.getElementById('shareFormat').value;
  canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d');
  const theme=shareThemeFor(haiku);
  const seed=hashText(HE.getHaikuText(haiku)+theme.name+format);
  const bg=ctx.createLinearGradient(0,0,w,h);
  bg.addColorStop(0,theme.bg1);bg.addColorStop(1,theme.bg2);
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  ctx.fillStyle=rgba(theme.paper,.36);ctx.fillRect(w*.06,h*.055,w*.88,h*.89);
  drawShareTexture(ctx,w,h,theme,seed);
  ctx.strokeStyle=rgba(theme.accent,.46);ctx.lineWidth=3;
  ctx.strokeRect(w*.085,h*.08,w*.83,h*.84);
  ctx.strokeStyle=rgba(theme.ink,.09);ctx.lineWidth=2;
  ctx.strokeRect(w*.11,h*.105,w*.78,h*.79);
  const lines=HE.getHaikuLines(haiku);
  drawCenteredLines(ctx,lines,w,h,theme,format);
  if(options.showMeta){
    ctx.fillStyle=theme.muted;
    ctx.font='28px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(HE.getHaikuMeta(haiku).replace(/\u00b7/g,'-'),w/2,format==='portrait'?h*.68:h*.70);
  }
  if(options.showBrand){
    ctx.fillStyle=rgba(theme.ink,.64);
    ctx.font='24px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('DAILY HAIKU',w/2,h*.89);
  }
}
function renderSharePreview(){
  if(!shareTarget)return null;
  const canvas=document.getElementById('shareCanvas');
  drawShareCard(canvas,shareTarget,{
    showMeta:document.getElementById('shareShowMeta').checked,
    showBrand:document.getElementById('shareShowBrand').checked
  });
  return canvas.toDataURL('image/png');
}
function shareSuggestedName(){
  const first=(HE.getHaikuLines(shareTarget)[0]||'Daily Haiku').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,42);
  return `daily-haiku-${first||'share-card'}`;
}
async function saveShareCardPng(){
  if(!window.electronAPI||!window.electronAPI.saveShareCardPng)return toast('Save is unavailable');
  const dataUrl=renderSharePreview();
  const result=await window.electronAPI.saveShareCardPng({dataUrl,suggestedName:shareSuggestedName()});
  if(result&&result.ok)toast('PNG saved');
  else if(result&&!result.canceled)toast(result.error||'Could not save PNG');
}
async function copyShareCardPng(){
  if(!window.electronAPI||!window.electronAPI.copyShareCardPng)return toast('Copy image is unavailable');
  const dataUrl=renderSharePreview();
  const result=await window.electronAPI.copyShareCardPng({dataUrl});
  toast(result&&result.ok?'PNG copied to clipboard':(result&&result.error)||'Could not copy PNG');
}

// ===================== COUNTDOWN =====================
let lastCountdownStatus='';
let lastCountdownText='';
let lastCountdownWidth='';
let lastRingText='';
function resetMainTimer(){
  if(!window.electronAPI)return;
  if(window.electronAPI.resetScheduler)window.electronAPI.resetScheduler();
  else window.electronAPI.resetTimer();
}
function formatRemaining(ms){
  const totalSeconds=Math.max(0,Math.ceil(Number(ms||0)/1000));
  const h=Math.floor(totalSeconds/3600);
  const m=Math.floor((totalSeconds%3600)/60);
  const s=totalSeconds%60;
  if(h>0)return`${h}h ${m}m remaining`;
  return`${m}m ${String(s).padStart(2,'0')}s remaining`;
}
function schedulerStatusText(snapshot){
  if(snapshot.isSuspended)return'Paused while system is suspended';
  if(snapshot.isLocked)return'Paused while screen is locked';
  if(snapshot.isInQuietHours)return'Resting during quiet hours';
  if(snapshot.isOutsideWorkHours)return'Waiting for your workday window';
  if(snapshot.isIdle)return'Paused while laptop is idle';
  if(snapshot.paused)return'Paused';
  return'Next haiku in';
}
function setTextIfChanged(el,text,lastKey){
  if(lastKey==='status'&&lastCountdownStatus===text)return;
  if(lastKey==='time'&&lastCountdownText===text)return;
  el.textContent=text;
  if(lastKey==='status')lastCountdownStatus=text;
  if(lastKey==='time')lastCountdownText=text;
}
function renderSchedulerSnapshot(snapshot){
  if(!snapshot)return;
  const fill=document.getElementById('countdownFill');
  const ring=document.getElementById('countdownRing');
  const ringValue=document.getElementById('ringValue');
  const time=document.getElementById('countdownTime');
  const status=document.getElementById('countdownStatus');
  const progress=Math.min(1,Math.max(0,Number(snapshot.progress||0)));
  const width=(progress*100).toFixed(1)+'%';
  if(width!==lastCountdownWidth){fill.style.width=width;lastCountdownWidth=width}
  const deg=(progress*360).toFixed(1)+'deg';
  ring.style.setProperty('--progress-deg',deg);
  const ringText=Math.round(progress*100)+'%';
  if(ringText!==lastRingText){ringValue.textContent=ringText;lastRingText=ringText}
  setTextIfChanged(status,schedulerStatusText(snapshot),'status');
  setTextIfChanged(time,formatRemaining(snapshot.remainingMs),'time');
}
function triggerPopup(){
  const{h,i}=selectHaiku();
  if(!h)return;
  const entry=recordHaikuDisplay(h,i,'scheduled');
  display(h,i,true,entry.id);
  if(S.popup&&window.electronAPI){
    const payload={haiku:h,lines:HE.getHaikuLines(h),text:HE.getHaikuText(h),meta:HE.getHaikuMeta(h),notificationStyle:S.notificationStyle};
    if(window.electronAPI.showHaikuNotification)window.electronAPI.showHaikuNotification(payload);
    else window.electronAPI.showNativeNotification(HE.getHaikuLines(h).join(' / '));
  }
  if(S.sound)playChime();
}

// ===================== CHIME =====================
function playChime(){
  try{const c=new(window.AudioContext||window.webkitAudioContext)();
    [523.25,659.25,783.99].forEach((f,i)=>{
      const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;
      g.gain.setValueAtTime(0,c.currentTime+i*.15);
      g.gain.linearRampToValueAtTime(.08,c.currentTime+i*.15+.05);
      g.gain.exponentialRampToValueAtTime(.001,c.currentTime+i*.15+.8);
      o.connect(g);g.connect(c.destination);o.start(c.currentTime+i*.15);o.stop(c.currentTime+i*.15+.8);
    })}catch(e){}
}

// ===================== SETTINGS =====================
function updateInterval(){
  S.interval=+document.getElementById('intervalSel').value;save();
  if(window.electronAPI)window.electronAPI.updateInterval(S.interval);
  toast(`Interval: every ${S.interval} minute${S.interval>1?'s':''}`);
}
function syncTimeWindowSettings(showToast){
  save();
  renderTimeWindowSettings();
  if(window.electronAPI&&window.electronAPI.updateScheduleSettings){
    window.electronAPI.updateScheduleSettings(S.timeWindowSettings).then(renderSchedulerSnapshot).catch(()=>{});
  }
  if(showToast)toast('Schedule updated');
}
function renderTimeWindowSettings(){
  const w=S.timeWindowSettings;
  document.getElementById('quietTgl').classList.toggle('on',!!w.quietHoursEnabled);
  document.getElementById('quietStart').value=w.quietHoursStart;
  document.getElementById('quietEnd').value=w.quietHoursEnd;
  document.getElementById('workOnlyTgl').classList.toggle('on',!!w.workHoursOnly);
  document.getElementById('workStart').value=w.workdayStart;
  document.getElementById('workEnd').value=w.workdayEnd;
  document.querySelectorAll('.day').forEach(b=>b.classList.toggle('on',w.workdays.includes(+b.dataset.day)));
}
function toggleQuietHours(){
  S.timeWindowSettings.quietHoursEnabled=!S.timeWindowSettings.quietHoursEnabled;
  syncTimeWindowSettings(true);
}
function toggleWorkHoursOnly(){
  S.timeWindowSettings.workHoursOnly=!S.timeWindowSettings.workHoursOnly;
  syncTimeWindowSettings(true);
}
function updateTimeWindowSetting(key,value){
  S.timeWindowSettings[key]=value;
  syncTimeWindowSettings(true);
}
function toggleWorkday(day){
  const days=new Set(S.timeWindowSettings.workdays);
  if(days.has(day))days.delete(day);else days.add(day);
  S.timeWindowSettings.workdays=[...days].sort((a,b)=>a-b);
  syncTimeWindowSettings(true);
}
function toggleSetting(t){
  if(t==='popup'){S.popup=!S.popup;document.getElementById('popupTgl').classList.toggle('on',S.popup)}
  else{S.sound=!S.sound;document.getElementById('soundTgl').classList.toggle('on',S.sound)}
  save();
}
function updateNotificationStyle(){
  S.notificationStyle=document.getElementById('notificationStyleSel').value;
  save();
  const label={native:'Native notification',floating:'Floating haiku card',both:'Native and floating'}[S.notificationStyle]||'Native notification';
  toast(`Notification style: ${label}`);
}
function toggleStartup(){
  const btn=document.getElementById('startupTgl'),on=btn.classList.toggle('on');
  if(window.electronAPI)window.electronAPI.toggleAutolaunch(on);
  toast(on?'Launch at login enabled':'Launch at login disabled');
}
function updateThemeSetting(){setTheme(document.getElementById('themeSel').value,true)}
function setAccent(_el,c){setTheme(legacyAccentTheme(c),true)}
function clearAllData(){
  S.favs=[];S.history=[];S.archiveEntries=[];S.currentArchiveEntryId=null;S.archiveMigrated=true;S.shownHaikuIds=[];
  updFavs();updHist();renderArchive();updFavBtn();syncCurrentReflection();save();toast('All data cleared')
}

// ===================== ONBOARDING =====================
let onboardingStep=0;
let onboardingDraft=null;
const ONBOARDING_TOTAL=7;
function onboardingDefaults(){
  return{
    interval:S.interval||60,
    notificationStyle:S.notificationStyle||'native',
    sound:S.sound!==false,
    quietHoursEnabled:!!S.timeWindowSettings.quietHoursEnabled,
    quietHoursStart:S.timeWindowSettings.quietHoursStart||'22:00',
    quietHoursEnd:S.timeWindowSettings.quietHoursEnd||'08:00',
    themeKey:S.themeKey||'midnight'
  };
}
function maybeShowOnboarding(){
  if(S.onboardingComplete)return;
  onboardingStep=0;
  onboardingDraft=onboardingDefaults();
  document.getElementById('onboardingModal').classList.add('show');
  renderOnboarding();
}
function onboardingOption(label,active,key,value,sub){
  return`<button class="onboarding-option${active?' active':''}" data-action="onboarding-value" data-key="${esc(key)}" data-value="${esc(String(value))}" data-value-type="${typeof value}">${esc(label)}${sub?`<br><span style="font-size:12px;color:var(--fg-d)">${esc(sub)}</span>`:''}</button>`;
}
function renderOnboarding(){
  const body=document.getElementById('onboardingBody'),dots=document.getElementById('onboardingDots');
  dots.innerHTML=Array.from({length:ONBOARDING_TOTAL},(_,i)=>`<span class="onboarding-dot${i===onboardingStep?' active':''}"></span>`).join('');
  document.getElementById('onboardingBack').style.visibility=onboardingStep===0?'hidden':'visible';
  document.getElementById('onboardingNext').textContent=onboardingStep===ONBOARDING_TOTAL-1?'Begin the ritual':'Next';
  const themeOptions=Object.entries(APP_THEMES).map(([key,t])=>onboardingOption(t.name,onboardingDraft.themeKey===key,'themeKey',key)).join('');
  const screens=[
    `<div class="onboarding-kicker">Welcome</div><h1 class="onboarding-title" id="onboardingTitle">A small pause for every active hour.</h1><p class="onboarding-text">Daily Haiku watches active laptop time gently, then offers a short poem when it is time to breathe.</p>`,
    `<div class="onboarding-kicker">Frequency</div><h1 class="onboarding-title" id="onboardingTitle">Choose the rhythm.</h1><p class="onboarding-text">You can change this later in Settings.</p><div class="onboarding-options">
      ${onboardingOption('Every 30 minutes',onboardingDraft.interval===30,'interval',30)}
      ${onboardingOption('Every hour',onboardingDraft.interval===60,'interval',60)}
      ${onboardingOption('Every 2 hours',onboardingDraft.interval===120,'interval',120)}
    </div>`,
    `<div class="onboarding-kicker">Notification Style</div><h1 class="onboarding-title" id="onboardingTitle">How should haikus arrive?</h1><div class="onboarding-options">
      ${onboardingOption('Native',onboardingDraft.notificationStyle==='native','notificationStyle','native','A standard Windows notification.')}
      ${onboardingOption('Floating card',onboardingDraft.notificationStyle==='floating','notificationStyle','floating','A soft custom haiku card.')}
      ${onboardingOption('Both',onboardingDraft.notificationStyle==='both','notificationStyle','both','Native alert and floating card together.')}
    </div>`,
    `<div class="onboarding-kicker">Sound</div><h1 class="onboarding-title" id="onboardingTitle">A gentle chime?</h1><div class="onboarding-options">
      ${onboardingOption('Sound on',onboardingDraft.sound===true,'sound',true)}
      ${onboardingOption('Sound off',onboardingDraft.sound===false,'sound',false)}
    </div>`,
    `<div class="onboarding-kicker">Quiet Hours</div><h1 class="onboarding-title" id="onboardingTitle">Protect your rest.</h1><p class="onboarding-text">Quiet hours default to 10 PM through 8 AM.</p><div class="onboarding-options">
      ${onboardingOption('Enable quiet hours',onboardingDraft.quietHoursEnabled===true,'quietHoursEnabled',true)}
      ${onboardingOption('Leave quiet hours off',onboardingDraft.quietHoursEnabled===false,'quietHoursEnabled',false)}
    </div><div class="onboarding-grid">
      <label class="time-field"><span>Start</span><input class="time-input" type="time" value="${esc(onboardingDraft.quietHoursStart)}" data-action="onboarding-field" data-key="quietHoursStart"></label>
      <label class="time-field"><span>End</span><input class="time-input" type="time" value="${esc(onboardingDraft.quietHoursEnd)}" data-action="onboarding-field" data-key="quietHoursEnd"></label>
    </div>`,
    `<div class="onboarding-kicker">Theme</div><h1 class="onboarding-title" id="onboardingTitle">Set the atmosphere.</h1><div class="onboarding-options">${themeOptions}</div>`,
    `<div class="onboarding-kicker">Finish</div><h1 class="onboarding-title" id="onboardingTitle">Begin the ritual</h1><p class="onboarding-text">Your haikus will follow active time, respect your quiet hours, and keep the app feeling like a small deliberate pause.</p>`
  ];
  body.innerHTML=screens[onboardingStep];
}
function setOnboardingValue(key,value){
  onboardingDraft[key]=value;
  if(key==='themeKey')applyTheme(value);
  renderOnboarding();
}
function previousOnboardingStep(){if(onboardingStep>0){onboardingStep-=1;renderOnboarding()}}
function nextOnboardingStep(){
  if(onboardingStep<ONBOARDING_TOTAL-1){onboardingStep+=1;renderOnboarding();return}
  finishOnboarding();
}
function skipOnboarding(){
  S.onboardingComplete=true;
  applyTheme(S.themeKey);
  save();
  document.getElementById('onboardingModal').classList.remove('show');
}
function finishOnboarding(){
  S.interval=onboardingDraft.interval;
  S.notificationStyle=onboardingDraft.notificationStyle;
  S.popup=true;
  S.sound=onboardingDraft.sound;
  S.timeWindowSettings={...S.timeWindowSettings,
    quietHoursEnabled:onboardingDraft.quietHoursEnabled,
    quietHoursStart:onboardingDraft.quietHoursStart||'22:00',
    quietHoursEnd:onboardingDraft.quietHoursEnd||'08:00'
  };
  S.onboardingComplete=true;
  setTheme(onboardingDraft.themeKey,false);
  document.getElementById('intervalSel').value=String(S.interval);
  document.getElementById('notificationStyleSel').value=S.notificationStyle;
  document.getElementById('popupTgl').classList.toggle('on',S.popup);
  document.getElementById('soundTgl').classList.toggle('on',S.sound);
  renderTimeWindowSettings();
  if(window.electronAPI)window.electronAPI.updateInterval(S.interval);
  syncTimeWindowSettings(false);
  save();
  document.getElementById('onboardingModal').classList.remove('show');
  toast('Ritual ready');
}

// ===================== TOAST =====================
let tto=null;
function toast(m){
  const t=document.getElementById('toast');document.getElementById('toastTxt').textContent=m;
  t.classList.add('show');if(tto)clearTimeout(tto);tto=setTimeout(()=>t.classList.remove('show'),2500);
}

// ===================== PARTICLES =====================
function mkParticles(){
  const c=document.getElementById('particles');
  for(let i=0;i<12;i++){const p=document.createElement('div');p.className='particle';
    p.style.left=Math.random()*100+'%';p.style.animationDuration=(18+Math.random()*25)+'s';
    p.style.animationDelay=Math.random()*20+'s';const sz=(1+Math.random()*2)+'px';
    p.style.width=sz;p.style.height=sz;c.appendChild(p);
  }
}

// ===================== ELECTRON WIRING =====================
function parsedDatasetValue(el){
  const type=el.dataset.valueType,value=el.dataset.value;
  if(type==='number')return Number(value);
  if(type==='boolean')return value==='true';
  return value;
}
function bindUIEvents(){
  document.addEventListener('click',e=>{
    const el=e.target.closest('[data-action]');
    if(!el)return;
    const action=el.dataset.action;
    if(action==='switch-tab')switchTab(el.dataset.tab);
    else if(action==='toggle-favorite')toggleFavorite();
    else if(action==='copy-haiku')copyHaiku();
    else if(action==='share-current')openShareComposerForCurrent();
    else if(action==='new-haiku')newHaiku();
    else if(action==='clear-current-reflection')clearCurrentReflection();
    else if(action==='open-archive')switchTab('archive');
    else if(action==='archive-scope')setArchiveScope(el.dataset.scope);
    else if(action==='toggle-quiet-hours')toggleQuietHours();
    else if(action==='toggle-work-hours-only')toggleWorkHoursOnly();
    else if(action==='toggle-workday')toggleWorkday(Number(el.dataset.day));
    else if(action==='toggle-popup')toggleSetting('popup');
    else if(action==='toggle-sound')toggleSetting('sound');
    else if(action==='toggle-startup')toggleStartup();
    else if(action==='clear-all-data')clearAllData();
    else if(action==='share-favorite')openShareComposerForFavorite(Number(el.dataset.index));
    else if(action==='remove-favorite')rmFav(Number(el.dataset.index));
    else if(action==='load-history')loadHist(Number(el.dataset.index));
    else if(action==='load-archive-entry')loadArchiveEntry(el.dataset.entryId);
    else if(action==='share-archive')openShareComposerForArchive(el.dataset.entryId);
    else if(action==='clear-archive-reflection')deleteArchiveReflection(el.dataset.entryId);
    else if(action==='skip-onboarding')skipOnboarding();
    else if(action==='onboarding-back')previousOnboardingStep();
    else if(action==='onboarding-next')nextOnboardingStep();
    else if(action==='onboarding-value')setOnboardingValue(el.dataset.key,parsedDatasetValue(el));
    else if(action==='save-share-png')saveShareCardPng();
    else if(action==='copy-share-png')copyShareCardPng();
    else if(action==='close-share-composer')closeShareComposer();
  });
  document.addEventListener('input',e=>{
    const el=e.target;
    if(el.id==='currentReflection')updateCurrentReflection(el.value);
    else if(el.id==='archiveSearch')updateArchiveSearch(el.value);
    else if(el.dataset.action==='archive-reflection')saveArchiveReflection(el.dataset.entryId,el.value);
  });
  document.addEventListener('change',e=>{
    const el=e.target;
    if(el.id==='archiveMoodFilter')updateArchiveFilter('mood',el.value);
    else if(el.id==='archiveThemeFilter')updateArchiveFilter('theme',el.value);
    else if(el.id==='intervalSel')updateInterval();
    else if(el.id==='notificationStyleSel')updateNotificationStyle();
    else if(el.id==='themeSel')updateThemeSetting();
    else if(el.dataset.settingKey)updateTimeWindowSetting(el.dataset.settingKey,el.value);
    else if(el.dataset.action==='onboarding-field')setOnboardingValue(el.dataset.key,el.value);
    else if(['shareFormat','shareTheme','shareShowMeta','shareShowBrand'].includes(el.id))renderSharePreview();
  });
}
function wireElectron(){
  if(!window.electronAPI)return;
  document.getElementById('minBtn').addEventListener('click',()=>window.electronAPI.minimize());
  document.getElementById('closeBtn').addEventListener('click',()=>window.electronAPI.close());
  window.electronAPI.onTriggerPopup(()=>{triggerPopup()});
  window.electronAPI.onOpenSettings(()=>switchTab('settings'));
  if(window.electronAPI.onFloatingHaikuSave)window.electronAPI.onFloatingHaikuSave(h=>saveHaikuAsFavorite(h));
  if(window.electronAPI.onSchedulerSnapshot)window.electronAPI.onSchedulerSnapshot(renderSchedulerSnapshot);
  window.electronAPI.updateInterval(S.interval);
  if(window.electronAPI.updateScheduleSettings)window.electronAPI.updateScheduleSettings(S.timeWindowSettings).then(renderSchedulerSnapshot).catch(()=>{});
  if(window.electronAPI.getSchedulerSnapshot){
    window.electronAPI.getSchedulerSnapshot().then(renderSchedulerSnapshot).catch(()=>{});
  }
  // Restore startup toggle state
  window.electronAPI.getAutolaunch().then(on=>{
    document.getElementById('startupTgl').classList.toggle('on',on);
  }).catch(()=>{});
}

// ===================== KEYBOARD =====================
document.addEventListener('keydown',e=>{
  if(!window.electronAPI)return;
  if(e.key==='Escape'&&document.getElementById('shareModal').classList.contains('show')){closeShareComposer();return}
  if(['SELECT','INPUT','TEXTAREA'].includes(e.target.tagName))return;
  if(e.key==='n'||e.key==='N')newHaiku();
  if(e.key==='f'||e.key==='F')toggleFavorite();
  if(e.key==='1')switchTab('haiku');
  if(e.key==='2')switchTab('archive');
  if(e.key==='3')switchTab('favorites');
  if(e.key==='4')switchTab('settings');
});
document.getElementById('shareModal').addEventListener('click',e=>{
  if(e.target.id==='shareModal')closeShareComposer();
});

// ===================== INIT =====================
async function init(){
  if(!window.electronAPI)return;
  await load();
  applyTheme(S.themeKey);
  await loadHaikuData();
  migrateArchiveState();
  document.getElementById('intervalSel').value=String(S.interval);
  document.getElementById('notificationStyleSel').value=S.notificationStyle;
  document.getElementById('themeSel').value=S.themeKey;
  document.getElementById('popupTgl').classList.toggle('on',S.popup);
  document.getElementById('soundTgl').classList.toggle('on',S.sound);
  renderTimeWindowSettings();
  renderArchive();initHaiku();mkParticles();bindUIEvents();wireElectron();
  maybeShowOnboarding();
}
function rgb2hex(c){if(!c||c[0]==='#')return(c||'').toLowerCase();
  const m=c.match(/\d+/g);if(!m)return c;return'#'+m.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join('');}
init();
