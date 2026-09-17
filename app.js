const destinations = [
  {
    id:'shibuya', name:'Shibuya Crossing', detail:'Tokyo, Japan', region:'Asia', timezone:'Asia/Tokyo',
    videoId:'dfVK7ld38Ys', quality:'LIVE · CITY', description:'Real-time view over the Shibuya scramble crossing.', source:'ANNnewsCH'
  },
  {
    id:'venice', name:'Ponte delle Guglie', detail:'Venice, Italy', region:'Europe', timezone:'Europe/Rome',
    videoId:'mt7uE-n0YPI', quality:'LIVE · 4K', description:'Canal traffic and daily life from Cannaregio in Venice.', source:'Venice live camera'
  },
  {
    id:'geiranger', name:'Geirangerfjord', detail:'Geiranger, Norway', region:'Nordic', timezone:'Europe/Oslo',
    videoId:'yMSc-qqW3To', quality:'LIVE · 4K', description:'A live window into the fjord, port and surrounding mountains.', source:'Geiranger live camera'
  },
  {
    id:'thailand', name:'Crystal Bay', detail:'Koh Samui, Thailand', region:'Southeast Asia', timezone:'Asia/Bangkok',
    videoId:'3N3ZwIB_X4Y', quality:'LIVE · 4K BEACH', description:'Tropical shoreline, palms and the water of Crystal Bay.', source:'Koh Samui live camera'
  },
  {
    id:'times-square', name:'Times Square', detail:'New York City, USA', region:'North America', timezone:'America/New_York',
    videoId:'VXo0VqVcbK4', quality:'LIVE · 4K CITY', description:'Pedestrians, traffic and lights at the crossroads of the world.', source:'Times Square live camera'
  },
  {
    id:'kamikochi', name:'Kappa Bridge', detail:'Kamikōchi, Japan', region:'Asia', timezone:'Asia/Tokyo',
    videoId:'Iv2VUE_UhRQ', quality:'LIVE · 4K NATURE', description:'The Azusa River, Kappa Bridge and Japanese Alps in real time.', source:'Kamikochi Kappa-Bashi live camera'
  },
  {
    id:'paris', name:'Paris Panorama', detail:'Paris, France', region:'Europe', timezone:'Europe/Paris',
    videoId:'-xzg3wujOVM', quality:'LIVE · CITY', description:'A live panorama across the Paris skyline and Eiffel Tower.', source:'Paris live camera'
  },
  {
    id:'vatican', name:"St. Peter's Square", detail:'Vatican City', region:'Europe', timezone:'Europe/Rome',
    videoId:'K-zknhNgt7Y', quality:'LIVE · 1080P', description:'Live activity across St. Peter’s Square and Basilica.', source:'Vatican live camera'
  },
  {
    id:'aurora', name:'Lapland Sky', detail:'Kilpisjärvi, Finland', region:'Arctic', timezone:'Europe/Helsinki',
    videoId:'ccTVAhJU5lg', quality:'LIVE · 4K SKY', description:'A live Arctic sky camera with seasonal aurora viewing.', source:'Finland live camera'
  },
  {
    id:'zaanse', name:'Zaanse Schans', detail:'Zaandam, Netherlands', region:'Europe', timezone:'Europe/Amsterdam',
    videoId:'o9MIV7sep5k', quality:'LIVE · LANDMARK', description:'Historic windmills, canals and visitors in real time.', source:'Zaanse Schans live camera'
  },
  {
    id:'manaus', name:'Teatro Amazonas', detail:'Manaus, Brazil', region:'South America', timezone:'America/Manaus',
    videoId:'zQk5FOcP0f0', quality:'LIVE · CITY', description:'The Amazon Theatre and its public square in central Manaus.', source:'Manaus live camera'
  },
  {
    id:'wild-africa', name:'Wild Africa', detail:'Southern & Eastern Africa', region:'Africa', timezone:'Africa/Johannesburg',
    videoId:'vr4o_AsrU1k', quality:'LIVE · WILDLIFE', description:'A continuous live safari feed from wildlife cameras across Africa.', source:'Africam'
  }
];

const state = {
  index:0,
  activeSlot:'A',
  transitioning:false,
  transition:'rift',
  duration:1250,
  edge:70,
  wander:false,
  wanderSeconds:45,
  wanderTimer:null,
  idleTimer:null,
  players:{A:null,B:null},
  ready:{A:false,B:false},
  loadedIndex:{A:0,B:1},
  playing:{A:false,B:false},
  failed:new Set(),
  pendingJump:null,
  pendingTimer:null,
  initialStarted:false
};

const $ = s => document.querySelector(s);
const app = $('#app');
const layers = {A:$('#layerA'),B:$('#layerB')};

function inactiveSlot(){ return state.activeSlot === 'A' ? 'B' : 'A'; }
function currentDestination(){ return destinations[state.index]; }
function validWebOrigin(){ return location.protocol === 'https:' || location.protocol === 'http:'; }
function sourceUrl(d){ return `https://www.youtube.com/watch?v=${encodeURIComponent(d.videoId)}`; }

if(location.protocol === 'file:'){
  $('#fileWarning').hidden = false;
}

function playerVars(){
  const vars = {
    autoplay:1,
    mute:1,
    controls:0,
    rel:0,
    playsinline:1,
    disablekb:1,
    fs:0,
    iv_load_policy:3,
    cc_load_policy:0,
    enablejsapi:1
  };
  if(validWebOrigin()) vars.origin = location.origin;
  return vars;
}

window.onYouTubeIframeAPIReady = function(){
  if(location.protocol === 'file:') return;
  state.players.A = createPlayer('playerA','A',0);
  state.players.B = createPlayer('playerB','B',1);
  updateHud();
  buildDestinationGrid();
  tickClock();
};

function createPlayer(elementId,slot,index){
  return new YT.Player(elementId, {
    videoId: destinations[index].videoId,
    host:'https://www.youtube.com',
    playerVars:playerVars(),
    events:{
      onReady:()=>onPlayerReady(slot),
      onStateChange:e=>onPlayerState(slot,e),
      onError:e=>onPlayerError(slot,e)
    }
  });
}

function onPlayerReady(slot){
  state.ready[slot] = true;
  try{
    const iframe = state.players[slot].getIframe();
    iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
    iframe.setAttribute('allow','autoplay; encrypted-media; picture-in-picture');
    state.players[slot].mute();
    state.players[slot].playVideo();
  }catch(e){}
}

function onPlayerState(slot,e){
  if(e.data === YT.PlayerState.PLAYING){
    state.playing[slot] = true;
    const idx = state.loadedIndex[slot];
    if(slot === state.activeSlot && idx === state.index && !state.initialStarted){
      state.initialStarted = true;
      $('#loadingScreen').classList.add('hidden');
      setTimeout(preloadNext,300);
    }
    if(state.pendingJump && state.pendingJump.slot === slot && state.pendingJump.index === idx){
      beginTransition();
    }
  }else if(e.data === YT.PlayerState.CUED || e.data === YT.PlayerState.PAUSED){
    try{ state.players[slot].playVideo(); }catch(err){}
  }else if(e.data === YT.PlayerState.ENDED){
    state.playing[slot] = false;
  }
}

function onPlayerError(slot,e){
  const idx = state.loadedIndex[slot];
  if(Number.isInteger(idx)) state.failed.add(idx);
  buildDestinationGrid();

  const messages = {
    100:'Feed removed or unavailable',
    101:'Embedding disabled by camera owner',
    150:'Embedding disabled by camera owner',
    153:'YouTube embed identity/referrer rejected'
  };
  const reason = messages[e.data] || `Player error ${e.data}`;

  if(state.pendingJump && state.pendingJump.slot === slot){
    clearTimeout(state.pendingTimer);
    state.pendingJump = null;
    state.transitioning = false;
    app.classList.remove('transitioning');
    toast(`${reason}. Trying another portal…`);
    setTimeout(()=>jumpBy(1),350);
    return;
  }

  if(slot === state.activeSlot){
    toast(`${reason}. Skipping this portal…`);
    setTimeout(()=>jumpBy(1),500);
  }else{
    toast(`${reason} on a queued portal.`);
    setTimeout(preloadNext,250);
  }
}

function loadIndex(slot,index){
  const player = state.players[slot];
  if(!player || !state.ready[slot]) return false;
  if(state.loadedIndex[slot] === index && state.playing[slot]) return true;
  state.loadedIndex[slot] = index;
  state.playing[slot] = false;
  try{
    player.loadVideoById({videoId:destinations[index].videoId,startSeconds:0});
    player.mute();
    return true;
  }catch(e){
    return false;
  }
}

function nextUsableIndex(from,delta=1){
  if(state.failed.size >= destinations.length - 1) return from;
  let idx = from;
  for(let i=0;i<destinations.length;i++){
    idx = (idx + delta + destinations.length) % destinations.length;
    if(!state.failed.has(idx)) return idx;
  }
  return from;
}

function preloadNext(){
  if(!state.players.A || !state.players.B || state.transitioning) return;
  const idx = nextUsableIndex(state.index,1);
  if(idx === state.index) return;
  loadIndex(inactiveSlot(),idx);
}

function updateHud(){
  const d = currentDestination();
  $('#placeName').textContent = d.name;
  $('#placeDetail').textContent = d.detail;
  $('#qualityPill').textContent = d.quality;
  $('#sourceLink').textContent = `${d.source} ↗`;
  $('#sourceLink').href = sourceUrl(d);
  $('#loadingPlace').textContent = d.name;
  document.title = `PORTALS — ${d.name}`;
  document.querySelectorAll('.destination-card').forEach(el=>el.classList.toggle('active',el.dataset.id===d.id));
  tickClock();
}

function tickClock(){
  const d = currentDestination();
  if(!d) return;
  try{
    $('#localTime').textContent = new Intl.DateTimeFormat(undefined,{timeZone:d.timezone,hour:'numeric',minute:'2-digit'}).format(new Date()) + ' local';
  }catch(e){
    $('#localTime').textContent = 'Live now';
  }
}
setInterval(tickClock,15000);

function jumpTo(requestedIndex){
  if(state.transitioning || !state.players.A || !state.players.B) return;
  let targetIndex = (requestedIndex + destinations.length) % destinations.length;
  if(state.failed.has(targetIndex)) targetIndex = nextUsableIndex(targetIndex,1);
  if(targetIndex === state.index) return;

  const incoming = inactiveSlot();
  const outgoing = state.activeSlot;
  state.transitioning = true;
  state.pendingJump = {index:targetIndex,slot:incoming,outgoing};

  const incomingLayer = layers[incoming];
  const outgoingLayer = layers[outgoing];
  incomingLayer.className = 'world-layer incoming prep';
  incomingLayer.style.zIndex = '3';
  outgoingLayer.style.zIndex = '1';

  const alreadyWarm = state.loadedIndex[incoming] === targetIndex && state.playing[incoming];
  if(!alreadyWarm) loadIndex(incoming,targetIndex);

  clearTimeout(state.pendingTimer);
  state.pendingTimer = setTimeout(()=>{
    if(!state.pendingJump) return;
    const missed = state.pendingJump.index;
    state.failed.add(missed);
    state.pendingJump = null;
    state.transitioning = false;
    incomingLayer.className = 'world-layer incoming';
    app.classList.remove('transitioning');
    buildDestinationGrid();
    toast('That live feed did not become ready. Trying another portal…');
    setTimeout(()=>jumpBy(1),250);
  },8000);

  if(alreadyWarm) setTimeout(beginTransition,120);
}

function beginTransition(){
  if(!state.pendingJump) return;
  const {index:targetIndex,slot:incoming,outgoing} = state.pendingJump;
  clearTimeout(state.pendingTimer);
  state.pendingJump = null;

  const incomingLayer = layers[incoming];
  const outgoingLayer = layers[outgoing];
  app.classList.add('transitioning');
  $('#centerFlash').classList.remove('show');
  void $('#centerFlash').offsetWidth;
  $('#centerFlash').classList.add('show');

  // Let one rendered frame exist inside the opening before the portal expands.
  setTimeout(()=>{
    incomingLayer.classList.add('go');
    setTimeout(()=>{
      outgoingLayer.className = 'world-layer incoming';
      outgoingLayer.style.zIndex = '2';
      incomingLayer.className = 'world-layer active';
      incomingLayer.style.zIndex = '1';
      state.activeSlot = incoming;
      state.index = targetIndex;
      state.transitioning = false;
      app.classList.remove('transitioning');
      updateHud();
      setTimeout(preloadNext,350);
      resetWander();
    },state.duration + 80);
  },180);
}

function jumpBy(delta){
  const target = nextUsableIndex(state.index,delta >= 0 ? 1 : -1);
  jumpTo(target);
}

function randomJump(){
  const usable = destinations.map((_,i)=>i).filter(i=>i!==state.index && !state.failed.has(i));
  if(!usable.length) return toast('No other verified live portals are available right now.');
  jumpTo(usable[Math.floor(Math.random()*usable.length)]);
}

function buildDestinationGrid(){
  const grid = $('#destinationGrid');
  grid.innerHTML = destinations.map((d,i)=>`
    <button class="destination-card ${i===state.index?'active':''} ${state.failed.has(i)?'failed':''}" data-id="${d.id}" data-index="${i}" ${state.failed.has(i)?'disabled':''}>
      <span class="region">${d.region}</span>
      <h3>${d.name}</h3>
      <p>${d.detail}<br>${d.description}</p>
      <span class="badge">${d.quality}</span>
    </button>`).join('');
}

$('#destinationGrid').addEventListener('click',e=>{
  const card = e.target.closest('.destination-card');
  if(!card || card.disabled) return;
  closePanels();
  jumpTo(Number(card.dataset.index));
});

function toast(msg){
  const el = $('#statusToast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(()=>el.classList.remove('show'),3100);
}

function openDrawer(){ closePanels(); $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden','false'); $('#scrim').classList.add('show'); }
function openSettings(){ closePanels(); $('#settings').classList.add('open'); $('#settings').setAttribute('aria-hidden','false'); $('#scrim').classList.add('show'); }
function closePanels(){ document.querySelectorAll('.drawer,.settings').forEach(p=>{p.classList.remove('open');p.setAttribute('aria-hidden','true')}); $('#scrim').classList.remove('show'); }

function setTransition(name){
  state.transition = name;
  app.dataset.transition = name;
  document.querySelectorAll('.transition-card').forEach(b=>b.classList.toggle('selected',b.dataset.transition===name));
  toast(`${name[0].toUpperCase()+name.slice(1)} transition selected`);
}
function setWander(on){
  state.wander = on;
  $('#wanderButton').textContent = on ? 'Wander ●' : 'Wander';
  $('#wanderButton').classList.toggle('active',on);
  resetWander();
  toast(on ? `Wander mode · ${state.wanderSeconds}s` : 'Wander mode off');
}
function resetWander(){
  clearInterval(state.wanderTimer);
  if(state.wander) state.wanderTimer = setInterval(randomJump,state.wanderSeconds*1000);
}

$('#prevButton').addEventListener('click',()=>jumpBy(-1));
$('#nextButton').addEventListener('click',()=>jumpBy(1));
$('#randomButton').addEventListener('click',randomJump);
$('#wanderButton').addEventListener('click',()=>setWander(!state.wander));
$('#destinationsButton').addEventListener('click',openDrawer);
$('#settingsButton').addEventListener('click',openSettings);
$('#closeDrawer').addEventListener('click',closePanels);
$('#closeSettings').addEventListener('click',closePanels);
$('#scrim').addEventListener('click',closePanels);
$('#fullscreenButton').addEventListener('click',async()=>{
  try{
    if(!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  }catch(e){ toast('Fullscreen is not available in this browser'); }
});
$('#transitionList').addEventListener('click',e=>{ const b=e.target.closest('.transition-card'); if(b) setTransition(b.dataset.transition); });
$('#speedRange').addEventListener('input',e=>{ state.duration=Number(e.target.value); document.documentElement.style.setProperty('--duration',`${state.duration}ms`); $('#speedOutput').textContent=(state.duration/1000).toFixed(2)+'s'; });
$('#edgeRange').addEventListener('input',e=>{ state.edge=Number(e.target.value); document.documentElement.style.setProperty('--edge',(state.edge/100).toFixed(2)); $('#edgeOutput').textContent=state.edge+'%'; });
$('#wanderRange').addEventListener('input',e=>{ state.wanderSeconds=Number(e.target.value); $('#wanderOutput').textContent=state.wanderSeconds+'s'; resetWander(); });

document.addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'){e.preventDefault();jumpBy(1);}
  if(e.key==='ArrowLeft'){e.preventDefault();jumpBy(-1);}
  if(e.code==='Space' && !['INPUT','BUTTON'].includes(document.activeElement.tagName)){e.preventDefault();randomJump();}
  if(e.key==='Escape') closePanels();
});

function wakeChrome(){
  app.classList.remove('idle');
  clearTimeout(state.idleTimer);
  state.idleTimer=setTimeout(()=>app.classList.add('idle'),5000);
}
['mousemove','mousedown','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,wakeChrome,{passive:true}));
wakeChrome();
