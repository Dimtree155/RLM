import React from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import ExtendedGames from './ExtendedGames.jsx'
import './style.css'
import './presence.css'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = url && anon ? createClient(url, anon) : null

const STAFF_NAME_COLORS = ['#38bdf8', '#22c55e', '#a78bfa', '#f472b6', '#f97316', '#facc15', '#ef4444', '#14b8a6', '#6366f1', '#e879f9', '#f8fafc', '#94a3b8']

const menu = [
  ['Home', '⌂'], ['Messages', '✉'], ['Clan Chat', '💬'], ['Friends', '♙'],
  ['Minigames', '🎮'], ['Leaderboard', '🏆'], ['Quests', '✦'],
  ['Coin shop', '🛍'], ['My profile', '◉']
]

function ChatAvatar({ person, className = 'chat-avatar', presenceStatus = 'offline' }) {
  const name = person?.display_name || person?.username || 'R'

  if (person?.avatar_url) {
    return (
      <span className="presence-avatar-wrap">
        <img
          src={person.avatar_url}
          alt=""
          className={`${className} chat-avatar-image`}
        />
        <span className={`presence-dot ${presenceStatus}`} title={presenceStatus === 'online' ? 'Online' : presenceStatus === 'away' ? 'Away' : 'Offline'} />
      </span>
    )
  }

  return (
    <span className="presence-avatar-wrap">
      <span className={className}>{name.slice(0, 1).toUpperCase()}</span>
      <span className={`presence-dot ${presenceStatus}`} title={presenceStatus === 'online' ? 'Online' : presenceStatus === 'away' ? 'Away' : 'Offline'} />
    </span>
  )
}

function MemberName({ person, role, tierRoles = [], className = '', cosmetics = null }) {
  const isOwner = role === 'owner'
  const isStaff = ['owner', 'co_owner', 'admin', 'moderator'].includes(role)

  return (
    <span className={`member-name ${isOwner ? 'owner-name' : ''} ${role === 'co_owner' ? 'co-owner-name' : ''} ${className}`.trim()}>
      <span className="member-name-main">
        {isOwner && <span className="owner-crown" aria-label="Owner">👑</span>}
        {role === 'co_owner' && <span className="co-owner-diamond" aria-label="Co-owner" title="Co-owner"><span className="co-owner-diamond-shape" /></span>}
        {cosmetics?.badge && <span className={`equipped-badge badge-${cosmetics.badge_style || ''}`} title={cosmetics.badge}>{cosmetics.badge === 'Star Badge' ? '⭐' : cosmetics.badge === 'Flame Badge' ? '🔥' : '💎'}</span>}
        <span className="member-display-name" style={cosmetics?.display_name_color ? { '--display-name-color': cosmetics.display_name_color } : undefined}>{person?.display_name || person?.username || '尺ḼⱮ member'}</span>
        {tierRoles.map(tier => <span key={tier} className={`member-tier-badge tier-${tier}`} title={`${tier.toUpperCase()} tier`}>{tier[0].toUpperCase()}</span>)}
        {cosmetics?.name_tag && <span className={`equipped-name-tag tag-${cosmetics.name_tag_style || ''}`}>{cosmetics.name_tag}</span>}
        {cosmetics?.title && <span className={cosmetics.title.trim().toLowerCase() === 'clan creator' ? 'equipped-title clan-creator-title' : 'equipped-title'}>{cosmetics.title}</span>}
        {isStaff && (
          <span
            className={`member-role-tag ${role}`}
            style={cosmetics?.staff_name_color ? { '--staff-name-color': cosmetics.staff_name_color } : undefined}
          >{role === 'co_owner' ? 'Co-owner' : role === 'owner' ? 'Owner' : role === 'moderator' ? 'Moderator' : 'Admin'}</span>
        )}
      </span>
      {person?.username && !/^player_[a-f0-9]{8,}$/i.test(person.username) && <span className="member-username">@{person.username}</span>}
    </span>
  )
}


function ProfileHover({ person, role, tierRoles = [], cosmetics, supabase, children }) {
  const [open, setOpen] = React.useState(false)
  const [stats, setStats] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const [cardPosition, setCardPosition] = React.useState({ top: 0, left: 0 })
  const timer = React.useRef(null)

  async function showProfile(event) {
    const rect = event?.currentTarget?.getBoundingClientRect?.()
    if (rect && typeof window !== 'undefined') {
      setCardPosition({ top: Math.min(rect.bottom + 8, window.innerHeight - 230), left: Math.min(rect.left, window.innerWidth - 245) })
    }
    setOpen(true)
    if (!person?.id || stats || loading || !supabase) return
    setLoading(true)
    const { data, error } = await supabase.rpc('rlm_get_public_profile', { p_user_id: person.id })
    if (error) setFailed(true)
    else setStats(Array.isArray(data) ? data[0] || null : data)
    setLoading(false)
  }

  return (
    <span className="profile-hover-wrap" role="button" tabIndex={0}
      aria-label={`View ${person?.display_name || person?.username || 'member'} profile`}
      onClick={(event) => { event.stopPropagation(); showProfile(event) }}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showProfile(event) } }}
      onMouseEnter={(event) => { clearTimeout(timer.current); showProfile(event) }}
      onMouseLeave={() => { timer.current = setTimeout(() => setOpen(false), 180) }}
      onFocus={showProfile}
      onBlur={() => setOpen(false)}
    >
      {children || <MemberName person={person} role={role} tierRoles={tierRoles} cosmetics={cosmetics} />}
      {open && (
        <span className="profile-hover-card" role="status" style={{ top: cardPosition.top, left: cardPosition.left }}>
          <span className="profile-hover-heading">
            {person?.avatar_url && <img src={person.avatar_url} alt="" className="profile-hover-avatar" />}
            <span><strong>{person?.display_name || person?.username || '尺ḼⱮ member'}</strong></span>
            {role && <small>{role === 'co_owner' ? 'CO-OWNER' : role.toUpperCase()}</small>}
          </span>
          {loading ? <span className="muted">Loading stats…</span> : failed ? <span className="muted">Profile stats unavailable. Run the progression SQL migration.</span> : stats ? (
            <>
              {stats.title && <span className={stats.title.trim().toLowerCase() === 'clan creator' ? 'profile-hover-title clan-creator-title' : 'profile-hover-title'}>{stats.title}</span>}
              <span>🪙 {stats.coins ?? 0} coins</span>
              <span>🎮 {stats.games_played ?? 0} games played</span>
              <span>✦ {stats.quests_completed ?? 0} quests completed</span>
              {stats.equipped_name_tag && <span>Tag: {stats.equipped_name_tag}</span>}
              {stats.equipped_badge && <span>Badge: {stats.equipped_badge}</span>}
            </>
          ) : <span className="muted">No stats yet.</span>}
        </span>
      )}
    </span>
  )
}

const BLOCK_SHAPES = [
  [[0,0],[1,0],[2,0]], [[0,0],[0,1],[1,1]], [[0,0],[1,0],[0,1],[1,1]],
  [[0,0],[0,1],[0,2]], [[0,0],[1,0],[2,0],[1,1]], [[0,0],[1,0],[2,0],[0,1]],
  [[0,0],[1,0],[1,1]], [[0,0],[1,0],[2,0],[3,0]], [[0,0],[1,0],[0,1]]
]

function BlockBlastGame({ onRecordGame }) {
  const empty = () => Array.from({ length: 10 }, () => Array(10).fill(false))
  const [grid, setGrid] = React.useState(empty)
  const [pieces, setPieces] = React.useState(() => [0, 2, 4])
  const [selected, setSelected] = React.useState(0)
  const [score, setScore] = React.useState(0)
  const [over, setOver] = React.useState(false)
  const [round, setRound] = React.useState(0)
  const [drag, setDrag] = React.useState(null)
  const boardRef = React.useRef(null)
  const wrapRef = React.useRef(null)

  function fits(board, shape, x, y) {
    return shape.every(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < 10 && y + dy < 10 && !board[y + dy]?.[x + dx])
  }
  function canAnyFit(board, list) {
    return list.some(index => {
      if (index == null) return false
      for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) if (fits(board, BLOCK_SHAPES[index], x, y)) return true
      return false
    })
  }
  function place(x, y, pieceIndex = selected) {
    if (over || pieces[pieceIndex] == null) return
    const shape = BLOCK_SHAPES[pieces[pieceIndex]]
    if (!fits(grid, shape, x, y)) return
    const next = grid.map(row => [...row])
    shape.forEach(([dx, dy]) => { next[y + dy][x + dx] = true })
    const fullRows = next.map((row, i) => row.every(Boolean) ? i : -1).filter(i => i >= 0)
    const fullCols = Array.from({ length: 10 }, (_, x2) => x2).filter(x2 => next.every(row => row[x2]))
    fullRows.forEach(row => { next[row] = Array(10).fill(false) })
    fullCols.forEach(col => { for (let row = 0; row < 10; row++) next[row][col] = false })
    const cleared = fullRows.length + fullCols.length
    const nextPieces = [...pieces]
    nextPieces[pieceIndex] = null
    const nextScore = score + shape.length + cleared * 10 + Math.max(0, cleared - 1) * 5
    setGrid(next); setScore(nextScore)
    if (nextPieces.every(piece => piece == null)) {
      const newPieces = Array.from({ length: 3 }, () => Math.floor(Math.random() * BLOCK_SHAPES.length))
      setPieces(newPieces); setSelected(0); setRound(value => value + 1)
      if (!canAnyFit(next, newPieces)) { setOver(true); onRecordGame('block-blast') }
    } else {
      setPieces(nextPieces)
      const remaining = nextPieces.filter(piece => piece != null)
      if (!canAnyFit(next, remaining)) { setOver(true); onRecordGame('block-blast') }
      else if (nextPieces[selected] == null) setSelected(nextPieces.findIndex(piece => piece != null))
    }
  }
  function getCell(clientX, clientY, pieceIndex) {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return null
    const shape = BLOCK_SHAPES[pieces[pieceIndex]]
    const maxX = Math.max(...shape.map(([x]) => x))
    const maxY = Math.max(...shape.map(([,y]) => y))
    const gap = 3, pad = 6
    const cell = (rect.width - pad * 2 - gap * 9) / 10
    const col = Math.floor((clientX - rect.left - pad) / (cell + gap)) - Math.floor((maxX + 1) / 2)
    const row = Math.floor((clientY - rect.top - pad) / (cell + gap)) - Math.floor((maxY + 1) / 2)
    return { x: col, y: row }
  }
  function updateDrag(event) {
    if (!drag) return
    const cell = getCell(event.clientX, event.clientY, drag.index)
    if (!cell) return
    const shape = BLOCK_SHAPES[pieces[drag.index]]
    setDrag({ ...drag, ...cell, inside: event.clientX >= boardRef.current.getBoundingClientRect().left && event.clientX <= boardRef.current.getBoundingClientRect().right && event.clientY >= boardRef.current.getBoundingClientRect().top && event.clientY <= boardRef.current.getBoundingClientRect().bottom, valid: fits(grid, shape, cell.x, cell.y) })
  }
  function finishDrag() {
    if (drag?.inside && drag.valid) place(drag.x, drag.y, drag.index)
    setDrag(null)
  }
  function restart() { setGrid(empty()); setPieces([0,2,4]); setSelected(0); setScore(0); setOver(false); setRound(0); setDrag(null) }
  const previewCells = new Set(drag?.inside && drag.valid ? BLOCK_SHAPES[pieces[drag.index]].map(([dx,dy]) => `${drag.x+dx}-${drag.y+dy}`) : [])
  return <div className="panel game-panel arcade-game" ref={wrapRef} onPointerMove={updateDrag} onPointerUp={finishDrag} onPointerCancel={() => setDrag(null)}>
    <h3>🧩 Block Blast</h3><p className="muted">Drag a shape onto the board. The glowing outline previews exactly where it will land. Clear full rows or columns.</p>
    <div className="arcade-score">Score: {score}</div>
    <div className="block-grid" ref={boardRef} role="grid" aria-label="Block Blast board">
      {grid.map((row,y) => row.map((filled,x) => <button key={`${x}-${y}`} aria-label={`Row ${y+1}, column ${x+1}`} className={`block-cell ${filled ? 'filled' : ''} ${previewCells.has(`${x}-${y}`) ? 'block-preview' : ''}`} onClick={() => !drag && place(x,y)} disabled={over} />))}
    </div>
    <div className="piece-tray">{pieces.map((piece,i) => <button key={`${round}-${i}`} className={`piece-choice ${selected === i ? 'chosen' : ''}`} onClick={() => setSelected(i)} onPointerDown={event => { if (piece == null || over) return; event.preventDefault(); setSelected(i); setDrag({ index:i, x:-99, y:-99, inside:false, valid:false }); wrapRef.current?.setPointerCapture?.(event.pointerId) }} disabled={piece == null || over} aria-label={`Drag block shape ${i+1}`}>{piece == null ? '✓' : BLOCK_SHAPES[piece].map(([x,y]) => <i key={`${x}-${y}`} style={{ gridColumn:x+1, gridRow:y+1 }} />)}</button>)}</div>
    {drag && <p className="block-drag-hint">{drag.inside ? (drag.valid ? '✓ Release to place' : 'That spot is blocked') : 'Drag onto the board'}</p>}
    {over && <p className="game-over">No more moves — final score {score}</p>}<button className="secondary" onClick={restart}>New game</button>
  </div>
}

const BUBBLE_COLORS = ['#f45b69','#4d96ff','#ffd166','#6bcB77','#b084f5']
function BubbleShooterGame({ onRecordGame }) {
  const freshBoard = () => Array.from({length:8},(_,r)=>Array.from({length:8},()=>r<4?Math.floor(Math.random()*BUBBLE_COLORS.length):null))
  const [board,setBoard] = React.useState(freshBoard)
  const [current,setCurrent] = React.useState(() => Math.floor(Math.random()*BUBBLE_COLORS.length))
  const [next,setNext] = React.useState(() => Math.floor(Math.random()*BUBBLE_COLORS.length))
  const [score,setScore] = React.useState(0)
  const [shots,setShots] = React.useState(0)
  const [aim,setAim] = React.useState(50)
  const [busy,setBusy] = React.useState(false)
  const [over,setOver] = React.useState(false)
  const areaRef = React.useRef(null)
  const timeoutRef = React.useRef(null)
  React.useEffect(()=>()=>clearTimeout(timeoutRef.current),[])
  function shoot(event) {
    if(busy||over) return
    const rect=areaRef.current.getBoundingClientRect()
    const col=Math.max(0,Math.min(7,Math.floor(((event.clientX-rect.left)/rect.width)*8)))
    setAim((col+.5)/8*100); setBusy(true)
    const row=[...Array(8).keys()].reverse().find(r=>board[r][col]==null)
    if(row==null){setBusy(false);setOver(true);onRecordGame('bubble-shooter');return}
    const nextBoard=board.map(r=>[...r]); nextBoard[row][col]=current
    const connected=[],stack=[[row,col]],seen=new Set()
    while(stack.length){const [r,c]=stack.pop(),key=`${r},${c}`;if(seen.has(key))continue;seen.add(key);if(nextBoard[r]?.[c]!==current)continue;connected.push([r,c]);[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr,nc])=>{if(nr>=0&&nr<8&&nc>=0&&nc<8&&!seen.has(`${nr},${nc}`))stack.push([nr,nc])})}
    let gained=0
    if(connected.length>=3){connected.forEach(([r,c])=>{nextBoard[r][c]=null});gained=connected.length*10}
    const newScore=score+gained;setBoard(nextBoard);setScore(newScore);setShots(v=>v+1)
    const isFull=nextBoard[0].some(Boolean)
    timeoutRef.current=setTimeout(()=>{setCurrent(next);setNext(Math.floor(Math.random()*BUBBLE_COLORS.length));setBusy(false);if(isFull){setOver(true);onRecordGame('bubble-shooter')}},220)
  }
  function restart(){clearTimeout(timeoutRef.current);setBoard(freshBoard());setCurrent(Math.floor(Math.random()*BUBBLE_COLORS.length));setNext(Math.floor(Math.random()*BUBBLE_COLORS.length));setScore(0);setShots(0);setBusy(false);setOver(false)}
  return <div className="panel game-panel arcade-game"><h3>🫧 Bubble Shooter</h3><p className="muted">Aim with your mouse or finger, then tap to shoot. Match 3 or more bubbles of the same colour to pop them.</p>
    <div className="arcade-score"><span>Score: {score}</span><span>Shots: {shots}</span></div>
    <div className="bubble-arena" ref={areaRef} onPointerMove={e=>{if(!busy&&!over){const r=areaRef.current.getBoundingClientRect();setAim(Math.max(4,Math.min(96,(e.clientX-r.left)/r.width*100)))} }} onPointerDown={shoot} role="button" tabIndex={0} aria-label="Aim and shoot bubbles">
      <div className="bubble-board">{board.map((row,r)=>row.map((color,c)=><span key={`${r}-${c}`} className="bubble-slot">{color!=null&&<i className="bubble-ball" style={{background:BUBBLE_COLORS[color]}}/>}</span>))}</div>
      <div className="bubble-aim" style={{left:`${aim}%`}} />
      <div className="bubble-launcher"><i className="bubble-ball" style={{background:BUBBLE_COLORS[current]}}/><small>Next <i className="bubble-ball" style={{background:BUBBLE_COLORS[next]}}/></small></div>
      {over&&<div className="bubble-over">Game over<br/><small>Final score: {score}</small></div>}
    </div>
    <p className="muted bubble-hint">Tip: aim at the same-colour clusters to clear space.</p><button className="secondary" onClick={restart}>New game</button>
  </div>
}

function Game2048({ onRecordGame }) {
  const makeBoard = () => { const board = Array(16).fill(0); [Math.floor(Math.random()*16), Math.floor(Math.random()*16)].forEach(i => { if (!board[i]) board[i] = Math.random() < .0 ? 4 : 2 }); return board }
  const [board, setBoard] = React.useState(makeBoard)
  const [score, setScore] = React.useState(0)
  const [over, setOver] = React.useState(false)
  const [won, setWon] = React.useState(false)
  const boardRef = React.useRef(board); boardRef.current = board
  function move(direction) {
    if (over) return
    const old = boardRef.current
    const next = Array(16).fill(0); let gained = 0
    for (let line = 0; line < 4; line++) {
      let indices = Array.from({length:4}, (_,n) => direction === 'left' ? line*4+n : direction === 'right' ? line*4+3-n : direction === 'up' ? n*4+line : (3-n)*4+line)
      let values = indices.map(i => old[i]).filter(Boolean), merged = []
      for (let i=0;i<values.length;i++) { if (values[i] === values[i+1]) { merged.push(values[i]*2); gained += values[i]*2; i++ } else merged.push(values[i]) }
      indices.forEach((idx,n) => { next[idx] = merged[n] || 0 })
    }
    if (next.every((v,i) => v === old[i])) return
    const empty = next.map((v,i) => v ? -1 : i).filter(i => i >= 0)
    if (empty.length) { const idx = empty[Math.floor(Math.random()*empty.length)]; next[idx] = Math.random() < .1 ? 4 : 2 }
    const nextScore = score + gained; setBoard(next); setScore(nextScore)
    if (!won && next.includes(2048)) setWon(true)
    const noMoves = next.every(Boolean) && !next.some((v,i) => i%4<3 && v===next[i+1] || i<12 && v===next[i+4])
    if (noMoves) { setOver(true); onRecordGame('2048') }
  }
  React.useEffect(() => { const key = e => { const map = {ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down'}; if (map[e.key]) { e.preventDefault(); move(map[e.key]) } }; window.addEventListener('keydown',key); return () => window.removeEventListener('keydown',key) })
  function restart() { setBoard(makeBoard()); setScore(0); setOver(false); setWon(false) }
  return <div className="panel game-panel arcade-game"><h3>🔢 2048</h3><p className="muted">Use the arrow keys or buttons to slide tiles. Combine matching numbers to reach 2048.</p><div className="arcade-score">Score: {score}</div><div className="number-grid">{board.map((value,i) => <div key={i} className={`number-tile tile-${Math.min(value,2048)}`}>{value || ''}</div>)}</div><div className="direction-pad"><button onClick={() => move('up')}>↑</button><div><button onClick={() => move('left')}>←</button><button onClick={() => move('down')}>↓</button><button onClick={() => move('right')}>→</button></div></div>{won && <p className="game-win">2048 reached! Keep going if you want.</p>}{over && <p className="game-over">No moves left — final score {score}</p>}<button className="secondary" onClick={restart}>New game</button></div>
}

function FruitMergeGame({ onRecordGame }) {
  const fruits = ['🍒','🍓','🍇','🍊','🍋','🍎','🍐','🍑','🍍','🍉']
  const radius = [4.5,5.2,6,6.9,7.8,8.8,9.8,10.8,11.8,12.8]
  const [pieces,setPieces] = React.useState([])
  const [next,setNext] = React.useState(0)
  const [score,setScore] = React.useState(0)
  const [over,setOver] = React.useState(false)
  const [best,setBest] = React.useState(0)
  const piecesRef = React.useRef(pieces); piecesRef.current = pieces
  const idRef = React.useRef(0)
  const cooldownRef = React.useRef(0)
  const topFramesRef = React.useRef(0)
  const overRef = React.useRef(false)
  const scoreRef = React.useRef(0)
  const arenaRef = React.useRef(null)

  React.useEffect(() => {
    const timer = setInterval(() => {
      if (overRef.current) return
      const current = piecesRef.current.map(p => ({...p, vy:Math.min(p.vy + 0.16, 2.1), x:p.x + p.vx, y:p.y + p.vy}))
      // Keep fruit inside the walls and let it bounce gently off the floor.
      current.forEach(p => {
        const r = radius[p.level]
        if (p.x < r) { p.x = r; p.vx = Math.abs(p.vx) * 0.45 }
        if (p.x > 100-r) { p.x = 100-r; p.vx = -Math.abs(p.vx) * 0.45 }
        if (p.y > 100-r) { p.y = 100-r; p.vy = -Math.abs(p.vy) * 0.22; p.vx *= 0.985 }
      })
      const removed = new Set(), additions = []
      let gained = 0
      for (let i=0;i<current.length;i++) {
        if (removed.has(i)) continue
        for (let j=i+1;j<current.length;j++) {
          if (removed.has(j)) continue
          const a=current[i], b=current[j], dx=(a.x-b.x)*0.78, dy=a.y-b.y
          const minDist=radius[a.level]+radius[b.level]
          const dist=Math.hypot(dx,dy)
          if (dist >= minDist || dist === 0) continue
          if (a.level === b.level && a.level < 9) {
            removed.add(i); removed.add(j)
            additions.push({id:++idRef.current,level:a.level+1,x:(a.x+b.x)/2,y:(a.y+b.y)/2,vx:(a.vx+b.vx)*0.25,vy:-0.7})
            gained += (a.level+1)*10
            break
          }
          // A small separation impulse keeps unlike fruits from overlapping.
          const overlap=minDist-dist, nx=dx/dist, ny=dy/dist
          a.x += nx*overlap*0.35/0.78; a.y += ny*overlap*0.35
          b.x -= nx*overlap*0.35/0.78; b.y -= ny*overlap*0.35
          const push=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny
          if (push > 0) { a.vx -= push*nx*0.18; a.vy -= push*ny*0.18; b.vx += push*nx*0.18; b.vy += push*ny*0.18 }
        }
      }
      const nextPieces=[...current.filter((_,i)=>!removed.has(i)),...additions]
      // End the round if a fruit is trapped against the top for several ticks.
      const danger=nextPieces.some(p => p.y-radius[p.level] < 2.5 && Math.abs(p.vy)<0.22)
      topFramesRef.current = danger ? topFramesRef.current+1 : 0
      if (topFramesRef.current > 90) {
        overRef.current=true; setOver(true); onRecordGame('fruit-merge')
      }
      if (gained) { scoreRef.current += gained; setScore(scoreRef.current); setBest(v=>Math.max(v,scoreRef.current)) }
      piecesRef.current=nextPieces; setPieces(nextPieces)
      cooldownRef.current=Math.max(0,cooldownRef.current-1)
    }, 30)
    return () => clearInterval(timer)
  }, [onRecordGame])

  function drop(event) {
    if (overRef.current || cooldownRef.current>0 || piecesRef.current.length>=55) return
    const rect=arenaRef.current.getBoundingClientRect()
    const x=Math.max(7,Math.min(93,((event.clientX-rect.left)/rect.width)*100))
    const piece={id:++idRef.current,level:next,x,y:8,vx:0,vy:0.15}
    const updated=[...piecesRef.current,piece]
    piecesRef.current=updated; setPieces(updated)
    setNext(Math.floor(Math.random()*5)); cooldownRef.current=12
  }
  function restart() {
    piecesRef.current=[]; setPieces([]); setNext(Math.floor(Math.random()*5)); setScore(0); scoreRef.current=0
    setOver(false); overRef.current=false; topFramesRef.current=0; cooldownRef.current=0
  }
  return <div className="panel game-panel arcade-game">
    <h3>🍉 Fruit Merge</h3>
    <p className="muted">Tap or click anywhere across the box to drop fruit. Matching fruits merge when they touch. Bigger merges earn more points!</p>
    <div className="arcade-score"><span>Score: {score}</span><span>Next: {fruits[next]}</span><span>Best: {best}</span></div>
    <div ref={arenaRef} className={`fruit-drop-arena ${over?'is-over':''}`} onClick={drop} role="button" tabIndex={0} aria-label="Fruit drop area. Click to drop the next fruit." onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();const rect=arenaRef.current.getBoundingClientRect();drop({clientX:rect.left+rect.width/2})}}}>
      <div className="fruit-drop-line" />
      {pieces.map(p=><span key={p.id} className="free-fruit" style={{left:`${p.x}%`,top:`${p.y}%`,width:`${radius[p.level]*1.56}%`,height:`${radius[p.level]*2}%`,fontSize:`${Math.max(17,radius[p.level]*3.1)}px`}}>{fruits[p.level]}</span>)}
      {over && <div className="fruit-game-over">Game over<br/>Final score: {score}</div>}
    </div>
    <p className="muted fruit-hint">Drop one fruit at a time • Combine matching fruit • Don't let the pile reach the top</p>
    <button className="secondary" onClick={restart}>New game</button>
  </div>
}
function SnakeGame({ onRecordGame }) {
  const [snake,setSnake] = React.useState([[5,5],[4,5],[3,5]])
  const [food,setFood] = React.useState([7,5])
  const [direction,setDirection] = React.useState([1,0])
  const directionRef = React.useRef(direction); directionRef.current = direction
  const [running,setRunning] = React.useState(false)
  const [over,setOver] = React.useState(false)
  const [score,setScore] = React.useState(0)
  const snakeRef = React.useRef(snake); snakeRef.current = snake
  React.useEffect(() => { const key = e => { const dirs = {ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]}; const d=dirs[e.key]; if (d) { e.preventDefault(); const old=directionRef.current; if (d[0] !== -old[0] || d[1] !== -old[1]) { directionRef.current=d; setDirection(d); setRunning(true) } } }; window.addEventListener('keydown',key); return () => window.removeEventListener('keydown',key) },[])
  React.useEffect(() => { if (!running || over) return; const id=setInterval(() => { const current=snakeRef.current, d=directionRef.current, head=[current[0][0]+d[0],current[0][1]+d[1]], eating=head[0]===food[0]&&head[1]===food[1], body=eating?current:current.slice(0,-1); if(head[0]<0||head[0]>=12||head[1]<0||head[1]>=12||body.some(([x,y])=>x===head[0]&&y===head[1])) { setOver(true); setRunning(false); onRecordGame('snake'); return } const next=[head,...current]; if(!eating) next.pop(); setSnake(next); if(eating) { setScore(s=>s+1); let point; do { point=[Math.floor(Math.random()*12),Math.floor(Math.random()*12)] } while(next.some(([x,y])=>x===point[0]&&y===point[1])); setFood(point) } },150); return () => clearInterval(id) },[running,over,food,onRecordGame])
  function restart() { setSnake([[5,5],[4,5],[3,5]]); snakeRef.current=[[5,5],[4,5],[3,5]]; setFood([7,5]); setDirection([1,0]); directionRef.current=[1,0]; setScore(0); setOver(false); setRunning(false) }
  return <div className="panel game-panel arcade-game"><h3>🐍 Snake</h3><p className="muted">Classic — eat, grow, don't hit yourself. Use WASD or arrow keys.</p><div className="arcade-score">Score: {score}</div><div className="snake-board">{Array.from({length:144},(_,i) => { const x=i%12,y=Math.floor(i/12), isSnake=snake.some(([sx,sy])=>sx===x&&sy===y); return <span key={i} className={`snake-cell ${isSnake?'snake-body':''} ${snake[0][0]===x&&snake[0][1]===y?'snake-head':''} ${food[0]===x&&food[1]===y?'snake-food':''}`}>{food[0]===x&&food[1]===y?'●':''}</span> })}</div><div className="direction-pad snake-pad"><button onClick={() => { if (directionRef.current[1] !== 1) { directionRef.current=[0,-1]; setDirection([0,-1]); setRunning(true) } }}>↑</button><div><button onClick={() => { if (directionRef.current[0] !== 1) { directionRef.current=[-1,0]; setDirection([-1,0]); setRunning(true) } }}>←</button><button onClick={() => { if (directionRef.current[1] !== -1) { directionRef.current=[0,1]; setDirection([0,1]); setRunning(true) } }}>↓</button><button onClick={() => { if (directionRef.current[0] !== -1) { directionRef.current=[1,0]; setDirection([1,0]); setRunning(true) } }}>→</button></div></div>{over && <p className="game-over">Game over — final score {score}</p>}{!running && !over && <p className="muted">Use the arrow buttons, arrow keys or WASD to start moving.</p>}<button className="secondary" onClick={restart}>Restart</button></div>
}

function MiniGames({ onRecordGame }) {
  const [game, setGame] = React.useState('tic-tac-toe')
  const [board, setBoard] = React.useState(Array(9).fill(''))
  const [roundMessage, setRoundMessage] = React.useState('You are X. Try to beat the computer.')
  const [reactionPhase, setReactionPhase] = React.useState('idle')
  const [reactionStart, setReactionStart] = React.useState(0)
  const [reactionResult, setReactionResult] = React.useState('')
  const timerRef = React.useRef(null)
  React.useEffect(() => () => clearTimeout(timerRef.current), [])
  function winnerOf(cells) { const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]; for(const [a,b,c] of lines) if(cells[a]&&cells[a]===cells[b]&&cells[a]===cells[c]) return cells[a]; return cells.every(Boolean)?'draw':null }
  function playCell(index) { if(board[index]||winnerOf(board)) return; const next=[...board]; next[index]='X'; const result=winnerOf(next); if(result){setBoard(next);setRoundMessage(result==='X'?'You won! 🎉':'It is a draw.');onRecordGame('tic-tac-toe');return} const available=next.map((v,i)=>v?-1:i).filter(i=>i>=0); next[available[Math.floor(Math.random()*available.length)]]='O'; const final=winnerOf(next); setBoard(next); if(final){setRoundMessage(final==='O'?'The computer won. Try again!':'It is a draw.');onRecordGame('tic-tac-toe')} else setRoundMessage('Your turn — choose a square.') }
  function resetBoard(){setBoard(Array(9).fill(''));setRoundMessage('You are X. Try to beat the computer.')}
  function startReaction(){clearTimeout(timerRef.current);setReactionResult('Wait for GO…');setReactionPhase('waiting');timerRef.current=setTimeout(()=>{setReactionStart(Date.now());setReactionPhase('go');setReactionResult('GO! Click the button!')},1200+Math.floor(Math.random()*1800))}
  function hitReaction(){if(reactionPhase==='waiting'){clearTimeout(timerRef.current);setReactionPhase('idle');setReactionResult('Too early! Press Start and try again.')}else if(reactionPhase==='go'){const ms=Date.now()-reactionStart;setReactionPhase('idle');setReactionResult(`Your reaction time: ${ms} ms`);onRecordGame('reaction')}}
  const tabs=[['tic-tac-toe','⭕ Tic-tac-toe'],['reaction','⚡ Reaction test'],['block','🧩 Block Blast'],['2048','🔢 2048'],['fruit','🍉 Fruit Merge'],['snake','🐍 Snake'],['bubble','🫧 Bubble Shooter']]
  return <div className="minigames-wrap"><div className="game-tabs">{tabs.map(([id,label])=><button key={id} className={game===id?'primary':'secondary'} onClick={()=>setGame(id)}>{label}</button>)}</div>
    {game==='tic-tac-toe'&&<div className="panel game-panel"><h3>⭕ Tic-tac-toe</h3><p className="muted">Play as X against the computer. A completed round counts toward your daily game quests.</p><div className="tic-board">{board.map((cell,index)=><button key={index} className="tic-cell" onClick={()=>playCell(index)} disabled={Boolean(cell)||Boolean(winnerOf(board))}>{cell}</button>)}</div><p>{roundMessage}</p><button className="secondary" onClick={resetBoard}>New round</button></div>}
    {game==='reaction'&&<div className="panel game-panel"><h3>⚡ Reaction test</h3><p className="muted">Press Start, wait for GO, then click as quickly as you can. Clicking early cancels the round.</p><div className="reaction-display">{reactionResult||'Ready when you are'}</div>{reactionPhase==='idle'?<button className="primary" onClick={startReaction}>Start</button>:<button className="primary" onClick={hitReaction}>{reactionPhase==='waiting'?'Wait…':'CLICK!'}</button>}</div>}
    {game==='block'&&<BlockBlastGame onRecordGame={onRecordGame}/>}{game==='2048'&&<Game2048 onRecordGame={onRecordGame}/>}{game==='fruit'&&<FruitMergeGame onRecordGame={onRecordGame}/>}{game==='snake'&&<SnakeGame onRecordGame={onRecordGame}/>}{game==='bubble'&&<BubbleShooterGame onRecordGame={onRecordGame}/>}
  </div>
}
function App() {
  const [session, setSession] = React.useState(null)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [signupDisplayName, setSignupDisplayName] = React.useState('')
  const [signupUsername, setSignupUsername] = React.useState('')
  const [myUsernameValue, setMyUsernameValue] = React.useState('')
  const [ownerUsernameTarget, setOwnerUsernameTarget] = React.useState('')
  const [ownerUsernameValue, setOwnerUsernameValue] = React.useState('')
  const [status, setStatus] = React.useState('')
  const [section, setSection] = React.useState('Home')

  const [lightMode, setLightMode] = React.useState(() => {
    try {
      return localStorage.getItem('rlm-theme') === 'light'
    } catch {
      return false
    }
  })

  const [profile, setProfile] = React.useState(null)
  const [newDisplayName, setNewDisplayName] = React.useState('')
  const [savingName, setSavingName] = React.useState(false)
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false)
  const avatarInputRef = React.useRef(null)

  // Member directory and friend requests
  const [members, setMembers] = React.useState([])
  const [friendshipRows, setFriendshipRows] = React.useState([])
  const [loadingMembers, setLoadingMembers] = React.useState(false)
  const [friendshipBusy, setFriendshipBusy] = React.useState('')
  const [memberRoles, setMemberRoles] = React.useState({})
  const [memberTierRoles, setMemberTierRoles] = React.useState({})
  const [tierRoleTarget, setTierRoleTarget] = React.useState('')
  const [tierRoleChoices, setTierRoleChoices] = React.useState([])
  const [memberCosmetics, setMemberCosmetics] = React.useState({})
  const [selectedStaffNameColor, setSelectedStaffNameColor] = React.useState('#38bdf8')
  const [savingStaffNameColor, setSavingStaffNameColor] = React.useState(false)
  const [selectedDisplayNameColor, setSelectedDisplayNameColor] = React.useState('#f8fafc')
  const [savingDisplayNameColor, setSavingDisplayNameColor] = React.useState(false)
  const [progressData, setProgressData] = React.useState(null)
  const [progressLoading, setProgressLoading] = React.useState(false)
  const [progressBusy, setProgressBusy] = React.useState(false)
  const [xpLeaderboard, setXpLeaderboard] = React.useState([])
  const [xpLeaderboardLoading, setXpLeaderboardLoading] = React.useState(false)
  const [ownerRoleTarget, setOwnerRoleTarget] = React.useState('')
  const [ownerRoleChoice, setOwnerRoleChoice] = React.useState('moderator')
  const [titleTarget, setTitleTarget] = React.useState('')
  const [titleValue, setTitleValue] = React.useState('')

  // Private messaging
  const [friends, setFriends] = React.useState([])
  const [conversations, setConversations] = React.useState([])
  const [selectedConversation, setSelectedConversation] = React.useState(null)
  const [selectedName, setSelectedName] = React.useState('')
  const [messages, setMessages] = React.useState([])
  const [messageText, setMessageText] = React.useState('')
  const [loadingMessages, setLoadingMessages] = React.useState(false)
  const [sendingMessage, setSendingMessage] = React.useState(false)

  // Shared clan chat
  const [clanMessages, setClanMessages] = React.useState([])
  const [clanMessageText, setClanMessageText] = React.useState('')
  const [clanImageFile, setClanImageFile] = React.useState(null)
  const [uploadingClanImage, setUploadingClanImage] = React.useState(false)
  const [loadingClanChat, setLoadingClanChat] = React.useState(false)
  const [sendingClanMessage, setSendingClanMessage] = React.useState(false)
  const [presenceByUser, setPresenceByUser] = React.useState({})

  // Staff permissions and moderation
  const [staffRole, setStaffRole] = React.useState('member')
  const [staffMembers, setStaffMembers] = React.useState([])
  const [ownerDirectory, setOwnerDirectory] = React.useState([])
  const [moderationActions, setModerationActions] = React.useState([])
  const [staffSearch, setStaffSearch] = React.useState('')
  const [staffTarget, setStaffTarget] = React.useState('')
  const [staffAction, setStaffAction] = React.useState('timeout')
  const [staffReason, setStaffReason] = React.useState('')
  const [timeoutMinutes, setTimeoutMinutes] = React.useState('60')
  const [staffLoading, setStaffLoading] = React.useState(false)
  const [staffBusy, setStaffBusy] = React.useState(false)
  const [coinGrantTarget, setCoinGrantTarget] = React.useState('')
  const [coinGrantAmount, setCoinGrantAmount] = React.useState('100')
  const [coinGrantReason, setCoinGrantReason] = React.useState('')
  const [deleteTarget, setDeleteTarget] = React.useState('')
  const [deleteConfirm, setDeleteConfirm] = React.useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [suspension, setSuspension] = React.useState(null)

  const isStaff = ['owner', 'co_owner', 'admin', 'moderator'].includes(staffRole)
  const canDeleteChatMessages = ['owner', 'co_owner', 'admin', 'moderator'].includes(staffRole)
  const canDeleteAccounts = ['owner', 'co_owner'].includes(staffRole)

  // Realtime presence shared by every signed-in clan member.
  // Hidden tabs or inactive users are marked away; disconnecting removes them.
  React.useEffect(() => {
    if (!session?.user?.id || !supabase) {
      setPresenceByUser({})
      return
    }

    let channel
    let disposed = false
    let lastActivity = Date.now()
    let currentStatus = 'online'

    const publishPresence = async (status) => {
      currentStatus = status
      if (!channel || disposed) return
      await channel.track({
        user_id: session.user.id,
        display_name: profile?.display_name || session.user.email || 'Clan member',
        status,
        last_seen: new Date().toISOString()
      })
    }

    const refreshPresence = () => {
      if (!channel || disposed) return
      const state = channel.presenceState()
      const next = {}
      Object.values(state).flat().forEach((entry) => {
        if (!entry?.user_id) return
        const previous = next[entry.user_id]
        const priority = value => value === 'online' ? 2 : value === 'away' ? 1 : 0
        if (!previous || priority(entry.status) > priority(previous.status)) {
          next[entry.user_id] = {
            status: ['online', 'away'].includes(entry.status) ? entry.status : 'away',
            display_name: entry.display_name || 'Clan member'
          }
        }
      })
      setPresenceByUser(next)
    }

    channel = supabase.channel('rlm-clan-presence', {
      config: { presence: { key: session.user.id } }
    })
      .on('presence', { event: 'sync' }, refreshPresence)
      .on('presence', { event: 'join' }, refreshPresence)
      .on('presence', { event: 'leave' }, refreshPresence)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await publishPresence(document.visibilityState === 'hidden' ? 'away' : 'online')
          refreshPresence()
        }
      })

    const markActive = () => {
      lastActivity = Date.now()
      if (document.visibilityState !== 'hidden' && currentStatus !== 'online') publishPresence('online')
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') publishPresence('away')
      else { lastActivity = Date.now(); publishPresence('online') }
    }
    const activityEvents = ['pointerdown', 'keydown', 'mousemove', 'touchstart']
    activityEvents.forEach(event => window.addEventListener(event, markActive, { passive: true }))
    document.addEventListener('visibilitychange', onVisibility)

    const awayTimer = window.setInterval(() => {
      if (document.visibilityState === 'hidden' || Date.now() - lastActivity > 60000) {
        if (currentStatus !== 'away') publishPresence('away')
      }
    }, 15000)

    return () => {
      disposed = true
      window.clearInterval(awayTimer)
      activityEvents.forEach(event => window.removeEventListener(event, markActive))
      document.removeEventListener('visibilitychange', onVisibility)
      if (channel) supabase.removeChannel(channel)
    }
  }, [session?.user?.id, profile?.display_name])

  function presenceStatus(userId) {
    return userId && presenceByUser[userId]?.status ? presenceByUser[userId].status : 'offline'
  }

  React.useEffect(() => {
    try {
      localStorage.setItem('rlm-theme', lightMode ? 'light' : 'dark')
    } catch {}
  }, [lightMode])

  React.useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  React.useEffect(() => {
    if (!session || !supabase) {
      setProfile(null)
      setNewDisplayName('')
      return
    }

    supabase.from('profiles')
      .select('username, display_name, avatar_url, created_at')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error) {
          setStatus(error.message)
        } else {
          const metadataUsername = session.user.user_metadata?.username
          if (!data?.username && metadataUsername && !/^player_[a-f0-9]{8,}$/i.test(metadataUsername)) {
            const { data: updatedProfile, error: updateError } = await supabase.from('profiles')
              .update({ username: metadataUsername })
              .eq('id', session.user.id)
              .select('username, display_name, avatar_url, created_at')
              .maybeSingle()
            if (!updateError && updatedProfile) {
              setProfile(updatedProfile)
              setNewDisplayName(updatedProfile.display_name || '')
              setMyUsernameValue(updatedProfile.username && !/^player_[a-f0-9]{8,}$/i.test(updatedProfile.username) ? updatedProfile.username : '')
            } else {
              setProfile(data)
              setNewDisplayName(data?.display_name || '')
              setMyUsernameValue(data?.username && !/^player_[a-f0-9]{8,}$/i.test(data.username) ? data.username : '')
            }
          } else {
            setProfile(data)
            setNewDisplayName(data?.display_name || '')
            setMyUsernameValue(data?.username && !/^player_[a-f0-9]{8,}$/i.test(data.username) ? data.username : '')
          }
        }
      })
  }, [session])

  // Load the signed-in user's role and moderation status.
  React.useEffect(() => {
    let cancelled = false

    async function loadAccountPermissions() {
      if (!session || !supabase) {
        setStaffRole('member')
        setSuspension(null)
        return
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (cancelled) return

      if (roleError) {
        setStatus('Could not load account permissions: ' + roleError.message)
        setStaffRole('member')
      } else {
        setStaffRole(roleData?.role || 'member')
      }

      const { data: moderationData, error: moderationError } =
        await supabase.rpc('get_my_moderation_status')

      if (cancelled) return

      if (moderationError) {
        setStatus('Could not check account status: ' + moderationError.message)
      } else {
        setSuspension(
          Array.isArray(moderationData)
            ? moderationData[0] || null
            : moderationData || null
        )
      }
    }

    loadAccountPermissions()

    return () => {
      cancelled = true
    }
  }, [session])

  // Public role labels are read through a SECURITY DEFINER RPC that exposes
  // only user IDs and role names. Do not grant broad SELECT on user_roles.
  React.useEffect(() => {
    let cancelled = false

    async function loadPublicMemberRoles() {
      if (!session || !supabase) {
        setMemberRoles({})
        return
      }

      const { data, error } = await supabase.rpc('get_public_member_roles')
      if (cancelled) return

      if (error) {
        setStatus('Could not load member role badges: ' + error.message)
        setMemberRoles({})
      } else {
        setMemberRoles(Object.fromEntries(
          (data || []).map(item => [item.user_id, item.role])
        ))
      }
    }

    loadPublicMemberRoles()
    return () => { cancelled = true }
  }, [session])

  React.useEffect(() => {
    let cancelled = false
    async function loadPublicTierRoles() {
      if (!session || !supabase) { setMemberTierRoles({}); return }
      const { data, error } = await supabase.rpc('rlm_get_public_member_tier_roles')
      if (cancelled) return
      if (error) {
        setStatus('Could not load tier badges: ' + error.message + '. Run the tier roles migration first.')
        setMemberTierRoles({})
      } else {
        const grouped = {}
        ;(data || []).forEach(row => { (grouped[row.user_id] ||= []).push(row.tier) })
        setMemberTierRoles(grouped)
      }
    }
    loadPublicTierRoles()
    return () => { cancelled = true }
  }, [session])


  React.useEffect(() => {
    let cancelled = false
    async function loadCosmetics() {
      if (!session || !supabase) { setMemberCosmetics({}); return }
      const [{ data, error }, { data: roleColors, error: colorError }, { data: displayColors, error: displayColorError }] = await Promise.all([
        supabase.rpc('rlm_get_public_member_cosmetics'),
        supabase.rpc('rlm_get_public_staff_name_colors'),
        supabase.rpc('rlm_get_public_display_name_colors')
      ])
      if (cancelled) return
      if (error) { setStatus('Could not load member cosmetics: ' + error.message); return }
      if (colorError) { setStatus('Could not load staff name colours. Run the staff name colour migration.'); }
      if (displayColorError) { setStatus('Could not load display name colours. Run the display name colour migration.'); }
      const cosmeticsByUser = Object.fromEntries((data || []).map(row => [row.user_id, row]))
      ;(roleColors || []).forEach(row => {
        cosmeticsByUser[row.user_id] = { ...(cosmeticsByUser[row.user_id] || {}), staff_name_color: row.color }
      })
      ;(displayColors || []).forEach(row => {
        cosmeticsByUser[row.user_id] = { ...(cosmeticsByUser[row.user_id] || {}), display_name_color: row.color }
      })
      setMemberCosmetics(cosmeticsByUser)
      const myDisplayColor = (displayColors || []).find(row => row.user_id === session.user.id)?.color
      if (myDisplayColor && STAFF_NAME_COLORS.includes(myDisplayColor)) setSelectedDisplayNameColor(myDisplayColor)
      const myColor = (roleColors || []).find(row => row.user_id === session.user.id)?.color
      if (myColor && STAFF_NAME_COLORS.includes(myColor)) setSelectedStaffNameColor(myColor)
    }
    loadCosmetics()
    return () => { cancelled = true }
  }, [session])

  React.useEffect(() => {
    if (!session || !supabase || section !== 'Leaderboard') return
    let cancelled = false
    async function loadXpLeaderboard() {
      setXpLeaderboardLoading(true)
      const { data, error } = await supabase.rpc('rlm_get_xp_leaderboard')
      if (!cancelled) {
        if (error) setStatus('Could not load XP leaderboard: ' + error.message)
        else setXpLeaderboard(data || [])
        setXpLeaderboardLoading(false)
      }
    }
    loadXpLeaderboard()
    const channel = supabase.channel('rlm-xp-leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_stats' }, loadXpLeaderboard)
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [session, section])

  async function refreshProgress() {
    if (!session || !supabase) { setProgressData(null); return }
    setProgressLoading(true)
    const { data, error } = await supabase.rpc('rlm_get_my_progress')
    if (error) setStatus('Could not load progression: ' + error.message)
    else setProgressData(data)
    setProgressLoading(false)
  }

  React.useEffect(() => {
    if (session && ['Home','Minigames','Quests','Coin shop','My profile'].includes(section)) refreshProgress()
    if (!session) setProgressData(null)
  }, [session, section])

  async function recordGame(gameKey) {
    if (!session || !supabase || progressBusy) return
    setProgressBusy(true)
    const [{ data, error }, { data: xpData, error: xpError }] = await Promise.all([
      supabase.rpc('rlm_record_game', { p_game_key: gameKey }),
      supabase.rpc('rlm_award_minigame_xp', { p_game_key: gameKey, p_score: 0 })
    ])
    if (error) setStatus('Game finished, but coin reward could not be saved: ' + error.message)
    else {
      setProgressData(data?.progress || null)
      setStatus(`Game recorded. You earned ${data?.coins_awarded || 0} coins${xpError ? '' : ` and ${xpData?.xp_awarded || 0} XP`}.`)
    }
    if (xpError) setStatus(previous => `${previous} XP could not be saved: ${xpError.message}`)
    setProgressBusy(false)
  }

  async function claimQuest(questId) {
    if (!supabase || progressBusy) return
    setProgressBusy(true)
    const { data, error } = await supabase.rpc('rlm_claim_quest', { p_quest_id: questId })
    if (error) setStatus('Could not claim quest: ' + error.message)
    else { setProgressData(data); setStatus('Quest reward claimed!') }
    setProgressBusy(false)
  }

  async function buyCosmetic(itemId) {
    if (!supabase || progressBusy) return
    setProgressBusy(true)
    const { data, error } = await supabase.rpc('rlm_buy_cosmetic', { p_item_id: itemId })
    if (error) setStatus('Purchase failed: ' + error.message)
    else { setProgressData(data); setStatus('Item purchased! Equip it from your collection.') }
    setProgressBusy(false)
  }

  async function equipCosmetic(itemId) {
    if (!supabase || progressBusy) return
    setProgressBusy(true)
    const { data, error } = await supabase.rpc('rlm_equip_cosmetic', { p_item_id: itemId })
    if (error) setStatus('Could not equip item: ' + error.message)
    else {
      setProgressData(data)
      const { data: cosmetics } = await supabase.rpc('rlm_get_public_member_cosmetics')
      setMemberCosmetics(Object.fromEntries((cosmetics || []).map(row => [row.user_id, row])))
      setStatus('Cosmetic equipped!')
    }
    setProgressBusy(false)
  }

  async function saveDisplayNameColor(color) {
    if (!STAFF_NAME_COLORS.includes(color) || !supabase || !session?.user?.id) return
    setSelectedDisplayNameColor(color)
    setSavingDisplayNameColor(true)
    const { error } = await supabase.rpc('rlm_set_my_display_name_color', { p_color: color })
    if (error) {
      setStatus('Could not save your display name colour: ' + error.message + '. Run the display name colour migration first.')
    } else {
      setMemberCosmetics(current => ({ ...current, [session.user.id]: { ...(current[session.user.id] || {}), display_name_color: color } }))
      setStatus('Your display name colour has been updated.')
    }
    setSavingDisplayNameColor(false)
  }

  async function saveStaffNameColor(color) {
    if (!['owner', 'co_owner', 'admin'].includes(staffRole) || !STAFF_NAME_COLORS.includes(color) || !supabase) return
    setSelectedStaffNameColor(color)
    setSavingStaffNameColor(true)
    const { error } = await supabase.rpc('rlm_set_my_staff_name_color', { p_color: color })
    if (error) {
      setStatus('Could not save your name colour: ' + error.message + '. Run the staff name colour migration first.')
    } else {
      setMemberCosmetics(current => ({ ...current, [session.user.id]: { ...(current[session.user.id] || {}), staff_name_color: color } }))
      setStatus('Your staff name colour has been updated.')
    }
    setSavingStaffNameColor(false)
  }

  async function ownerChangeRole() {
    if (staffRole !== 'owner' || !ownerRoleTarget || !supabase) return
    setStaffBusy(true)
    const { error } = await supabase.rpc('rlm_owner_set_staff_role', {
      p_target_user_id: ownerRoleTarget,
      p_role: ownerRoleChoice
    })
    if (error) setStatus('Could not update staff role: ' + error.message)
    else { setStatus(`Member role changed to ${ownerRoleChoice}.`); setOwnerRoleTarget(''); await refreshStaffData(); const { data } = await supabase.rpc('get_public_member_roles'); setMemberRoles(Object.fromEntries((data || []).map(row => [row.user_id,row.role]))) }
    setStaffBusy(false)
  }

  async function ownerSaveTierRoles() {
    if (staffRole !== 'owner' || !tierRoleTarget || !supabase) return
    setStaffBusy(true)
    const { error } = await supabase.rpc('rlm_owner_set_member_tier_roles', {
      p_target_user_id: tierRoleTarget,
      p_tiers: tierRoleChoices
    })
    if (error) setStatus('Could not update tier badges: ' + error.message)
    else {
      setMemberTierRoles(current => ({ ...current, [tierRoleTarget]: [...tierRoleChoices] }))
      setStatus('Member tier badges updated. These badges do not grant permissions.')
    }
    setStaffBusy(false)
  }

  async function ownerGrantTitle() {
    if (staffRole !== 'owner' || !titleTarget || !titleValue.trim() || !supabase) return
    setStaffBusy(true)
    const { error } = await supabase.rpc('rlm_owner_grant_title', {
      p_target_user_id: titleTarget,
      p_title: titleValue.trim()
    })
    if (error) setStatus('Could not grant title: ' + error.message)
    else { setStatus('Title granted!'); setTitleValue(''); setTitleTarget(''); const { data } = await supabase.rpc('rlm_get_public_member_cosmetics'); setMemberCosmetics(Object.fromEntries((data || []).map(row => [row.user_id,row]))) }
    setStaffBusy(false)
  }

  async function refreshDirectory() {
    if (!session || !supabase) {
      setMembers([])
      setFriendshipRows([])
      return
    }

    setLoadingMembers(true)

    const userId = session.user.id

    const [peopleResult, friendshipResult] = await Promise.all([
      supabase.from('profiles')
        .select('id, username, display_name, avatar_url, created_at')
        .order('display_name', { ascending: true }),

      supabase.from('friendships')
        .select('id, requester, addressee, status, created_at')
        .or(`requester.eq.${userId},addressee.eq.${userId}`)
    ])

    if (peopleResult.error) {
      setStatus('Could not load members: ' + peopleResult.error.message)
    } else {
      setMembers((peopleResult.data || []).filter(person => person.id !== userId))
    }

    if (friendshipResult.error) {
      setStatus('Could not load friend requests: ' + friendshipResult.error.message)
    } else {
      setFriendshipRows(friendshipResult.data || [])
    }

    setLoadingMembers(false)
  }

  React.useEffect(() => {
    if (session && ['Leaderboard', 'Friends', 'Minigames', 'Clan Chat'].includes(section)) {
      refreshDirectory()
    }

    if (!session) {
      setMembers([])
      setFriendshipRows([])
    }
  }, [session, section])

  function relationshipWith(memberId) {
    if (!session) return null

    return friendshipRows.find(row =>
      (row.requester === session.user.id && row.addressee === memberId) ||
      (row.requester === memberId && row.addressee === session.user.id)
    ) || null
  }

  function isAcceptedFriend(memberId) {
    return relationshipWith(memberId)?.status === 'accepted'
  }

  async function sendFriendRequest(member) {
    if (!session || !supabase) return

    const existing = relationshipWith(member.id)

    if (existing) {
      setStatus('There is already a friend request or friendship with this member.')
      return
    }

    setFriendshipBusy(member.id)
    setStatus('Sending friend request...')

    const { error } = await supabase.from('friendships').insert({
      requester: session.user.id,
      addressee: member.id,
      status: 'pending'
    })

    if (error) {
      setStatus('Could not send friend request: ' + error.message)
    } else {
      setStatus('Friend request sent to ' + (member.display_name || member.username || 'member') + '.')
    }

    await refreshDirectory()
    setFriendshipBusy('')
  }

  async function acceptFriendRequest(row) {
    if (!session || !supabase) return

    setFriendshipBusy(row.id)
    setStatus('Accepting friend request...')

    const { error } = await supabase.from('friendships')
      .update({ status: 'accepted' })
      .eq('id', row.id)
      .eq('addressee', session.user.id)

    if (error) {
      setStatus('Could not accept request: ' + error.message)
    } else {
      setStatus('Friend request accepted. You can now message each other.')
    }

    await refreshDirectory()
    setFriendshipBusy('')
  }

  async function declineFriendRequest(row) {
    if (!session || !supabase) return

    setFriendshipBusy(row.id)
    setStatus('Declining friend request...')

    const { error } = await supabase.from('friendships')
      .delete()
      .eq('id', row.id)
      .eq('addressee', session.user.id)
      .eq('status', 'pending')

    if (error) {
      setStatus('Could not decline request: ' + error.message)
    } else {
      setStatus('Friend request declined.')
    }

    await refreshDirectory()
    setFriendshipBusy('')
  }

  // Load accepted friends for the Messages page.
  React.useEffect(() => {
    if (!session || !supabase) {
      setFriends([])
      return
    }

    async function loadFriends() {
      const userId = session.user.id

      const { data, error } = await supabase.from('friendships')
        .select('requester, addressee')
        .eq('status', 'accepted')
        .or(`requester.eq.${userId},addressee.eq.${userId}`)

      if (error) {
        setStatus(error.message)
        return
      }

      const friendIds = (data || []).map(row =>
        row.requester === userId ? row.addressee : row.requester
      )

      if (!friendIds.length) {
        setFriends([])
        return
      }

      const { data: profiles, error: profileError } = await supabase.from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', friendIds)

      if (profileError) {
        setStatus(profileError.message)
      } else {
        setFriends(profiles || [])
      }
    }

    loadFriends()
  }, [session, section, friendshipRows])

  // Load saved private conversations.
  React.useEffect(() => {
    if (!session || !supabase) {
      setConversations([])
      return
    }

    let cancelled = false

    async function loadConversations() {
      const userId = session.user.id

      const { data: memberships, error } = await supabase.from('conversation_members')
        .select('conversation_id')
        .eq('user_id', userId)

      if (error) {
        setStatus(error.message)
        return
      }

      const ids = [...new Set((memberships || []).map(item => item.conversation_id))]

      if (!ids.length) {
        if (!cancelled) setConversations([])
        return
      }

      const { data: otherMembers, error: memberError } = await supabase.from('conversation_members')
        .select('conversation_id, user_id')
        .in('conversation_id', ids)
        .neq('user_id', userId)

      if (memberError) {
        setStatus(memberError.message)
        return
      }

      const otherIds = [...new Set((otherMembers || []).map(item => item.user_id))]

      if (!otherIds.length) {
        if (!cancelled) setConversations([])
        return
      }

      const { data: people, error: peopleError } = await supabase.from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', otherIds)

      if (peopleError) {
        setStatus(peopleError.message)
        return
      }

      const profileMap = Object.fromEntries(
        (people || []).map(person => [person.id, person])
      )

      const result = (otherMembers || []).map(member => ({
        conversationId: member.conversation_id,
        friend: profileMap[member.user_id] || {
          id: member.user_id,
          display_name: '尺ḼⱮ member',
          username: '',
          avatar_url: null
        }
      }))

      if (!cancelled) setConversations(result)
    }

    loadConversations()

    return () => {
      cancelled = true
    }
  }, [session])

  // Load shared clan chat and subscribe to new messages.
  React.useEffect(() => {
    if (!session || !supabase || section !== 'Clan Chat') {
      setClanMessages([])
      return
    }

    let cancelled = false

    async function loadClanMessages() {
      setLoadingClanChat(true)

      const { data, error } = await supabase.from('clan_chat_messages')
        .select('id, sender_id, body, image_url, created_at')
        .order('created_at', { ascending: false })
        .limit(100)

      if (cancelled) return

      if (error) {
        setStatus('Could not load clan chat: ' + error.message)
        setLoadingClanChat(false)
        return
      }

      const rows = data || []
      const userIds = [...new Set(rows.map(item => item.sender_id))]
      let profileMap = {}

      if (userIds.length) {
        const { data: people, error: peopleError } = await supabase.from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', userIds)

        if (peopleError) {
          setStatus('Could not load chat names: ' + peopleError.message)
        } else {
          profileMap = Object.fromEntries(
            (people || []).map(person => [person.id, person])
          )
        }
      }

      if (!cancelled) {
        setClanMessages(
          rows.reverse().map(item => ({
            ...item,
            sender: profileMap[item.sender_id] || null
          }))
        )
        setLoadingClanChat(false)
      }
    }

    loadClanMessages()

    const channel = supabase.channel('rlm-public-clan-chat')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clan_chat_messages' },
        () => loadClanMessages()
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [session, section])

  async function sendClanMessage(e) {
    e.preventDefault()
    const body = clanMessageText.trim()
    if ((!body && !clanImageFile) || !session || !supabase) return
    if (body.length > 1000) return setStatus('Clan chat messages must be 1000 characters or fewer.')

    setSendingClanMessage(true)
    setStatus('')
    try {
      let image_url = null
      if (clanImageFile) {
        if (!clanImageFile.type.startsWith('image/')) throw new Error('Choose an image file.')
        if (clanImageFile.size > 5 * 1024 * 1024) throw new Error('Images must be 5 MB or smaller.')
        setUploadingClanImage(true)
        const extension = (clanImageFile.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
        const path = `${session.user.id}/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage.from('clan-chat-images').upload(path, clanImageFile, { contentType: clanImageFile.type, upsert: false })
        if (uploadError) throw uploadError
        const { data: publicData } = supabase.storage.from('clan-chat-images').getPublicUrl(path)
        image_url = publicData?.publicUrl || null
        if (!image_url) throw new Error('Could not create an image URL.')
      }
      const { error } = await supabase.from('clan_chat_messages').insert({ sender_id: session.user.id, body: body || '', image_url })
      if (error) throw error
      setClanMessageText('')
      setClanImageFile(null)
      const picker = document.getElementById('clan-image-picker')
      if (picker) picker.value = ''
    } catch (error) {
      setStatus('Message could not be sent: ' + (error?.message || 'Unknown error'))
    } finally {
      setUploadingClanImage(false)
      setSendingClanMessage(false)
    }
  }

  async function deleteClanMessage(message) {
    if (!canDeleteChatMessages || !supabase || !message?.id) return
    if (!window.confirm('Delete this clan chat message?')) return
    const { error } = await supabase.from('clan_chat_messages').delete().eq('id', message.id)
    if (error) setStatus('Could not delete message: ' + error.message)
    else {
      setClanMessages(current => current.filter(item => item.id !== message.id))
      setStatus('Message deleted.')
    }
  }

  // Load private messages and subscribe to inserts.
  React.useEffect(() => {
    if (!session || !supabase || !selectedConversation) {
      setMessages([])
      return
    }

    let cancelled = false

    async function loadMessages() {
      setLoadingMessages(true)

      const { data, error } = await supabase.from('messages')
        .select('id, conversation_id, sender_id, body, created_at')
        .eq('conversation_id', selectedConversation)
        .order('created_at', { ascending: true })

      if (cancelled) return

      if (error) {
        setStatus(error.message)
      } else {
        setMessages(data || [])
      }

      setLoadingMessages(false)
    }

    loadMessages()

    const channel = supabase.channel(`messages-${selectedConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation}`
        },
        payload => {
          setMessages(previous =>
            previous.some(item => item.id === payload.new.id)
              ? previous
              : [...previous, payload.new]
          )
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [session, selectedConversation])

  // Load staff data through protected database functions.
  async function refreshStaffData() {
    if (!session || !supabase || !isStaff) return

    setStaffLoading(true)

    const [membersResult, actionsResult, ownerDirectoryResult] = await Promise.all([
      supabase.rpc('get_staff_members'),
      supabase.rpc('get_active_moderation_actions'),
      staffRole === 'owner' ? supabase.rpc('rlm_owner_list_members') : Promise.resolve({ data: [], error: null })
    ])

    if (membersResult.error) {
      setStatus('Could not load staff directory: ' + membersResult.error.message)
    } else {
      setStaffMembers(membersResult.data || [])
    }

    if (actionsResult.error) {
      setStatus('Could not load moderation actions: ' + actionsResult.error.message)
    } else {
      setModerationActions(actionsResult.data || [])
    }
    if (ownerDirectoryResult.error) setStatus('Could not load owner member list: ' + ownerDirectoryResult.error.message)
    else setOwnerDirectory(ownerDirectoryResult.data || [])

    setStaffLoading(false)
  }

  React.useEffect(() => {
    if (section === 'Staff Control Panel' && isStaff) {
      refreshStaffData()
    }
  }, [section, isStaff])

  async function grantMemberCoins() {
    if (!session || !supabase || !['owner', 'admin'].includes(staffRole)) return
    const amount = Number(coinGrantAmount)
    if (!coinGrantTarget || !Number.isSafeInteger(amount) || amount < 1 || amount > 10000) {
      setStatus('Choose a member and a whole-number amount from 1 to 10,000.')
      return
    }
    setStaffBusy(true)
    const { error } = await supabase.rpc('rlm_staff_grant_coins', {
      p_target_user_id: coinGrantTarget,
      p_amount: amount,
      p_reason: coinGrantReason.trim().slice(0, 200)
    })
    setStaffBusy(false)
    if (error) setStatus('Could not grant coins: ' + error.message)
    else {
      setStatus(`Granted ${amount} coins.`)
      setCoinGrantReason('')
    }
  }

  async function deleteMemberAccount() {
    if (!session || !supabase || !canDeleteAccounts || !deleteTarget) return
    const target = (staffRole === 'owner' ? ownerDirectory : members.map(member => ({ ...member, user_id: member.id, role: memberRoles[member.id] || 'member' })).concat(ownerDirectory)).find(member => (member.user_id || member.id) === deleteTarget)
    if (!target || target.role === 'owner' || (staffRole === 'co_owner' && target.role === 'co_owner') || deleteTarget === session.user.id) {
      setStatus('That account cannot be selected for deletion.')
      return
    }
    if (deleteConfirm !== 'DELETE') {
      setStatus('Type DELETE exactly to confirm this action.')
      return
    }

    setStaffBusy(true)
    setStatus('Requesting account deletion from the secure server function...')
    try {
      const { data: authData, error: authError } = await supabase.auth.getSession()
      if (authError || !authData?.session?.access_token) {
        throw new Error(authError?.message || 'Your session has expired. Sign in again.')
      }
      const { data, error } = await supabase.functions.invoke('owner-delete-user', {
        body: { user_id: deleteTarget },
        headers: { Authorization: `Bearer ${authData.session.access_token}` }
      })
      if (error) throw new Error(error.message || 'The account deletion function returned an error.')
      if (data?.error) throw new Error(data.error)

      setOwnerDirectory(current => current.filter(member => (member.user_id || member.id) !== deleteTarget))
      setMembers(current => current.filter(member => member.id !== deleteTarget))
      setStaffMembers(current => current.filter(member => (member.user_id || member.id) !== deleteTarget))
      setDeleteTarget('')
      setDeleteConfirm('')
      setShowDeleteConfirm(false)
      setStatus('The deletion function completed successfully. The selected member has been removed from the staff directory.')
      await refreshStaffData()
    } catch (error) {
      setStatus(`Account deletion failed: ${error?.message || 'Unknown error'}. Check that the owner-delete-user Edge Function is deployed and its server-side role checks are configured.`)
    } finally {
      setStaffBusy(false)
    }
  }

  async function applyStaffAction(e) {
    e.preventDefault()

    if (!session || !supabase || !isStaff) return

    if (!staffTarget) {
      setStatus('Choose a member first.')
      return
    }

    if (staffAction === 'timeout' && Number(timeoutMinutes) < 1) {
      setStatus('Choose a valid timeout duration.')
      return
    }

    if (staffReason.trim().length > 500) {
      setStatus('The reason must be 500 characters or fewer.')
      return
    }

    setStaffBusy(true)
    setStatus('Applying moderation action...')

    const { error } = await supabase.rpc('staff_apply_action', {
      p_target_user_id: staffTarget,
      p_action: staffAction,
      p_reason: staffReason.trim(),
      p_duration_minutes: staffAction === 'timeout'
        ? Number(timeoutMinutes)
        : null
    })

    if (error) {
      setStatus('Could not apply action: ' + error.message)
    } else {
      setStatus(staffAction === 'ban' ? 'Ban applied.' : 'Timeout applied.')
      setStaffTarget('')
      setStaffReason('')
      await refreshStaffData()
    }

    setStaffBusy(false)
  }

  async function liftStaffAction(actionId) {
    if (!session || !supabase || !isStaff) return

    setStaffBusy(true)
    setStatus('Lifting moderation action...')

    const { error } = await supabase.rpc('staff_lift_action', {
      p_action_id: actionId
    })

    if (error) {
      setStatus('Could not lift action: ' + error.message)
    } else {
      setStatus('Moderation action lifted.')
      await refreshStaffData()
    }

    setStaffBusy(false)
  }

  const filteredStaffMembers = staffMembers.filter(member => {
    const search = staffSearch.trim().toLowerCase()

    if (!search) return true

    return (
      (member.username || '').toLowerCase().includes(search) ||
      (member.display_name || '').toLowerCase().includes(search)
    )
  })

  async function signUp(e) {
    e.preventDefault()

    setStatus('Creating account...')

    if (!supabase) {
      return setStatus('Supabase is not connected.')
    }

    const cleanDisplayName = signupDisplayName.trim()
    const cleanUsername = signupUsername.trim().toLowerCase()

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      return setStatus('Choose a username of 3–20 characters using only letters, numbers, and underscores.')
    }

    if (!cleanDisplayName || cleanDisplayName.length > 24) {
      return setStatus('Choose a display name between 1 and 24 characters.')
    }

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: cleanDisplayName, username: cleanUsername }
      }
    })

    if (error) {
      setStatus(error.message)
    } else if (data?.session && data.user) {
      const { error: profileError } = await supabase.from('profiles')
        .upsert({
          id: data.user.id,
          display_name: cleanDisplayName,
          username: cleanUsername
        }, {
          onConflict: 'id'
        })

      setStatus(
        profileError
          ? 'Account created, but the profile could not be saved: ' + profileError.message
          : 'Account created! Welcome to 尺ḼⱮ.'
      )
    } else {
      setStatus('Account created. If email confirmation is enabled in Supabase, you will still need to confirm your email.')
    }
  }

  async function signIn(e) {
    e.preventDefault()

    setStatus('Signing in...')

    if (!supabase) {
      return setStatus('Supabase is not connected.')
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    setStatus(error ? error.message : 'Signed in!')
  }

  async function signOut() {
    await supabase?.auth.signOut()

    setStatus('Signed out.')
    setSection('Home')
    setSelectedConversation(null)
    setMessages([])
    setConversations([])
    setStaffRole('member')
    setSuspension(null)
  }

  async function saveMyUsername() {
    const cleanUsername = myUsernameValue.trim().toLowerCase()
    if (!session || !supabase || !/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setStatus('Choose a username of 3–20 characters using only letters, numbers, and underscores.')
      return
    }
    setStaffBusy(true)
    const { error } = await supabase.rpc('rlm_set_my_username', { p_username: cleanUsername })
    if (error) {
      setStatus('Could not save username: ' + error.message)
    } else {
      setProfile(current => ({ ...(current || {}), username: cleanUsername }))
      setStatus('Your username has been updated.')
      await refreshDirectory()
      await refreshStaffData()
    }
    setStaffBusy(false)
  }

  async function ownerSetUsername() {
    const cleanUsername = ownerUsernameValue.trim().toLowerCase()
    if (!ownerUsernameTarget || !/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setStatus('Choose a username of 3–20 characters using only letters, numbers, and underscores.')
      return
    }
    setStaffBusy(true)
    const { error } = await supabase.rpc('rlm_owner_set_member_username', {
      p_user_id: ownerUsernameTarget,
      p_username: cleanUsername
    })
    if (error) {
      setStatus('Could not change username: ' + error.message)
    } else {
      setStatus('Member username updated.')
      setOwnerUsernameTarget('')
      setOwnerUsernameValue('')
      await refreshStaffData()
      await refreshDirectory()
    }
    setStaffBusy(false)
  }

  async function saveDisplayName() {
    const cleanName = newDisplayName.trim()

    if (!session || !supabase) {
      return setStatus('Please sign in first.')
    }

    if (!cleanName || cleanName.length > 24) {
      return setStatus('Enter a name between 1 and 24 characters.')
    }

    setSavingName(true)
    setStatus('Saving your name...')

    const { data, error } = await supabase.from('profiles')
      .update({ display_name: cleanName })
      .eq('id', session.user.id)
      .select()
      .maybeSingle()

    if (error) {
      setStatus('Could not save your name: ' + error.message)
    } else if (!data) {
      setStatus('Your profile could not be found.')
    } else {
      setProfile(data)
      setStatus('Your name has been updated!')
    }

    setSavingName(false)
  }

  async function uploadAvatar(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !session || !supabase) return

    if (!file.type.startsWith('image/')) {
      return setStatus('Please choose an image file.')
    }

    if (file.size > 3 * 1024 * 1024) {
      return setStatus('Please choose an image smaller than 3 MB.')
    }

    setUploadingAvatar(true)
    setStatus('Uploading profile picture...')

    const extension = (file.name.split('.').pop() || 'jpg')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')

    const filePath = `${session.user.id}/${Date.now()}.${extension || 'jpg'}`

    const { error: uploadError } = await supabase.storage.from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      })

    if (uploadError) {
      setStatus('Could not upload picture: ' + uploadError.message)
      setUploadingAvatar(false)
      return
    }

    const { data: publicData } = supabase.storage.from('avatars')
      .getPublicUrl(filePath)

    const avatarUrl = publicData.publicUrl

    const { data, error } = await supabase.from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', session.user.id)
      .select('username, display_name, avatar_url, created_at')
      .maybeSingle()

    if (error) {
      setStatus('Picture uploaded, but profile could not be updated: ' + error.message)
    } else if (!data) {
      setStatus('Picture uploaded, but your profile could not be found.')
    } else {
      setProfile(data)
      setStatus('Profile picture updated!')
    }

    setUploadingAvatar(false)
  }

  async function startConversation(friend) {
    if (!supabase || !session) return
    if (friend.id === session.user.id) return

    setStatus('Opening conversation...')

    const { data, error } = await supabase.rpc(
      'start_private_conversation',
      { other_user_id: friend.id }
    )

    if (error) {
      setStatus('Could not open conversation: ' + error.message)
      return
    }

    setSelectedConversation(data)
    setSelectedName(friend.display_name || friend.username || '尺ḼⱮ member')
    setMessageText('')

    setConversations(previous => {
      const withoutDuplicate = previous.filter(
        item => item.conversationId !== data
      )

      return [
        ...withoutDuplicate,
        { conversationId: data, friend }
      ]
    })

    setStatus('')
    setSection('Messages')
  }

  async function sendMessage(e) {
    e.preventDefault()

    const body = messageText.trim()

    if (!body || !selectedConversation || !session || !supabase) return

    if (body.length > 2000) {
      return setStatus('Messages must be 2000 characters or fewer.')
    }

    setSendingMessage(true)
    setStatus('')

    const { data, error } = await supabase.from('messages')
      .insert({
        conversation_id: selectedConversation,
        sender_id: session.user.id,
        body
      })
      .select()
      .single()

    if (error) {
      setStatus('Message could not be sent: ' + error.message)
    } else {
      setMessageText('')

      setMessages(previous =>
        previous.some(item => item.id === data.id)
          ? previous
          : [...previous, data]
      )
    }

    setSendingMessage(false)
  }

  function displayName(person) {
    return person?.display_name || person?.username || '尺ḼⱮ member'
  }

  function memberFriendControls(member) {
    const relation = relationshipWith(member.id)
    const busy = friendshipBusy === member.id || friendshipBusy === relation?.id

    if (!session) {
      return <span className="muted">Sign in to connect</span>
    }

    if (relation?.status === 'accepted') return null

    if (relation?.status === 'pending' && relation.requester === session.user.id) {
      return <button className="secondary" disabled>Request sent</button>
    }

    if (relation?.status === 'pending' && relation.addressee === session.user.id) {
      return (
        <div className="actions">
          <button
            className="primary"
            disabled={busy}
            onClick={() => acceptFriendRequest(relation)}
          >
            Accept
          </button>

          <button
            className="secondary"
            disabled={busy}
            onClick={() => declineFriendRequest(relation)}
          >
            Decline
          </button>
        </div>
      )
    }

    if (relation?.status === 'blocked') {
      return <button className="secondary" disabled>Unavailable</button>
    }

    return (
      <button
        className="primary"
        disabled={busy}
        onClick={() => sendFriendRequest(member)}
      >
        {busy ? 'Sending...' : '＋ Add friend'}
      </button>
    )
  }

  function Page() {
    // Display the restriction page for accounts with active moderation actions.
    if (suspension) {
      return (
        <div className="panel">
          <h2>Account restricted</h2>
          <p>Your 尺ḼⱮ account currently has an active {suspension.action_type}.</p>
          <p>
            <strong>Reason:</strong>{' '}
            {suspension.reason || 'No reason provided'}
          </p>

          {suspension.expires_at && (
            <p>
              <strong>Expires:</strong>{' '}
              {new Date(suspension.expires_at).toLocaleString()}
            </p>
          )}

          <p className="muted">
            If you think this restriction was applied by mistake, contact 尺ḼⱮ staff.
          </p>

          <button className="secondary" onClick={signOut}>
            Sign out
          </button>
        </div>
      )
    }

    if (section === 'Home') {
      return (
        <>
          <section className="hero">
            <div className="eyebrow">WELCOME TO THE CLAN</div>
            <h1>尺ḼⱮ<br />SHELL SHOCKERS CLAN</h1>
            <p>
              The home of the 尺ḼⱮ Shell Shockers clan. Connect with clan members,
              chat with friends, compete, and represent 尺ḼⱮ.
            </p>
          </section>

          {!session ? (
            <div className="panel auth">
              <h2>Create an account or sign in</h2>
              <p className="muted">Join the 尺ḼⱮ community.</p>

              <form onSubmit={signIn}>
                <label>
                  Username (required for new accounts)
                  <input
                    type="text"
                    maxLength="20"
                    minLength="3"
                    placeholder="e.g. player_one"
                    value={signupUsername}
                    onChange={e => setSignupUsername(e.target.value)}
                    autoComplete="username"
                  />
                  <small className="muted">3–20 characters: letters, numbers, and underscores. Choose this when creating your account.</small>
                </label>

                <label>
                  Display name (for new accounts)
                  <input
                    type="text"
                    maxLength="24"
                    placeholder="Your 尺ḼⱮ name"
                    value={signupDisplayName}
                    onChange={e => setSignupDisplayName(e.target.value)}
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </label>

                <label>
                  Password
                  <input
                    type="password"
                    minLength="8"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </label>

                <div className="actions">
                  <button className="primary">Sign in</button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={signUp}
                  >
                    Create account
                  </button>
                </div>
              </form>

              <p className="status">{status}</p>
            </div>
          ) : (
            <div className="panel">
              <h2>
                Welcome back, {profile?.display_name || session.user.email}!
              </h2>
              <p className="muted">Your 尺ḼⱮ account is connected.</p>
              <button className="secondary" onClick={signOut}>Sign out</button>
              <p className="status">{status}</p>
            </div>
          )}

          <div className="grid">
            <div className="panel">
              <h3>✉ Messages</h3>
              <p className="muted">Chat with your 尺ḼⱮ friends.</p>
              <button
                className="secondary"
                onClick={() => setSection('Messages')}
              >
                Open messages
              </button>
            </div>

            <div className="panel">
              <h3>🎮 Minigames</h3>
              <p className="muted">Your gaming area.</p>
            </div>

            <div className="panel">
              <h3>🏆 Progression</h3>
              <p className="muted">Your 尺ḼⱮ journey.</p>
            </div>
          </div>
        </>
      )
    }

    if (section === 'Messages') {
      if (!session) {
        return (
          <div className="panel">
            <h2>✉ Messages</h2>
            <p>Please sign in to use messages.</p>
          </div>
        )
      }

      const selectedFriend = conversations.find(
        c => c.conversationId === selectedConversation
      )?.friend

      return (
        <div className="chat-page">
          <div className="chat-heading">
            <div>
              <h2>✉ 尺ḼⱮ Messages</h2>
              <p className="muted">Your private conversations</p>
            </div>
          </div>

          <div className="chat-layout">
            <aside className="chat-conversation-list">
              <div className="chat-section-label">DIRECT MESSAGES</div>

              {conversations.length === 0 ? (
                <p className="muted chat-empty-list">
                  No conversations yet. Open a member's message icon on the
                  Leaderboard to start one.
                </p>
              ) : (
                conversations.map(conversation => (
                  <button
                    key={conversation.conversationId}
                    className={`chat-conversation-button${selectedConversation === conversation.conversationId ? ' active' : ''}`}
                    onClick={() => {
                      setSelectedConversation(conversation.conversationId)
                      setSelectedName(displayName(conversation.friend))
                    }}
                  >
                    <ChatAvatar person={conversation.friend} presenceStatus={presenceStatus(conversation.friend?.id)} />
                    <span className="chat-conversation-name">
                      <ProfileHover supabase={supabase} person={conversation.friend} role={memberRoles[conversation.friend.id]} tierRoles={memberTierRoles[conversation.friend.id]} cosmetics={memberCosmetics[conversation.friend.id]} />
                    </span>
                  </button>
                ))
              )}
            </aside>

            <section className="chat-main">
              {selectedConversation ? (
                <>
                  <div className="chat-topbar">
                    <ChatAvatar person={selectedFriend} />
                    <div>
                      <strong>
                        <ProfileHover supabase={supabase} person={selectedFriend} role={memberRoles[selectedFriend?.id]} tierRoles={memberTierRoles[selectedFriend?.id]} cosmetics={memberCosmetics[selectedFriend?.id]} />
                      </strong>
                      <small>Private conversation</small>
                    </div>
                  </div>

                  <div className="chat-messages">
                    {loadingMessages ? (
                      <p className="muted chat-placeholder">Loading messages...</p>
                    ) : messages.length === 0 ? (
                      <div className="chat-placeholder">
                        <strong>This is the beginning of your conversation.</strong>
                        <span>Send a message to say hello!</span>
                      </div>
                    ) : (
                      messages.map(message => {
                        const isOwn = message.sender_id === session.user.id
                        const senderProfile = isOwn ? profile : selectedFriend

                        return (
                          <div
                            key={message.id}
                            className={`chat-message-row${isOwn ? ' own' : ' incoming'}`}
                          >
                            <ChatAvatar
                              person={senderProfile}
                              className="chat-message-avatar"
                              presenceStatus={presenceStatus(senderProfile?.id)}
                            />

                            <div className="chat-message-content">
                              <div className="chat-message-meta">
                                <strong>
                                  {isOwn ? (
                                    <ProfileHover supabase={supabase} person={{ id: session.user.id, display_name: profile?.display_name || 'You' }} role={memberRoles[session.user.id] || staffRole} cosmetics={memberCosmetics[session.user.id]} />
                                  ) : (
                                    <ProfileHover supabase={supabase} person={selectedFriend} role={memberRoles[selectedFriend?.id]} tierRoles={memberTierRoles[selectedFriend?.id]} cosmetics={memberCosmetics[selectedFriend?.id]} />
                                  )}
                                </strong>
                                <small>
                                  {new Date(message.created_at).toLocaleTimeString(
                                    [],
                                    { hour: '2-digit', minute: '2-digit' }
                                  )}
                                </small>
                              </div>

                              <div className="chat-message-bubble">
                                {message.body}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <form className="chat-composer" onSubmit={sendMessage}>
                    <input
                      aria-label="Write a private message"
                      maxLength="2000"
                      placeholder={`Message @${selectedName}...`}
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                    />

                    <button
                      className="chat-send-button"
                      type="submit"
                      disabled={sendingMessage || !messageText.trim()}
                      aria-label="Send message"
                      title="Send message"
                    >
                      {sendingMessage ? '…' : '➤'}
                    </button>
                  </form>
                </>
              ) : (
                <div className="chat-placeholder chat-no-selection">
                  <strong>Select a conversation</strong>
                  <span>
                    Choose a direct message on the left, or start one from the Leaderboard.
                  </span>
                </div>
              )}
            </section>
          </div>

          <p className="status">{status}</p>
        </div>
      )
    }

    if (section === 'Clan Chat') {
      if (!session) {
        return (
          <div className="panel">
            <h2>💬 尺ḼⱮ Clan Chat</h2>
            <p>Please sign in to join the clan chat.</p>
          </div>
        )
      }

      return (
        <div className="chat-page">
          <div className="chat-heading">
            <div>
              <h2>💬 尺ḼⱮ Clan Chat</h2>
              <p className="muted">The shared chat for 尺ḼⱮ members</p>
            </div>

            <span className="chat-online-label">● Clan channel</span>
          </div>

          <section className="clan-presence-panel" aria-label="Clan member presence">
            <div className="clan-presence-heading">
              <strong>Members online</strong>
              <span>{Object.values(presenceByUser).filter(item => item.status === 'online').length} online</span>
            </div>
            <div className="clan-presence-list">
              {[...members, ...(session?.user?.id ? [{ id: session.user.id, display_name: profile?.display_name || session.user.email }] : [])]
                .sort((a, b) => (a.display_name || a.username || '').localeCompare(b.display_name || b.username || ''))
                .map(person => {
                  const state = presenceStatus(person.id)
                  return (
                    <span className="clan-presence-member" key={person.id}>
                      <span className={`presence-dot ${state}`} />
                      {person.display_name || person.username || 'Clan member'}
                      <small>{state === 'online' ? 'Online' : state === 'away' ? 'Away' : 'Offline'}</small>
                    </span>
                  )
                })}
            </div>
          </section>

          <section className="chat-main clan-chat-main">
            <div className="chat-topbar">
              <span className="chat-channel-icon">#</span>
              <div>
                <strong>general</strong>
                <small>Everyone signed in can join the conversation</small>
              </div>
            </div>

            <div className="chat-messages clan-chat-messages">
              {loadingClanChat ? (
                <p className="muted chat-placeholder">Loading clan chat...</p>
              ) : clanMessages.length === 0 ? (
                <div className="chat-placeholder">
                  <strong>Welcome to the 尺ḼⱮ clan chat!</strong>
                  <span>Be the first to send a message.</span>
                </div>
              ) : (
                clanMessages.map(message => (
                  <div key={message.id} className="clan-message-row">
                    <ChatAvatar person={message.sender} presenceStatus={presenceStatus(message.sender?.id)} />

                    <div className="clan-message-content">
                      <div className="chat-message-meta">
                        <strong><ProfileHover supabase={supabase} person={message.sender} role={memberRoles[message.sender?.id]} tierRoles={memberTierRoles[message.sender?.id]} cosmetics={memberCosmetics[message.sender?.id]} /></strong>
                        <small>
                          {new Date(message.created_at).toLocaleString(
                            [],
                            {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }
                          )}
                        </small>
                      </div>

                      {message.body && <div className="clan-message-body">{message.body}</div>}
                      {message.image_url && <a className="clan-chat-image-link" href={message.image_url} target="_blank" rel="noreferrer"><img className="clan-chat-image" src={message.image_url} alt="Image shared in clan chat" loading="lazy" /></a>}
                    </div>
                    {canDeleteChatMessages && <button type="button" className="chat-delete-message" title="Delete message" aria-label="Delete message" onClick={() => deleteClanMessage(message)}>Delete</button>}
                  </div>
                ))
              )}
            </div>

            <form className="chat-composer" onSubmit={sendClanMessage}>
              <label className="chat-image-picker" htmlFor="clan-image-picker" title="Attach an image">＋ Image</label>
              <input id="clan-image-picker" className="visually-hidden-file" type="file" accept="image/*" onChange={e => setClanImageFile(e.target.files?.[0] || null)} />
              {clanImageFile && <span className="chat-image-selected">{clanImageFile.name} <button type="button" onClick={() => { setClanImageFile(null); const el=document.getElementById('clan-image-picker'); if(el) el.value='' }}>×</button></span>}
              <input
                aria-label="Message the 尺ḼⱮ clan"
                maxLength="1000"
                placeholder="Message #general..."
                value={clanMessageText}
                onChange={e => setClanMessageText(e.target.value)}
              />

              <button
                className="chat-send-button"
                type="submit"
                disabled={sendingClanMessage || uploadingClanImage || (!clanMessageText.trim() && !clanImageFile)}
                aria-label="Send to clan"
                title="Send to clan"
              >
                {sendingClanMessage ? '…' : '➤'}
              </button>
            </form>
          </section>

          <p className="status">{status}</p>
        </div>
      )
    }

    if (section === 'Friends') {
      if (!session) {
        return (
          <div className="panel">
            <h2>♙ Friends</h2>
            <p>Please sign in to view friends and requests.</p>
          </div>
        )
      }

      const accepted = friends
      const incoming = friendshipRows.filter(
        row => row.status === 'pending' && row.addressee === session.user.id
      )

      return (
        <div className="panel">
          <h2>♙ Friends</h2>
          <p className="muted">
            Manage your friend requests and chat with accepted friends.
          </p>

          <h3>Incoming requests ({incoming.length})</h3>

          {incoming.length === 0 ? (
            <p className="muted">No incoming friend requests.</p>
          ) : (
            incoming.map(row => {
              const sender = members.find(person => person.id === row.requester)

              return (
                <div className="panel" key={row.id}>
                  <strong>
                    <MemberName person={sender} role={memberRoles[row.requester]} tierRoles={memberTierRoles[row.requester]} />
                  </strong>

                  <div className="actions" style={{ marginTop: '10px' }}>
                    <button
                      className="primary"
                      disabled={friendshipBusy === row.id}
                      onClick={() => acceptFriendRequest(row)}
                    >
                      Accept
                    </button>

                    <button
                      className="secondary"
                      disabled={friendshipBusy === row.id}
                      onClick={() => declineFriendRequest(row)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )
            })
          )}

          <h3>Your friends ({accepted.length})</h3>

          {accepted.length === 0 ? (
            <p className="muted">
              No accepted friends yet. Visit the Leaderboard to find members.
            </p>
          ) : (
            accepted.map(friend => (
              <div className="panel" key={friend.id}>
                <strong>
                  <MemberName person={friend} role={memberRoles[friend.id]} tierRoles={memberTierRoles[friend.id]} />
                </strong>

                <button
                  className="secondary"
                  style={{ marginLeft: '12px' }}
                  onClick={() => startConversation(friend)}
                >
                  ✉ Message
                </button>
              </div>
            ))
          )}

          <p className="status">{status}</p>
        </div>
      )
    }

    if (section === 'Minigames') {
      if (!session) return <div className="panel"><h2>🎮 Minigames</h2><p>Please sign in to play and save progress.</p></div>
      return (
        <div className="panel">
          <h2>🎮 Minigames</h2>
          <p className="muted">Play casual games, earn a small coin reward, and make progress on daily quests.</p>
          <div className="progress-summary"><strong>🪙 {progressData?.stats?.coins ?? 100} coins</strong><span>🎮 {progressData?.stats?.games_played ?? 0} games played</span><span>🏆 {progressData?.stats?.games_won ?? 0} wins</span></div>
          <MiniGames onRecordGame={recordGame} />
          <ExtendedGames supabase={supabase} session={session} members={members} staffRole={staffRole} onProgress={refreshProgress} />
          <p className="status">{status}</p>
          <p className="muted small-note">Game rewards have a short cooldown and a daily limit. These are casual rewards, not competitive anti-cheat scores.</p>
        </div>
      )
    }

    if (section === 'Leaderboard') {
      if (!session) {
        return (
          <div className="panel">
            <h2>🏆 尺ḼⱮ Members</h2>
            <p>
              Please sign in to view the member directory and connect with other members.
            </p>
          </div>
        )
      }

      const incoming = friendshipRows.filter(
        row => row.status === 'pending' && row.addressee === session.user.id
      )

      return (
        <div className="panel">
          <h2>🏆 尺ḼⱮ Members</h2>
          <p className="muted">
            Find clan members, send friend requests, and start private chats after a request is accepted.
          </p>

          <div className="panel xp-leaderboard-panel">
            <div className="xp-leaderboard-heading"><div><span className="arena-kicker">尺ḼⱮ GLOBAL RANKINGS</span><h3>🏆 XP Leaderboard</h3><p className="muted">Players are ranked by level first, then total XP.</p></div><span className="xp-cap">LEVEL CAP · 100</span></div>
            {xpLeaderboardLoading ? <p className="muted">Loading rankings…</p> : xpLeaderboard.length === 0 ? <p className="muted">No rankings yet. Play a game to earn the first XP.</p> : <div className="xp-leaderboard-list">{xpLeaderboard.map(row => {
              const isYou = row.user_id === session.user.id
              return <div key={row.user_id} className={`xp-leaderboard-row ${isYou ? 'is-you' : ''}`}>
                <strong className="xp-rank">#{row.rank}</strong>
                {row.avatar_url ? <img className="xp-avatar" src={row.avatar_url} alt="" /> : <span className="xp-avatar xp-avatar-fallback">{(row.display_name || row.username || '?').slice(0,1).toUpperCase()}</span>}
                <div className="xp-member"><strong><ProfileHover supabase={supabase} person={{ id: row.user_id, display_name: row.display_name, username: row.username, avatar_url: row.avatar_url }} role={memberRoles[row.user_id]} tierRoles={memberTierRoles[row.user_id]} cosmetics={memberCosmetics[row.user_id]}>{<MemberName person={{ id: row.user_id, display_name: row.display_name, username: row.username }} role={memberRoles[row.user_id]} tierRoles={memberTierRoles[row.user_id]} cosmetics={memberCosmetics[row.user_id]} />}</ProfileHover> {isYou && <span className="you-tag">YOU</span>}</strong></div>
                <div className="xp-member-score"><strong>LEVEL {row.level}</strong><small>{Number(row.xp || 0).toLocaleString()} XP</small></div>
              </div>
            })}</div>}
            {!xpLeaderboardLoading && !xpLeaderboard.some(row => row.user_id === session.user.id) && <p className="muted">Your ranking will appear here after your first XP reward.</p>}
          </div>

          {incoming.length > 0 && (
            <div className="panel">
              <h3>Friend requests waiting for you ({incoming.length})</h3>

              {incoming.map(row => {
                const sender = members.find(person => person.id === row.requester)

                return (
                  <div
                    key={row.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                      marginBottom: '10px'
                    }}
                  >
                    <strong>
                     <MemberName person={sender} role={memberRoles[row.requester]} tierRoles={memberTierRoles[row.requester]} />
                   </strong>

                    <div className="actions">
                      <button
                        className="primary"
                        disabled={friendshipBusy === row.id}
                        onClick={() => acceptFriendRequest(row)}
                      >
                        Accept
                      </button>

                      <button
                        className="secondary"
                        disabled={friendshipBusy === row.id}
                        onClick={() => declineFriendRequest(row)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            <h3>Member directory ({members.length})</h3>

            <button
              className="secondary"
              onClick={refreshDirectory}
              disabled={loadingMembers}
            >
              {loadingMembers ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>

          {loadingMembers ? (
            <p className="muted">Loading 尺ḼⱮ members...</p>
          ) : members.length === 0 ? (
            <p className="muted">No other members found yet.</p>
          ) : (
            members.map(member => (
              <div
                className="panel"
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <strong>
                      <ProfileHover supabase={supabase} person={member} role={memberRoles[member.id]} tierRoles={memberTierRoles[member.id]} cosmetics={memberCosmetics[member.id]} />
                    </strong>

                    {session && relationshipWith(member.id)?.status !== 'blocked' && (
                      <button
                        className="secondary"
                        style={{ padding: '5px 9px', minWidth: '34px' }}
                        aria-label={`Open private chat with ${displayName(member)}`}
                        title={`Message ${displayName(member)}`}
                        onClick={() => startConversation(member)}
                      >
                        ✉
                      </button>
                    )}
                  </div>

                </div>

                <div className="actions">
                  {memberFriendControls(member)}
                </div>
              </div>
            ))
          )}

          <p className="status">{status}</p>
        </div>
      )
    }

    // STAFF CONTROL PANEL
    if (section === 'Staff Control Panel') {
      if (!session || !isStaff) {
        return (
          <div className="panel">
            <h2>🛡 Staff Control Panel</h2>
            <p>You do not have permission to access this page.</p>
          </div>
        )
      }

      return (
        <div className="panel">
          <h2>🛡 Staff Control Panel</h2>
          <p className="muted">
            Manage 尺ḼⱮ member restrictions, chat moderation, and review active moderation actions.
          </p>

          <div className="panel">
            <h3>Staff account</h3>
            <p>
              Signed in as <strong>{staffRole.toUpperCase()}</strong>
            </p>
            <p className="muted">
              Your available actions are controlled by your staff role and the database permission checks.
            </p>
          </div>

          {staffRole === 'owner' && (
            <div className="panel owner-tools-panel">
              <h3>👑 Owner tools</h3>
              <div className="owner-tool-grid">
                <div>
                  <h4>Grant or change staff role</h4>
                  <label>Member<select value={ownerRoleTarget} onChange={e => setOwnerRoleTarget(e.target.value)}><option value="">Choose a member…</option>{ownerDirectory.filter(m => m.user_id !== session.user.id).map(m => <option key={m.user_id} value={m.user_id}>{m.display_name || m.username || m.user_id} — {m.role}</option>)}</select></label>
                  <label>Role<select value={ownerRoleChoice} onChange={e => setOwnerRoleChoice(e.target.value)}><option value="co_owner">Co-owner</option><option value="moderator">Moderator</option><option value="admin">Admin</option><option value="member">Remove staff (Member)</option></select></label>
                  <button className="primary" disabled={staffBusy || !ownerRoleTarget} onClick={ownerChangeRole}>Save role</button>
                </div>
                <div>
                  <h4>Assign member tier badges</h4>
                  <label>Member<select value={tierRoleTarget} onChange={e => { const id = e.target.value; setTierRoleTarget(id); setTierRoleChoices(memberTierRoles[id] || []) }}><option value="">Choose a member…</option>{ownerDirectory.map(m => <option key={m.user_id} value={m.user_id}>{m.display_name || m.username || m.user_id}</option>)}</select></label>
                  <div className="tier-role-picker">
                    {['s', 'a', 'b', 'c', 'd'].map(tier => <label key={tier} className="tier-role-option"><input type="checkbox" checked={tierRoleChoices.includes(tier)} disabled={!tierRoleTarget || staffBusy} onChange={e => setTierRoleChoices(current => e.target.checked ? [...current, tier] : current.filter(value => value !== tier))} /><span className={`member-tier-badge tier-${tier}`}>{tier.toUpperCase()}</span><span>{tier.toUpperCase()}-tier</span></label>)}
                  </div>
                  <button className="primary" disabled={staffBusy || !tierRoleTarget} onClick={ownerSaveTierRoles}>Save tier badges</button>
                  <p className="muted">Members can have multiple tier badges. These are labels only and never grant staff permissions or change name colours.</p>
                </div>
                <div>
                  <h4>Give a member a custom title</h4>
                  <label>Member<select value={titleTarget} onChange={e => setTitleTarget(e.target.value)}><option value="">Choose a member…</option>{ownerDirectory.map(m => <option key={m.user_id} value={m.user_id}>{m.display_name || m.username || m.user_id}</option>)}</select></label>
                  <label>Title<input maxLength={32} value={titleValue} onChange={e => setTitleValue(e.target.value)} placeholder="e.g. Clan Legend" /></label>
                  <button className="primary" disabled={staffBusy || !titleTarget || !titleValue.trim()} onClick={ownerGrantTitle}>Grant title</button>
                  <p className="muted">Only the owner can grant titles or change staff roles.</p>
                </div>
                <div>
                  <h4>Change a member username</h4>
                  <label>Member<select value={ownerUsernameTarget} onChange={e => { setOwnerUsernameTarget(e.target.value); const selected = ownerDirectory.find(m => m.user_id === e.target.value); setOwnerUsernameValue(selected?.username || '') }}><option value="">Choose a member…</option>{ownerDirectory.map(m => <option key={m.user_id} value={m.user_id}>{m.display_name || m.username || m.user_id} — @{m.username || 'no username'}</option>)}</select></label>
                  <label>New username<input maxLength={20} minLength={3} value={ownerUsernameValue} onChange={e => setOwnerUsernameValue(e.target.value)} placeholder="new_username" /></label>
                  <button className="primary" disabled={staffBusy || !ownerUsernameTarget || !ownerUsernameValue.trim()} onClick={ownerSetUsername}>Save username</button>
                  <p className="muted">Usernames must be unique and use 3–20 letters, numbers, or underscores.</p>
                </div>
              </div>
            </div>
          )}

          {canDeleteAccounts && (
            <div className="panel owner-tools-panel">
              <h3>🛡 Delete a member account</h3>
              <p className="muted">Permanently delete an eligible member account. Your own account and owner accounts are excluded; co-owners cannot delete other co-owners. The Edge Function must verify the owner or co-owner role and target restrictions again on the server.</p>
              <label>
                Member to delete
                <select value={deleteTarget} onChange={e => { setDeleteTarget(e.target.value); setDeleteConfirm(''); setShowDeleteConfirm(false) }}>
                  <option value="">Choose a member…</option>
                  {(staffRole === 'owner' ? ownerDirectory : members.map(member => ({ ...member, user_id: member.id, role: memberRoles[member.id] || 'member' })))
                    .filter(member => (member.user_id || member.id) !== session.user.id && member.role !== 'owner' && (staffRole !== 'co_owner' || member.role !== 'co_owner'))
                    .map(member => {
                      const memberId = member.user_id || member.id
                      return <option key={memberId} value={memberId}>{member.display_name || member.username || memberId} — {member.role || 'member'}</option>
                    })}
                </select>
              </label>
              <label>
                Type DELETE to confirm
                <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} autoComplete="off" />
              </label>
              <button className="primary danger-button" disabled={!deleteTarget || deleteConfirm !== 'DELETE' || staffBusy} onClick={() => setShowDeleteConfirm(true)}>
                Review account deletion
              </button>
              {showDeleteConfirm && (
                <div className="notice">
                  <strong>Final confirmation</strong>
                  <p>This permanently removes the selected member’s account and authentication identity. This cannot be undone.</p>
                  <button className="danger-button" disabled={staffBusy} onClick={deleteMemberAccount}>
                    {staffBusy ? 'Deleting account…' : 'Permanently delete account'}
                  </button>
                  <button className="secondary" disabled={staffBusy} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                </div>
              )}
            </div>
          )}

          {['owner', 'admin'].includes(staffRole) && (
            <div className="panel">
              <h3>🪙 Give coins</h3>
              <p className="muted">Grant coins to a clanmate. The database checks your role and records each grant.</p>
              <label>
                Member
                <select value={coinGrantTarget} onChange={e => setCoinGrantTarget(e.target.value)}>
                  <option value="">Choose a member…</option>
                  {(staffRole === 'owner' ? ownerDirectory : staffMembers)
                    .map(member => {
                      const memberId = member.user_id || member.id
                      return <option key={memberId} value={memberId}>{member.display_name || member.username || '尺ḼⱮ member'}</option>
                    })}
                </select>
              </label>
              <label>Amount (1–10,000)<input type="number" min="1" max="10000" step="1" value={coinGrantAmount} onChange={e => setCoinGrantAmount(e.target.value)} /></label>
              <label>Reason (optional)<input maxLength={200} value={coinGrantReason} onChange={e => setCoinGrantReason(e.target.value)} placeholder="Tournament reward, event prize…" /></label>
              <button className="primary" disabled={staffBusy || !coinGrantTarget} onClick={grantMemberCoins}>Grant coins</button>
            </div>
          )}

          <div className="panel">
            <h3>Apply a moderation action</h3>

            <form onSubmit={applyStaffAction}>
              <label>
                Search members
                <input
                  type="text"
                  placeholder="Search by display name or username..."
                  value={staffSearch}
                  onChange={e => setStaffSearch(e.target.value)}
                />
              </label>

              <label>
                Select member
                <select
                  value={staffTarget}
                  onChange={e => setStaffTarget(e.target.value)}
                  required
                >
                  <option value="">Choose a member...</option>

                  {filteredStaffMembers
                    .filter(member => member.id !== session.user.id)
                    .map(member => (
                      <option key={member.id} value={member.id}>
                        {member.display_name || member.username || '尺ḼⱮ member'}
                        
                        {member.role ? ` — ${member.role}` : ''}
                      </option>
                    ))}
                </select>
              </label>

              {filteredStaffMembers.filter(
                member => member.id !== session.user.id
              ).length === 0 && (
                <p className="muted">
                  No matching members found.
                </p>
              )}

              <label>
                Action
                <select
                  value={staffAction}
                  onChange={e => setStaffAction(e.target.value)}
                >
                  <option value="timeout">Timeout</option>
                  <option value="ban">Ban</option>
                </select>
              </label>

              {staffAction === 'timeout' && (
                <label>
                  Timeout duration
                  <select
                    value={timeoutMinutes}
                    onChange={e => setTimeoutMinutes(e.target.value)}
                  >
                    <option value="5">5 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="360">6 hours</option>
                    <option value="1440">1 day</option>
                    <option value="10080">7 days</option>
                    <option value="43200">30 days</option>
                  </select>
                </label>
              )}

              <label>
                Reason
                <textarea
                  className="staff-message-bubble"
                  maxLength={500}
                  rows={4}
                  placeholder="Explain why this moderation action is being applied..."
                  value={staffReason}
                  onChange={e => setStaffReason(e.target.value)}
                />
              </label>

              <p className="muted">
                {staffReason.length}/500 characters
              </p>

              <button
                className="primary"
                type="submit"
                disabled={staffBusy || !staffTarget}
              >
                {staffBusy
                  ? 'Please wait...'
                  : staffAction === 'ban'
                    ? 'Apply ban'
                    : 'Apply timeout'}
              </button>
            </form>
          </div>

          <div className="panel">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap'
              }}
            >
              <div>
                <h3>Active moderation actions</h3>
                <p className="muted">
                  Review current bans and timeouts.
                </p>
              </div>

              <button
                className="secondary"
                onClick={refreshStaffData}
                disabled={staffLoading || staffBusy}
              >
                {staffLoading ? 'Loading...' : '↻ Refresh'}
              </button>
            </div>

            {staffLoading ? (
              <p className="muted">Loading moderation actions...</p>
            ) : moderationActions.length === 0 ? (
              <p className="muted">
                There are currently no active moderation actions.
              </p>
            ) : (
              moderationActions.map(action => (
                <div className="panel" key={action.id}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <h3>
                      {action.action_type === 'ban' ? '🔨 Ban' : '⏱ Timeout'}
                    </h3>

                    <span className="muted">
                      {action.expires_at
                        ? `Expires ${new Date(action.expires_at).toLocaleString()}`
                        : 'No expiry shown'}
                    </span>
                  </div>

                  <p>
                    <strong>Member:</strong>{' '}
                    {action.target_display_name || action.target_username || action.target_user_id}
                  </p>

                  <p>
                    <strong>Reason:</strong>{' '}
                    {action.reason || 'No reason provided'}
                  </p>

                  <p>
                    <strong>Applied by:</strong>{' '}
                    {action.moderator_display_name || action.moderator_username || '尺ḼⱮ staff'}
                  </p>

                  <p>
                    <strong>Applied:</strong>{' '}
                    {action.created_at
                      ? new Date(action.created_at).toLocaleString()
                      : 'Date unavailable'}
                  </p>

                  <button
                    className="secondary"
                    disabled={staffBusy}
                    onClick={() => liftStaffAction(action.id)}
                  >
                    {staffBusy ? 'Please wait...' : 'Lift action'}
                  </button>
                </div>
              ))
            )}
          </div>

          <p className="status">{status}</p>
        </div>
      )
    }

    if (section === 'Quests') {
      if (!session) return <div className="panel"><h2>✦ Quests</h2><p>Please sign in to track quests.</p></div>
      const quests = progressData?.quests || []
      return (
        <div className="panel">
          <h2>✦ Daily quests</h2>
          <p className="muted">Complete today's challenges to earn coins. Progress resets each UTC day.</p>
          <div className="progress-summary"><strong>🪙 {progressData?.stats?.coins ?? 100} coins</strong><span>Completed: {progressData?.stats?.quests_completed ?? 0}</span></div>
          {progressLoading ? <p className="muted">Loading quests…</p> : quests.map(quest => (
            <div className="quest-card" key={quest.id}>
              <div><h3>{quest.name}</h3><p className="muted">{quest.description}</p><strong>Reward: 🪙 {quest.reward_coins}</strong></div>
              <div className="quest-progress"><span>{Math.min(quest.progress,quest.target_count)} / {quest.target_count}</span><div className="progress-track"><span style={{width:`${Math.min(100,quest.progress / quest.target_count * 100)}%`}} /></div>
              <button className="primary" disabled={progressBusy || quest.claimed || quest.progress < quest.target_count} onClick={() => claimQuest(quest.id)}>{quest.claimed ? 'Claimed' : quest.progress >= quest.target_count ? 'Claim reward' : 'In progress'}</button></div>
            </div>
          ))}
          <p className="status">{status}</p>
        </div>
      )
    }

    if (section === 'Coin shop') {
      if (!session) return <div className="panel"><h2>🛍 Coin shop</h2><p>Please sign in to use the shop.</p></div>
      const ownedIds = new Set((progressData?.owned || []).map(item => item.item_id))
      const equippedIds = new Set((progressData?.owned || []).filter(item => item.equipped).map(item => item.item_id))
      return (
        <div className="panel">
          <h2>🛍 Coin shop</h2>
          <p className="muted">Buy name tags and badges with coins earned in 尺ḼⱮ games and quests.</p>
          <div className="progress-summary"><strong>🪙 {progressData?.stats?.coins ?? 100} coins</strong></div>
          <div className="shop-grid">
            {(progressData?.shop || []).map(item => (
              <div className="shop-item" key={item.id}>
                <div className="shop-preview">{item.item_type === 'badge' ? (item.style_key === 'star' ? '⭐' : item.style_key === 'flame' ? '🔥' : '💎') : <span className={`equipped-name-tag tag-${item.style_key}`}>{item.name}</span>}</div>
                <h3>{item.name}</h3><p className="muted">{item.item_type === 'badge' ? 'Profile badge' : 'Name tag'}</p><strong>🪙 {item.price}</strong>
                {ownedIds.has(item.id) ? <button className="secondary" disabled={progressBusy || equippedIds.has(item.id)} onClick={() => equipCosmetic(item.id)}>{equippedIds.has(item.id) ? 'Equipped' : 'Equip'}</button> : <button className="primary" disabled={progressBusy || (progressData?.stats?.coins ?? 100) < item.price} onClick={() => buyCosmetic(item.id)}>Buy</button>}
              </div>
            ))}
          </div>
          <h3>Your collection</h3>
          {(progressData?.owned || []).length === 0 ? <p className="muted">You haven't bought any cosmetics yet.</p> : <div className="owned-list">{(progressData?.owned || []).map(owned => { const item = (progressData?.shop || []).find(x => x.id === owned.item_id); return <span key={owned.item_id}>{item?.name || owned.item_id} {owned.equipped ? '✓ Equipped' : ''}</span> })}</div>}
          <p className="status">{status}</p>
        </div>
      )
    }

    if (section === 'My profile') {
      return (
        <div className="panel">
          <h2>◉ My profile</h2>

          {session ? (
            <>
              <div className="profile-avatar-editor">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Your profile"
                    className="profile-avatar-preview"
                  />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {(profile?.display_name || session.user.email || 'R')
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>
                )}

                <div>
                  <strong>Profile picture</strong>
                  <p className="muted">
                    Choose an image to use as your 尺ḼⱮ avatar (max 3 MB).
                  </p>

                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={uploadAvatar}
                    style={{ display: 'none' }}
                  />

                  <button
                    className="secondary"
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? 'Uploading...' : 'Change profile picture'}
                  </button>
                </div>
              </div>

              <p><strong>Email:</strong> {session.user.email}</p>
              <section className="profile-staff-colour-section">
                <h3>Your username</h3>
                <p className="muted">This appears as @username underneath your display name. It is separate from your display name.</p>
                <label>Username
                  <input type="text" maxLength={20} minLength={3} autoComplete="username" placeholder="your_username" value={myUsernameValue} onChange={e => setMyUsernameValue(e.target.value.toLowerCase())} />
                </label>
                <button className="primary" type="button" disabled={staffBusy || !myUsernameValue.trim()} onClick={saveMyUsername}>Save username</button>
              </section>
              <p>
                <strong>Display name:</strong>{' '}
                <MemberName
                  person={{ display_name: profile?.display_name || 'Not set yet' }}
                  role={staffRole}
                  tierRoles={memberTierRoles[session.user.id]}
                  cosmetics={memberCosmetics[session.user.id]}
                />
              </p>
              <p><strong>尺ḼⱮ role:</strong> {staffRole}</p>

              <section className="profile-staff-colour-section">
                <h3>Display name colour</h3>
                <p className="muted">Choose the colour of your actual display name. This changes the name text wherever it appears, not your role tag.</p>
                <div className="staff-name-color-grid" aria-label="Choose display name colour">
                  {STAFF_NAME_COLORS.map(color => (
                    <button key={color} type="button" className={`staff-name-color-swatch${selectedDisplayNameColor === color ? ' selected' : ''}`} style={{ '--swatch-color': color }} aria-label={`Choose display name colour ${color}`} aria-pressed={selectedDisplayNameColor === color} disabled={savingDisplayNameColor} onClick={() => saveDisplayNameColor(color)} />
                  ))}
                </div>
                <div className="staff-name-color-preview">Preview: <span className="member-display-name" style={{ '--display-name-color': selectedDisplayNameColor }}>Your display name</span></div>
              </section>

              {['owner', 'co_owner', 'admin'].includes(staffRole) && (
                <section className="profile-staff-colour-section">
                  <h3>Staff name tag colour</h3>
                  <p className="muted">Choose the colour of your {staffRole === 'co_owner' ? 'Co-owner' : staffRole === 'owner' ? 'Owner' : 'Admin'} tag. Admin tags stay a solid colour; Owner and Co-owner tags keep their animated sheen.</p>
                  <div className="staff-name-color-grid" aria-label="Choose staff name tag colour">
                    {STAFF_NAME_COLORS.map(color => (
                      <button key={color} type="button" className={`staff-name-color-swatch${selectedStaffNameColor === color ? ' selected' : ''}`} style={{ '--swatch-color': color }} aria-label={`Choose ${color}`} aria-pressed={selectedStaffNameColor === color} disabled={savingStaffNameColor} onClick={() => saveStaffNameColor(color)} />
                    ))}
                  </div>
                  <div className="staff-name-color-preview">Preview: <span className={`member-role-tag ${staffRole}`} style={{ '--staff-name-color': selectedStaffNameColor }}>{staffRole === 'co_owner' ? 'Co-owner' : staffRole === 'owner' ? 'Owner' : 'Admin'}</span></div>
                </section>
              )}

              <label>
                Change your display name
                <input
                  type="text"
                  maxLength={24}
                  placeholder="Enter your new name"
                  value={newDisplayName}
                  onChange={e => setNewDisplayName(e.target.value)}
                />
              </label>

              <button
                className="primary"
                onClick={saveDisplayName}
                disabled={savingName}
              >
                {savingName ? 'Saving...' : 'Save new name'}
              </button>

              <p className="status">{status}</p>

              <button className="secondary" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <p>Please sign in to view your profile.</p>
          )}
        </div>
      )
    }

    return (
      <div className="panel">
        <h2>Page not found</h2>
      </div>
    )
  }

  return (
    <div className={lightMode ? 'app light-mode' : 'app'}>
      <style>{`
        .member-name {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 1px;
          font-weight: 650;
          vertical-align: middle;
        }
        .member-name-main {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-width: 0;
        }
        .member-username {
          display: block;
          padding-left: 1px;
          color: var(--muted, #94a3b8);
          -webkit-text-fill-color: var(--muted, #94a3b8);
          background: none !important;
          font-size: .76em;
          font-weight: 500;
          line-height: 1.2;
          letter-spacing: .01em;
        }

        .member-display-name { color: var(--display-name-color, inherit) !important; -webkit-text-fill-color: var(--display-name-color, currentColor) !important; background: none !important; filter: none; text-shadow: none; }

        .owner-name {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-start;
          color: #ffd447 !important;
          background: transparent !important;
          -webkit-text-fill-color: initial !important;
          font-weight: 900;
          filter: drop-shadow(0 0 4px rgba(255, 196, 36, 0.28));
        }

        .owner-crown {
          display: inline-block;
          font-size: 1.05em;
          line-height: 1;
          -webkit-text-fill-color: initial;
          filter: drop-shadow(0 0 4px rgba(255, 211, 64, 0.65));
        }

        .member-role-tag {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 0.65em;
          line-height: 1.3;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-weight: 800;
          color: #d8c9ff;
          background: rgba(135, 94, 230, 0.2);
          border: 1px solid rgba(173, 143, 255, 0.28);
          -webkit-text-fill-color: initial;
        }

        .member-role-tag.admin {
          color: #ffc878;
          background: rgba(225, 151, 55, 0.14);
          border-color: rgba(225, 151, 55, 0.3);
        }

        .member-role-tag.owner, .member-role-tag.co_owner, .member-role-tag.admin {
          color: #07111f;
          background: var(--staff-name-color, #38bdf8);
          border: 1px solid var(--staff-name-color, #38bdf8);
          font-weight: 950;
          text-shadow: none;
          box-shadow: 0 1px 3px rgba(0,0,0,.28);
        }
        /* Owner stays gold; Co-owner uses the blue diamond treatment. */
        .member-role-tag.owner {
          color: #4a2b00 !important;
          -webkit-text-fill-color: #4a2b00 !important;
          background: linear-gradient(110deg, #9b6500 0%, #f6cf58 18%, #fff2b0 34%, #d99a16 52%, #fff0a0 70%, #b77908 88%, #f6cf58 100%) !important;
          background-size: 260% 100% !important;
          border: 1px solid #f5cf65 !important;
          box-shadow: 0 0 5px rgba(255, 198, 48, .7), inset 0 1px 0 rgba(255,255,255,.65) !important;
          animation: goldBannerShine 3s linear infinite !important;
        }
        .member-role-tag.co_owner {
          color: #082b4a !important;
          -webkit-text-fill-color: #082b4a !important;
          background: linear-gradient(110deg, #075985 0%, #38bdf8 18%, #dff6ff 34%, #0ea5e9 52%, #bae6fd 70%, #0369a1 88%, #38bdf8 100%) !important;
          background-size: 260% 100% !important;
          border: 1px solid #7dd3fc !important;
          box-shadow: 0 0 8px rgba(56, 189, 248, .9), 0 0 15px rgba(14, 165, 233, .48), inset 0 1px 0 rgba(255,255,255,.72) !important;
          animation: diamondBannerShine 3s linear infinite !important;
        }
        @keyframes diamondBannerShine { 0% { background-position: 0% center; } 100% { background-position: 260% center; } }
        .member-role-tag.admin { animation: none !important; background: var(--staff-name-color, #f97316); }
        @keyframes goldBannerShine { 0% { background-position: 0% center; } 100% { background-position: 260% center; } }
        .member-name.owner-name .member-display-name,
        .member-name.co-owner-name .member-display-name {
          background-size: 260% auto !important;
          background-clip: text !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          font-weight: 950;
        }
        /* Continuous sunlight glint: the base role colours stay gold/diamond-blue. */
        .member-name.owner-name .member-display-name {
          color: #f6cf58 !important;
          background: linear-gradient(108deg,
            #9b6500 0%, #f6cf58 24%, #ffe9a0 37%,
            #ffffff 43%, #fff5c2 47%, #d99a16 53%,
            #fff0a0 69%, #b77908 84%, #f6cf58 100%) !important;
          background-size: 320% 100% !important;
          background-position: 0% center;
          background-clip: text !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          animation: ownerSunlightGlint 2.25s ease-in-out infinite !important;
          filter: drop-shadow(0 0 4px rgba(255, 190, 35, .65));
        }
        .member-name.co-owner-name .member-display-name {
          color: #38bdf8 !important;
          background: linear-gradient(108deg,
            #075985 0%, #38bdf8 24%, #a5e8ff 37%,
            #ffffff 43%, #e0f7ff 47%, #0ea5e9 53%,
            #bae6fd 69%, #0369a1 84%, #38bdf8 100%) !important;
          background-size: 320% 100% !important;
          background-position: 0% center;
          background-clip: text !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          animation: coOwnerSunlightGlint 2.25s ease-in-out infinite !important;
          filter: drop-shadow(0 0 5px rgba(56, 189, 248, .9));
        }
        @keyframes ownerSunlightGlint {
          0% { background-position: 0% center; }
          55% { background-position: 100% center; }
          100% { background-position: 0% center; }
        }
        @keyframes coOwnerSunlightGlint {
          0% { background-position: 0% center; }
          55% { background-position: 100% center; }
          100% { background-position: 0% center; }
        }
        @media (prefers-reduced-motion: reduce) {
          .member-name.owner-name .member-display-name,
          .member-name.co-owner-name .member-display-name { animation: none !important; }
        }
        .owner-crown, .co-owner-diamond {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent !important;
        }
        .owner-crown { color: #f6cf58 !important; filter: drop-shadow(0 0 5px rgba(255, 190, 35, .75)); }
        .co-owner-diamond { color: #38bdf8 !important; filter: drop-shadow(0 0 6px rgba(56, 189, 248, .95)); }
        /* Draw the co-owner diamond as a CSS shape, not a blue emoji/glyph. */
        .co-owner-diamond-shape {
          display: block;
          width: .68em;
          height: .68em;
          border: 1px solid #bae6fd;
          border-radius: 2px;
          background: linear-gradient(120deg, #075985 0%, #38bdf8 20%, #e0f7ff 38%, #0ea5e9 56%, #bae6fd 74%, #0369a1 90%, #38bdf8 100%);
          background-size: 260% 100%;
          transform: rotate(45deg);
          animation: diamondNameShine 2.8s linear infinite;
          box-shadow: 0 0 7px rgba(56, 189, 248, .95), inset 0 0 2px rgba(255,255,255,.8);
        }
        @keyframes goldNameMorph { 0% { background-position: 0% center; } 100% { background-position: 260% center; } }
        .staff-name-color-grid { display:grid; grid-template-columns:repeat(6, minmax(34px, 44px)); gap:10px; margin:12px 0; }
        .staff-name-color-swatch { width:38px; height:38px; border-radius:10px; border:2px solid rgba(255,255,255,.35); background:var(--swatch-color); cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,.25); }
        .staff-name-color-swatch.selected { outline:3px solid #fff; outline-offset:2px; transform:scale(1.06); }
        .staff-name-color-swatch:disabled { opacity:.65; cursor:wait; }
        .staff-name-color-preview { display:flex; align-items:center; gap:8px; margin-top:12px; font-weight:700; }
        @media (prefers-reduced-motion: reduce) { .member-role-tag.owner, .member-role-tag.co_owner, .member-name.owner-name .member-display-name, .member-name.co-owner-name .member-display-name, .owner-crown, .co-owner-diamond { animation:none !important; } }

        @keyframes ownerShine {
          to { background-position: 220% center; }
        }

        @media (prefers-reduced-motion: reduce) {
          .owner-name { animation: none; }
        }


        .equipped-name-tag { display:inline-flex; align-items:center; padding:2px 6px; border-radius:6px; font-size:.65em; font-weight:800; letter-spacing:.03em; -webkit-text-fill-color:initial; }
        .equipped-title { display:inline; padding:0; border:0; border-radius:0; background:transparent; color:#ffd447; font-size:.72em; font-weight:850; letter-spacing:.025em; -webkit-text-fill-color:#ffd447; }
        .clan-creator-title { color:#8e5bff !important; -webkit-text-fill-color:#8e5bff !important; background:transparent !important; border:0 !important; padding:0 !important; text-shadow:0 0 4px rgba(115,55,255,.95), 0 0 10px rgba(115,55,255,.75), 0 0 19px rgba(75,25,190,.65); }
        .profile-hover-title { color:#ffd447; font-weight:850; }
        .profile-hover-title.clan-creator-title { color:#8e5bff; -webkit-text-fill-color:#8e5bff; }
        .tag-neon { color:#9ffcff; background:rgba(35,220,255,.12); border:1px solid rgba(35,220,255,.45); }
        .tag-gold { color:#ffd447; background:rgba(255,200,45,.12); border:1px solid rgba(255,200,45,.45); }
        .tag-cyber { color:#e2a8ff; background:rgba(190,80,255,.13); border:1px solid rgba(190,80,255,.45); }
        .equipped-badge { font-size:.95em; -webkit-text-fill-color:initial; }
        .profile-hover-wrap { cursor:pointer; }
        .profile-hover-wrap:focus-visible { outline:2px solid #a78bfa; outline-offset:3px; border-radius:4px; }
        .profile-staff-colour-section { margin:18px 0; padding:14px; border:1px solid rgba(160,140,200,.28); border-radius:12px; }
        .profile-hover-wrap { position:relative; display:inline-flex; cursor:pointer; }
        .profile-hover-avatar { width:34px; height:34px; border-radius:50%; object-fit:cover; flex:0 0 34px; }
        .profile-hover-heading { display:flex; align-items:center; gap:8px; }
        .profile-hover-card { position:fixed; z-index:1000; left:0; top:calc(100% + 8px); width:220px; display:flex; flex-direction:column; gap:7px; padding:12px; border-radius:12px; background:#19152a; border:1px solid rgba(170,140,255,.38); box-shadow:0 12px 35px rgba(0,0,0,.4); color:#f5f1ff; font-size:12px; font-weight:500; white-space:normal; }
        .profile-hover-heading { display:flex; justify-content:space-between; gap:8px; align-items:center; border-bottom:1px solid rgba(255,255,255,.12); padding-bottom:7px; }
        .profile-hover-heading small { color:#b99cff; }
        .profile-hover-title { color:#ffd447; font-weight:800; }
        .progress-summary { display:flex; flex-wrap:wrap; gap:14px; padding:12px; margin:12px 0; border-radius:10px; background:rgba(130,90,220,.12); }
        .co-owner-diamond { display:inline-flex; align-items:center; justify-content:center; font-size:1.12em; line-height:1; font-weight:950; }
        .clan-message-row { position:relative; }
        .chat-delete-message { margin-left:auto; border:1px solid rgba(255,100,100,.3); background:rgba(210,60,70,.1); color:#ff9da4; border-radius:7px; padding:4px 8px; font-size:11px; cursor:pointer; }
        .clan-chat-image { display:block; max-width:min(360px,100%); max-height:280px; object-fit:contain; margin-top:8px; border-radius:10px; border:1px solid rgba(160,140,200,.3); }
        .chat-image-picker { display:inline-flex; align-items:center; justify-content:center; padding:8px 10px; border:1px solid rgba(160,140,200,.35); border-radius:9px; color:inherit; cursor:pointer; white-space:nowrap; }
        .visually-hidden-file { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
        .chat-image-selected { font-size:11px; color:inherit; }
        .chat-image-selected button { border:0; background:transparent; color:inherit; cursor:pointer; }
        .minigames-wrap { margin-top:16px; }
        .minigames-wrap, .minigames-wrap .game-panel, .minigames-wrap .panel { color:#f3efff !important; background-color:#171421 !important; border-color:#403451 !important; }
        .minigames-wrap .tic-cell, .minigames-wrap .reaction-display { background:#211b30 !important; color:#f7f2ff !important; border-color:#66518b !important; }
        .rlm-extra-games .panel { background:#171421 !important; color:#f3efff !important; border-color:#403451 !important; }
        .rlm-extra-games .panel h3, .rlm-extra-games .panel h4, .rlm-extra-games .panel strong { color:#f7f2ff !important; }
        .rlm-extra-games .panel p, .rlm-extra-games .panel small, .rlm-extra-games .muted { color:#c9bfd8 !important; }
        .rlm-extra-games .tic-cell { background:#211b30 !important; color:#f7f2ff !important; border-color:#66518b !important; }
        .rlm-extra-games input, .rlm-extra-games select { background:#211b30 !important; color:#f7f2ff !important; border-color:#66518b !important; }
        .minigames-wrap button { color:inherit; }
        .minigames-wrap .muted, .minigames-wrap p { color:#c9bfd8; }

        .game-tabs { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
        .game-panel { text-align:center; }
        .arcade-game { max-width:560px; margin:0 auto; }
        .arcade-score { display:flex; justify-content:space-between; max-width:430px; margin:10px auto; font-weight:800; }
        .block-grid { display:grid; grid-template-columns:repeat(10,minmax(0,1fr)); gap:3px; width:min(100%,430px); aspect-ratio:1; margin:14px auto; padding:6px; border-radius:12px; background:#30283d; }
        .block-cell { min-width:0; border:1px solid #514663; border-radius:4px; background:#211b30; padding:0; }
        .block-cell.filled { background:#9b75ff; border-color:#c4adff; }
        .piece-tray { display:flex; justify-content:center; gap:12px; flex-wrap:wrap; margin:12px auto; }
        .piece-choice { display:grid; grid-template-columns:repeat(4,17px); grid-template-rows:repeat(4,17px); gap:2px; min-width:92px; min-height:82px; place-content:center; border:1px solid #514663; border-radius:10px; background:#211b30; }
        .piece-choice.chosen { outline:2px solid #b69aff; }
        .piece-choice i { width:17px; height:17px; background:#9b75ff; border-radius:3px; }
        .block-grid { touch-action:none; }
        .block-cell.block-preview { background:rgba(115,255,191,.32); border:2px solid #8dffd0; box-shadow:inset 0 0 0 1px rgba(255,255,255,.55),0 0 10px rgba(93,255,190,.45); }
        .piece-choice { touch-action:none; cursor:grab; }
        .piece-choice:active { cursor:grabbing; }
        .block-drag-hint { min-height:1.3em; color:#9dffd0 !important; font-weight:800; }
        .bubble-arena { position:relative; width:min(100%,390px); margin:14px auto; aspect-ratio:0.82; overflow:hidden; border:3px solid #536b91; border-radius:18px; background:radial-gradient(ellipse at 50% 0%,#304e78,#101a32 72%); touch-action:pan-y; cursor:crosshair; user-select:none; }
        .bubble-board { position:absolute; inset:12px 8px 74px; display:grid; grid-template-columns:repeat(8,minmax(0,1fr)); grid-template-rows:repeat(8,minmax(0,1fr)); gap:3px; }
        .bubble-slot { display:grid; place-items:center; min-width:0; min-height:0; }
        .bubble-ball { display:block; width:88%; aspect-ratio:1; border-radius:50%; border:2px solid rgba(255,255,255,.48); box-shadow:inset -5px -6px 8px rgba(0,0,0,.2),inset 3px 3px 5px rgba(255,255,255,.45),0 2px 4px rgba(0,0,0,.25); }
        .bubble-aim { position:absolute; bottom:64px; left:50%; height:42%; border-left:2px dashed rgba(255,255,255,.72); transform:translateX(-50%); pointer-events:none; }
        .bubble-launcher { position:absolute; bottom:8px; left:50%; transform:translateX(-50%); width:64px; height:64px; border-radius:50%; background:#263b5b; border:2px solid #8ca7cc; display:grid; place-items:center; }
        .bubble-launcher>.bubble-ball { width:42px; }
        .bubble-launcher small { position:absolute; left:70px; bottom:4px; display:flex; align-items:center; gap:5px; color:#fff; white-space:nowrap; }
        .bubble-launcher small .bubble-ball { width:22px; }
        .bubble-over { position:absolute; inset:0; display:grid; place-content:center; gap:8px; color:white; background:rgba(7,12,25,.78); font-size:1.6rem; font-weight:900; }
        .bubble-over small { font-size:1rem; }
        .bubble-hint { font-size:.85rem; }

        .number-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; width:min(100%,390px); aspect-ratio:1; margin:14px auto; padding:8px; background:#554b40; border-radius:12px; }
        .number-tile { display:grid; place-items:center; border-radius:7px; background:#756b60; color:#fff; font-size:clamp(1rem,5vw,1.7rem); font-weight:850; }
        .tile-2 { background:#eee4da; color:#554b40; } .tile-4 { background:#ede0c8; color:#554b40; } .tile-8 { background:#f2b179; } .tile-16 { background:#f59563; } .tile-32 { background:#f67c5f; } .tile-64 { background:#f65e3b; } .tile-128,.tile-256,.tile-512 { background:#edcf72; color:#51452e; } .tile-1024,.tile-2048 { background:#edc53f; color:#51452e; }
        .direction-pad { display:grid; justify-content:center; gap:5px; margin:10px; } .direction-pad div { display:flex; justify-content:center; gap:5px; } .direction-pad button { min-width:46px; min-height:38px; border-radius:8px; }
        .fruit-drop-arena { position:relative; isolation:isolate; overflow:hidden; width:min(100%,360px); aspect-ratio:0.78; margin:14px auto; border:3px solid #a87946; border-top:0; border-radius:0 0 22px 22px; background:linear-gradient(180deg,#ffe5ad 0%,#ffdfa0 62%,#f4c77c 100%); box-shadow:inset 0 0 0 2px rgba(255,255,255,.22), inset 0 -12px 24px rgba(132,77,30,.12); cursor:crosshair; touch-action:manipulation; }
        .fruit-drop-arena:before { content:""; position:absolute; inset:0; pointer-events:none; opacity:.22; background:repeating-linear-gradient(90deg,transparent 0 23px,rgba(180,112,49,.22) 24px 25px); }
        .fruit-drop-line { position:absolute; z-index:1; top:3%; left:0; right:0; border-top:2px dashed rgba(190,75,48,.5); pointer-events:none; }
        .free-fruit { position:absolute; z-index:2; display:grid; place-items:center; transform:translate(-50%,-50%); line-height:1; border-radius:50%; filter:drop-shadow(1px 3px 2px rgba(75,42,19,.28)); user-select:none; pointer-events:none; }
        .fruit-drop-arena.is-over { cursor:default; }
        .fruit-game-over { position:absolute; z-index:5; inset:0; display:grid; place-content:center; gap:8px; background:rgba(34,20,17,.72); color:#fff; font-size:1.4rem; font-weight:900; text-shadow:0 2px 5px #000; }
        .fruit-hint { font-size:.85rem; }
        .snake-board { display:grid; grid-template-columns:repeat(12,1fr); gap:2px; width:min(100%,420px); aspect-ratio:1; margin:14px auto; padding:6px; border-radius:10px; background:#283b35; }
        .snake-cell { background:#b8d7a6; border-radius:2px; } .snake-cell.snake-body { background:#328b59; } .snake-cell.snake-head { background:#146b3b; outline:2px solid #a7f3c2; } .snake-cell.snake-food { background:#f3d36b; border-radius:50%; }
        .game-over { color:#ff9b9b !important; font-weight:800; } .game-win { color:#9ce9b5 !important; font-weight:800; }

        .tic-board { display:grid; grid-template-columns:repeat(3, minmax(65px, 90px)); justify-content:center; gap:7px; margin:18px auto; }
        .tic-cell { height:78px; border-radius:10px; border:1px solid rgba(170,140,255,.4); background:rgba(120,90,200,.14); color:inherit; font-size:2rem; font-weight:800; cursor:pointer; }
        .tic-cell:disabled { cursor:default; opacity:.85; }
        .reaction-display { min-height:60px; display:grid; place-items:center; margin:18px auto; padding:12px; max-width:480px; border-radius:12px; background:rgba(120,90,200,.14); font-size:1.15rem; font-weight:750; }
        .quest-card, .shop-item { border:1px solid rgba(150,140,200,.25); border-radius:12px; padding:15px; margin:12px 0; }
        .quest-card { display:flex; align-items:center; justify-content:space-between; gap:18px; flex-wrap:wrap; }
        .quest-card h3, .shop-item h3 { margin:0 0 6px; }
        .quest-progress { min-width:150px; display:flex; flex-direction:column; gap:6px; }
        .progress-track { height:8px; border-radius:20px; overflow:hidden; background:rgba(150,140,200,.2); }
        .progress-track span { display:block; height:100%; background:#9b75ff; border-radius:20px; }
        .shop-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin:16px 0; }
        .shop-item { display:flex; flex-direction:column; gap:8px; }
        .shop-preview { min-height:48px; display:grid; place-items:center; font-size:1.8rem; }
        .owned-list { display:flex; flex-wrap:wrap; gap:8px; }
        .owned-list span { padding:6px 9px; border-radius:8px; background:rgba(130,90,220,.14); }
        .owner-tool-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:18px; }
        .owner-tool-grid h4 { margin:8px 0; }
        .small-note { font-size:.82rem; }
        .app.light-mode .profile-hover-card { background:#fff; color:#242238; border-color:#d9d0f5; }
        .app.light-mode .quest-card, .app.light-mode .shop-item { border-color:#e2e4ef; }

        .app.light-mode {
          background: #f3f4fb;
          color: #202238;
          color-scheme: light;
        }

        .app.light-mode main {
          background: #f3f4fb;
          color: #202238;
        }

        .app.light-mode .sidebar {
          background: #ffffff;
          border-color: #e2e4ef;
          color: #25263a;
        }

        .app.light-mode header {
          background: #ffffff;
          border-color: #e2e4ef;
          color: #202238;
        }

        .app.light-mode .panel,
        .app.light-mode .hero,
        .app.light-mode .notice,
        .app.light-mode .staff-note,
        .app.light-mode .account {
          background: #ffffff;
          color: #292b40;
          border-color: #e2e4ef;
        }

        .app.light-mode .caption,
        .app.light-mode .muted,
        .app.light-mode .eyebrow,
        .app.light-mode small {
          color: #72758d;
        }

        .app.light-mode input,
        .app.light-mode textarea,
        .app.light-mode select {
          background: #ffffff;
          color: #202238;
          border-color: #d6d9e8;
        }

        .app.light-mode .nav {
          color: #555970;
        }

        .app.light-mode .nav:hover,
        .app.light-mode .nav.active {
          background: #eeeaff;
          color: #6941c6;
        }

        .app.light-mode .secondary {
          background: #ececf5;
          color: #303149;
          border-color: #d9daea;
        }

        .app.light-mode .theme-toggle {
          background: #eeeaff;
          color: #5736a8;
          border: 1px solid #d9d0fa;
        }

        .app .theme-toggle {
          margin-left: auto;
          padding: 8px 13px;
          border-radius: 10px;
          cursor: pointer;
          font: inherit;
          font-weight: 600;
        }

        .app.light-mode .online {
          color: #21865b;
        }

        .staff-panel-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }

        .staff-action-card {
          border: 1px solid rgba(150, 140, 200, 0.25);
          border-radius: 12px;
          padding: 16px;
          margin: 12px 0;
        }

        .staff-action-card h3 {
          margin-top: 0;
        }

        .staff-role-label {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 20px;
          background: rgba(130, 90, 220, 0.16);
          color: #a98aff;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .staff-warning {
          border-left: 3px solid #d89b43;
          padding: 10px 14px;
          background: rgba(216, 155, 67, 0.08);
          border-radius: 6px;
        }

        .app.light-mode .staff-role-label {
          color: #6941c6;
        }

        .app.light-mode .staff-action-card {
          border-color: #e2e4ef;
        }

        @media (max-width: 600px) {
          .staff-action-card {
            padding: 12px;
          }
        }
        .member-tier-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          min-width: 22px;
          border-radius: 6px;
          margin-left: 4px;
          font-size: .72rem;
          line-height: 1;
          font-weight: 900;
          color: #111827;
          border: 1px solid rgba(0,0,0,.18);
          box-shadow: 0 1px 3px rgba(0,0,0,.24);
          vertical-align: middle;
          -webkit-text-fill-color: #111827;
          background: #e5e7eb;
        }
        .member-tier-badge.tier-s { background: #ff8084; }
        .member-tier-badge.tier-a { background: #ffc184; }
        .member-tier-badge.tier-b { background: #ffe184; }
        .member-tier-badge.tier-c { background: #ffff83; }
        .member-tier-badge.tier-d { background: #b7ff82; }
        .tier-role-picker { display: flex; flex-wrap: wrap; gap: 10px; margin: 10px 0; }
        .tier-role-option { display: inline-flex; align-items: center; gap: 5px; font-size: .85rem; }
        .tier-role-option input { width: auto; }

        /* Final Co-owner override: diamond-blue name, badge and glow. */
        .member-role-tag.co_owner {
          color: #082b4a !important;
          -webkit-text-fill-color: #082b4a !important;
          background: linear-gradient(110deg, #075985 0%, #38bdf8 18%, #e0f7ff 34%, #0ea5e9 52%, #bae6fd 70%, #0369a1 88%, #38bdf8 100%) !important;
          background-size: 260% 100% !important;
          border: 1px solid #bae6fd !important;
          box-shadow: 0 0 8px rgba(56, 189, 248, .95), 0 0 16px rgba(14, 165, 233, .55), inset 0 1px 0 rgba(255,255,255,.72) !important;
          animation: diamondBannerShine 3s linear infinite !important;
          text-shadow: none !important;
          filter: none !important;
        }
        .member-name.co-owner-name .member-display-name {
          color: #38bdf8 !important;
          background: linear-gradient(100deg, #075985 0%, #38bdf8 18%, #e0f7ff 34%, #0ea5e9 52%, #bae6fd 70%, #0369a1 88%, #38bdf8 100%) !important;
          background-size: 260% auto !important;
          background-clip: text !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          animation: diamondNameShine 3.4s linear infinite !important;
          filter: drop-shadow(0 0 6px rgba(56, 189, 248, .95)) !important;
        }
        .member-name.co-owner-name .co-owner-diamond,
        .member-name.co-owner-name .co-owner-diamond-shape {
          filter: drop-shadow(0 0 7px rgba(56, 189, 248, 1)) !important;
          box-shadow: 0 0 8px rgba(56, 189, 248, .95), inset 0 0 2px rgba(255,255,255,.8) !important;
        }

        /* Strong, high-contrast moving glint for staff display names. */
        .member-name.owner-name .member-display-name {
          display: inline-block !important;
          color: #f6cf58 !important;
          background-image: linear-gradient(110deg,
            #9b6500 0%, #f6cf58 30%, #ffe9a0 40%,
            #ffffff 48%, #ffffff 51%, #fff0a0 55%,
            #d99a16 64%, #b77908 78%, #f6cf58 100%) !important;
          background-size: 300% 100% !important;
          background-position: 100% 0 !important;
          background-clip: text !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          animation: rlmOwnerGlintSweep 1.35s linear infinite !important;
          filter: drop-shadow(0 0 5px rgba(255, 205, 70, .95)) !important;
          text-shadow: 0 0 8px rgba(255, 226, 130, .55) !important;
        }
        .member-name.co-owner-name .member-display-name {
          display: inline-block !important;
          color: #38bdf8 !important;
          background-image: linear-gradient(110deg,
            #075985 0%, #38bdf8 30%, #a5e8ff 40%,
            #ffffff 48%, #ffffff 51%, #e0f7ff 55%,
            #0ea5e9 64%, #0369a1 78%, #38bdf8 100%) !important;
          background-size: 300% 100% !important;
          background-position: 100% 0 !important;
          background-clip: text !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          animation: rlmCoOwnerGlintSweep 1.35s linear infinite !important;
          filter: drop-shadow(0 0 6px rgba(56, 189, 248, 1)) !important;
          text-shadow: 0 0 8px rgba(210, 245, 255, .65) !important;
        }
        @keyframes rlmOwnerGlintSweep {
          from { background-position: 100% 0; }
          to { background-position: 0% 0; }
        }
        @keyframes rlmCoOwnerGlintSweep {
          from { background-position: 100% 0; }
          to { background-position: 0% 0; }
        }


        /* Final override: a bright highlight wave travels across the entire name, left to right. */
        .member-name.owner-name .member-display-name,
        .member-name.co-owner-name .member-display-name {
          display: inline-block !important;
          background-size: 250% 100% !important;
          background-repeat: no-repeat !important;
          background-clip: text !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          background-position: 200% 0 !important;
          animation-duration: 1.8s !important;
          animation-timing-function: linear !important;
          animation-iteration-count: infinite !important;
          animation-direction: normal !important;
        }
        .member-name.owner-name .member-display-name {
          background-image: linear-gradient(110deg,
            #9b6500 0%, #f6cf58 34%, #ffe9a0 42%,
            #ffffff 48%, #fff9df 51%, #ffe9a0 56%,
            #d99a16 64%, #b77908 78%, #f6cf58 100%) !important;
          animation-name: rlmOwnerWaveLeftToRight !important;
          filter: drop-shadow(0 0 5px rgba(255, 205, 70, .95)) !important;
        }
        .member-name.co-owner-name .member-display-name {
          background-image: linear-gradient(110deg,
            #075985 0%, #38bdf8 34%, #a5e8ff 42%,
            #ffffff 48%, #f2fcff 51%, #a5e8ff 56%,
            #0ea5e9 64%, #0369a1 78%, #38bdf8 100%) !important;
          animation-name: rlmCoOwnerWaveLeftToRight !important;
          filter: drop-shadow(0 0 6px rgba(56, 189, 248, 1)) !important;
        }
        @keyframes rlmOwnerWaveLeftToRight {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }
        @keyframes rlmCoOwnerWaveLeftToRight {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }

      `}</style>

      <aside className="sidebar">
        <div className="brand">尺ḼⱮ<span>.</span></div>

        <div className="caption">MAIN MENU</div>

        {menu.map(([name, icon]) => (
          <button
            key={name}
            className={section === name ? 'nav active' : 'nav'}
            onClick={() => setSection(name)}
          >
            {name === 'My profile' && profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="nav-profile-avatar"
              />
            ) : (
              icon
            )}

            <span>{name}</span>
          </button>
        ))}

        <div className="caption" style={{ marginTop: '22px' }}>
          PRIVATE CHATS
        </div>

        {!session ? (
          <div className="staff-note">Sign in to see your chats.</div>
        ) : conversations.length === 0 ? (
          <div className="staff-note">No private chats yet.</div>
        ) : (
          conversations.map(conversation => (
            <button
              key={conversation.conversationId}
              className={
                selectedConversation === conversation.conversationId
                  ? 'nav active'
                  : 'nav'
              }
              onClick={() => {
                setSelectedConversation(conversation.conversationId)
                setSelectedName(displayName(conversation.friend))
                setSection('Messages')
              }}
              title={displayName(conversation.friend)}
            >
              <ChatAvatar
                person={conversation.friend}
                className="sidebar-chat-avatar"
                presenceStatus={presenceStatus(conversation.friend?.id)}
              />

              <span>
                <MemberName
                  person={conversation.friend}
                  role={memberRoles[conversation.friend.id]}
                  tierRoles={memberTierRoles[conversation.friend.id]}
                />
              </span>
            </button>
          ))
        )}

        {isStaff && (
          <>
            <div className="caption" style={{ marginTop: '22px' }}>
              STAFF
            </div>

            <button
              className={
                section === 'Staff Control Panel'
                  ? 'nav active'
                  : 'nav'
              }
              onClick={() => setSection('Staff Control Panel')}
            >
              🛡 <span>Staff Control Panel</span>
            </button>

            <div className="staff-note">
              Signed in as {staffRole}.
            </div>
          </>
        )}

        <div className="account">
          {session && profile?.avatar_url && (
            <img
              src={profile.avatar_url}
              alt=""
              className="sidebar-avatar"
            />
          )}

          {session ? (
            <MemberName
              person={{ display_name: profile?.display_name || session.user.email, username: profile?.username }}
              role={memberRoles[session.user.id] || staffRole}
                                      tierRoles={memberTierRoles[session.user.id]}
            />
          ) : 'Guest'}

          <small>{session ? 'SIGNED IN' : 'NOT SIGNED IN'}</small>
        </div>
      </aside>

      <main>
        <header>
          <strong>{section}</strong>
          <span className="online">● 尺ḼⱮ</span>

          <button
            className="theme-toggle"
            type="button"
            onClick={() => setLightMode(value => !value)}
            aria-label={
              lightMode
                ? 'Switch to dark mode'
                : 'Switch to light mode'
            }
          >
            {lightMode ? '🌙 Dark mode' : '☀️ Light mode'}
          </button>
        </header>

        <div className="content">
          {Page()}

          <div className="notice">
            <strong>尺ḼⱮ:</strong> New features are being built.
            Private messaging is available between accepted friends.
            Clan Chat is shared with all signed-in members.
          </div>
        </div>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
