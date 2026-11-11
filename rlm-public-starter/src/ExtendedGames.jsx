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
const freshAdventureSave = () => ({ region:'crimson', x:3, y:3, discovered:['crimson'], completedQuests:[], inventory:[], discoveries:[], dungeon:{entered:false, switches:[], key:false, guardian:false}, coins:0, xp:0, sideQuestProgress:{}, health:100, hunger:100, resources:{wood:0,stone:0,fiber:0,iron:0,amethyst:0,diamond:0,titanium:0,iridium:0,infinity:0,fish:0}, tools:{pickaxe:0,axe:0,sword:0,hoe:0,bow:0,rod:0}, seeds:{turnip:0,carrot:0,moonflower:0}, crops:[], buildings:[], pets:[], pigs:0, caveLevel:0, equippedTool:'axe', durability:{axe:100,pickaxe:100,rod:100,hoe:100,sword:100,bow:100}, worldNodes:{} });


function PixelAdventureScene({ region, save, onMoveTo, onSceneAction, sceneAction, traderOpen, onOpenTrader }) {
  const canvasRef = React.useRef(null);
  React.useEffect(() => {
    const canvas=canvasRef.current, ctx=canvas?.getContext('2d'); if(!ctx)return;
    const W=960,H=600,T=48,C=20,R=13;
    const palettes={
      crimson:{ground:'#9e3e50',ground2:'#8c3048',path:'#6b3545',path2:'#81505a',tree:'#b72f4b',tree2:'#e34d5a',trunk:'#49303c',water:'#3a9db0',rock:'#777b88',flower:'#f4b3c7'},
      marsh:{ground:'#526b4c',ground2:'#405b43',path:'#82704d',path2:'#a08a5e',tree:'#326849',tree2:'#63945a',trunk:'#493d31',water:'#367f76',rock:'#788b77',flower:'#c7dc91'},
      frost:{ground:'#c6d3d9',ground2:'#aebfc9',path:'#858eaa',path2:'#aab6c7',tree:'#426b73',tree2:'#71959a',trunk:'#5c6874',water:'#7bb8d0',rock:'#78859a',flower:'#f4f7fa'},
      ember:{ground:'#9b5545',ground2:'#81443e',path:'#6e4a43',path2:'#936253',tree:'#8b3e32',tree2:'#c15a3d',trunk:'#49323a',water:'#647b83',rock:'#777078',flower:'#f5b34b'},
      sky:{ground:'#789b83',ground2:'#638873',path:'#b2a77a',path2:'#d1c18a',tree:'#3f805a',tree2:'#82ae6d',trunk:'#584c40',water:'#66b9c5',rock:'#a3b4b3',flower:'#f2e6a1'}
    };
    const p=palettes[region.tone]||palettes.crimson;
    const rand=(x,y)=>{const n=Math.sin(x*127.1+y*311.7+region.id.length*71)*43758.5453;return n-Math.floor(n)};
    ctx.imageSmoothingEnabled=false;
    for(let y=0;y<R;y++)for(let x=0;x<C;x++){
      const xx=x*T,yy=y*T;ctx.fillStyle=rand(x,y)>.53?p.ground:p.ground2;ctx.fillRect(xx,yy,T,T);
      for(let k=0;k<5;k++){const rx=xx+5+rand(x*7+k,y*9)*38,ry=yy+5+rand(x*11,y*5+k)*38;ctx.fillStyle=rand(x+k,y-k)>.5?p.path2:p.flower;ctx.globalAlpha=.22;ctx.fillRect(rx,ry,3+rand(k,x)*4,3+rand(y,k)*4);ctx.globalAlpha=1;}
    }
    // Winding trail and clearings
    ctx.fillStyle=p.path;ctx.beginPath();ctx.moveTo(0,420);ctx.lineTo(170,420);ctx.lineTo(250,350);ctx.lineTo(390,350);ctx.lineTo(470,260);ctx.lineTo(640,260);ctx.lineTo(710,180);ctx.lineTo(960,180);ctx.lineTo(960,235);ctx.lineTo(730,235);ctx.lineTo(665,315);ctx.lineTo(495,315);ctx.lineTo(420,405);ctx.lineTo(270,405);ctx.lineTo(190,475);ctx.lineTo(0,475);ctx.closePath();ctx.fill();
    ctx.fillStyle=p.path2;ctx.globalAlpha=.35;for(let i=0;i<90;i++){const x=rand(i,4)*W,y=rand(9,i)*H;if((x>100&&x<850&&y>180&&y<490)&&rand(i,2)>.45)ctx.fillRect(x,y,5,4);}ctx.globalAlpha=1;
    // ponds / river
    if(region.tone==='crimson'||region.tone==='marsh'||region.tone==='frost'){
      ctx.fillStyle=p.water;ctx.beginPath();ctx.ellipse(780,430,115,78,-.25,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffffff33';for(let i=0;i<18;i++)ctx.fillRect(700+rand(i,3)*150,390+rand(5,i)*70,10,3);
      if(region.tone==='crimson'){ctx.fillStyle='#b7e7e6';ctx.fillRect(775,330,8,28);ctx.fillRect(767,350,24,8);}
    }
    // Pixel rocks and shrubs
    for(let i=0;i<28;i++){const x=rand(i,19)*W,y=rand(21,i)*H;if((x<110&&y<100)||(x>W-110&&y>H-90))continue;ctx.fillStyle=p.rock;ctx.fillRect(x,y,18,13);ctx.fillStyle='#ffffff38';ctx.fillRect(x+3,y+2,7,3);ctx.fillStyle='#30384366';ctx.fillRect(x+4,y+11,14,3);}
    // Forest clusters
    for(let i=0;i<26;i++){
      const x=rand(i,31)*W,y=rand(37,i)*H;if((x>300&&x<690&&y>180&&y<430)||(x>720&&x<900&&y>360&&y<510))continue;
      ctx.fillStyle='#241d2a55';ctx.beginPath();ctx.ellipse(x+5,y+23,25,13,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=p.trunk;ctx.fillRect(x-5,y-2,13,30);ctx.fillStyle=p.tree;ctx.fillRect(x-22,y-26,48,34);ctx.fillRect(x-14,y-38,32,20);ctx.fillStyle=p.tree2;ctx.fillRect(x-13,y-27,14,10);ctx.fillRect(x+5,y-17,10,8);ctx.fillStyle='#ffffff22';ctx.fillRect(x-7,y-32,7,5);
      if(region.tone==='crimson'){ctx.fillStyle='#ef6470';ctx.fillRect(x-19,y-18,7,6);ctx.fillRect(x+9,y-27,7,7);}
      if(region.tone==='frost'){ctx.fillStyle='#eef5f8';ctx.fillRect(x-17,y-28,32,5);}
    }
    // Mushrooms, flowers, torches and ruins
    for(let i=0;i<22;i++){const x=rand(i,71)*W,y=rand(73,i)*H;ctx.fillStyle=region.tone==='crimson'?'#f0d7c8':'#d8e8bd';ctx.fillRect(x,y+5,4,8);ctx.fillStyle=region.tone==='crimson'?'#ed5666':p.flower;ctx.fillRect(x-5,y,14,6);ctx.fillRect(x-2,y-3,7,4);}
    ctx.fillStyle='#51434a';ctx.fillRect(70,60,110,24);ctx.fillRect(70,60,14,95);ctx.fillStyle='#897b76';ctx.fillRect(75,65,100,12);ctx.fillRect(75,65,8,82);ctx.fillStyle='#3e343c';ctx.fillRect(94,86,62,5);
    // Ruined stone doorway
    ctx.fillStyle='#5c5965';ctx.fillRect(800,65,100,76);ctx.fillStyle='#8e929d';ctx.fillRect(792,58,116,16);ctx.fillRect(792,58,13,83);ctx.fillRect(895,58,13,83);ctx.fillStyle='#2a2531';ctx.fillRect(826,83,49,58);ctx.fillStyle='#a5a8a9';ctx.fillRect(836,91,29,5);
    // Enemy sprites
    const drawSlime=(x,y,color)=>{ctx.fillStyle='#241d2a66';ctx.fillRect(x-17,y+12,36,7);ctx.fillStyle=color;ctx.fillRect(x-17,y-5,34,18);ctx.fillRect(x-11,y-12,22,9);ctx.fillStyle='#f4e8c9';ctx.fillRect(x-9,y,4,5);ctx.fillRect(x+5,y,4,5);ctx.fillStyle='#33263a';ctx.fillRect(x-8,y+2,3,3);ctx.fillRect(x+6,y+2,3,3);ctx.fillStyle='#ffffff55';ctx.fillRect(x-10,y-8,7,4);};
    drawSlime(585,165,region.tone==='frost'?'#8dc9d7':'#c28a45');drawSlime(650,220,'#b78c4d');drawSlime(350,470,'#73834a');drawSlime(875,315,'#7165a6');
    // Moving character sprites are rendered in the overlay so they can walk independently of the terrain.
    // tiny labels and area edge details
    ctx.fillStyle='#fff0d6';ctx.font='bold 16px monospace';ctx.fillText(region.name.toUpperCase(),22,30);ctx.fillStyle='#ffffffaa';ctx.font='11px monospace';ctx.fillText('CLICK A CLEAR TILE TO MOVE',22,49);
  },[region,save.x,save.y]);
  function click(e){const r=canvasRef.current.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;onMoveTo(Math.max(0,Math.min(7,Math.floor(x*8))),Math.max(0,Math.min(7,Math.floor(y*8))));}
  return <div className="adventure-scene-stage">
    <canvas ref={canvasRef} width={960} height={600} className="adventure-pixel-canvas" onClick={click} aria-label="Top-down pixel art adventure world" />
    <div className="adventure-walk-layer" aria-hidden="true">
      <div className="adventure-walker villager-walker walker-one"><i className="walker-shadow"/><i className="walker-hair"/><i className="walker-head"/><i className="walker-body"/><i className="walker-pack"/><i className="walker-leg leg-one"/><i className="walker-leg leg-two"/></div>
      <div className="adventure-walker villager-walker walker-two"><i className="walker-shadow"/><i className="walker-hair"/><i className="walker-head"/><i className="walker-body"/><i className="walker-pack"/><i className="walker-leg leg-one"/><i className="walker-leg leg-two"/></div>
      <div className="adventure-walker villager-walker walker-three"><i className="walker-shadow"/><i className="walker-hair"/><i className="walker-head"/><i className="walker-body"/><i className="walker-pack"/><i className="walker-leg leg-one"/><i className="walker-leg leg-two"/></div>
      <div className={`adventure-walker player-walker ${sceneAction?.kind ? `doing-${sceneAction.kind}` : ''}`} style={{left:`${((100+save.x*105)/960)*100}%`,top:`${((125+save.y*54)/600)*100}%`}}><i className="walker-shadow"/><i className="walker-hair"/><i className="walker-head"/><i className="walker-body"/><i className="walker-pack"/><i className="walker-arm"/><i className={`held-tool tool-${sceneAction?.tool || save.equippedTool || 'axe'}`}/><i className="walker-leg leg-one"/><i className="walker-leg leg-two"/></div>
    </div>
    <div className="scene-interact-layer">
      {!save.worldNodes?.[`${region.id}:treeA`]&&<button className="scene-node scene-tree node-tree-a" onClick={()=>onSceneAction('chop','treeA')} aria-label="Chop tree"><i/><b>🌳 Tree</b><small>Nearby · E</small></button>}
      {!save.worldNodes?.[`${region.id}:treeB`]&&<button className="scene-node scene-tree node-tree-b" onClick={()=>onSceneAction('chop','treeB')} aria-label="Chop another tree"><i/><b>🌲 Tree</b><small>Chop</small></button>}
      {!save.worldNodes?.[`${region.id}:oreA`]&&<button className="scene-node scene-ore node-ore-a" onClick={()=>onSceneAction('mine','oreA')} aria-label="Mine ore"><i/><b>⛏ Ore vein</b><small>Nearby · E</small></button>}
      <button className="scene-node scene-water node-fishing" onClick={()=>onSceneAction('fish','water')} aria-label="Fish at pond"><i/><b>🎣 Fishing spot</b><small>Nearby · E</small></button>
      <button className="scene-node scene-trader node-trader" onClick={onOpenTrader} aria-label="Talk to village trader"><i>🧑‍🌾</i><b>Trader</b><small>Trade</small></button>
    </div>
  </div>;
}

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
  const [sceneAction,setSceneAction] = React.useState(null);
  const [traderOpen,setTraderOpen] = React.useState(false);
  const [bagOpen,setBagOpen] = React.useState(false);
  const [groundDrops,setGroundDrops] = React.useState([]);
  const [clock,setClock] = React.useState(8);
  const [weather,setWeather] = React.useState('Sunny');
  const [season,setSeason] = React.useState('Spring');
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
      else if(data?.save_data){const base=freshAdventureSave(),old=data.save_data;setSave({...base,...old,resources:{...base.resources,...(old.resources||{})},tools:{...base.tools,...(old.tools||{})},seeds:{...base.seeds,...(old.seeds||{})},dungeon:{...base.dungeon,...(old.dungeon||{})},sideQuestProgress:old.sideQuestProgress||{},crops:old.crops||[],buildings:old.buildings||[],pets:old.pets||[],worldNodes:old.worldNodes||{},equippedTool:old.equippedTool||'axe'});setSaveState('Adventure loaded');}
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
  function performSceneAction(kind,node){
    if(sceneAction)return;
    const tool=kind==='chop'?'axe':kind==='mine'?'pickaxe':kind==='fish'?'rod':(save.equippedTool||'axe');
    const durability=save.durability||{axe:100,pickaxe:100,rod:100,hoe:100,sword:100,bow:100};
    if((durability[tool]??100)<=0){setMessage(`Your ${tool} is broken. Craft or upgrade another one.`);return;}
    if(kind==='chop'&&save.worldNodes?.[`${save.region}:${node}`])return;
    if(kind==='mine'&&save.worldNodes?.[`${save.region}:${node}`])return;
    const spots={treeA:[2,4],treeB:[6,3],oreA:[5,7],water:[7,7]};
    setSceneAction({kind,tool,node});
    const tier=save.tools[tool]||0, speed=Math.max(420,950-tier*75);
    setMessage(kind==='chop'?'Chopping nearby tree…':kind==='mine'?'Mining nearby rock…':'Fishing at the water…');
    window.setTimeout(()=>{
      const amount=kind==='chop'?3+tier:kind==='mine'?2+Math.floor(tier/2):1;
      const resource=kind==='chop'?'wood':kind==='mine'?'stone':'fish';
      const drop={id:Date.now()+Math.random(),resource,amount,x:save.x,y:save.y};
      setGroundDrops(v=>[...v,drop]);
      setSave(v=>({...v,x:spots[node]?.[0]??v.x,y:spots[node]?.[1]??v.y,xp:v.xp+(kind==='fish'?3:4),durability:{...(v.durability||{axe:100,pickaxe:100,rod:100,hoe:100,sword:100,bow:100}),[tool]:Math.max(0,(v.durability?.[tool]??100)-(kind==='fish'?2:5-tier))},worldNodes:kind==='fish'?v.worldNodes:{...(v.worldNodes||{}),[`${save.region}:${node}`]:true}}));
      setMessage(`${amount} ${resource} dropped nearby. Walk over and press E to pick it up.`);setSceneAction(null);
    },speed);
  }
  function pickupDrop(){if(!groundDrops.length)return;const drop=groundDrops[0];setGroundDrops(v=>v.filter(d=>d.id!==drop.id));setSave(v=>({...v,resources:{...v.resources,[drop.resource]:(v.resources[drop.resource]||0)+drop.amount}}));setMessage(`Picked up ${drop.amount} ${drop.resource}.`);}
  function interactNearby(){if(groundDrops.length){pickupDrop();return;}const options=[['chop','treeA',2,4],['chop','treeB',6,3],['mine','oreA',5,7],['fish','water',7,7]];const near=options.find(([, ,x,y])=>Math.abs(save.x-x)+Math.abs(save.y-y)<=1);if(near){performSceneAction(near[0],near[1]);return;}setMessage('Move closer to a tree, rock, fishing spot or dropped resource, then press E.');}
  function tradeFromScene(){setSave(v=>({...v,x:1,y:2}));setTraderOpen(true);setMessage('You walked over to the village trader. Choose a trade below.');}
  function sellWood(){if((save.resources.wood||0)<5){setMessage('You need at least 5 wood to trade.');return;}update({resources:{...save.resources,wood:save.resources.wood-5},coins:save.coins+12});setMessage('Traded 5 wood for 12 adventure coins.');}
  function sellStone(){if((save.resources.stone||0)<5){setMessage('You need at least 5 stone to trade.');return;}update({resources:{...save.resources,stone:save.resources.stone-5},coins:save.coins+15});setMessage('Traded 5 stone for 15 adventure coins.');}
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
  const tiers=['Wooden','Stone','Iron','Amethyst','Diamond','Titanium','Iridium','Infinity'];
  const toolNames={pickaxe:'Pickaxe',axe:'Axe',sword:'Sword',hoe:'Hoe',bow:'Bow',rod:'Fishing rod'};
  const prices=[0,45,100,190,330,520,800,1200];
  function spend(cost){if(save.coins<cost){setMessage(`You need ${cost-save.coins} more adventure coins.`);return false;}return true;}
  function buyTool(tool){const tier=save.tools[tool]||0;if(tier>=7){setMessage(`${toolNames[tool]} is already Infinity tier.`);return;}const next=tier+1,cost=prices[next];if(!spend(cost))return;const resource=next===1?'stone':next===2?'iron':next===3?'amethyst':next===4?'diamond':next===5?'titanium':next===6?'iridium':'infinity';const need=next===1?5:next===2?5:next===3?4:next===4?4:next===5?4:next===6?3:3;if((save.resources[resource]||0)<need){setMessage(`Need ${need} ${resource} to craft ${tiers[next]} ${toolNames[tool]}.`);return;}update({coins:save.coins-cost,tools:{...save.tools,[tool]:next},resources:{...save.resources,[resource]:save.resources[resource]-need}});setMessage(`${tiers[next]} ${toolNames[tool]} crafted!`);}
  function gather(kind){const level=save.tools[kind==='wood'?'axe':'pickaxe']||0;if(kind==='wood'&&level<0){return;}if(kind==='stone'&&level<0){setMessage('You need a pickaxe to mine stone.');return;}const amount=kind==='wood'?2+level:1+Math.floor(level/2);update({resources:{...save.resources,[kind]:save.resources[kind]+amount},xp:save.xp+2});setMessage(`Gathered ${amount} ${kind}.`);}
  function mineOre(ore){const need=ore==='iron'?1:ore==='amethyst'?2:ore==='diamond'?3:ore==='titanium'?4:ore==='iridium'?5:6;if((save.tools.pickaxe||0)<need){setMessage(`${tiers[need]} pickaxe required to mine ${ore}.`);return;}update({resources:{...save.resources,[ore]:save.resources[ore]+1},xp:save.xp+5});setMessage(`Mined 1 ${ore}.`);}
  function buySeeds(seed){if(!spend(12))return;update({coins:save.coins-12,seeds:{...save.seeds,[seed]:save.seeds[seed]+3}});setMessage('Bought 3 seeds.');}
  function plant(seed){if(!save.seeds[seed]){setMessage(`Buy ${seed} seeds first.`);return;}update({seeds:{...save.seeds,[seed]:save.seeds[seed]-1},crops:[...save.crops,{id:Date.now(),seed,plantedAt:Date.now()}]});setMessage(`${seed} planted. Return in about one minute to harvest.`);}
  function harvest(crop){if(Date.now()-crop.plantedAt<60000){setMessage('This crop is still growing. Give it a little more time.');return;}update({crops:save.crops.filter(c=>c.id!==crop.id),inventory:[...save.inventory,`${crop.seed} harvest`],coins:save.coins+8});setMessage(`Harvested ${crop.seed}! +8 coins.`);}
  function build(type){const costs={farm:{wood:8,stone:0,coins:10},hut:{wood:20,stone:8,coins:30},house:{wood:45,stone:30,coins:80},campfire:{wood:5,stone:4,coins:5},chest:{wood:12,stone:2,coins:12}}[type];if(save.resources.wood<costs.wood||save.resources.stone<costs.stone||!spend(costs.coins)){setMessage(`Building ${type} needs ${costs.wood} wood, ${costs.stone} stone and ${costs.coins} coins.`);return;}update({coins:save.coins-costs.coins,resources:{...save.resources,wood:save.resources.wood-costs.wood,stone:save.resources.stone-costs.stone},buildings:[...save.buildings,type]});setMessage(`${type[0].toUpperCase()+type.slice(1)} built at your homestead.`);}
  function eatFood(food){const foods={berries:{cost:0,hunger:18,health:4},bread:{cost:10,hunger:35,health:8},stew:{cost:22,hunger:60,health:20}}[food];if(!spend(foods.cost))return;update({coins:save.coins-foods.cost,hunger:Math.min(100,save.hunger+foods.hunger),health:Math.min(100,save.health+foods.health)});setMessage(`You ate ${food}. Hunger and health restored.`);}
  function fish(){update({resources:{...save.resources,fish:save.resources.fish+1},xp:save.xp+3});setMessage('You caught a fish!');}
  function sellFish(){if(!save.resources.fish){setMessage('You have no fish to trade.');return;}update({resources:{...save.resources,fish:save.resources.fish-1},coins:save.coins+18});setMessage('Village trader paid 18 coins for your fish.');}
  function exploreCave(){const sword=save.tools.sword||0;if((save.health||0)<25){setMessage('Rest and eat before entering the cave. You need at least 25 health.');return;}const next=save.caveLevel||0;const ore=['stone','iron','amethyst','diamond','titanium','iridium','infinity'][Math.min(next,6)];const required=Math.min(next,6);if((save.tools.pickaxe||0)<required){setMessage(`${tiers[required]} pickaxe needed to explore this cave depth.`);return;}update({health:Math.max(1,save.health-18),caveLevel:next+1,resources:{...save.resources,[ore]:save.resources[ore]+2},coins:save.coins+12,xp:save.xp+18});setMessage(`Cave expedition complete! You found 2 ${ore}, +12 coins and +18 XP. A cave creature blocked the deeper tunnel, but you made it back safely.`);}
  function buyPet(){if(!spend(75))return;update({coins:save.coins-75,pets:[...save.pets,`Pip ${save.pets.length+1}`]});setMessage('A little companion joined your homestead!');}
  function buyPig(){if(!spend(90))return;update({coins:save.coins-90,pigs:save.pigs+1});setMessage('A pig joined your farm.');}
  function breedPigs(){if(save.pigs<2){setMessage('You need at least two pigs to breed.');return;}update({pigs:save.pigs+1});setMessage('A piglet was born on your farm!');}
  React.useEffect(()=>{const down=e=>{const k=e.key.toLowerCase();if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;if(k==='e'){e.preventDefault();interactNearby();return;}if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();const d={w:[0,-1],arrowup:[0,-1],s:[0,1],arrowdown:[0,1],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0]}[k];move(...d);}};window.addEventListener('keydown',down);return()=>window.removeEventListener('keydown',down);});
  React.useEffect(()=>{if(loading)return;const timer=setInterval(()=>{setSave(v=>({...v,hunger:Math.max(0,(v.hunger??100)-1),health:(v.hunger??100)<=0?Math.max(1,(v.health??100)-1):v.health}));setClock(h=>{const n=(h+1)%24;if(n===0)setSeason(s=>({Spring:'Summer',Summer:'Autumn',Autumn:'Winter',Winter:'Spring'}[s]));return n;});if(Math.random()<.12)setWeather(w=>w==='Sunny'?'Rainy':w==='Rainy'?'Cloudy':'Sunny');},45000);return()=>clearInterval(timer);},[loading]);
  return <div className="adventure-world">
    <section className={`adventure-hero biome-${region.tone}`}>
      <div><span className="adventure-kicker">RLM ADVENTURE · THE FIVE REALMS</span><h2>{region.icon} {region.name}</h2><p>{region.biome} · Meet characters, uncover secrets and explore ancient dungeons.</p></div>
      <div className="adventure-wallet"><strong>🪙 {save.coins}</strong><span>Adventure coins</span><strong>✦ {save.xp} XP</strong><span>Adventure XP</span></div>
    </section>
    <div className="adventure-toolbar"><button className="primary" onClick={()=>setMapOpen(v=>!v)}>🗺 {mapOpen?'Close world map':'Open world map'}</button><span className="adventure-save-status">● {saveState}</span><span className="muted">{loading?'Loading…':`${save.discoveries.length} discoveries`}</span></div>
    {mapOpen&&<div className="adventure-map panel"><h3>World map · Five Realms</h3><div className="realm-map-grid">{ADVENTURE_REGIONS.map(r=><button key={r.id} disabled={!isUnlocked(r.id)} className={`realm-map-card biome-${r.tone} ${save.region===r.id?'selected':''}`} onClick={()=>travel(r.id)}><strong>{isUnlocked(r.id)?r.icon:'🔒'} {isUnlocked(r.id)?r.name:'Undiscovered region'}</strong><small>{isUnlocked(r.id)?r.biome:'Complete the previous region quest'}</small></button>)}</div></div>}
    <section className="adventure-survival panel"><h3>❤️ Survival status</h3><div className="survival-bars"><div><label>Health · {save.health}/100</label><div className="survival-track"><i className="health-fill" style={{width:`${save.health}%`}}/></div></div><div><label>Hunger · {save.hunger}/100</label><div className="survival-track"><i className="hunger-fill" style={{width:`${save.hunger}%`}}/></div></div></div><p className="muted">Hunger slowly decreases while exploring. Eat food to keep your energy up.</p></section>
    <section className="adventure-systems-grid">

      <div className="panel"><h3>⚒ Tool workshop</h3><p className="muted">Eight tiers: Wooden → Stone → Iron → Amethyst → Diamond → Titanium → Iridium → Infinity.</p><div className="tool-tier-list">{Object.entries(toolNames).map(([k,n])=><div key={k}><span>{n}</span><b>{tiers[save.tools[k]||0]}</b><button disabled={(save.tools[k]||0)>=7} onClick={()=>buyTool(k)}>Upgrade · {prices[(save.tools[k]||0)+1]||'MAX'} coins</button></div>)}</div></div>
      <div className="panel"><h3>🌱 Farming & seeds</h3><div className="adventure-action-row">{['turnip','carrot','moonflower'].map(seed=><span key={seed}>{seed} seeds: {save.seeds[seed]} <button onClick={()=>buySeeds(seed)}>Buy seeds · 12</button> <button onClick={()=>plant(seed)}>Plant</button></span>)}</div><p className="muted">Growing crops:</p>{save.crops.length?save.crops.map(c=><div className="crop-row" key={c.id}><span>{c.seed} · {Math.max(0,Math.ceil((60000-(Date.now()-c.plantedAt))/1000))}s left</span><button onClick={()=>harvest(c)}>Harvest</button></div>):<small>No crops planted yet.</small>}</div>
      <div className="panel"><h3>⛏ Mountain caves</h3><p className="muted">Explore deeper cave layers for rarer ores. Your pickaxe tier determines how far you can go.</p><p>Depth reached: {save.caveLevel} · Cave creatures spotted: {Math.min(save.caveLevel,5)}</p><button onClick={exploreCave}>Explore cave · -18 health</button></div>
      <div className="panel"><h3>🏡 Build your homestead</h3><p className="muted">Collect materials, then build useful structures.</p><div className="adventure-action-row">{['farm','hut','house','campfire','chest'].map(b=><button key={b} onClick={()=>build(b)}>Build {b}</button>)}</div><p>Built: {save.buildings.length?save.buildings.join(' · '):'Nothing yet'}</p></div>
      <div className="panel"><h3>🍲 Food & cooking</h3><div className="adventure-action-row"><button onClick={()=>eatFood('berries')}>Eat berries · free</button><button onClick={()=>eatFood('bread')}>Buy bread · 10</button><button onClick={()=>eatFood('stew')}>Buy stew · 22</button></div></div>
      <div className="panel"><h3>🏘 Village trading & pets</h3><p className="muted">Trade with the village merchant and look after your homestead animals.</p><div className="adventure-action-row"><button onClick={sellFish}>Sell fish · 18 coins</button><button onClick={buyPet}>Adopt pet · 75</button><button onClick={buyPig}>Buy pig · 90</button><button onClick={breedPigs}>Breed pigs</button></div><p>Pets: {save.pets.length} · Pigs: {save.pigs}</p></div>
    </section>
    <div className="adventure-layout">
      <div className={`adventure-scene biome-${region.tone}`}>
        <div className="adventure-scene-top"><span>{region.icon} {region.name}</span><small>Move with the arrows · Discover hidden places</small></div>
        <div className="adventure-hud"><span>🕒 {String(clock).padStart(2,'0')}:00</span><span>🌦 {weather}</span><span>🍂 {season}</span><button onClick={()=>setBagOpen(v=>!v)}>🎒 Bag</button></div>
        <div className="tool-hotbar minecraft-hotbar">{['axe','pickaxe','rod','hoe','sword','bow'].map(t=><button title={t} className={(save.equippedTool||'axe')===t?'selected':''} key={t} onClick={()=>update({equippedTool:t})}>{t==='axe'?'🪓':t==='pickaxe'?'⛏️':t==='rod'?'🎣':t==='hoe'?'🪴':t==='sword'?'⚔️':'🏹'}</button>)}</div>
        <div className="adventure-prompt">Press <b>E</b> near a resource to interact · WASD / arrows to move</div>
        {groundDrops.map(d=><button key={d.id} style={{position:'absolute',left:`${12+d.x*9}%`,top:`${18+d.y*7}%`}} className="ground-drop" onClick={pickupDrop}>✨ {d.amount} {d.resource} · E</button>)}
        {bagOpen&&<div className="adventure-bag"><button className="bag-close" onClick={()=>setBagOpen(false)}>✕</button><h3>🎒 Inventory & durability</h3><div className="resource-counts">{Object.entries(save.resources).map(([k,v])=><span key={k}>{k}: <b>{v}</b></span>)}</div><h4>Tools</h4>{['axe','pickaxe','rod','hoe','sword','bow'].map(t=><div className="durability-row" key={t}><span>{t}</span><div><i style={{width:`${(save.durability?.[t]??100)}%`}}/></div><b>{save.durability?.[t]??100}%</b><button onClick={()=>update({equippedTool:t})}>Equip</button></div>)}<h4>Seeds</h4>{Object.entries(save.seeds).map(([k,v])=><button key={k} onClick={()=>update({selectedSeed:k})}>{k} · {v} seeds</button>)}</div>}
        <PixelAdventureScene region={region} save={save} sceneAction={sceneAction} traderOpen={traderOpen} onSceneAction={performSceneAction} onOpenTrader={tradeFromScene} onMoveTo={(x,y)=>{const key=`${save.region}:${x}:${y}`;update({x,y,discoveries:save.discoveries.includes(key)?save.discoveries:[...save.discoveries,key]});setMessage(`You explored ${region.name} · ${x+1}, ${y+1}.`)}} />
        {sceneAction&&<div className="scene-action-toast">{sceneAction.kind==='chop'?'🪓 Chopping…':sceneAction.kind==='mine'?'⛏ Mining…':'🎣 Fishing…'}</div>}
        {traderOpen&&<div className="scene-trader-panel"><button className="scene-trader-close" onClick={()=>setTraderOpen(false)}>✕</button><strong>🧑‍🌾 Village trader</strong><p>Trade gathered materials for adventure coins.</p><div className="adventure-action-row"><button onClick={sellFish}>Sell 1 fish · 18 coins</button><button onClick={sellWood}>Sell 5 wood · 12 coins</button><button onClick={sellStone}>Sell 5 stone · 15 coins</button></div></div>}
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
