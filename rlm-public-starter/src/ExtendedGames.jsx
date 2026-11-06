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

function ArenaShooter({ onFinish }) {
  const canvasRef = React.useRef(null)
  const worldRef = React.useRef(null)
  const [hud,setHud] = React.useState({wave:1,score:0,hp:100,coins:0,kills:0,status:'ready',weapon:'Pistol'})
  const [credits,setCredits] = React.useState(0)
  const [weapon,setWeapon] = React.useState('Pistol')
  const [notice,setNotice] = React.useState('WASD to move · Mouse to aim and shoot · Space also fires')
  const [runId,setRunId] = React.useState(0)
  const weapons = [{name:'Pistol',cost:0,damage:1,rate:260},{name:'Burst rifle',cost:30,damage:1,rate:130},{name:'Plasma blaster',cost:65,damage:3,rate:300}]
  const start = () => {
    worldRef.current = {player:{x:420,y:240,r:13,hp:100},enemies:[],bullets:[],keys:{},mouse:{x:620,y:240,down:false},wave:1,score:0,coins:0,kills:0,spawned:0,need:6,spawnClock:0,lastShot:0,lastHud:0,status:'playing',weapon:'Pistol',damage:1,rate:260}
    setHud({wave:1,score:0,hp:100,coins:0,kills:0,status:'playing',weapon:'Pistol'}); setCredits(0); setWeapon('Pistol'); setNotice('Wave 1 — clear all monsters!'); setRunId(v=>v+1)
  }
  function buy(item) {
    const w=worldRef.current
    if (!w || w.status!=='shop' || credits<item.cost) return
    setCredits(v=>v-item.cost); w.coins-=item.cost; w.weapon=item.name; w.damage=item.damage; w.rate=item.rate; setWeapon(item.name); w.wave+=1; w.need=6+(w.wave-1)*3; w.spawned=0; w.status='playing'; setHud(h=>({...h,wave:w.wave,status:'playing',weapon:item.name,coins:w.coins})); setNotice(`Wave ${w.wave} — ${item.name} equipped.`)
  }
  React.useEffect(()=>{
    const canvas=canvasRef.current, ctx=canvas?.getContext('2d'), w=worldRef.current
    if(!canvas||!ctx||!w||w.status!=='playing') return
    const keyDown=e=>{if(['w','a','s','d',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();w.keys[e.key.toLowerCase()]=true}}
    const keyUp=e=>{w.keys[e.key.toLowerCase()]=false}
    const pointer=e=>{const r=canvas.getBoundingClientRect();w.mouse.x=(e.clientX-r.left)*canvas.width/r.width;w.mouse.y=(e.clientY-r.top)*canvas.height/r.height}
    const down=e=>{pointer(e);w.mouse.down=true;canvas.focus()}; const up=()=>{w.mouse.down=false}
    window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);canvas.addEventListener('pointermove',pointer);canvas.addEventListener('pointerdown',down);window.addEventListener('pointerup',up)
    let frame=0, last=performance.now()
    const loop=now=>{
      const dt=Math.min(0.035,(now-last)/1000);last=now
      if(w.status!=='playing'){cancelAnimationFrame(frame);return}
      const p=w.player, keys=w.keys
      let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0),len=Math.hypot(dx,dy)||1
      p.x=Math.max(18,Math.min(822,p.x+dx/len*220*dt));p.y=Math.max(18,Math.min(462,p.y+dy/len*220*dt))
      w.spawnClock+=dt
      if(w.spawned<w.need&&w.spawnClock>Math.max(.35,1.25-w.wave*.055)){w.spawnClock=0;const edge=Math.floor(Math.random()*4);const x=edge===0?12:edge===1?828:Math.random()*840;const y=edge===2?12:edge===3?468:Math.random()*480;w.enemies.push({x,y,r:10+Math.min(8,w.wave),hp:1+Math.floor(w.wave/4),speed:35+w.wave*4}) ;w.spawned++}
      if((w.mouse.down||keys[' '])&&now-w.lastShot>w.rate){const a=Math.atan2(w.mouse.y-p.y,w.mouse.x-p.x);w.bullets.push({x:p.x,y:p.y,vx:Math.cos(a)*520,vy:Math.sin(a)*520,life:1.2,damage:w.damage});w.lastShot=now}
      for(const b of w.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt}
      for(const e of w.enemies){const a=Math.atan2(p.y-e.y,p.x-e.x);e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt;if(Math.hypot(p.x-e.x,p.y-e.y)<p.r+e.r){p.hp-=16*dt}}
      for(const b of w.bullets){for(const e of w.enemies){if(!e.dead&&Math.hypot(b.x-e.x,b.y-e.y)<e.r+4){e.hp-=b.damage;b.life=0;if(e.hp<=0){e.dead=true;w.kills++;w.score+=10;w.coins+=5}}}}
      w.enemies=w.enemies.filter(e=>!e.dead);w.bullets=w.bullets.filter(b=>b.life>0&&b.x>-5&&b.x<845&&b.y>-5&&b.y<485)
      if(p.hp<=0){p.hp=0;w.status='over';setHud({wave:w.wave,score:w.score,hp:0,coins:w.coins,kills:w.kills,status:'over',weapon:w.weapon});setCredits(w.coins);setNotice('Run over — your score and earned arcade credits are shown below.');onFinish?.('arena',w.score)}
      else if(w.spawned===w.need&&w.enemies.length===0){w.status='shop';setHud({wave:w.wave,score:w.score,hp:Math.ceil(p.hp),coins:w.coins,kills:w.kills,status:'shop',weapon:w.weapon});setCredits(w.coins);setNotice(`Wave ${w.wave} cleared! Spend your run credits on a weapon before continuing.`)}
      if(now-w.lastHud>120){w.lastHud=now;setHud({wave:w.wave,score:w.score,hp:Math.ceil(p.hp),coins:w.coins,kills:w.kills,status:w.status,weapon:w.weapon})}
      ctx.fillStyle='#0c101a';ctx.fillRect(0,0,840,480);ctx.strokeStyle='#1e293b';ctx.lineWidth=1;for(let x=0;x<840;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,480);ctx.stroke()}for(let y=0;y<480;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(840,y);ctx.stroke()}
      ctx.fillStyle='#60a5fa';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#dbeafe';ctx.lineWidth=3;ctx.stroke()
      ctx.fillStyle='#fbbf24';for(const b of w.bullets){ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);ctx.fill()}
      for(const e of w.enemies){ctx.fillStyle='#a855f7';ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f5d0fe';ctx.fillRect(e.x-e.r,e.y-e.r-7,e.r*2*(e.hp/(1+Math.floor(w.wave/4))),3)}
      ctx.fillStyle='#e2e8f0';ctx.font='13px system-ui';ctx.fillText(`WAVE ${w.wave}  ·  MONSTERS ${w.enemies.length+(w.need-w.spawned)}  ·  ${w.weapon}`,14,22)
      frame=requestAnimationFrame(loop)
    }
    frame=requestAnimationFrame(loop)
    return ()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);canvas.removeEventListener('pointermove',pointer);canvas.removeEventListener('pointerdown',down);window.removeEventListener('pointerup',up)}
  },[runId,onFinish])
  const w=worldRef.current
  return <div className="panel arena-panel"><div className="lobby-row"><div><h3>👾 Arena survival</h3><p className="muted">Move around the arena, aim with your mouse and survive increasingly difficult monster waves.</p></div><div className="arena-hud"><strong>Wave {hud.wave}</strong><strong>Score {hud.score}</strong><strong>HP {hud.hp}</strong><strong>Credits {hud.coins}</strong></div></div>
    <canvas ref={canvasRef} width="840" height="480" className="arena-canvas" tabIndex="0" aria-label="Arena shooter game area" />
    <p className="muted">{notice}</p>
    {hud.status==='ready'&&<button className="primary" onClick={start}>Start survival</button>}
    {hud.status==='over'&&<div className="arena-shop"><h3>Run complete</h3><p>Score: {hud.score} · Monsters defeated: {hud.kills} · Run credits: {credits}</p><button className="primary" onClick={start}>Play again</button></div>}
    {hud.status==='shop'&&<div className="arena-shop"><h3>Wave cleared — weapon shop</h3><p className="muted">Credits are earned in this run and are not deducted from your account balance.</p><div className="weapon-grid">{weapons.map(item=><div className="weapon-card" key={item.name}><strong>{item.name}</strong><span>{item.damage} damage · {Math.round(1000/item.rate)} shots/sec</span><span>{item.cost===0?'Free':`${item.cost} credits`}</span><button className="primary" disabled={credits<item.cost} onClick={()=>buy(item)}>{item.cost===0?'Continue':`Buy · ${item.cost}`}</button></div>)}</div><button className="secondary" onClick={()=>{const x=worldRef.current;if(x){x.wave++;x.need=6+(x.wave-1)*3;x.spawned=0;x.status='playing';setHud(h=>({...h,wave:x.wave,status:'playing'}));setNotice(`Wave ${x.wave} — keep moving!`)}}}>Continue with current weapon</button></div>}
  </div>
}

function AIRacer({ onFinish }) {
  const [running,setRunning]=React.useState(false),[progress,setProgress]=React.useState(0),[bots,setBots]=React.useState([0,0,0]),[lane,setLane]=React.useState(1),[message,setMessage]=React.useState('Press start, then hold W or ↑ to accelerate. Use A/D or ←/→ to change lanes.')
  const keys=React.useRef({})
  const finished=React.useRef(false)
  React.useEffect(()=>{const down=e=>{if(['w','a','d','ArrowUp','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();keys.current[e.key.toLowerCase()]=true}},up=e=>{keys.current[e.key.toLowerCase()]=false};window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)}},[])
  React.useEffect(()=>{if(!running)return;const id=setInterval(()=>{const k=keys.current;setProgress(v=>{const n=Math.min(100,v+(k.w||k.arrowup?1.5:0.35));if(n>=100&&!finished.current){finished.current=true;setRunning(false);setMessage('🏁 You crossed the finish line!');onFinish?.('racer',100)}return n});setBots(v=>v.map((x,i)=>Math.min(100,x+[.65,.8,.72][i]+Math.random()*.25)));if(k.a||k.arrowleft)setLane(v=>Math.max(0,v-1));else if(k.d||k.arrowright)setLane(v=>Math.min(2,v+1))},180);return()=>clearInterval(id)},[running,onFinish])
  function start(){finished.current=false;setProgress(0);setBots([0,0,0]);setLane(1);setMessage('Race started — accelerate and steer!');setRunning(true);keys.current={}}
  const cars=[{name:'You',value:progress,lane},{name:'Nova',value:bots[0],lane:0},{name:'Pixel',value:bots[1],lane:2},{name:'Turbo',value:bots[2],lane:1}]
  return <div className="panel racer-panel"><h3>🏎 RLM Grand Prix — AI race</h3><p className="muted">Race three computer drivers on a three-lane road. Hold W / ↑ to accelerate; A/D / ←/→ to steer.</p><div className="race-game-layout"><div className="road-view"><div className="road-lines"/><div className="finish-line" style={{top:`${Math.max(2,92-progress*.88)}%`}}/> {cars.map((car,i)=><div key={car.name} className={`road-car ${i===0?'player-car':'bot-car'}`} style={{left:`${18+car.lane*32}%`,top:`${Math.max(4,88-car.value*.78)}%`}}><span>{i===0?'🏎️':'🚙'}</span><small>{car.name}</small></div>)}</div><div className="race-side"><div className="race-big-stat"><strong>{Math.round(progress)}%</strong><span>Distance</span></div><p>{message}</p><button className="primary" disabled={running} onClick={start}>{running?'Race in progress':'Start race'}</button>{cars.slice(1).map(car=><div className="race-opponent" key={car.name}><span>{car.name}</span><strong>{Math.round(car.value)}%</strong><div className="race-track"><div className="race-car" style={{width:`${car.value}%`}}/></div></div>)}</div></div></div>
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
  const finishLocalGame = React.useCallback(async (key, score) => {
    const { error } = await supabase.rpc('rlm_award_minigame_xp', { p_game_key: key, p_score: score })
    if (error) setNote(`Game finished, but XP was not saved: ${error.message}`)
    else { setNote('XP awarded!'); onProgress?.() }
  }, [supabase, onProgress])


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
    {tab === 'arena' && <ArenaShooter onFinish={finishLocalGame} />}
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
