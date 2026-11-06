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

function ArenaShooter({ onFinish, supabase, playerStats, onStatsRefresh }) {
  const canvasRef = React.useRef(null)
  const worldRef = React.useRef(null)
  const [hud,setHud] = React.useState({wave:1,score:0,hp:100,kills:0,status:'ready',weapon:'Pistol'})
  const [owned,setOwned] = React.useState(['arena_pistol'])
  const [shopBusy,setShopBusy] = React.useState(false)
  const [shopMessage,setShopMessage] = React.useState('')
  const [weapon,setWeapon] = React.useState('Pistol')
  const [notice,setNotice] = React.useState('WASD to move · Mouse to aim and shoot · Space also fires')
  const [runId,setRunId] = React.useState(0)
  const weapons = [
    {code:'arena_pistol',name:'Pistol',cost:0,damage:1,rate:260,desc:'Reliable starter sidearm'},
    {code:'arena_burst_rifle',name:'Burst rifle',cost:150,damage:1,rate:125,desc:'Fast firing for close and mid range'},
    {code:'arena_shotgun',name:'Scattergun',cost:220,damage:4,rate:620,desc:'Heavy close-range damage'},
    {code:'arena_plasma_blaster',name:'Plasma blaster',cost:350,damage:3,rate:300,desc:'Powerful energy shots'}
  ]
  React.useEffect(()=>{
    let alive=true
    async function loadOwned(){
      if(!supabase)return
      const {data,error}=await supabase.from('user_inventory').select('item_code').eq('user_id',(await supabase.auth.getUser()).data.user?.id)
      if(alive&&!error)setOwned(['arena_pistol',...(data||[]).map(x=>x.item_code).filter(x=>weapons.some(w=>w.code===x))])
    }
    loadOwned()
    return()=>{alive=false}
  },[supabase])
  async function buyWeapon(item){
    if(item.code==='arena_pistol'||owned.includes(item.code)||shopBusy)return
    setShopBusy(true);setShopMessage('')
    const {data,error}=await supabase.rpc('rlm_buy_arena_weapon',{p_item_code:item.code})
    setShopBusy(false)
    if(error){setShopMessage(`Purchase failed: ${error.message}`);return}
    setOwned(v=>[...v,item.code]);setShopMessage(`${item.name} unlocked!`);onStatsRefresh?.()
  }
  const start = (selectedWeapon=weapon) => {
    const item=weapons.find(x=>x.name===selectedWeapon&&owned.includes(x.code))||weapons[0]
    worldRef.current = {player:{x:420,y:240,r:13,hp:100},enemies:[],bullets:[],keys:{},mouse:{x:620,y:240,down:false},wave:1,score:0,kills:0,spawned:0,need:6,spawnClock:0,lastShot:0,lastHud:0,status:'playing',weapon:item.name,damage:item.damage,rate:item.rate}
    setWeapon(item.name);setHud({wave:1,score:0,hp:100,kills:0,status:'playing',weapon:item.name});setNotice('Wave 1 — clear all monsters!');setRunId(v=>v+1)
  }
  function continueWave(selectedWeapon=weapon){
    const w=worldRef.current,item=weapons.find(x=>x.name===selectedWeapon&&owned.includes(x.code))||weapons[0]
    if(!w)return
    w.weapon=item.name;w.damage=item.damage;w.rate=item.rate;w.wave+=1;w.need=6+(w.wave-1)*3;w.spawned=0;w.spawnClock=0;w.status='playing'
    setWeapon(item.name);setHud(h=>({...h,wave:w.wave,status:'playing',weapon:item.name}));setNotice(`Wave ${w.wave} — ${item.name} equipped.`);setRunId(v=>v+1)
  }
  React.useEffect(()=>{
    const canvas=canvasRef.current, ctx=canvas?.getContext('2d'), w=worldRef.current
    if(!canvas||!ctx||!w||w.status!=='playing') return
    const keyDown=e=>{if(['w','a','s','d',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();w.keys[e.key.toLowerCase()]=true}}
    const keyUp=e=>{w.keys[e.key.toLowerCase()]=false}
    const pointer=e=>{const r=canvas.getBoundingClientRect();w.mouse.x=(e.clientX-r.left)*canvas.width/r.width;w.mouse.y=(e.clientY-r.top)*canvas.height/r.height}
    const down=e=>{pointer(e);w.mouse.down=true;canvas.focus()},up=()=>{w.mouse.down=false}
    window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);canvas.addEventListener('pointermove',pointer);canvas.addEventListener('pointerdown',down);window.addEventListener('pointerup',up)
    let frame=0,last=performance.now()
    const loop=now=>{
      const dt=Math.min(.035,(now-last)/1000);last=now
      if(w.status!=='playing'){cancelAnimationFrame(frame);return}
      const p=w.player,k=w.keys
      let dx=(k.d||k.arrowright?1:0)-(k.a||k.arrowleft?1:0),dy=(k.s||k.arrowdown?1:0)-(k.w||k.arrowup?1:0),len=Math.hypot(dx,dy)||1
      p.x=Math.max(18,Math.min(822,p.x+dx/len*220*dt));p.y=Math.max(18,Math.min(462,p.y+dy/len*220*dt))
      w.spawnClock+=dt
      if(w.spawned<w.need&&w.spawnClock>Math.max(.35,1.25-w.wave*.055)){w.spawnClock=0;const edge=Math.floor(Math.random()*4),x=edge===0?12:edge===1?828:Math.random()*840,y=edge===2?12:edge===3?468:Math.random()*480;w.enemies.push({x,y,r:10+Math.min(8,w.wave),hp:1+Math.floor(w.wave/4),speed:35+w.wave*4});w.spawned++}
      if((w.mouse.down||k[' '])&&now-w.lastShot>w.rate){const a=Math.atan2(w.mouse.y-p.y,w.mouse.x-p.x);w.bullets.push({x:p.x,y:p.y,vx:Math.cos(a)*520,vy:Math.sin(a)*520,life:1.2,damage:w.damage});w.lastShot=now}
      for(const b of w.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt}
      for(const e of w.enemies){const a=Math.atan2(p.y-e.y,p.x-e.x);e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt;if(Math.hypot(p.x-e.x,p.y-e.y)<p.r+e.r)p.hp-=16*dt}
      for(const b of w.bullets)for(const e of w.enemies)if(!e.dead&&b.life>0&&Math.hypot(b.x-e.x,b.y-e.y)<e.r+4){e.hp-=b.damage;b.life=0;if(e.hp<=0){e.dead=true;w.kills++;w.score+=10}}
      w.enemies=w.enemies.filter(e=>!e.dead);w.bullets=w.bullets.filter(b=>b.life>0&&b.x>-5&&b.x<845&&b.y>-5&&b.y<485)
      if(p.hp<=0){p.hp=0;w.status='over';setHud({wave:w.wave,score:w.score,hp:0,kills:w.kills,status:'over',weapon:w.weapon});setNotice('Run over — your score and kills are shown below.');onFinish?.('arena',w.score)}
      else if(w.spawned===w.need&&w.enemies.length===0){w.status='shop';setHud({wave:w.wave,score:w.score,hp:Math.ceil(p.hp),kills:w.kills,status:'shop',weapon:w.weapon});setNotice(`Wave ${w.wave} cleared! Choose an owned weapon or buy a new one below.`)}
      if(now-w.lastHud>120){w.lastHud=now;setHud({wave:w.wave,score:w.score,hp:Math.ceil(p.hp),kills:w.kills,status:w.status,weapon:w.weapon})}
      ctx.fillStyle='#0c101a';ctx.fillRect(0,0,840,480);ctx.strokeStyle='#1e293b';ctx.lineWidth=1;for(let x=0;x<840;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,480);ctx.stroke()}for(let y=0;y<480;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(840,y);ctx.stroke()}
      ctx.fillStyle='#60a5fa';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#dbeafe';ctx.lineWidth=3;ctx.stroke()
      ctx.fillStyle='#fbbf24';for(const b of w.bullets){ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);ctx.fill()}
      for(const e of w.enemies){ctx.fillStyle='#a855f7';ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f5d0fe';ctx.fillRect(e.x-e.r,e.y-e.r-7,e.r*2*(e.hp/(1+Math.floor(w.wave/4))),3)}
      ctx.fillStyle='#e2e8f0';ctx.font='13px system-ui';ctx.fillText(`WAVE ${w.wave} · MONSTERS ${w.enemies.length+(w.need-w.spawned)} · ${w.weapon}`,14,22)
      frame=requestAnimationFrame(loop)
    }
    frame=requestAnimationFrame(loop)
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);canvas.removeEventListener('pointermove',pointer);canvas.removeEventListener('pointerdown',down);window.removeEventListener('pointerup',up)}
  },[runId,onFinish])
  const coins=Number(playerStats?.coins||0)
  return <div className="panel arena-panel"><div className="lobby-row"><div><h3>👾 Arena survival</h3><p className="muted">Move, aim and survive monster waves. Your account coins buy permanent weapons.</p></div><div className="arena-hud"><strong>Wave {hud.wave}</strong><strong>Score {hud.score}</strong><strong>HP {hud.hp}</strong><strong>🪙 {coins}</strong></div></div>
    <canvas ref={canvasRef} width="840" height="480" className="arena-canvas" tabIndex="0" aria-label="Arena shooter game area" />
    <p className="muted">{notice}</p>
    {hud.status==='ready'&&<button className="primary" onClick={()=>start()}>Start survival</button>}
    {hud.status==='over'&&<div className="arena-shop"><h3>Run complete</h3><p>Score: {hud.score} · Monsters defeated: {hud.kills}</p><button className="primary" onClick={()=>start()}>Play again</button></div>}
    {hud.status==='shop'&&<div className="arena-shop"><h3>Wave cleared — choose your weapon</h3><div className="weapon-grid">{weapons.filter(x=>owned.includes(x.code)).map(item=><div className="weapon-card" key={item.code}><strong>{item.name}</strong><span>{item.damage} damage · {Math.round(1000/item.rate)} shots/sec</span><button className="primary" onClick={()=>continueWave(item.name)}>Equip & continue</button></div>)}</div></div>}
    <div className="arena-shop"><h3>🛒 Permanent weapon shop</h3><p className="muted">Purchases use your real RLM account coins and stay unlocked for future runs.</p><div className="weapon-grid">{weapons.map(item=><div className="weapon-card" key={item.code}><strong>{item.name}</strong><span>{item.desc}</span><span>{item.cost===0?'Free':`${item.cost} account coins`}</span>{owned.includes(item.code)?<span className="muted">✓ Owned</span>:<button className="primary" disabled={shopBusy||coins<item.cost} onClick={()=>buyWeapon(item)}>{coins<item.cost?'Not enough coins':`Buy · ${item.cost}`}</button>}</div>)}</div>{shopMessage&&<p className="status">{shopMessage}</p>}</div>
  </div>
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
    supabase.from('player_stats').select('xp,level,coins').eq('user_id', session.user.id).maybeSingle().then(({data,error}) => {
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
    const { data, error } = await supabase.from('player_stats').select('xp,level,coins').eq('user_id', session.user.id).maybeSingle()
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
  const perks = [{level:2,name:'Arcade Starter',detail:'Unlock the arena wave badge.'},{level:3,name:'Track Regular',detail:'Unlock the racer profile tag.'},{level:5,name:'RLM Veteran',detail:'Unlock the veteran profile title.'},{level:10,name:'Elite Member',detail:'Unlock the elite profile title.'}]
  return <div className="rlm-extra-games">
    <div className="level-progress panel"><h3>✦ Level {level} · {Number(playerStats?.xp || 0)} XP</h3><p className="muted">Earn XP by completing games. Level markers track upcoming profile-flair milestones; cosmetic grants are not automatic yet.</p><div className="unlocked-perks">{perks.map(p => <span key={p.level} className={level >= p.level ? 'perk unlocked' : 'perk'}>{level >= p.level ? '✓' : '🔒'} Level {p.level}: {p.name} — {p.detail}</span>)}</div></div>
    <div className="game-tabs extra-tabs">
      {[['chess','♟ Chess'],['ttt','⭕ Multiplayer TTT'],['arena','👾 Arena'],['racer','🏎 Racer'],...(isAdmin ? [['gifts','🪙 Coin gifts']] : []),...(isOwner ? [['delete','🛡 Account tools']] : [])].map(([key,label]) => <button key={key} className={tab === key ? 'primary' : 'secondary'} onClick={() => setTab(key)}>{label}</button>)}
    </div>
    {note && <p className="status">{note}</p>}
    {tab === 'chess' && <div className="mode-switch"><button className={chessMode==='bot'?'primary':'secondary'} onClick={()=>setChessMode('bot')}>🤖 Play vs bot</button><button className={chessMode==='online'?'primary':'secondary'} onClick={()=>setChessMode('online')}>🌐 Multiplayer</button></div>}
    {tab === 'racer' && <div className="mode-switch"><button className={racerMode==='ai'?'primary':'secondary'} onClick={()=>setRacerMode('ai')}>🤖 AI race</button><button className={racerMode==='online'?'primary':'secondary'} onClick={()=>setRacerMode('online')}>🌐 Online race</button></div>}
    {tab === 'chess' && chessMode === 'bot' && <SoloChess onFinish={finishLocalGame} />}
    {tab === 'arena' && <ArenaShooter onFinish={finishLocalGame} supabase={supabase} playerStats={playerStats} onStatsRefresh={refreshPlayerStats} />}
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
        {active.status === 'active' && tab === 'chess' && <><div className="chess-clocks"><strong>♔ White {formatClock(whiteRemaining)}</strong><strong>♚ Black {formatClock(blackRemaining)}</strong></div><div className="chess-board">{chessBoard.flatMap((row,r) => row.map((piece,c) => { const sq = `${'abcdefgh'[c]}${8-r}`; return <button key={sq} className={`chess-square ${(r+c)%2 ? 'dark' : 'light'} ${selected === sq ? 'chosen' : ''}`} onClick={() => playChessSquare(sq)}>{piece ? pieces[piece.color][piece.type] : ''}</button> }))}</div><p className="muted">Select a piece, then its destination. Server-managed clocks use the selected time control; legal chess moves are checked in the browser.</p></>}
        {active.status === 'active' && tab === 'racer' && <><div className="race-lanes">{[active.player_one,active.player_two].map((id,i) => <div className="race-lane" key={id}><span>{id === session.user.id ? 'You' : 'Clanmate'}</span><div className="race-track"><div className="race-car" style={{width:`${Number(active.state?.progress?.[id] || 0)}%`}} /></div><strong>{Number(active.state?.progress?.[id] || 0)}%</strong></div>)}</div><button className="primary" disabled={busy || active.status !== 'active'} onClick={accelerateClanRace}>Accelerate +10%</button><p className="muted">Each acceleration updates your position through the existing Supabase race function. Live opponent updates arrive through Realtime.</p></>}
        {active.status === 'finished' && <p>Match finished. {active.winner_id === 'draw' ? 'Draw.' : active.winner_id === session.user.id ? 'You won!' : 'Your opponent won.'}</p>}
        {active.status === 'pending' && <p className="muted">Waiting for the invited clanmate to respond.</p>}
      </div>}
    </div>}
    {tab === 'gifts' && isAdmin && <div className="panel"><h3>🪙 Staff coin gifting</h3><p className="muted">Owner and admin gifts are processed by a permission-checked database function and recorded in an audit log. You can select yourself.</p><label>Member<select value={giftTarget} onChange={e => setGiftTarget(e.target.value)}><option value="">Choose member</option><option value={session.user.id}>{profileLabel(session.user.id, members) || 'You (self)'}</option>{members.map(m => <option key={m.id} value={m.id}>{m.display_name || m.username || m.id}</option>)}</select></label><label>Coins<input type="number" min="1" max="100000" value={giftAmount} onChange={e => setGiftAmount(e.target.value)} /></label><label>Reason<input value={giftReason} maxLength={200} onChange={e => setGiftReason(e.target.value)} placeholder="Optional reason" /></label><button className="primary" disabled={busy || !giftTarget || !Number.isInteger(Number(giftAmount)) || Number(giftAmount)<1 || Number(giftAmount)>100000} onClick={async () => { const result = await rpc('rlm_staff_grant_coins',{p_target_user_id:giftTarget,p_amount:Number(giftAmount),p_reason:giftReason.trim()}); if(result) setNote('Coin gift completed and logged.') }}>Grant coins</button></div>}
    {tab === 'delete' && isOwner && <div className="panel"><h3>🛡 Owner account deletion</h3><p className="muted">This permanently deletes a selected member account. It cannot delete your own owner account or another owner. The server verifies your role before deletion.</p><label>Member to delete<select value={deleteTarget} onChange={e => setDeleteTarget(e.target.value)}><option value="">Choose member</option>{members.filter(m => m.id !== session.user.id).map(m => <option key={m.id} value={m.id}>{m.display_name || m.username || m.id} · {m.id}</option>)}</select></label><label>Type DELETE to confirm<input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} /></label><button className="primary danger-button" disabled={!deleteTarget || deleteConfirm !== 'DELETE' || busy} onClick={() => setShowDelete(true)}>Review deletion</button>{showDelete && <div className="notice"><strong>Final confirmation</strong><p>This action permanently removes the selected account and its auth identity.</p><button className="danger-button" disabled={busy} onClick={async () => { setBusy(true); const {data:{session:current}} = await supabase.auth.getSession(); const {data,error} = await supabase.functions.invoke('owner-delete-user',{body:{user_id:deleteTarget},headers:{Authorization:`Bearer ${current?.access_token || ''}`}}); setBusy(false); if(error || data?.error) setNote(error?.message || data.error); else {setNote('Account deleted.');setDeleteTarget('');setDeleteConfirm('');setShowDelete(false)} }}>Permanently delete account</button><button className="secondary" onClick={() => setShowDelete(false)}>Cancel</button></div>}</div>}
  </div>
}
