
import React from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import './style.css'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = url && anon ? createClient(url, anon) : null

const menu = [
  ['Home', '⌂'],
  ['Messages', '✉'],
  ['Clan Chat', '💬'],
  ['Friends', '♙'],
  ['Minigames', '🎮'],
  ['Leaderboard', '🏆'],
  ['Quests', '✦'],
  ['Coin shop', '🛍'],
  ['My profile', '◉']
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

  React.useEffect(() => {
    try { localStorage.setItem('rlm-theme', lightMode ? 'light' : 'dark') } catch {}
  }, [lightMode])
  const [profile, setProfile] = React.useState(null)

  // Profile editing
  const [newDisplayName, setNewDisplayName] = React.useState('')
  const [savingName, setSavingName] = React.useState(false)

  // Messaging
  const [friends, setFriends] = React.useState([])
  const [conversations, setConversations] = React.useState([])
  const [selectedConversation, setSelectedConversation] = React.useState(null)
  const [selectedName, setSelectedName] = React.useState('')
  const [messages, setMessages] = React.useState([])
  const [messageText, setMessageText] = React.useState('')
  const [loadingMessages, setLoadingMessages] = React.useState(false)
  const [sendingMessage, setSendingMessage] = React.useState(false)

  // Public RLM clan chat
  const [clanMessages, setClanMessages] = React.useState([])
  const [clanMessageText, setClanMessageText] = React.useState('')
  const [loadingClanChat, setLoadingClanChat] = React.useState(false)
  const [sendingClanMessage, setSendingClanMessage] = React.useState(false)

  React.useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, next) => {
        setSession(next)
      })

    return () => listener.subscription.unsubscribe()
  }, [])

  // Load the signed-in user's profile
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

  // Load accepted friends
  React.useEffect(() => {
    if (!session || !supabase) {
      setFriends([])
      return
    }

    async function loadFriends() {
      const userId = session.user.id

      const { data, error } = await supabase
        .from('friendships')
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

      if (friendIds.length === 0) {
        setFriends([])
        return
      }

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', friendIds)

      if (profileError) {
        setStatus(profileError.message)
        return
      }

      setFriends(profiles || [])
    }

    loadFriends()
  }, [session, section])

  // Load existing conversations
  React.useEffect(() => {
    if (!session || !supabase || section !== 'Messages') {
      return
    }

    let cancelled = false

    async function loadConversations() {
      const userId = session.user.id

      const { data: memberships, error } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', userId)

      if (error) {
        setStatus(error.message)
        return
      }

      const conversationIds = [
        ...new Set((memberships || []).map(item => item.conversation_id))
      ]

      if (conversationIds.length === 0) {
        if (!cancelled) setConversations([])
        return
      }

      const { data: otherMembers, error: memberError } = await supabase
        .from('conversation_members')
        .select('conversation_id, user_id')
        .in('conversation_id', conversationIds)
        .neq('user_id', userId)

      if (memberError) {
        setStatus(memberError.message)
        return
      }

      const otherIds = [
        ...new Set((otherMembers || []).map(item => item.user_id))
      ]

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', otherIds)

      if (profilesError) {
        setStatus(profilesError.message)
        return
      }

      const profileMap = Object.fromEntries(
        (profiles || []).map(person => [person.id, person])
      )

      const result = (otherMembers || []).map(member => ({
        conversationId: member.conversation_id,
        friend: profileMap[member.user_id] || {
          id: member.user_id,
          display_name: 'RLM member',
          username: ''
        }
      }))

      if (!cancelled) {
        setConversations(result)
      }
    }

    loadConversations()

    return () => {
      cancelled = true
    }
  }, [session, section])

  // Load the shared RLM clan chat and listen for new messages
  React.useEffect(() => {
    if (!session || !supabase || section !== 'Clan Chat') {
      setClanMessages([])
      return
    }

    let cancelled = false

    async function loadClanMessages() {
      setLoadingClanChat(true)

      const { data, error } = await supabase
        .from('clan_chat_messages')
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

      if (userIds.length > 0) {
        const { data: people, error: peopleError } = await supabase
          .from('profiles')
          .select('id, username, display_name')
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
        setClanMessages(rows.reverse().map(item => ({
          ...item,
          sender: profileMap[item.sender_id] || null
        })))
        setLoadingClanChat(false)
      }
    }

    loadClanMessages()

    const channel = supabase
      .channel('rlm-public-clan-chat')
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
      setStatus('Clan chat messages must be 1000 characters or fewer.')
      return
    }

    setSendingClanMessage(true)
    setStatus('')

    const { error } = await supabase
      .from('clan_chat_messages')
      .insert({ sender_id: session.user.id, body })

    if (error) {
      setStatus('Message could not be sent: ' + error.message)
    } else {
      setClanMessageText('')
    }

    setSendingClanMessage(false)
  }

  // Load messages and listen for new ones
  React.useEffect(() => {
    if (!session || !supabase || !selectedConversation) {
      setMessages([])
      return
    }

    let cancelled = false

    async function loadMessages() {
      setLoadingMessages(true)

      const { data, error } = await supabase
        .from('messages')
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

    const channel = supabase
      .channel(`messages-${selectedConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation}`
        },
        payload => {
          setMessages(previous => {
            if (previous.some(item => item.id === payload.new.id)) {
              return previous
            }
            return [...previous, payload.new]
          })
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [session, selectedConversation])

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
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          { id: data.user.id, display_name: cleanDisplayName },
          { onConflict: 'id' }
        )

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
  }

  async function saveDisplayName() {
    const cleanName = newDisplayName.trim()

    if (!session || !supabase) {
      setStatus('Please sign in first.')
      return
    }

    if (!cleanName || cleanName.length > 24) {
      setStatus('Enter a name between 1 and 24 characters.')
      return
    }

    setSavingName(true)
    setStatus('Saving your name...')

    const { data, error } = await supabase
      .from('profiles')
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

  // Start or open a private conversation with an accepted friend
  async function startConversation(friend) {
    if (!supabase || !session) return

    setStatus('Opening conversation...')

    const { data, error } = await supabase.rpc(
      'start_friend_conversation',
      { friend_id: friend.id }
    )

    if (error) {
      setStatus('Could not open conversation: ' + error.message)
      return
    }

    setSelectedConversation(data)
    setSelectedName(friend.display_name || friend.username || 'RLM member')
    setMessageText('')
    setStatus('')
    setSection('Messages')
  }

  async function sendMessage(e) {
    e.preventDefault()

    const body = messageText.trim()

    if (!body || !selectedConversation || !session || !supabase) {
      return
    }

    if (body.length > 2000) {
      setStatus('Messages must be 2000 characters or fewer.')
      return
    }

    setSendingMessage(true)
    setStatus('')

    const { data, error } = await supabase
      .from('messages')
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

      setMessages(previous => {
        if (previous.some(item => item.id === data.id)) {
          return previous
        }
        return [...previous, data]
      })
    }

    setSendingMessage(false)
  }

  function Page() {
    if (section === 'Home') {
      return <>
        <section className="hero">
          <div className="eyebrow">WELCOME TO THE CLAN</div>
          <h1>RLM<br />SHELL SHOCKERS CLAN</h1>
          <p>
            The home of the RLM Shell Shockers clan.
            Connect with clan members, chat with friends,
            compete, and represent RLM.
          </p>
        </section>

        {!session ? (
          <div className="panel auth">
            <h2>Create an account or sign in</h2>
            <p className="muted">Join the RLM community.</p>

            <form onSubmit={signIn}>
              <label>Display name (for new accounts)
                <input
                  type="text"
                  maxLength="24"
                  placeholder="Your RLM name"
                  value={signupDisplayName}
                  onChange={e => setSignupDisplayName(e.target.value)}
                />
              </label>

              <label>Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </label>

              <label>Password
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
            <button className="secondary" onClick={signOut}>
              Sign out
            </button>
            <p className="status">{status}</p>
          </div>
        )}

        <div className="grid">
          <div className="panel">
            <h3>✉ Messages</h3>
            <p className="muted">Chat with your RLM friends.</p>
            <button className="secondary" onClick={() => setSection('Messages')}>
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
    }

    if (section === 'Messages') {
      if (!session) {
        return <div className="panel">
          <h2>✉ Messages</h2>
          <p>Please sign in to use messages.</p>
        </div>
      }

      return <div className="panel">
        <h2>✉ RLM Messages</h2>
        <p className="muted">
          Private conversations with your accepted friends.
        </p>

        <div className="grid">
          <div className="panel">
            <h3>Your conversations</h3>

            {conversations.length === 0 ? (
              <p className="muted">No conversations yet.</p>
            ) : (
              conversations.map(conversation => (
                <button
                  key={conversation.conversationId}
                  className="secondary"
                  style={{
                    display: 'block',
                    width: '100%',
                    marginBottom: '8px'
                  }}
                  onClick={() => {
                    setSelectedConversation(conversation.conversationId)
                    setSelectedName(
                      conversation.friend.display_name ||
                      conversation.friend.username ||
                      'RLM member'
                    )
                  }}
                >
                  {conversation.friend.display_name ||
                    conversation.friend.username ||
                    'RLM member'}
                </button>
              ))
            )}
          </div>

          <div className="panel">
            {selectedConversation ? (
              <>
                <h3>Chat with {selectedName}</h3>

                <div
                  style={{
                    minHeight: '220px',
                    maxHeight: '380px',
                    overflowY: 'auto',
                    padding: '10px',
                    marginBottom: '12px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '10px'
                  }}
                >
                  {loadingMessages ? (
                    <p className="muted">Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p className="muted">
                      No messages yet. Say hello!
                    </p>
                  ) : (
                    messages.map(message => (
                      <div
                        key={message.id}
                        style={{
                          marginBottom: '12px',
                          textAlign:
                            message.sender_id === session.user.id
                              ? 'right'
                              : 'left'
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background:
                              message.sender_id === session.user.id
                                ? '#7044c8'
                                : '#29233b',
                            maxWidth: '85%',
                            overflowWrap: 'anywhere'
                          }}
                        >
                          {message.body}
                        </span>
                        <small
                          style={{
                            display: 'block',
                            opacity: 0.6,
                            marginTop: '3px'
                          }}
                        >
                          {message.sender_id === session.user.id
                            ? 'You'
                            : selectedName}
                          {' · '}
                          {new Date(message.created_at).toLocaleTimeString(
                            [],
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </small>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={sendMessage}>
                  <label>
                    Your message
                    <textarea
                      rows="3"
                      maxLength="2000"
                      placeholder="Write a message..."
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                    />
                  </label>

                  <button
                    className="primary"
                    disabled={sendingMessage || !messageText.trim()}
                  >
                    {sendingMessage ? 'Sending...' : 'Send message'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h3>Choose a conversation</h3>
                <p className="muted">
                  Select a conversation or start one with a friend.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="panel">
          <h3>Start a conversation</h3>
          {friends.length === 0 ? (
            <p className="muted">
              You don't have any accepted friends yet.
              Add friends and accept their requests first.
            </p>
          ) : (
            friends.map(friend => (
              <button
                key={friend.id}
                className="secondary"
                style={{ margin: '5px' }}
                onClick={() => startConversation(friend)}
              >
                Message {friend.display_name || friend.username}
              </button>
            ))
          )}
        </div>

        <p className="status">{status}</p>
      </div>
    }

    if (section === 'Clan Chat') {
      if (!session) {
        return <div className="panel">
          <h2>💬 RLM Clan Chat</h2>
          <p>Please sign in to join the clan chat.</p>
        </div>
      }

      return <div className="panel">
        <h2>💬 RLM Clan Chat</h2>
        <p className="muted">
          The shared chat for RLM Shell Shockers clan members. Everyone signed in can join the conversation.
        </p>

        <div
          style={{
            minHeight: '300px',
            maxHeight: '500px',
            overflowY: 'auto',
            padding: '14px',
            marginBottom: '14px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '12px'
          }}
        >
          {loadingClanChat ? (
            <p className="muted">Loading clan chat...</p>
          ) : clanMessages.length === 0 ? (
            <p className="muted">No messages yet. Be the first to say hello!</p>
          ) : (
            clanMessages.map(message => (
              <div key={message.id} style={{ marginBottom: '14px', overflowWrap: 'anywhere' }}>
                <strong style={{ color: '#c084fc' }}>
                  {message.sender?.display_name || message.sender?.username || 'RLM member'}
                </strong>
                <small style={{ opacity: 0.55, marginLeft: '9px' }}>
                  {new Date(message.created_at).toLocaleString([], {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </small>
                <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap' }}>{message.body}</div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={sendClanMessage}>
          <label>
            Message everyone
            <textarea
              rows="3"
              maxLength="1000"
              placeholder="Say something to the RLM clan..."
              value={clanMessageText}
              onChange={e => setClanMessageText(e.target.value)}
            />
          </label>
          <button
            className="primary"
            disabled={sendingClanMessage || !clanMessageText.trim()}
          >
            {sendingClanMessage ? 'Sending...' : 'Send to clan'}
          </button>
        </form>
        <p className="status">{status}</p>
      </div>
    }

    if (section === 'Friends') {
      return <div className="panel">
        <h2>♙ Friends</h2>
        <p className="muted">Your accepted RLM friends.</p>

        {!session ? (
          <p>Please sign in to view your friends.</p>
        ) : friends.length === 0 ? (
          <p>No accepted friends yet.</p>
        ) : (
          friends.map(friend => (
            <div key={friend.id} className="panel">
              <strong>
                {friend.display_name || friend.username}
              </strong>
              <button
                className="secondary"
                style={{ marginLeft: '12px' }}
                onClick={() => startConversation(friend)}
              >
                Message
              </button>
            </div>
          ))
        )}
      </div>
    }

    if (section === 'Minigames') {
      return <div className="panel">
        <h2>🎮 Minigames</h2>
        <p className="muted">Choose a game to play.</p>
        <div className="grid">
          <div className="panel"><h3>⚔️ Arena</h3><p>Coming soon!</p></div>
          <div className="panel"><h3>♟ Chess</h3><p>Coming soon!</p></div>
          <div className="panel"><h3>⭕ Tic-tac-toe</h3><p>Coming soon!</p></div>
          <div className="panel"><h3>🏎️ Car racer</h3><p>Coming soon!</p></div>
        </div>
      </div>
    }

    if (section === 'Leaderboard') {
      return <div className="panel">
        <h2>🏆 Leaderboard</h2>
        <p className="muted">Top RLM players will appear here.</p>
        <p>Leaderboard is coming soon!</p>
      </div>
    }

    if (section === 'Quests') {
      return <div className="panel">
        <h2>✦ Quests</h2>
        <p className="muted">Complete challenges and earn rewards.</p>
        <p>Quests are coming soon!</p>
      </div>
    }

    if (section === 'Coin shop') {
      return <div className="panel">
        <h2>🛍 Coin shop</h2>
        <p className="muted">Spend your RLM coins on cosmetics and items.</p>
        <p>The shop is coming soon!</p>
      </div>
    }

    if (section === 'My profile') {
      return <div className="panel">
        <h2>◉ My profile</h2>

        {session ? (
          <>
            <p><strong>Email:</strong> {session.user.email}</p>
            <p><strong>Username:</strong> {profile?.username || 'Not set yet'}</p>
            <p>
              <strong>Display name:</strong>{' '}
              {profile?.display_name || 'Not set yet'}
            </p>

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
    }

    return <div className="panel"><h2>Page not found</h2></div>
  }

  return (
    <div className={lightMode ? 'app light-mode' : 'app'}>
      <style>{`
        .app.light-mode { background: #f3f4fb; color: #202238; color-scheme: light; }
        .app.light-mode main { background: #f3f4fb; color: #202238; }
        .app.light-mode .sidebar { background: #ffffff; border-color: #e2e4ef; color: #25263a; }
        .app.light-mode header { background: #ffffff; border-color: #e2e4ef; color: #202238; }
        .app.light-mode .panel, .app.light-mode .hero, .app.light-mode .notice,
        .app.light-mode .staff-note, .app.light-mode .account { background: #ffffff; color: #292b40; border-color: #e2e4ef; }
        .app.light-mode .caption, .app.light-mode .muted, .app.light-mode .eyebrow,
        .app.light-mode small { color: #72758d; }
        .app.light-mode input, .app.light-mode textarea, .app.light-mode select {
          background: #ffffff; color: #202238; border-color: #d6d9e8;
        }
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

        {menu.map(([name, icon]) => (
          <button
            key={name}
            className={section === name ? 'nav active' : 'nav'}
            onClick={() => setSection(name)}
          >
            {icon} <span>{name}</span>
          </button>
        ))}

        <div className="caption">STAFF</div>
        <div className="staff-note">
          Staff tools appear after a trusted owner assigns your role.
        </div>

        <div className="account">
          {session
            ? (profile?.display_name || session.user.email)
            : 'Guest'}
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
            aria-label={lightMode ? 'Switch to dark mode' : 'Switch to light mode'}
          >
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
  )
}

createRoot(document.getElementById('root')).render(<App />)
