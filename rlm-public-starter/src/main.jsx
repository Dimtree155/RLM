import React from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import './style.css'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = url && anon ? createClient(url, anon) : null

const menu = [
  ['Home', '⌂'], ['Messages', '✉'], ['Clan Chat', '💬'], ['Friends', '♙'],
  ['Minigames', '🎮'], ['Leaderboard', '🏆'], ['Quests', '✦'],
  ['Coin shop', '🛍'], ['My profile', '◉']
]

function App() {
  const [session, setSession] = React.useState(null)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [signupDisplayName, setSignupDisplayName] = React.useState('')
  const [status, setStatus] = React.useState('')
  const [section, setSection] = React.useState('Home')
  const [lightMode, setLightMode] = React.useState(() => {
    try { return localStorage.getItem('rlm-theme') === 'light' } catch { return false }
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

  React.useEffect(() => {
    try { localStorage.setItem('rlm-theme', lightMode ? 'light' : 'dark') } catch {}
  }, [lightMode])

  React.useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
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
        if (error) setStatus(error.message)
        else {
          setProfile(data)
          setNewDisplayName(data?.display_name || '')
        }
      })
  }, [session])

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
        .select('id, username, display_name, created_at')
        .order('display_name', { ascending: true }),
      supabase.from('friendships')
        .select('id, requester, addressee, status, created_at')
        .or(`requester.eq.${userId},addressee.eq.${userId}`)
    ])
    if (peopleResult.error) setStatus('Could not load members: ' + peopleResult.error.message)
    else setMembers((peopleResult.data || []).filter(person => person.id !== userId))
    if (friendshipResult.error) setStatus('Could not load friend requests: ' + friendshipResult.error.message)
    else setFriendshipRows(friendshipResult.data || [])
    setLoadingMembers(false)
  }

  React.useEffect(() => {
    if (session && (section === 'Leaderboard' || section === 'Friends')) refreshDirectory()
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
    if (error) setStatus('Could not send friend request: ' + error.message)
    else setStatus('Friend request sent to ' + (member.display_name || member.username || 'member') + '.')
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
    if (error) setStatus('Could not accept request: ' + error.message)
    else setStatus('Friend request accepted. You can now message each other.')
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
    if (error) setStatus('Could not decline request: ' + error.message)
    else setStatus('Friend request declined.')
    await refreshDirectory()
    setFriendshipBusy('')
  }

  // Load accepted friends for the Messages page
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
        .select('id, username, display_name')
        .in('id', friendIds)
      if (profileError) setStatus(profileError.message)
      else setFriends(profiles || [])
    }
    loadFriends()
  }, [session, section, friendshipRows])

  // Load saved private conversations whenever the user signs in.
  // This keeps the sidebar list available on every page, not just Messages.
  React.useEffect(() => {
    if (!session || !supabase) {
      setConversations([])
      return
    }
    let cancelled = false
    async function loadConversations() {
      const userId = session.user.id
      const { data: memberships, error } = await supabase.from('conversation_members')
        .select('conversation_id').eq('user_id', userId)
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
        .select('conversation_id, user_id').in('conversation_id', ids).neq('user_id', userId)
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
        .select('id, username, display_name').in('id', otherIds)
      if (peopleError) {
        setStatus(peopleError.message)
        return
      }
      const profileMap = Object.fromEntries((people || []).map(person => [person.id, person]))
      const result = (otherMembers || []).map(member => ({
        conversationId: member.conversation_id,
        friend: profileMap[member.user_id] || {
          id: member.user_id, display_name: 'RLM member', username: ''
        }
      }))
      if (!cancelled) setConversations(result)
    }
    loadConversations()
    return () => { cancelled = true }
  }, [session])

  // Load shared clan chat and subscribe to new messages
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
        .order('created_at', { ascending: false }).limit(100)
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
          .select('id, username, display_name').in('id', userIds)
        if (peopleError) setStatus('Could not load chat names: ' + peopleError.message)
        else profileMap = Object.fromEntries((people || []).map(person => [person.id, person]))
      }
      if (!cancelled) {
        setClanMessages(rows.reverse().map(item => ({ ...item, sender: profileMap[item.sender_id] || null })))
        setLoadingClanChat(false)
      }
    }
    loadClanMessages()
    const channel = supabase.channel('rlm-public-clan-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clan_chat_messages' }, () => loadClanMessages())
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
    if (body.length > 1000) return setStatus('Clan chat messages must be 1000 characters or fewer.')
    setSendingClanMessage(true)
    setStatus('')
    const { error } = await supabase.from('clan_chat_messages')
      .insert({ sender_id: session.user.id, body })
    if (error) setStatus('Message could not be sent: ' + error.message)
    else setClanMessageText('')
    setSendingClanMessage(false)
  }

  // Load private messages and subscribe to inserts
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
      if (error) setStatus(error.message)
      else setMessages(data || [])
      setLoadingMessages(false)
    }
    loadMessages()
    const channel = supabase.channel(`messages-${selectedConversation}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${selectedConversation}`
      }, payload => {
        setMessages(previous => previous.some(item => item.id === payload.new.id)
          ? previous : [...previous, payload.new])
      }).subscribe()
    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [session, selectedConversation])

  async function signUp(e) {
    e.preventDefault()
    setStatus('Creating account...')
    if (!supabase) return setStatus('Supabase is not connected.')
    const cleanDisplayName = signupDisplayName.trim()
    if (!cleanDisplayName || cleanDisplayName.length > 24)
      return setStatus('Choose a display name between 1 and 24 characters.')
    const { error, data } = await supabase.auth.signUp({
      email, password, options: { data: { display_name: cleanDisplayName } }
    })
    if (error) setStatus(error.message)
    else if (data?.session && data.user) {
      const { error: profileError } = await supabase.from('profiles')
        .upsert({ id: data.user.id, display_name: cleanDisplayName }, { onConflict: 'id' })
      setStatus(profileError
        ? 'Account created, but the display name could not be saved: ' + profileError.message
        : 'Account created! Welcome to RLM.')
    } else {
      setStatus('Account created. If email confirmation is enabled in Supabase, you will still need to confirm your email.')
    }
  }

  async function signIn(e) {
    e.preventDefault()
    setStatus('Signing in...')
    if (!supabase) return setStatus('Supabase is not connected.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setStatus(error ? error.message : 'Signed in!')
  }

  async function signOut() {
    await supabase?.auth.signOut()
    setStatus('Signed out.')
    setSection('Home')
    setSelectedConversation(null)
    setMessages([])
    setConversations([])
  }

  async function saveDisplayName() {
    const cleanName = newDisplayName.trim()
    if (!session || !supabase) return setStatus('Please sign in first.')
    if (!cleanName || cleanName.length > 24) return setStatus('Enter a name between 1 and 24 characters.')
    setSavingName(true)
    setStatus('Saving your name...')
    const { data, error } = await supabase.from('profiles')
      .update({ display_name: cleanName }).eq('id', session.user.id).select().maybeSingle()
    if (error) setStatus('Could not save your name: ' + error.message)
    else if (!data) setStatus('Your profile could not be found.')
    else {
      setProfile(data)
      setStatus('Your name has been updated!')
    }
    setSavingName(false)
  }

  async function uploadAvatar(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !session || !supabase) return
    if (!file.type.startsWith('image/')) return setStatus('Please choose an image file.')
    if (file.size > 3 * 1024 * 1024) return setStatus('Please choose an image smaller than 3 MB.')

    setUploadingAvatar(true)
    setStatus('Uploading profile picture...')
    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const filePath = `${session.user.id}/${Date.now()}.${extension || 'jpg'}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
      cacheControl: '3600', upsert: true, contentType: file.type
    })
    if (uploadError) {
      setStatus('Could not upload picture: ' + uploadError.message)
      setUploadingAvatar(false)
      return
    }
    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const avatarUrl = publicData.publicUrl
    const { data, error } = await supabase.from('profiles')
      .update({ avatar_url: avatarUrl }).eq('id', session.user.id)
      .select('username, display_name, avatar_url, created_at').maybeSingle()
    if (error) setStatus('Picture uploaded, but profile could not be updated: ' + error.message)
    else if (!data) setStatus('Picture uploaded, but your profile could not be found.')
    else {
      setProfile(data)
      setStatus('Profile picture updated!')
    }
    setUploadingAvatar(false)
  }

  async function startConversation(friend) {
    if (!supabase || !session) return
    if (friend.id === session.user.id) return
    setStatus('Opening conversation...')
    const { data, error } = await supabase.rpc('start_private_conversation', { other_user_id: friend.id })
    if (error) {
      setStatus('Could not open conversation: ' + error.message)
      return
    }
    setSelectedConversation(data)
    setSelectedName(friend.display_name || friend.username || 'RLM member')
    setMessageText('')
    // Add it to the sidebar immediately; the saved membership also reloads on next sign-in.
    setConversations(previous => {
      const withoutDuplicate = previous.filter(item => item.conversationId !== data)
      return [...withoutDuplicate, { conversationId: data, friend }]
    })
    setStatus('')
    setSection('Messages')
  }

  async function sendMessage(e) {
    e.preventDefault()
    const body = messageText.trim()
    if (!body || !selectedConversation || !session || !supabase) return
    if (body.length > 2000) return setStatus('Messages must be 2000 characters or fewer.')
    setSendingMessage(true)
    setStatus('')
    const { data, error } = await supabase.from('messages').insert({
      conversation_id: selectedConversation, sender_id: session.user.id, body
    }).select().single()
    if (error) setStatus('Message could not be sent: ' + error.message)
    else {
      setMessageText('')
      setMessages(previous => previous.some(item => item.id === data.id) ? previous : [...previous, data])
    }
    setSendingMessage(false)
  }

  function displayName(person) {
    return person?.display_name || person?.username || 'RLM member'
  }

  function memberFriendControls(member) {
    const relation = relationshipWith(member.id)
    const busy = friendshipBusy === member.id || friendshipBusy === relation?.id
    if (!session) return <span className="muted">Sign in to connect</span>
    if (relation?.status === 'accepted') {
      return null
    }
    if (relation?.status === 'pending' && relation.requester === session.user.id) {
      return <button className="secondary" disabled>Request sent</button>
    }
    if (relation?.status === 'pending' && relation.addressee === session.user.id) {
      return <div className="actions">
        <button className="primary" disabled={busy} onClick={() => acceptFriendRequest(relation)}>Accept</button>
        <button className="secondary" disabled={busy} onClick={() => declineFriendRequest(relation)}>Decline</button>
      </div>
    }
    if (relation?.status === 'blocked') return <button className="secondary" disabled>Unavailable</button>
    return <button className="primary" disabled={busy} onClick={() => sendFriendRequest(member)}>
      {busy ? 'Sending...' : '＋ Add friend'}
    </button>
  }

  function Page() {
    if (section === 'Home') {
      return <>
        <section className="hero">
          <div className="eyebrow">WELCOME TO THE CLAN</div>
          <h1>RLM<br />SHELL SHOCKERS CLAN</h1>
          <p>The home of the RLM Shell Shockers clan. Connect with clan members, chat with friends, compete, and represent RLM.</p>
        </section>
        {!session ? (
          <div className="panel auth">
            <h2>Create an account or sign in</h2>
            <p className="muted">Join the RLM community.</p>
            <form onSubmit={signIn}>
              <label>Display name (for new accounts)
                <input type="text" maxLength="24" placeholder="Your RLM name" value={signupDisplayName} onChange={e => setSignupDisplayName(e.target.value)} />
              </label>
              <label>Email
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
              </label>
              <label>Password
                <input type="password" minLength="8" required value={password} onChange={e => setPassword(e.target.value)} />
              </label>
              <div className="actions">
                <button className="primary">Sign in</button>
                <button type="button" className="secondary" onClick={signUp}>Create account</button>
              </div>
            </form>
            <p className="status">{status}</p>
          </div>
        ) : (
          <div className="panel">
            <h2>Welcome back, {profile?.display_name || session.user.email}!</h2>
            <p className="muted">Your RLM account is connected.</p>
            <button className="secondary" onClick={signOut}>Sign out</button>
            <p className="status">{status}</p>
          </div>
        )}
        <div className="grid">
          <div className="panel"><h3>✉ Messages</h3><p className="muted">Chat with your RLM friends.</p><button className="secondary" onClick={() => setSection('Messages')}>Open messages</button></div>
          <div className="panel"><h3>🎮 Minigames</h3><p className="muted">Your gaming area.</p></div>
          <div className="panel"><h3>🏆 Progression</h3><p className="muted">Your RLM journey.</p></div>
        </div>
      </>
    }

    if (section === 'Messages') {
      if (!session) return <div className="panel"><h2>✉ Messages</h2><p>Please sign in to use messages.</p></div>
      return <div className="chat-page">
        <div className="chat-heading">
          <div><h2>✉ RLM Messages</h2><p className="muted">Your private conversations</p></div>
        </div>
        <div className="chat-layout">
          <aside className="chat-conversation-list">
            <div className="chat-section-label">DIRECT MESSAGES</div>
            {conversations.length === 0 ? <p className="muted chat-empty-list">No conversations yet. Open a member's message icon on the Leaderboard to start one.</p> : conversations.map(conversation => (
              <button key={conversation.conversationId}
                className={`chat-conversation-button${selectedConversation === conversation.conversationId ? ' active' : ''}`}
                onClick={() => {
                  setSelectedConversation(conversation.conversationId)
                  setSelectedName(displayName(conversation.friend))
                }}>
                <span className="chat-avatar">{displayName(conversation.friend).slice(0, 1).toUpperCase()}</span>
                <span className="chat-conversation-name">{displayName(conversation.friend)}</span>
              </button>
            ))}
          </aside>
          <section className="chat-main">
            {selectedConversation ? <>
              <div className="chat-topbar">
                <span className="chat-avatar">{selectedName.slice(0, 1).toUpperCase()}</span>
                <div><strong>{selectedName}</strong><small>Private conversation</small></div>
              </div>
              <div className="chat-messages">
                {loadingMessages ? <p className="muted chat-placeholder">Loading messages...</p> : messages.length === 0 ? <div className="chat-placeholder"><strong>This is the beginning of your conversation.</strong><span>Send a message to say hello!</span></div> : messages.map(message => (
                  <div key={message.id} className={`chat-message-row${message.sender_id === session.user.id ? ' own' : ' incoming'}`}>
                    <div className="chat-message-content">
                      <div className="chat-message-meta">
                        <strong>{message.sender_id === session.user.id ? 'You' : selectedName}</strong>
                        <small>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                      </div>
                      <div className="chat-message-bubble">{message.body}</div>
                    </div>
                  </div>
                ))}
              </div>
              <form className="chat-composer" onSubmit={sendMessage}>
                <input aria-label="Write a private message" maxLength="2000" placeholder={`Message @${selectedName}...`} value={messageText} onChange={e => setMessageText(e.target.value)} />
                <button className="chat-send-button" type="submit" disabled={sendingMessage || !messageText.trim()} aria-label="Send message" title="Send message">{sendingMessage ? '…' : '➤'}</button>
              </form>
            </> : <div className="chat-placeholder chat-no-selection"><strong>Select a conversation</strong><span>Choose a direct message on the left, or start one from the Leaderboard.</span></div>}
          </section>
        </div>
        <p className="status">{status}</p>
      </div>
    }

    if (section === 'Clan Chat') {
      if (!session) return <div className="panel"><h2>💬 RLM Clan Chat</h2><p>Please sign in to join the clan chat.</p></div>
      return <div className="chat-page">
        <div className="chat-heading">
          <div><h2>💬 RLM Clan Chat</h2><p className="muted">The shared chat for RLM members</p></div>
          <span className="chat-online-label">● Clan channel</span>
        </div>
        <section className="chat-main clan-chat-main">
          <div className="chat-topbar">
            <span className="chat-channel-icon">#</span>
            <div><strong>general</strong><small>Everyone signed in can join the conversation</small></div>
          </div>
          <div className="chat-messages clan-chat-messages">
            {loadingClanChat ? <p className="muted chat-placeholder">Loading clan chat...</p> : clanMessages.length === 0 ? <div className="chat-placeholder"><strong>Welcome to the RLM clan chat!</strong><span>Be the first to send a message.</span></div> : clanMessages.map(message => (
              <div key={message.id} className="clan-message-row">
                <span className="chat-avatar">{displayName(message.sender).slice(0, 1).toUpperCase()}</span>
                <div className="clan-message-content">
                  <div className="chat-message-meta">
                    <strong>{displayName(message.sender)}</strong>
                    <small>{new Date(message.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
                  </div>
                  <div className="clan-message-body">{message.body}</div>
                </div>
              </div>
            ))}
          </div>
          <form className="chat-composer" onSubmit={sendClanMessage}>
            <input aria-label="Message the RLM clan" maxLength="1000" placeholder="Message #general..." value={clanMessageText} onChange={e => setClanMessageText(e.target.value)} />
            <button className="chat-send-button" type="submit" disabled={sendingClanMessage || !clanMessageText.trim()} aria-label="Send to clan" title="Send to clan">{sendingClanMessage ? '…' : '➤'}</button>
          </form>
        </section>
        <p className="status">{status}</p>
      </div>
    }

    if (section === 'Friends') {
      if (!session) return <div className="panel"><h2>♙ Friends</h2><p>Please sign in to view friends and requests.</p></div>
      const accepted = friends
      const incoming = friendshipRows.filter(row => row.status === 'pending' && row.addressee === session.user.id)
      return <div className="panel">
        <h2>♙ Friends</h2>
        <p className="muted">Manage your friend requests and chat with accepted friends.</p>
        <h3>Incoming requests ({incoming.length})</h3>
        {incoming.length === 0 ? <p className="muted">No incoming friend requests.</p> : incoming.map(row => {
          const sender = members.find(person => person.id === row.requester)
          return <div className="panel" key={row.id}>
            <strong>{displayName(sender)}</strong>
            <div className="actions" style={{ marginTop: '10px' }}>
              <button className="primary" disabled={friendshipBusy === row.id} onClick={() => acceptFriendRequest(row)}>Accept</button>
              <button className="secondary" disabled={friendshipBusy === row.id} onClick={() => declineFriendRequest(row)}>Decline</button>
            </div>
          </div>
        })}
        <h3>Your friends ({accepted.length})</h3>
        {accepted.length === 0 ? <p className="muted">No accepted friends yet. Visit the Leaderboard to find members.</p> : accepted.map(friend => (
          <div className="panel" key={friend.id}>
            <strong>{displayName(friend)}</strong>
            <button className="secondary" style={{ marginLeft: '12px' }} onClick={() => startConversation(friend)}>✉ Message</button>
          </div>
        ))}
        <p className="status">{status}</p>
      </div>
    }

    if (section === 'Minigames') return <div className="panel">
      <h2>🎮 Minigames</h2><p className="muted">Choose a game to play.</p>
      <div className="grid">
        <div className="panel"><h3>⚔️ Arena</h3><p>Coming soon!</p></div>
        <div className="panel"><h3>♟ Chess</h3><p>Coming soon!</p></div>
        <div className="panel"><h3>⭕ Tic-tac-toe</h3><p>Coming soon!</p></div>
        <div className="panel"><h3>🏎️ Car racer</h3><p>Coming soon!</p></div>
      </div>
    </div>

    if (section === 'Leaderboard') {
      if (!session) return <div className="panel"><h2>🏆 RLM Members</h2><p>Please sign in to view the member directory and connect with other members.</p></div>
      const incoming = friendshipRows.filter(row => row.status === 'pending' && row.addressee === session.user.id)
      return <div className="panel">
        <h2>🏆 RLM Members</h2>
        <p className="muted">Find clan members, send friend requests, and start private chats after a request is accepted.</p>
        {incoming.length > 0 && <div className="panel">
          <h3>Friend requests waiting for you ({incoming.length})</h3>
          {incoming.map(row => {
            const sender = members.find(person => person.id === row.requester)
            return <div key={row.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <strong>{displayName(sender)}</strong>
              <div className="actions">
                <button className="primary" disabled={friendshipBusy === row.id} onClick={() => acceptFriendRequest(row)}>Accept</button>
                <button className="secondary" disabled={friendshipBusy === row.id} onClick={() => declineFriendRequest(row)}>Decline</button>
              </div>
            </div>
          })}
        </div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <h3>Member directory ({members.length})</h3>
          <button className="secondary" onClick={refreshDirectory} disabled={loadingMembers}>{loadingMembers ? 'Refreshing...' : '↻ Refresh'}</button>
        </div>
        {loadingMembers ? <p className="muted">Loading RLM members...</p> : members.length === 0 ? <p className="muted">No other members found yet.</p> : members.map(member => (
          <div className="panel" key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <strong>{displayName(member)}</strong>
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
              {member.username && <div className="muted" style={{ fontSize: '0.9em' }}>@{member.username}</div>}
            </div>
            <div className="actions">{memberFriendControls(member)}</div>
          </div>
        ))}
        <p className="status">{status}</p>
      </div>
    }

    if (section === 'Quests') return <div className="panel"><h2>✦ Quests</h2><p className="muted">Complete challenges and earn rewards.</p><p>Quests are coming soon!</p></div>
    if (section === 'Coin shop') return <div className="panel"><h2>🛍 Coin shop</h2><p className="muted">Spend your RLM coins on cosmetics and items.</p><p>The shop is coming soon!</p></div>

    if (section === 'My profile') return <div className="panel">
      <h2>◉ My profile</h2>
      {session ? <>
        <div className="profile-avatar-editor">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="Your profile" className="profile-avatar-preview" /> : <div className="profile-avatar-placeholder">{(profile?.display_name || session.user.email || 'R').slice(0, 1).toUpperCase()}</div>}
          <div>
            <strong>Profile picture</strong>
            <p className="muted">Choose an image to use as your RLM avatar (max 3 MB).</p>
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={uploadAvatar} style={{ display: 'none' }} />
            <button className="secondary" type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}>{uploadingAvatar ? 'Uploading...' : 'Change profile picture'}</button>
          </div>
        </div>
        <p><strong>Email:</strong> {session.user.email}</p>
        <p><strong>Username:</strong> {profile?.username || 'Not set yet'}</p>
        <p><strong>Display name:</strong> {profile?.display_name || 'Not set yet'}</p>
        <label>Change your display name
          <input type="text" maxLength={24} placeholder="Enter your new name" value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} />
        </label>
        <button className="primary" onClick={saveDisplayName} disabled={savingName}>{savingName ? 'Saving...' : 'Save new name'}</button>
        <p className="status">{status}</p>
        <button className="secondary" onClick={signOut}>Sign out</button>
      </> : <p>Please sign in to view your profile.</p>}
    </div>

    return <div className="panel"><h2>Page not found</h2></div>
  }

  return <div className={lightMode ? 'app light-mode' : 'app'}>
    <style>{`
      .app.light-mode { background: #f3f4fb; color: #202238; color-scheme: light; }
      .app.light-mode main { background: #f3f4fb; color: #202238; }
      .app.light-mode .sidebar { background: #ffffff; border-color: #e2e4ef; color: #25263a; }
      .app.light-mode header { background: #ffffff; border-color: #e2e4ef; color: #202238; }
      .app.light-mode .panel, .app.light-mode .hero, .app.light-mode .notice,
      .app.light-mode .staff-note, .app.light-mode .account { background: #ffffff; color: #292b40; border-color: #e2e4ef; }
      .app.light-mode .caption, .app.light-mode .muted, .app.light-mode .eyebrow,
      .app.light-mode small { color: #72758d; }
      .app.light-mode input, .app.light-mode textarea, .app.light-mode select { background: #ffffff; color: #202238; border-color: #d6d9e8; }
      .app.light-mode .nav { color: #555970; }
      .app.light-mode .nav:hover, .app.light-mode .nav.active { background: #eeeaff; color: #6941c6; }
      .app.light-mode .secondary { background: #ececf5; color: #303149; border-color: #d9daea; }
      .app.light-mode .theme-toggle { background: #eeeaff; color: #5736a8; border: 1px solid #d9d0fa; }
      .app .theme-toggle { margin-left: auto; padding: 8px 13px; border-radius: 10px; cursor: pointer; font: inherit; font-weight: 600; }
      .app.light-mode .online { color: #21865b; }
    `}</style>
    <aside className="sidebar">
      <div className="brand">RLM<span>.</span></div>
      <div className="caption">MAIN MENU</div>
      {menu.map(([name, icon]) => <button key={name} className={section === name ? 'nav active' : 'nav'} onClick={() => setSection(name)}>{name === 'My profile' && profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="nav-profile-avatar" /> : icon} <span>{name}</span></button>)}

      <div className="caption" style={{ marginTop: '22px' }}>PRIVATE CHATS</div>
      {!session ? (
        <div className="staff-note">Sign in to see your chats.</div>
      ) : conversations.length === 0 ? (
        <div className="staff-note">No private chats yet.</div>
      ) : conversations.map(conversation => (
        <button
          key={conversation.conversationId}
          className={selectedConversation === conversation.conversationId ? 'nav active' : 'nav'}
          onClick={() => {
            setSelectedConversation(conversation.conversationId)
            setSelectedName(displayName(conversation.friend))
            setSection('Messages')
          }}
          title={displayName(conversation.friend)}
        >
          ✉ <span>{displayName(conversation.friend)}</span>
        </button>
      ))}

      <div className="caption">STAFF</div>
      <div className="staff-note">Staff tools appear after a trusted owner assigns your role.</div>
      <div className="account">{session && profile?.avatar_url && <img src={profile.avatar_url} alt="" className="sidebar-avatar" />} {session ? (profile?.display_name || session.user.email) : 'Guest'}<small>{session ? 'SIGNED IN' : 'NOT SIGNED IN'}</small></div>
    </aside>
    <main>
      <header>
        <strong>{section}</strong>
        <span className="online">● RLM</span>
        <button className="theme-toggle" type="button" onClick={() => setLightMode(value => !value)} aria-label={lightMode ? 'Switch to dark mode' : 'Switch to light mode'}>
          {lightMode ? '🌙 Dark mode' : '☀️ Light mode'}
        </button>
      </header>
      <div className="content">
        {Page()}
        <div className="notice">
          <strong>RLM:</strong> New features are being built.
          Private messaging is available between accepted friends. Clan Chat is shared with all signed-in members.
        </div>
      </div>
    </main>
  </div>
}

createRoot(document.getElementById('root')).render(<App />)
