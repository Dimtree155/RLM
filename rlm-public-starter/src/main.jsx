import React from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import ExtendedGames from './ExtendedGames.jsx'
import './style.css'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = url && anon ? createClient(url, anon) : null

const menu = [
  ['Home', '⌂'], ['Messages', '✉'], ['Clan Chat', '💬'], ['Friends', '♙'],
  ['Minigames', '🎮'], ['Leaderboard', '🏆'], ['Quests', '✦'],
  ['Coin shop', '🛍'], ['My profile', '◉']
]

function ChatAvatar({ person, className = 'chat-avatar' }) {
  const name = person?.display_name || person?.username || 'R'

  if (person?.avatar_url) {
    return (
      <img
        src={person.avatar_url}
        alt=""
        className={`${className} chat-avatar-image`}
      />
    )
  }

  return (
    <span className={className}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

function MemberName({ person, role, className = '', cosmetics = null }) {
  const isOwner = role === 'owner'
  const isStaff = ['owner', 'admin', 'moderator'].includes(role)

  return (
    <span className={`member-name ${isOwner ? 'owner-name' : ''} ${className}`.trim()}>
      {isOwner && <span className="owner-crown" aria-label="Owner">👑</span>}
      {cosmetics?.badge && <span className={`equipped-badge badge-${cosmetics.badge_style || ''}`} title={cosmetics.badge}>{cosmetics.badge === 'Star Badge' ? '⭐' : cosmetics.badge === 'Flame Badge' ? '🔥' : '💎'}</span>}
      <span>{person?.display_name || person?.username || 'RLM member'}</span>
      {cosmetics?.name_tag && <span className={`equipped-name-tag tag-${cosmetics.name_tag_style || ''}`}>{cosmetics.name_tag}</span>}
      {cosmetics?.title && <span className={cosmetics.title.trim().toLowerCase() === 'clan creator' ? 'equipped-title clan-creator-title' : 'equipped-title'}>{cosmetics.title}</span>}
      {isStaff && !isOwner && (
        <span className={`member-role-tag ${role}`}>{role}</span>
      )}
    </span>
  )
}


function ProfileHover({ person, role, cosmetics, supabase, children }) {
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
    <span className="profile-hover-wrap"
      onMouseEnter={(event) => { clearTimeout(timer.current); showProfile(event) }}
      onMouseLeave={() => { timer.current = setTimeout(() => setOpen(false), 180) }}
      onFocus={showProfile}
      onBlur={() => setOpen(false)}
    >
      {children || <MemberName person={person} role={role} cosmetics={cosmetics} />}
      {open && (
        <span className="profile-hover-card" role="status" style={{ top: cardPosition.top, left: cardPosition.left }}>
          <span className="profile-hover-heading">
            <strong>{person?.display_name || person?.username || 'RLM member'}</strong>
            {role && <small>{role.toUpperCase()}</small>}
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

function MiniGames({ onRecordGame }) {
  const [game, setGame] = React.useState('tic-tac-toe')
  const [board, setBoard] = React.useState(Array(9).fill(''))
  const [roundMessage, setRoundMessage] = React.useState('You are X. Try to beat the computer.')
  const [reactionPhase, setReactionPhase] = React.useState('idle')
  const [reactionStart, setReactionStart] = React.useState(0)
  const [reactionResult, setReactionResult] = React.useState('')
  const timerRef = React.useRef(null)

  React.useEffect(() => () => clearTimeout(timerRef.current), [])

  function winnerOf(cells) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
    for (const [a,b,c] of lines) if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return cells[a]
    return cells.every(Boolean) ? 'draw' : null
  }

  function playCell(index) {
    if (board[index] || winnerOf(board)) return
    const next = [...board]
    next[index] = 'X'
    const humanResult = winnerOf(next)
    if (humanResult) {
      setBoard(next)
      setRoundMessage(humanResult === 'X' ? 'You won! 🎉' : 'It is a draw.')
      onRecordGame('tic-tac-toe')
      return
    }
    const available = next.map((value, i) => value ? -1 : i).filter(i => i >= 0)
    const botMove = available[Math.floor(Math.random() * available.length)]
    next[botMove] = 'O'
    const result = winnerOf(next)
    setBoard(next)
    if (result) {
      setRoundMessage(result === 'O' ? 'The computer won. Try again!' : 'It is a draw.')
      onRecordGame('tic-tac-toe')
    } else setRoundMessage('Your turn — choose a square.')
  }

  function resetBoard() {
    setBoard(Array(9).fill(''))
    setRoundMessage('You are X. Try to beat the computer.')
  }

  function startReaction() {
    clearTimeout(timerRef.current)
    setReactionResult('Wait for GO…')
    setReactionPhase('waiting')
    timerRef.current = setTimeout(() => {
      setReactionStart(Date.now())
      setReactionPhase('go')
      setReactionResult('GO! Click the button!')
    }, 1200 + Math.floor(Math.random() * 1800))
  }

  function hitReaction() {
    if (reactionPhase === 'waiting') {
      clearTimeout(timerRef.current)
      setReactionPhase('idle')
      setReactionResult('Too early! Press Start and try again.')
    } else if (reactionPhase === 'go') {
      const ms = Date.now() - reactionStart
      setReactionPhase('idle')
      setReactionResult(`Your reaction time: ${ms} ms`)
      onRecordGame('reaction')
    }
  }

  return (
    <div className="minigames-wrap">
      <div className="game-tabs">
        <button className={game === 'tic-tac-toe' ? 'primary' : 'secondary'} onClick={() => setGame('tic-tac-toe')}>⭕ Tic-tac-toe</button>
        <button className={game === 'reaction' ? 'primary' : 'secondary'} onClick={() => setGame('reaction')}>⚡ Reaction test</button>
      </div>
      {game === 'tic-tac-toe' ? (
        <div className="panel game-panel">
          <h3>⭕ Tic-tac-toe</h3>
          <p className="muted">Play as X against the computer. A completed round counts toward your daily game quests.</p>
          <div className="tic-board">{board.map((cell, index) => <button key={index} className="tic-cell" onClick={() => playCell(index)} disabled={Boolean(cell) || Boolean(winnerOf(board))}>{cell}</button>)}</div>
          <p>{roundMessage}</p>
          <button className="secondary" onClick={resetBoard}>New round</button>
        </div>
      ) : (
        <div className="panel game-panel">
          <h3>⚡ Reaction test</h3>
          <p className="muted">Press Start, wait for GO, then click as quickly as you can. Clicking early cancels the round.</p>
          <div className="reaction-display">{reactionResult || 'Ready when you are'}</div>
          {reactionPhase === 'idle' ? <button className="primary" onClick={startReaction}>Start</button> : <button className="primary" onClick={hitReaction}>{reactionPhase === 'waiting' ? 'Wait…' : 'CLICK!'}</button>}
        </div>
      )}
    </div>
  )
}

function App() {
  const [session, setSession] = React.useState(null)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [signupDisplayName, setSignupDisplayName] = React.useState('')
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
  const [memberCosmetics, setMemberCosmetics] = React.useState({})
  const [progressData, setProgressData] = React.useState(null)
  const [progressLoading, setProgressLoading] = React.useState(false)
  const [progressBusy, setProgressBusy] = React.useState(false)
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
  const [loadingClanChat, setLoadingClanChat] = React.useState(false)
  const [sendingClanMessage, setSendingClanMessage] = React.useState(false)

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
  const [suspension, setSuspension] = React.useState(null)

  const isStaff = ['owner', 'admin', 'moderator'].includes(staffRole)

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
      .then(({ data, error }) => {
        if (error) {
          setStatus(error.message)
        } else {
          setProfile(data)
          setNewDisplayName(data?.display_name || '')
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
    async function loadCosmetics() {
      if (!session || !supabase) { setMemberCosmetics({}); return }
      const { data, error } = await supabase.rpc('rlm_get_public_member_cosmetics')
      if (cancelled) return
      if (error) { setStatus('Could not load member cosmetics: ' + error.message); return }
      setMemberCosmetics(Object.fromEntries((data || []).map(row => [row.user_id, row])))
    }
    loadCosmetics()
    return () => { cancelled = true }
  }, [session])

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
    if (session && ['Leaderboard', 'Friends', 'Minigames'].includes(section)) {
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
          display_name: 'RLM member',
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
        .select('id, sender_id, body, created_at')
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
        { event: 'INSERT', schema: 'public', table: 'clan_chat_messages' },
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

    if (!body || !session || !supabase) return

    if (body.length > 1000) {
      return setStatus('Clan chat messages must be 1000 characters or fewer.')
    }

    setSendingClanMessage(true)
    setStatus('')

    const { error } = await supabase.from('clan_chat_messages')
      .insert({
        sender_id: session.user.id,
        body
      })

    if (error) {
      setStatus('Message could not be sent: ' + error.message)
    } else {
      setClanMessageText('')
    }

    setSendingClanMessage(false)
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

    if (!cleanDisplayName || cleanDisplayName.length > 24) {
      return setStatus('Choose a display name between 1 and 24 characters.')
    }

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: cleanDisplayName }
      }
    })

    if (error) {
      setStatus(error.message)
    } else if (data?.session && data.user) {
      const { error: profileError } = await supabase.from('profiles')
        .upsert({
          id: data.user.id,
          display_name: cleanDisplayName
        }, {
          onConflict: 'id'
        })

      setStatus(
        profileError
          ? 'Account created, but the display name could not be saved: ' + profileError.message
          : 'Account created! Welcome to RLM.'
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
    setSelectedName(friend.display_name || friend.username || 'RLM member')
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
    return person?.display_name || person?.username || 'RLM member'
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
          <p>Your RLM account currently has an active {suspension.action_type}.</p>
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
            If you think this restriction was applied by mistake, contact RLM staff.
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
            <h1>RLM<br />SHELL SHOCKERS CLAN</h1>
            <p>
              The home of the RLM Shell Shockers clan. Connect with clan members,
              chat with friends, compete, and represent RLM.
            </p>
          </section>

          {!session ? (
            <div className="panel auth">
              <h2>Create an account or sign in</h2>
              <p className="muted">Join the RLM community.</p>

              <form onSubmit={signIn}>
                <label>
                  Display name (for new accounts)
                  <input
                    type="text"
                    maxLength="24"
                    placeholder="Your RLM name"
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
              <p className="muted">Your RLM account is connected.</p>
              <button className="secondary" onClick={signOut}>Sign out</button>
              <p className="status">{status}</p>
            </div>
          )}

          <div className="grid">
            <div className="panel">
              <h3>✉ Messages</h3>
              <p className="muted">Chat with your RLM friends.</p>
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
              <p className="muted">Your RLM journey.</p>
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
              <h2>✉ RLM Messages</h2>
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
                    <ChatAvatar person={conversation.friend} />
                    <span className="chat-conversation-name">
                      <MemberName
                        person={conversation.friend}
                        role={memberRoles[conversation.friend.id]}
                        cosmetics={memberCosmetics[conversation.friend.id]}
                      />
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
                        <MemberName
                          person={selectedFriend}
                          role={memberRoles[selectedFriend?.id]}
                        />
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
                            />

                            <div className="chat-message-content">
                              <div className="chat-message-meta">
                                <strong>
                                  {isOwn ? (
                                    <ProfileHover supabase={supabase} person={{ id: session.user.id, display_name: profile?.display_name || 'You' }} role={memberRoles[session.user.id] || staffRole} cosmetics={memberCosmetics[session.user.id]} />
                                  ) : (
                                    <ProfileHover supabase={supabase} person={selectedFriend} role={memberRoles[selectedFriend?.id]} cosmetics={memberCosmetics[selectedFriend?.id]} />
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
            <h2>💬 RLM Clan Chat</h2>
            <p>Please sign in to join the clan chat.</p>
          </div>
        )
      }

      return (
        <div className="chat-page">
          <div className="chat-heading">
            <div>
              <h2>💬 RLM Clan Chat</h2>
              <p className="muted">The shared chat for RLM members</p>
            </div>

            <span className="chat-online-label">● Clan channel</span>
          </div>

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
                  <strong>Welcome to the RLM clan chat!</strong>
                  <span>Be the first to send a message.</span>
                </div>
              ) : (
                clanMessages.map(message => (
                  <div key={message.id} className="clan-message-row">
                    <ChatAvatar person={message.sender} />

                    <div className="clan-message-content">
                      <div className="chat-message-meta">
                        <strong><ProfileHover supabase={supabase} person={message.sender} role={memberRoles[message.sender?.id]} cosmetics={memberCosmetics[message.sender?.id]} /></strong>
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

                      <div className="clan-message-body">{message.body}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form className="chat-composer" onSubmit={sendClanMessage}>
              <input
                aria-label="Message the RLM clan"
                maxLength="1000"
                placeholder="Message #general..."
                value={clanMessageText}
                onChange={e => setClanMessageText(e.target.value)}
              />

              <button
                className="chat-send-button"
                type="submit"
                disabled={sendingClanMessage || !clanMessageText.trim()}
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
                    <MemberName person={sender} role={memberRoles[row.requester]} />
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
                  <MemberName person={friend} role={memberRoles[friend.id]} />
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
            <h2>🏆 RLM Members</h2>
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
          <h2>🏆 RLM Members</h2>
          <p className="muted">
            Find clan members, send friend requests, and start private chats after a request is accepted.
          </p>

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
                     <MemberName person={sender} role={memberRoles[row.requester]} />
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
            <p className="muted">Loading RLM members...</p>
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
                      <ProfileHover supabase={supabase} person={member} role={memberRoles[member.id]} cosmetics={memberCosmetics[member.id]} />
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

                  {member.username && (
                    <div className="muted" style={{ fontSize: '0.9em' }}>
                      @{member.username}
                    </div>
                  )}
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
            Manage RLM member restrictions and review active moderation actions.
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
                  <label>Role<select value={ownerRoleChoice} onChange={e => setOwnerRoleChoice(e.target.value)}><option value="moderator">Moderator</option><option value="admin">Admin</option><option value="member">Remove staff (Member)</option></select></label>
                  <button className="primary" disabled={staffBusy || !ownerRoleTarget} onClick={ownerChangeRole}>Save role</button>
                </div>
                <div>
                  <h4>Give a member a custom title</h4>
                  <label>Member<select value={titleTarget} onChange={e => setTitleTarget(e.target.value)}><option value="">Choose a member…</option>{ownerDirectory.map(m => <option key={m.user_id} value={m.user_id}>{m.display_name || m.username || m.user_id}</option>)}</select></label>
                  <label>Title<input maxLength={32} value={titleValue} onChange={e => setTitleValue(e.target.value)} placeholder="e.g. Clan Legend" /></label>
                  <button className="primary" disabled={staffBusy || !titleTarget || !titleValue.trim()} onClick={ownerGrantTitle}>Grant title</button>
                  <p className="muted">Only the owner can grant titles or change staff roles.</p>
                </div>
              </div>
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
                      return <option key={memberId} value={memberId}>{member.display_name || member.username || 'RLM member'}</option>
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
                        {member.display_name || member.username || 'RLM member'}
                        {member.username ? ` (@${member.username})` : ''}
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
                    {action.moderator_display_name || action.moderator_username || 'RLM staff'}
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
          <p className="muted">Buy name tags and badges with coins earned in RLM games and quests.</p>
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
                    Choose an image to use as your RLM avatar (max 3 MB).
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
              <p><strong>Username:</strong> {profile?.username || 'Not set yet'}</p>
              <p>
                <strong>Display name:</strong>{' '}
                <MemberName
                  person={{ display_name: profile?.display_name || 'Not set yet' }}
                  role={staffRole}
                  cosmetics={memberCosmetics[session.user.id]}
                />
              </p>
              <p><strong>RLM role:</strong> {staffRole}</p>

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
          align-items: center;
          gap: 5px;
          font-weight: 650;
        }

        .owner-name {
          color: #ffd447 !important;
          background: linear-gradient(100deg, #fff6bd 0%, #ffd447 28%, #e6a600 52%, #fff0a1 75%, #ffd447 100%);
          background-size: 220% auto;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: ownerShine 3.2s linear infinite;
          font-weight: 900;
          filter: drop-shadow(0 0 5px rgba(255, 196, 36, 0.34));
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
        .profile-hover-wrap { position:relative; display:inline-flex; cursor:pointer; }
        .profile-hover-card { position:fixed; z-index:1000; left:0; top:calc(100% + 8px); width:220px; display:flex; flex-direction:column; gap:7px; padding:12px; border-radius:12px; background:#19152a; border:1px solid rgba(170,140,255,.38); box-shadow:0 12px 35px rgba(0,0,0,.4); color:#f5f1ff; font-size:12px; font-weight:500; white-space:normal; }
        .profile-hover-heading { display:flex; justify-content:space-between; gap:8px; align-items:center; border-bottom:1px solid rgba(255,255,255,.12); padding-bottom:7px; }
        .profile-hover-heading small { color:#b99cff; }
        .profile-hover-title { color:#ffd447; font-weight:800; }
        .progress-summary { display:flex; flex-wrap:wrap; gap:14px; padding:12px; margin:12px 0; border-radius:10px; background:rgba(130,90,220,.12); }
        .minigames-wrap { margin-top:16px; }
        .game-tabs { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
        .game-panel { text-align:center; }
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
      `}</style>

      <aside className="sidebar">
        <div className="brand">RLM<span>.</span></div>

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
              />

              <span>
                <MemberName
                  person={conversation.friend}
                  role={memberRoles[conversation.friend.id]}
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
              person={{ display_name: profile?.display_name || session.user.email }}
              role={memberRoles[session.user.id] || staffRole}
            />
          ) : 'Guest'}

          <small>{session ? 'SIGNED IN' : 'NOT SIGNED IN'}</small>
        </div>
      </aside>

      <main>
        <header>
          <strong>{section}</strong>
          <span className="online">● RLM</span>

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
            <strong>RLM:</strong> New features are being built.
            Private messaging is available between accepted friends.
            Clan Chat is shared with all signed-in members.
          </div>
        </div>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
