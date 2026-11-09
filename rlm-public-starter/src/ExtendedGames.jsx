import React from 'react'
import { Chess } from 'chess.js'

const CLOCKS = ['1+0', '2+1', '3+2', '5+0', '10+0']
const EMPTY_TTT = Array(9).fill('')
const pieces = { w: { k:'♔',q:'♕',r:'♖',b:'♗',n:'♘',p:'♙' }, b: { k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟' } }


const PIECE_VALUE = { p:100, n:320, b:330, r:500, q:900, k:20000 }
function evaluateChess(game) {
  if (game.isCheckmate()) return game.turn() === 'w' ? -100000 : 100000
  if (game.isDraw()) return 0
  let score = 0
  for (const row of game.board()) for (const piece of row) if (piece) {
    const value = PIECE_VALUE[piece.type]
    const central = 3.5 - Math.abs(3.5 - (piece.square.charCodeAt(0) - 97)) + 3.5 - Math.abs(3.5 - (Number(piece.square[1]) - 1))
    score += (piece.color === 'w' ? 1 : -1) * (value + (piece.type === 'p' ? central * 4 : piece.type === 'n' || piece.type === 'b' ? central * 3 : 0))
  }
  return score
}
function chessSearch(game, depth, alpha, beta) {
  if (depth <= 0 || game.isGameOver()) {
    const value = evaluateChess(game)
    return game.turn() === 'w' ? value : -value
  }
  const moves = game.moves({ verbose: true }).sort((a,b) => (b.captured ? PIECE_VALUE[b.captured] : 0) - (a.captured ? PIECE_VALUE[a.captured] : 0))
  let best = -Infinity
  for (const move of moves) {
    game.move(move)
    const score = -chessSearch(game, depth - 1, -beta, -alpha)
    game.undo()
    best = Math.max(best, score)
    alpha = Math.max(alpha, score)
    if (alpha >= beta) break
  }
  return best
}
function chooseChessBotMove(game, rating) {
  const settings = rating >= 2900 ? {depth:3,blunder:0.01} : rating >= 2400 ? {depth:2,blunder:0.05} : rating >= 1900 ? {depth:2,blunder:0.13} : rating >= 1400 ? {depth:1,blunder:0.25} : {depth:1,blunder:0.4}
  const moves = game.moves({ verbose: true })
  if (!moves.length) return null
  if (Math.random() < settings.blunder) return moves[Math.floor(Math.random() * moves.length)]
  let best = -Infinity, choices = []
  for (const move of moves) {
    game.move(move)
    const score = -chessSearch(game, settings.depth - 1, -Infinity, Infinity)
    game.undo()
    if (score > best) { best = score; choices = [move] }
    else if (score === best) choices.push(move)
  }
  return choices[Math.floor(Math.random() * choices.length)]
}

function SoloChess({ onFinish }) {
  const [rating,setRating] = React.useState(1600)
  const [,setPositionVersion] = React.useState(0)
  const [selected,setSelected] = React.useState('')
  const [thinking,setThinking] = React.useState(false)
  const [message,setMessage] = React.useState('You play White. Choose a piece to begin.')
  const gameRef = React.useRef(new Chess())
  const game = gameRef.current
  const board = game.board()
  const finished = game.isGameOver()
  function sync(msg) { setPositionVersion(v=>v+1); setSelected(''); setMessage(msg) }
  function botTurn() {
    if (game.isGameOver() || game.turn() !== 'b') return
    setThinking(true)
    window.setTimeout(() => {
      const move = chooseChessBotMove(game, rating)
      if (move) {
        game.move(move)
        const result = game.isCheckmate() ? 'Checkmate — the bot wins.' : game.isDraw() ? 'The game is a draw.' : `Bot played ${move.san}. Your move.`
        sync(result)
      }
      setThinking(false)
      if (game.isGameOver()) onFinish?.('chess', 100)
    }, 220)
  }
  function clickSquare(square) {
    if (thinking || finished || game.turn() !== 'w') return
    if (!selected) { const piece = game.get(square); if (piece?.color === 'w') setSelected(square); return }
    try {
      const move = game.move({from:selected,to:square,promotion:'q'})
      sync(game.isCheckmate() ? 'Checkmate — you win!' : game.isDraw() ? 'The game is a draw.' : `You played ${move.san}. Bot thinking…`)
      if (game.isGameOver()) onFinish?.('chess', 100); else botTurn()
    } catch {
      const piece = game.get(square)
      setSelected(piece?.color === 'w' ? square : '')
    }
  }
  function restart() { gameRef.current = new Chess(); setPositionVersion(v=>v+1); setSelected(''); setThinking(false); setMessage('You play White. Choose a piece to begin.') }
  return <div className="panel solo-chess-panel">
    <div className="lobby-row"><div><h3>♟ Chess vs computer</h3><p className="muted">Choose an approximate strength (not a calibrated online Elo). Higher settings search further and make fewer random mistakes.</p></div>
      <label>Bot rating <select value={rating} onChange={e=>{setRating(Number(e.target.value));restart()}}>{[1000,1200,1400,1600,1800,2000,2200,2400,2600,2800,3000].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
    </div>
    <div className="solo-chess-layout"><div className="chess-board solo-chess-board">{board.flatMap((row,r)=>row.map((piece,c)=>{const square=`${'abcdefgh'[c]}${8-r}`;return <button key={square} className={`chess-square ${(r+c)%2?'dark':'light'} ${selected===square?'chosen':''}`} onClick={()=>clickSquare(square)}>{piece?pieces[piece.color][piece.type]:''}</button>}))}</div>
      <div className="solo-chess-info"><strong>{message}</strong><p className="muted">White pieces are yours. Black is the computer. Pawns promote to queens.</p><button className="secondary" onClick={restart}>New game</button></div></div>
  </div>
}


const ADVENTURE_REGIONS = [
  { id:'crimson', name:'Crimson Grove', biome:'Mushroom forest', icon:'🍄', tone:'crimson', npc:'Mira', role:'The wandering botanist', quest:'Find the Mooncap Relic', detail:'A glowing relic is hidden somewhere in the old grove.', reward:90, unlock:'marsh' },
  { id:'marsh', name:'Mosslight Marsh', biome:'Luminous wetlands', icon:'🌿', tone:'marsh', npc:'Fen', role:'Marsh keeper', quest:'Collect three moon-lilies', detail:'Moon-lilies grow near the quiet pools.', reward:120, unlock:'frost' },
  { id:'frost', name:'Frostfall Peaks', biome:'Snowy mountain', icon:'❄️', tone:'frost', npc:'Orin', role:'Mountain cartographer', quest:'Recover the lost compass', detail:'The compass was left in a forgotten mountain shrine.', reward:150, unlock:'ember' },
  { id:'ember', name:'Ember Wastes', biome:'Volcanic badlands', icon:'🌋', tone:'ember', npc:'Sola', role:'Relic smith', quest:'Find the sun-forged ore', detail:'Search the old mine beyond the basalt ridge.', reward:180, unlock:'sky' },
  { id:'sky', name:'Skyroot Isles', biome:'Floating islands', icon:'☁️', tone:'sky', npc:'Pip', role:'Sky island tinkerer', quest:'Repair the wind beacon', detail:'The beacon needs a crystal and a little ingenuity.', reward:220, unlock:null }
];
const ADVENTURE_MAPS = {
  crimson:['🌲','🌲','🌿','🍄','🌲','🌲','🌲','🌲','🌲','🌿','🌿','🌲','🌲','🪨','🌲','🌲','🌲','🌲','🌿','🌿','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌿','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲'],
  marsh:['🌾','🌿','🌾','🌊','🌾','🌿','🌾','🌾','🌿','🌊','🌿','🌾','🌾','🌾','🌾','🌿','🌾','🌾','🌊','🌾','🌿','🌾','🌾','🌾','🌾','🌾','🌿','🌾','🌾','🌾','🌾','🌊','🌾','🌿','🌾','🌾','🌾','🌾','🌾','🌾','🌾','🌿','🌾','🌾','🌾','🌾','🌾','🌾','🌾','🌾','🌾','🌾','🌾','🌾','🌾','🌾','🌾','🌾','🌾','🌾','🌾','🌾','🌾','🌾'],
  frost:['❄️','🌲','❄️','🏔️','❄️','🌲','❄️','❄️','🌲','❄️','❄️','❄️','🌲','❄️','❄️','❄️','❄️','🏔️','❄️','🌲','❄️','❄️','❄️','❄️','❄️','🌲','❄️','❄️','❄️','❄️','❄️','❄️','❄️','🌲','❄️','❄️','❄️','❄️','🏔️','❄️','❄️','❄️','❄️','🌲','❄️','❄️','❄️','❄️','❄️','❄️','❄️','❄️','🌲','❄️','❄️','❄️','❄️','❄️','❄️','❄️','❄️','❄️','❄️','❄️'],
  ember:['🪨','🌋','🪨','🪨','🔥','🪨','🌋','🪨','🪨','🪨','🔥','🪨','🪨','🪨','🪨','🌋','🪨','🪨','🪨','🪨','🪨','🔥','🪨','🪨','🌋','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🔥','🪨','🪨','🪨','🪨','🌋','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨','🪨'],
  sky:['☁️','🌳','☁️','✨','☁️','🌳','☁️','☁️','🌳','☁️','☁️','☁️','🌳','☁️','☁️','✨','☁️','☁️','☁️','🌳','☁️','☁️','☁️','☁️','☁️','🌳','☁️','☁️','☁️','☁️','☁️','☁️','☁️','🌳','☁️','☁️','✨','☁️','☁️','☁️','☁️','☁️','☁️','🌳','☁️','☁️','☁️','☁️','☁️','☁️','☁️','☁️','🌳','☁️','☁️','☁️','☁️','☁️','☁️','☁️','☁️','☁️','☁️','☁️']
};
const freshAdventureSave = () => ({ region:'crimson', x:3, y:3, discovered:['crimson'], completedQuests:[], inventory:[], discoveries:[], dungeon:{entered:false, switches:[], key:false, guardian:false}, coins:0, xp:0, sideQuestProgress:{} });

function AdventureWorld({ supabase, session, staffRole='member', members=[] }) {
  const [save,setSave] = React.useState(freshAdventureSave);
  const [loading,setLoading] = React.useState(true);
  const [saveState,setSaveState] = React.useState('Loading save…');
  const [message,setMessage] = React.useState('Welcome to the Five Realms. Talk to Mira to begin.');
  const [ownerTarget,setOwnerTarget] = React.useState('');
  const [grantXp,setGrantXp] = React.useState('100');
  const [grantCoins,setGrantCoins] = React.useState('100');
  const [grantBusy,setGrantBusy] = React.useState(false);
  const [mapOpen,setMapOpen] = React.useState(false);
  const isOwner = staffRole === 'owner';
  const region = ADVENTURE_REGIONS.find(r=>r.id===save.region) || ADVENTURE_REGIONS[0];
  const completed = (id) => save.completedQuests.includes(id);
  const isUnlocked = (id) => save.discovered.includes(id);

  React.useEffect(()=>{
    let alive=true;
    async function load(){
      if(!supabase || !session?.user?.id){ if(alive){setLoading(false);setSaveState('Sign in to save your adventure.')} return; }
      const {data,error}=await supabase.from('rlm_adventure_saves').select('save_data').eq('user_id',session.user.id).maybeSingle();
      if(!alive)return;
      if(error){setSaveState('Save unavailable — run the adventure migration.');setMessage(error.message);}
      else if(data?.save_data){setSave({...freshAdventureSave(),...data.save_data});setSaveState('Adventure loaded');}
      else setSaveState('New adventure');
      setLoading(false);
    }
    load();return()=>{alive=false};
  },[supabase,session?.user?.id]);

  React.useEffect(()=>{
    if(loading || !supabase || !session?.user?.id)return;
    setSaveState('Saving…');
    const timer=setTimeout(async()=>{
      const {error}=await supabase.from('rlm_adventure_saves').upsert({user_id:session.user.id,save_data:save,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      setSaveState(error ? 'Save failed — check database migration' : 'All progress saved');
      if(error) console.error('Adventure save failed:',error.message);
    },650);
    return()=>clearTimeout(timer);
  },[save,loading,supabase,session?.user?.id]);

  function update(patch){setSave(s=>({...s,...patch}));}
  function discover(id){
    if(!isUnlocked(id)){setSave(s=>({...s,discovered:[...s.discovered,id]}));setMessage(`New region discovered: ${ADVENTURE_REGIONS.find(r=>r.id===id)?.name}!`);}
  }
  function travel(id){
    if(!isUnlocked(id)){setMessage('That region is still hidden. Follow the quests to discover a route.');return;}
    update({region:id,x:3,y:3});setMapOpen(false);setMessage(`You travelled to ${ADVENTURE_REGIONS.find(r=>r.id===id)?.name}. Explore and talk to the locals.`);
  }
  function move(dx,dy){
    const x=Math.max(0,Math.min(7,save.x+dx)),y=Math.max(0,Math.min(7,save.y+dy));
    const key=`${save.region}:${x}:${y}`;
    const newDiscoveries=save.discoveries.includes(key)?save.discoveries:[...save.discoveries,key];
    update({x,y,discoveries:newDiscoveries});
    if((x===7&&y===7)&&!save.dungeon.entered)setMessage('You found an ancient stone doorway. Open the map to enter the dungeon.');
    else setMessage(`Exploring ${region.name} · ${x+1}, ${y+1}`);
  }
  function interact(){
    const questIndex=ADVENTURE_REGIONS.findIndex(r=>r.id===save.region);
    const q=region;
    if(!completed(q.id)){
      const progress=save.sideQuestProgress[q.id]||0;
      if(progress<2){
        const next=progress+1;
        update({sideQuestProgress:{...save.sideQuestProgress,[q.id]:next}});
        setMessage(next===1?`${q.npc}: ${q.detail} Explore the region and return to me.`:`${q.npc}: You've found the clue! Your quest is ready to complete.`);
      } else {
        const nextCompleted=[...save.completedQuests,q.id];
        const nextDiscovered=q.unlock&&!save.discovered.includes(q.unlock)?[...save.discovered,q.unlock]:save.discovered;
        update({completedQuests:nextCompleted,discovered:nextDiscovered,coins:save.coins+q.reward,xp:save.xp+75,inventory:save.inventory.includes(q.quest)?save.inventory:[...save.inventory,q.quest]});
        setMessage(`Quest complete: ${q.quest}! +${q.reward} adventure coins and +75 XP.`);
      }
    } else setMessage(`${q.npc}: Thank you for helping the realms. Keep exploring!`);
  }
  function findSecret(){
    const key=`${save.region}:secret`;
    if(save.discoveries.includes(key)){setMessage('This hidden cache is already empty.');return;}
    update({discoveries:[...save.discoveries,key],coins:save.coins+35,xp:save.xp+20,inventory:[...save.inventory,'Ancient shard']});
    setMessage('Secret found! You discovered an Ancient Shard. +35 adventure coins and +20 XP.');
  }
  function openDungeon(){
    if(!save.dungeon.entered){update({dungeon:{...save.dungeon,entered:true}});setMessage('You entered the Sunken Shrine. Find the two switches, then claim the Bronze Key.');}
    else if(save.dungeon.switches.length<2){setMessage('The sealed gate needs two switches. Explore the chamber and activate both.');}
    else if(!save.dungeon.key){update({dungeon:{...save.dungeon,key:true},inventory:save.inventory.includes('Bronze Key')?save.inventory:[...save.inventory,'Bronze Key']});setMessage('The gate opens. You found the Bronze Key!');}
    else if(!save.dungeon.guardian){update({dungeon:{...save.dungeon,guardian:true},coins:save.coins+200,xp:save.xp+150,inventory:[...save.inventory,'Sun Guardian Emblem']});setMessage('The Sun Guardian is defeated! You earned its emblem, 200 coins and 150 XP.');}
    else setMessage('The shrine is peaceful now. You have completed its main secret.');
  }
  function switchDungeon(index){
    if(!save.dungeon.entered){setMessage('Enter the shrine first.');return;}
    const switches=save.dungeon.switches.includes(index)?save.dungeon.switches:[...save.dungeon.switches,index];
    update({dungeon:{...save.dungeon,switches}});
    setMessage(switches.length===2?'Both switches are active. Return to the sealed gate.':`Switch ${index+1} activated.`);
  }
  async function grantRewards(){
    if(!supabase||!ownerTarget){setMessage('Choose a member first.');return;}
    const xp=Number(grantXp),coins=Number(grantCoins);
    if(!Number.isSafeInteger(xp)||!Number.isSafeInteger(coins)||xp<0||coins<0||xp+coins===0||xp>1000000||coins>1000000){setMessage('Enter valid reward amounts (0–1,000,000), with at least one non-zero amount.');return;}
    setGrantBusy(true);
    const {error}=await supabase.rpc('rlm_owner_grant_adventure_rewards',{p_target_user_id:ownerTarget,p_xp:xp,p_adventure_coins:coins});
    setGrantBusy(false);
    if(!error && ownerTarget===session.user.id){
      setSave(current=>({...current,coins:Number(current.coins||0)+coins,xp:Number(current.xp||0)+xp}));
    }
    setMessage(error?`Reward grant failed: ${error.message}`:'Adventure rewards granted successfully.');
  }
  const mapTiles=ADVENTURE_MAPS[save.region]||ADVENTURE_MAPS.crimson;
  return <div className="adventure-world">
    <section className={`adventure-hero biome-${region.tone}`}>
      <div><span className="adventure-kicker">RLM ADVENTURE · THE FIVE REALMS</span><h2>{region.icon} {region.name}</h2><p>{region.biome} · Meet characters, uncover secrets and explore ancient dungeons.</p></div>
      <div className="adventure-wallet"><strong>🪙 {save.coins}</strong><span>Adventure coins</span><strong>✦ {save.xp} XP</strong><span>Adventure XP</span></div>
    </section>
    <div className="adventure-toolbar"><button className="primary" onClick={()=>setMapOpen(v=>!v)}>🗺 {mapOpen?'Close world map':'Open world map'}</button><span className="adventure-save-status">● {saveState}</span><span className="muted">{loading?'Loading…':`${save.discoveries.length} discoveries`}</span></div>
    {mapOpen&&<div className="adventure-map panel"><h3>World map · Five Realms</h3><div className="realm-map-grid">{ADVENTURE_REGIONS.map(r=><button key={r.id} disabled={!isUnlocked(r.id)} className={`realm-map-card biome-${r.tone} ${save.region===r.id?'selected':''}`} onClick={()=>travel(r.id)}><strong>{isUnlocked(r.id)?r.icon:'🔒'} {isUnlocked(r.id)?r.name:'Undiscovered region'}</strong><small>{isUnlocked(r.id)?r.biome:'Complete the previous region quest'}</small></button>)}</div></div>}
    <div className="adventure-layout">
      <div className={`adventure-scene biome-${region.tone}`}>
        <div className="adventure-scene-top"><span>{region.icon} {region.name}</span><small>Move with the arrows · Discover hidden places</small></div>
        <div className="adventure-tile-map">{mapTiles.map((tile,i)=>{const x=i%8,y=Math.floor(i/8),isPlayer=x===save.x&&y===save.y;return <button key={`${save.region}-${i}`} className={`adventure-tile ${isPlayer?'player-tile':''}`} onClick={()=>{setSave(s=>({...s,x,y,discoveries:s.discoveries.includes(`${s.region}:${x}:${y}`)?s.discoveries:[...s.discoveries,`${s.region}:${x}:${y}`]}));setMessage(`You explored tile ${x+1}, ${y+1}.`)}} title={`Explore ${x+1}, ${y+1}`}>{isPlayer?'🧝':tile}</button>})}</div>
        <div className="adventure-controls"><button onClick={()=>move(0,-1)}>▲</button><div><button onClick={()=>move(-1,0)}>◀</button><button onClick={()=>move(0,1)}>▼</button><button onClick={()=>move(1,0)}>▶</button></div></div>
      </div>
      <aside className="adventure-side">
        <div className="panel"><h3>🧑‍🌾 {region.npc}</h3><p className="muted">{region.role}</p><strong>{region.quest}</strong><p className="muted">{region.detail}</p><p className="adventure-quest-state">{completed(region.id)?'✓ Quest completed':`Quest clues: ${save.sideQuestProgress[region.id]||0}/2`}</p><button className="primary" onClick={interact}>Talk / continue quest</button></div>
        <div className="panel"><h3>✨ Discoveries</h3><p className="muted">Look for quiet corners and unusual landmarks. Some secrets are easy to miss.</p><button className="secondary" onClick={findSecret}>Search hidden cache</button><p className="muted">{save.discoveries.filter(d=>d.startsWith(`${save.region}:`)).length} places explored here</p></div>
        <div className="panel"><h3>🏛 Sunken Shrine</h3><p className="muted">A forgotten dungeon beneath the old roots. Its sealed gate responds to two floor switches.</p><button className="primary" onClick={openDungeon}>{!save.dungeon.entered?'Enter dungeon':!save.dungeon.key?'Inspect sealed gate':!save.dungeon.guardian?'Challenge guardian':'Visit completed shrine'}</button>
          {save.dungeon.entered&&<div className="dungeon-switches"><button className={save.dungeon.switches.includes(0)?'primary':'secondary'} onClick={()=>switchDungeon(0)}>Switch A</button><button className={save.dungeon.switches.includes(1)?'primary':'secondary'} onClick={()=>switchDungeon(1)}>Switch B</button></div>}
          <small>{save.dungeon.guardian?'Guardian defeated':save.dungeon.key?'Bronze Key found':`${save.dungeon.switches.length}/2 switches activated`}</small>
        </div>
        <div className="panel"><h3>🎒 Inventory</h3><p>{save.inventory.length?save.inventory.join(' · '):'No items yet. Explore to find relics and keys.'}</p></div>
      </aside>
    </div>
    <div className="adventure-message" role="status">{message}</div>
    {isOwner&&<div className="panel adventure-owner-tools"><h3>👑 Owner adventure rewards</h3><p className="muted">Grant XP and adventure coins. The database checks your owner role before applying rewards.</p><label>Member<select value={ownerTarget} onChange={e=>setOwnerTarget(e.target.value)}><option value="">Choose member</option>{members.map(m=><option key={m.id} value={m.id}>{m.display_name||m.username||m.id}</option>)}</select></label><label>XP<input type="number" min="0" max="1000000" value={grantXp} onChange={e=>setGrantXp(e.target.value)}/></label><label>Adventure coins<input type="number" min="0" max="1000000" value={grantCoins} onChange={e=>setGrantCoins(e.target.value)}/></label><button className="primary" disabled={grantBusy||!ownerTarget} onClick={grantRewards}>{grantBusy?'Granting…':'Grant adventure rewards'}</button></div>}
  </div>;
}


function AIRacer({ onFinish }) {
  const canvasRef=React.useRef(null),worldRef=React.useRef(null),keys=React.useRef({}),finished=React.useRef(false)
  const [running,setRunning]=React.useState(false),[message,setMessage]=React.useState('Start the race. Hold W / ↑ to accelerate, S / ↓ to brake, and steer with A/D or ←/→.'),[lap,setLap]=React.useState(0),[speed,setSpeed]=React.useState(0),[place,setPlace]=React.useState(1)
  const start=()=>{worldRef.current={x:430,y:402,angle:Math.PI,speed:0,lap:0,lastAngle:Math.PI/2,progress:0,bots:[{phase:0,speed:.66},{phase:1.8,speed:.70},{phase:3.4,speed:.63}],lastHud:0};finished.current=false;keys.current={};setLap(0);setSpeed(0);setPlace(1);setMessage('Lights out! Go go go!');setRunning(true)}
  React.useEffect(()=>{const down=e=>{const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)){e.preventDefault();keys.current[k]=true}},up=e=>{keys.current[e.key.toLowerCase()]=false};window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)}},[])
  React.useEffect(()=>{
    if(!running)return
    const canvas=canvasRef.current,ctx=canvas?.getContext('2d'),w=worldRef.current;if(!ctx||!w)return
    let frame=0,last=performance.now()
    const track={cx:430,cy:265,rx:300,ry:185,innerX:205,innerY:90}
    const drawCar=(x,y,a,color,label)=>{ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=color;ctx.fillRect(-18,-9,36,18);ctx.fillStyle='#111827';ctx.fillRect(-10,-12,16,24);ctx.fillStyle='#e5e7eb';ctx.fillRect(9,-7,7,14);ctx.fillStyle='#0b1020';ctx.fillRect(-13,-13,8,5);ctx.fillRect(7,-13,8,5);ctx.fillRect(-13,8,8,5);ctx.fillRect(7,8,8,5);ctx.restore();if(label){ctx.fillStyle='#f8fafc';ctx.font='11px system-ui';ctx.fillText(label,x-12,y-17)}}
    const loop=now=>{const dt=Math.min(.04,(now-last)/1000);last=now;const k=keys.current
      const throttle=k.w||k.arrowup,brake=k.s||k.arrowdown,left=k.a||k.arrowleft,right=k.d||k.arrowright
      w.speed=Math.max(0,Math.min(250,w.speed+((throttle?105:0)-(brake?180:22))*dt))
      const steer=(right?1:0)-(left?1:0);w.angle+=steer*(.8+w.speed/150)*dt*(w.speed>0?1:0)
      w.x+=Math.cos(w.angle)*w.speed*dt;w.y+=Math.sin(w.angle)*w.speed*dt
      const outer=((w.x-track.cx)/track.rx)**2+((w.y-track.cy)/track.ry)**2,inner=((w.x-track.cx)/track.innerX)**2+((w.y-track.cy)/track.innerY)**2
      if(outer>1.08||inner<.86)w.speed*=.91
      const angle=Math.atan2((w.y-track.cy)/track.ry,(w.x-track.cx)/track.rx);let delta=angle-w.lastAngle;while(delta>Math.PI)delta-=Math.PI*2;while(delta<-Math.PI)delta+=Math.PI*2
      if(delta>0.015&&w.lastAngle>2.2&&angle<-2.2)w.lap++
      w.lastAngle=angle
      for(const b of w.bots)b.phase+=b.speed*dt
      const playerPhase=(Math.atan2((w.y-track.cy)/track.ry,(w.x-track.cx)/track.rx)+Math.PI*2)%(Math.PI*2),ahead=w.bots.filter(b=>((b.phase%(Math.PI*2))>playerPhase)).length+1
      if(now-w.lastHud>100){w.lastHud=now;setLap(w.lap);setSpeed(Math.round(w.speed));setPlace(ahead)}
      ctx.fillStyle='#12351f';ctx.fillRect(0,0,860,530)
      ctx.fillStyle='#252a32';ctx.beginPath();ctx.ellipse(track.cx,track.cy,track.rx,track.ry,0,0,Math.PI*2);ctx.fill()
      ctx.fillStyle='#12351f';ctx.beginPath();ctx.ellipse(track.cx,track.cy,track.innerX,track.innerY,0,0,Math.PI*2);ctx.fill()
      ctx.strokeStyle='#f8fafc';ctx.lineWidth=3;ctx.setLineDash([18,14]);ctx.beginPath();ctx.ellipse(track.cx,track.cy,(track.rx+track.innerX)/2,(track.ry+track.innerY)/2,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])
      ctx.fillStyle='#64748b';ctx.fillRect(track.cx+track.rx-3,track.cy-18,6,36);ctx.fillStyle='#f8fafc';for(let i=0;i<6;i++)ctx.fillRect(track.cx+track.rx-3,track.cy-18+i*6,6,3)
      ctx.fillStyle='#d1d5db';ctx.font='bold 16px system-ui';ctx.fillText('RLM GRAND PRIX',26,32)
      for(let i=0;i<w.bots.length;i++){const b=w.bots[i],a=b.phase%(Math.PI*2),x=track.cx+Math.cos(a)*252,y=track.cy+Math.sin(a)*145;drawCar(x,y,a+Math.PI/2,['#ef4444','#facc15','#a78bfa'][i],`AI ${i+1}`)}
      drawCar(w.x,w.y,w.angle,'#38bdf8','YOU')
      ctx.fillStyle='#f8fafc';ctx.font='13px system-ui';ctx.fillText(`LAP ${Math.min(w.lap+1,3)} / 3   SPEED ${Math.round(w.speed)} km/h`,26,505)
      if(w.lap>=3&&!finished.current){finished.current=true;setRunning(false);setMessage('🏁 Chequered flag! Race complete.');onFinish?.('racer',100);return}
      frame=requestAnimationFrame(loop)
    }
    frame=requestAnimationFrame(loop);return()=>cancelAnimationFrame(frame)
  },[running,onFinish])
  return <div className="panel racer-panel"><h3>🏎 RLM Formula Racing</h3><p className="muted">Top-down circuit racing against three AI drivers. Stay on the tarmac, brake for corners and steer smoothly.</p><div className="f1-hud"><strong>Lap {Math.min(lap+1,3)} / 3</strong><strong>{speed} km/h</strong><strong>P{place}</strong></div><canvas ref={canvasRef} width="860" height="530" className="f1-canvas" aria-label="Formula racing circuit"/><p className="muted">{message}</p><button className="primary" disabled={running} onClick={start}>{running?'Race in progress':'Start race'}</button></div>
}



export default function ExtendedGames({ supabase, session, members = [], staffRole = 'member', onProgress }) {
  const [tab, setTab] = React.useState('chess')
  const [chessMode,setChessMode] = React.useState('bot')
  const [racerMode,setRacerMode] = React.useState('ai')
  const [matches, setMatches] = React.useState([])
  const [playerStats, setPlayerStats] = React.useState(null)
  const [clockNow, setClockNow] = React.useState(Date.now())
  const [active, setActive] = React.useState(null)
  const [clock, setClock] = React.useState('5+0')
  const [target, setTarget] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [note, setNote] = React.useState('')
  const [selected, setSelected] = React.useState('')
  const [giftTarget, setGiftTarget] = React.useState('')
  const [giftAmount, setGiftAmount] = React.useState('100')
  const [giftReason, setGiftReason] = React.useState('')
  const [deleteTarget, setDeleteTarget] = React.useState('')
  const [deleteConfirm, setDeleteConfirm] = React.useState('')
  const [showDelete, setShowDelete] = React.useState(false)
  const isOwner = staffRole === 'owner'
  const isAdmin = ['owner','admin'].includes(staffRole)

  const loadMatches = React.useCallback(async () => {
    if (!supabase || !session) return
    const { data, error } = await supabase.from('rlm_game_matches').select('*').in('status', ['pending','active']).order('created_at', { ascending: false }).limit(40)
    if (error) setNote(`Multiplayer lobby: ${error.message}. Apply the RLM games migration if this table is missing.`)
    else setMatches(data || [])
  }, [supabase, session])

  React.useEffect(() => { loadMatches() }, [loadMatches])
  React.useEffect(() => {
    if (!supabase || !session) { setPlayerStats(null); return }
    let cancelled = false
    supabase.from('player_stats').select('xp,level,coins,adventure_coins').eq('user_id', session.user.id).maybeSingle().then(({data,error}) => {
      if (!cancelled && !error) setPlayerStats(data)
    })
    return () => { cancelled = true }
  }, [supabase, session, active?.status, note])
  React.useEffect(() => {
    if (!supabase || !session) return
    const channel = supabase.channel('rlm-game-lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rlm_game_matches' }, () => loadMatches())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, session, loadMatches])

  React.useEffect(() => {
    if (!active?.id || !supabase) return
    const channel = supabase.channel(`rlm-match-${active.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rlm_game_matches', filter: `id=eq.${active.id}` }, payload => setActive(payload.new))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [active?.id, supabase])

  React.useEffect(() => {
    if (active?.game_type !== 'chess' || active?.status !== 'active') return
    const id = setInterval(() => setClockNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [active?.id, active?.status, active?.move_count])

  async function rpc(name, args) {
    setBusy(true)
    const { data, error } = await supabase.rpc(name, args)
    setBusy(false)
    if (error) { setNote(error.message); return null }
    setNote('')
    await loadMatches()
    onProgress?.()
    return data
  }

  async function createMatch(kind) {
    if (!supabase || !session) return
    const data = await rpc('rlm_create_game_match', { p_game: kind, p_opponent: target || null, p_clock: kind === 'chess' ? clock : null })
    if (data) { const row = Array.isArray(data) ? data[0] : data; setActive(row); setNote('Challenge sent. Your clanmate can accept it from the lobby.') }
  }
  async function acceptMatch(match) {
    const data = await rpc('rlm_respond_game_match', { p_match_id: match.id, p_accept: true })
    if (data) { const row = Array.isArray(data) ? data[0] : data; setActive(row); setNote('Challenge accepted!') }
  }
  async function declineMatch(match) { await rpc('rlm_respond_game_match', { p_match_id: match.id, p_accept: false }) }
  async function submitState(state, winner = null) {
    if (!active) return
    const data = await rpc('rlm_play_game_move', { p_match_id: active.id, p_state: state, p_winner: winner })
    if (data) { const row = Array.isArray(data) ? data[0] : data; setActive(row) }
  }
  function resetLocalMatch() { setSelected('') }
  async function accelerateClanRace() {
    if (!active) return
    const result = await rpc('rlm_update_race_progress', { p_match_id: active.id, p_progress: Math.min(100, Number(active.state?.progress?.[session.user.id] || 0) + 10) })
    if (result) { const row = Array.isArray(result) ? result[0] : result; setActive(row) }
  }
  function playTtt(i) {
    if (!active || active.status !== 'active' || active.state?.board?.[i]) return
    const board = [...(active.state?.board || EMPTY_TTT)]
    const symbol = active.player_one === session.user.id ? 'X' : 'O'
    board[i] = symbol
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
    const won = lines.some(([a,b,c]) => board[a] && board[a] === board[b] && board[b] === board[c])
    const draw = !won && board.every(Boolean)
    submitState({ board, next: symbol === 'X' ? 'O' : 'X' }, won ? session.user.id : draw ? 'draw' : null)
  }
  function playChessSquare(square) {
    if (!active || active.status !== 'active') return
    const game = new Chess(active.state?.fen && active.state.fen !== 'start' ? active.state.fen : undefined)
    if (!selected) { setSelected(square); return }
    try {
      game.move({ from: selected, to: square, promotion: 'q' })
      setSelected('')
      submitState({ fen: game.fen(), pgn: game.pgn() }, game.isGameOver() ? (game.isDraw() ? 'draw' : session.user.id) : null)
    } catch { setSelected(square) }
  }
  const refreshPlayerStats = React.useCallback(async () => {
    if (!supabase || !session) return
    const { data, error } = await supabase.from('player_stats').select('xp,level,coins,adventure_coins').eq('user_id', session.user.id).maybeSingle()
    if (!error && data) setPlayerStats(data)
  }, [supabase, session])
  const finishLocalGame = React.useCallback(async (key, score) => {
    if (!supabase) return
    const { data, error } = await supabase.rpc('rlm_award_minigame_xp', { p_game_key: key, p_score: score })
    if (error) setNote(`Game finished, but rewards were not saved: ${error.message}. Apply the RLM rewards migration.`)
    else { await refreshPlayerStats(); setNote(`Game complete! +${data?.xp_awarded ?? 'XP'} XP${data?.coins_awarded ? ` and +${data.coins_awarded} coins` : ''}.`); onProgress?.() }
  }, [supabase, refreshPlayerStats, onProgress])
  const rewardedMatchRef = React.useRef('')
  React.useEffect(() => {
    if (!active?.id || active.status !== 'finished' || rewardedMatchRef.current === active.id) return
    rewardedMatchRef.current = active.id
    finishLocalGame(active.game_type, 100)
  }, [active?.id, active?.status, active?.game_type, finishLocalGame])


  if (!session) return <div className="panel"><h3>Sign in to play RLM games</h3></div>
  const mine = matches.filter(m => m.player_one === session.user.id || m.player_two === session.user.id)
  const incoming = matches.filter(m => m.status === 'pending' && m.player_two === session.user.id)
  const openChallenges = matches.filter(m => m.status === 'pending' && m.player_two === null && m.player_one !== session.user.id)
  const opponents = members.filter(m => m.id !== session.user.id)
  const board = active?.state?.board || EMPTY_TTT
  const currentFen = active?.state?.fen && active.state.fen !== 'start' ? active.state.fen : undefined
  let chessBoard = []
  try { chessBoard = new Chess(currentFen).board() } catch { chessBoard = new Chess().board() }

  const clockElapsed = active?.last_move_at ? Math.max(0, clockNow - new Date(active.last_move_at).getTime()) : 0
  const whiteRemaining = Math.max(0, Number(active?.white_time_ms || 0) - (Number(active?.move_count || 0) % 2 === 0 ? clockElapsed : 0))
  const blackRemaining = Math.max(0, Number(active?.black_time_ms || 0) - (Number(active?.move_count || 0) % 2 === 1 ? clockElapsed : 0))
  const formatClock = ms => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2,'0')}`
  const profileLabel = (id, rows) => rows.find(row => row.id === id)?.display_name || rows.find(row => row.id === id)?.username
  const level = Number(playerStats?.level || 1)
  const perks = [{level:2,name:'Arcade Starter',detail:'Unlock the explorer badge.'},{level:3,name:'Track Regular',detail:'Unlock the racer profile tag.'},{level:5,name:'RLM Veteran',detail:'Unlock the veteran profile title.'},{level:10,name:'Elite Member',detail:'Unlock the elite profile title.'}]
  return <div className="rlm-extra-games">
    <div className="level-progress panel"><h3>✦ Level {level} · {Number(playerStats?.xp || 0)} XP</h3><p className="muted">Earn XP by completing games. Earn XP through quests and discoveries. Adventure progress is saved to your account.</p><div className="unlocked-perks">{perks.map(p => <span key={p.level} className={level >= p.level ? 'perk unlocked' : 'perk'}>{level >= p.level ? '✓' : '🔒'} Level {p.level}: {p.name} — {p.detail}</span>)}</div></div>
    <div className="game-tabs extra-tabs">
      {[['chess','♟ Chess'],['ttt','⭕ Multiplayer TTT'],['arena','🗺 Adventure'],['racer','🏎 Racer'],...(isAdmin ? [['gifts','🪙 Coin gifts']] : []),...(isOwner ? [['delete','🛡 Account tools']] : [])].map(([key,label]) => <button key={key} className={tab === key ? 'primary' : 'secondary'} onClick={() => setTab(key)}>{label}</button>)}
    </div>
    {note && <p className="status">{note}</p>}
    {tab === 'chess' && <div className="mode-switch"><button className={chessMode==='bot'?'primary':'secondary'} onClick={()=>setChessMode('bot')}>🤖 Play vs bot</button><button className={chessMode==='online'?'primary':'secondary'} onClick={()=>setChessMode('online')}>🌐 Multiplayer</button></div>}
    {tab === 'racer' && <div className="mode-switch"><button className={racerMode==='ai'?'primary':'secondary'} onClick={()=>setRacerMode('ai')}>🤖 AI race</button><button className={racerMode==='online'?'primary':'secondary'} onClick={()=>setRacerMode('online')}>🌐 Online race</button></div>}
    {tab === 'chess' && chessMode === 'bot' && <SoloChess onFinish={finishLocalGame} />}
    {tab === 'arena' && <AdventureWorld supabase={supabase} session={session} staffRole={staffRole} members={members} />}
    {tab === 'racer' && racerMode === 'ai' && <AIRacer onFinish={finishLocalGame} />}
    {((tab === 'chess' && chessMode === 'online') || tab === 'ttt' || (tab === 'racer' && racerMode === 'online')) && <div className="panel">
      <h3>{tab === 'chess' ? '♟ Live multiplayer chess' : tab === 'ttt' ? '⭕ Multiplayer tic-tac-toe' : '🏎 Clan race lobby'}</h3>
      <p className="muted">Send a challenge to a clanmate, or accept an incoming invite. Both players need to be online.</p>
      <div className="challenge-controls">
        <select value={target} onChange={e => setTarget(e.target.value)}><option value="">Anyone can accept</option>{opponents.map(m => <option key={m.id} value={m.id}>{m.display_name || m.username || 'Member'}</option>)}</select>
        {tab === 'chess' && <select value={clock} onChange={e => setClock(e.target.value)}>{CLOCKS.map(c => <option key={c}>{c}</option>)}</select>}
        <button className="primary" disabled={busy} onClick={() => createMatch(tab)}>Create challenge</button>
      </div>
      {incoming.length > 0 && <><h4>Incoming challenges</h4>{incoming.map(m => <div className="lobby-row" key={m.id}><span>{m.game_type.toUpperCase()} · {m.clock_control || 'No clock'}</span><span><button className="primary" onClick={() => acceptMatch(m)}>Accept</button> <button className="secondary" onClick={() => declineMatch(m)}>Decline</button></span></div>)}</>}
      {openChallenges.length > 0 && <><h4>Open clan challenges</h4>{openChallenges.map(m => <div className="lobby-row" key={m.id}><span>{m.game_type.toUpperCase()} · {m.clock_control || 'No clock'}</span><button className="primary" onClick={() => acceptMatch(m)}>Accept challenge</button></div>)}</>}
      <h4>Your matches</h4>
      {mine.length === 0 ? <p className="muted">No active matches yet.</p> : mine.map(m => <div className="lobby-row" key={m.id}><span>{m.game_type.toUpperCase()} · {m.status} · {m.clock_control || ''}</span><button className="secondary" onClick={() => { setActive(m); resetLocalMatch() }}>Open</button></div>)}
      {active && active.game_type === tab && <div className="active-match">
        <div className="lobby-row"><strong>{active.game_type.toUpperCase()} match</strong><span>{active.status}</span></div>
        {active.status === 'active' && tab === 'ttt' && <><div className="tic-board multiplayer-board">{board.map((v,i) => <button key={i} className="tic-cell" disabled={!!v || active.status !== 'active'} onClick={() => playTtt(i)}>{v}</button>)}</div><p className="muted">Your mark: {active.player_one === session.user.id ? 'X' : 'O'}. Turns are checked by the server.</p></>}
        {active.status === 'active' && tab === 'chess' && <><div className="chess-clocks"><strong>♔ White {formatClock(whiteRemaining)}</strong><strong>♚ Black {formatClock(blackRemaining)}</strong></div><div className={`chess-board multiplayer-chess-board ${active.player_two === session.user.id ? 'black-perspective' : 'white-perspective'}`} role="group" aria-label={`Multiplayer chessboard, ${active.player_two === session.user.id ? 'black' : 'white'} perspective`}>{chessBoard.flatMap((row,r) => row.map((piece,c) => { const sq = `${'abcdefgh'[c]}${8-r}`; return <button type="button" key={sq} aria-label={`${sq}${piece ? ` ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ' empty'}`} className={`chess-square ${(r+c)%2 ? 'dark' : 'light'} ${selected === sq ? 'chosen' : ''}`} onClick={() => playChessSquare(sq)}>{piece ? pieces[piece.color][piece.type] : ''}</button> }))}</div><p className="muted">Select a piece, then its destination. Server-managed clocks use the selected time control; legal chess moves are checked in the browser.</p></>}
        {active.status === 'active' && tab === 'racer' && <><div className="race-lanes">{[active.player_one,active.player_two].map((id,i) => <div className="race-lane" key={id}><span>{id === session.user.id ? 'You' : 'Clanmate'}</span><div className="race-track"><div className="race-car" style={{width:`${Number(active.state?.progress?.[id] || 0)}%`}} /></div><strong>{Number(active.state?.progress?.[id] || 0)}%</strong></div>)}</div><button className="primary" disabled={busy || active.status !== 'active'} onClick={accelerateClanRace}>Accelerate +10%</button><p className="muted">Each acceleration updates your position through the existing Supabase race function. Live opponent updates arrive through Realtime.</p></>}
        {active.status === 'finished' && <p>Match finished. {active.winner_id === 'draw' ? 'Draw.' : active.winner_id === session.user.id ? 'You won!' : 'Your opponent won.'}</p>}
        {active.status === 'pending' && <p className="muted">Waiting for the invited clanmate to respond.</p>}
      </div>}
    </div>}
    {tab === 'gifts' && isAdmin && <div className="panel"><h3>🪙 Staff coin gifting</h3><p className="muted">Owner and admin gifts are processed by a permission-checked database function and recorded in an audit log. You can select yourself.</p><label>Member<select value={giftTarget} onChange={e => setGiftTarget(e.target.value)}><option value="">Choose member</option><option value={session.user.id}>{profileLabel(session.user.id, members) || 'You (self)'}</option>{members.map(m => <option key={m.id} value={m.id}>{m.display_name || m.username || m.id}</option>)}</select></label><label>Coins<input type="number" min="1" max="100000" value={giftAmount} onChange={e => setGiftAmount(e.target.value)} /></label><label>Reason<input value={giftReason} maxLength={200} onChange={e => setGiftReason(e.target.value)} placeholder="Optional reason" /></label><button className="primary" disabled={busy || !giftTarget || !Number.isInteger(Number(giftAmount)) || Number(giftAmount)<1 || Number(giftAmount)>100000} onClick={async () => { const result = await rpc('rlm_staff_grant_coins',{p_target_user_id:giftTarget,p_amount:Number(giftAmount),p_reason:giftReason.trim()}); if(result) setNote('Coin gift completed and logged.') }}>Grant coins</button></div>}
    {tab === 'delete' && isOwner && <div className="panel"><h3>🛡 Owner account deletion</h3><p className="muted">This permanently deletes a selected member account. It cannot delete your own owner account or another owner. The server verifies your role before deletion.</p><label>Member to delete<select value={deleteTarget} onChange={e => setDeleteTarget(e.target.value)}><option value="">Choose member</option>{members.filter(m => m.id !== session.user.id).map(m => <option key={m.id} value={m.id}>{m.display_name || m.username || m.id} · {m.id}</option>)}</select></label><label>Type DELETE to confirm<input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} /></label><button className="primary danger-button" disabled={!deleteTarget || deleteConfirm !== 'DELETE' || busy} onClick={() => setShowDelete(true)}>Review deletion</button>{showDelete && <div className="notice"><strong>Final confirmation</strong><p>This action permanently removes the selected account and its auth identity.</p><button className="danger-button" disabled={busy} onClick={async () => { setBusy(true); const {data:{session:current}} = await supabase.auth.getSession(); const {data,error} = await supabase.functions.invoke('owner-delete-user',{body:{user_id:deleteTarget},headers:{Authorization:`Bearer ${current?.access_token || ''}`}}); setBusy(false); if(error || data?.error) setNote(error?.message || data.error); else {setNote('Account deleted.');setDeleteTarget('');setDeleteConfirm('');setShowDelete(false)} }}>Permanently delete account</button><button className="secondary" onClick={() => setShowDelete(false)}>Cancel</button></div>}</div>}
  </div>
}
