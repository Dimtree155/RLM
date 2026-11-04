
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
  const [status, setStatus] = React.useState('')
  const [section, setSection] = React.useState('Home')
  const [profile, setProfile] = React.useState(null)

  React.useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])

  React.useEffect(() => {
    if (!session || !supabase) {
      setProfile(null)
      return
    }
    supabase.from('profiles')
      .select('username, display_name, avatar_url, created_at')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setStatus(error.message)
        else setProfile(data)
      })
  }, [session])

  async function signUp(e) {
    e.preventDefault()
    setStatus('Creating account…')
    if (!supabase) return setStatus('Supabase is not connected.')
    const { error } = await supabase.auth.signUp({ email, password })
    setStatus(error ? error.message : 'Check your email to confirm your account.')
  }

  async function signIn(e) {
    e.preventDefault()
    setStatus('Signing in…')
    if (!supabase) return setStatus('Supabase is not connected.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setStatus(error ? error.message : 'Signed in!')
  }

  async function signOut() {
    await supabase?.auth.signOut()
    setStatus('Signed out.')
    setSection('Home')
  }

  function Page() {
    if (section === 'Home') {
      return <>
        <section className="hero">
          <div className="eyebrow">WELCOME TO RLM</div>
          <h1>Your universe.<br />Your community.</h1>
          <p>Chat, compete, explore and level up.</p>
        </section>

        {!session ? (
          <div className="panel auth">
            <h2>Create an account or sign in</h2>
            <p className="muted">Join the RLM community.</p>
            <form onSubmit={signIn}>
              <label>Email
                <input type="email" required value={email}
                  onChange={e => setEmail(e.target.value)} />
              </label>
              <label>Password
                <input type="password" minLength="8" required
                  value={password}
                  onChange={e => setPassword(e.target.value)} />
              </label>
              <div className="actions">
                <button className="primary">Sign in</button>
                <button type="button" className="secondary" onClick={signUp}>
                  Create account
                </button>
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
          <div className="panel"><h3>✉ Messages</h3>
            <p className="muted">Your messaging area.</p></div>
          <div className="panel"><h3>🎮 Minigames</h3>
            <p className="muted">Your gaming area.</p></div>
          <div className="panel"><h3>🏆 Progression</h3>
            <p className="muted">Your RLM journey.</p></div>
        </div>
      </>
    }

    if (section === 'Messages') {
      return <div className="panel">
        <h2>✉ Messages</h2>
        <p className="muted">Your private conversations will appear here.</p>
        {!session
          ? <p>Please sign in to use messages.</p>
          : <p>Messaging is coming soon!</p>}
      </div>
    }

    if (section === 'Friends') {
      return <div className="panel">
        <h2>♙ Friends</h2>
        <p className="muted">Your friends list and friend requests.</p>
        <p>Friend adding is coming soon!</p>
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
            <p><strong>Display name:</strong> {profile?.display_name || 'Not set yet'}</p>
          </>
        ) : <p>Please sign in to view your profile.</p>}
      </div>
    }

    return <div className="panel"><h2>Page not found</h2></div>
  }

  return (
    <div className="app">
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
          {session ? (profile?.display_name || session.user.email) : 'Guest'}
          <small>{session ? 'SIGNED IN' : 'NOT SIGNED IN'}</small>
        </div>
      </aside>

      <main>
        <header>
          <strong>{section}</strong>
          <span className="online">● RLM</span>
        </header>
        <div className="content">
          <Page />
          <div className="notice">
            <strong>RLM:</strong> New features are being built.
            Private messaging and multiplayer features need secure
            backend support before public launch.
          </div>
        </div>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)

