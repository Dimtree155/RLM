import React from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import './style.css'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = url && anon ? createClient(url, anon) : null

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
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])

  React.useEffect(() => {
    if (!session || !supabase) { setProfile(null); return }
    supabase.from('profiles').select('username, display_name, avatar_url, created_at').eq('id', session.user.id).maybeSingle()
      .then(({ data, error }) => { if (error) setStatus(error.message); else setProfile(data) })
  }, [session])

  async function signUp(e) {
    e.preventDefault(); setStatus('Creating account…')
    if (!supabase) return setStatus('Backend not connected yet. Add your Supabase URL and publishable key in Netlify environment variables.')
    const { error } = await supabase.auth.signUp({ email, password })
    setStatus(error ? error.message : 'Check your email to confirm your account, then sign in.')
  }
  async function signIn(e) {
    e.preventDefault(); setStatus('Signing in…')
    if (!supabase) return setStatus('Backend not connected yet. Add your Supabase URL and publishable key in Netlify environment variables.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setStatus(error ? error.message : 'Signed in.')
  }
  async function signOut() { await supabase?.auth.signOut(); setStatus('Signed out.') }

  return <div className="app">
    <aside className="sidebar">
      <div className="brand">RLM<span>.</span></div>
      <div className="caption">MAIN MENU</div>
      {['Home','Messages','Friends','Minigames','Leaderboard','Quests','Coin shop','My profile'].map(x =>
        <button key={x} className={section===x?'nav active':'nav'} onClick={()=>setSection(x)}>{({Home:'⌂',Messages:'✉',Friends:'♙',Minigames:'🎮',Leaderboard:'🏆',Quests:'✦','Coin shop':'🛍','My profile':'◉'})[x]} <span>{x}</span></button>)}
      <div className="caption">STAFF</div><div className="staff-note">Staff tools appear only after a trusted owner assigns your role.</div>
      <div className="account">{session ? (profile?.display_name || session.user.email) : 'Guest'}<small>{session ? 'SIGNED IN' : 'NOT SIGNED IN'}</small></div>
    </aside>
    <main>
      <header><strong>{section}</strong><span className="online">● RLM</span></header>
      <div className="content">
        <section className="hero"><div className="eyebrow">WELCOME TO RLM</div><h1>Your universe.<br/>Your community.</h1><p>Chat, compete, explore and level up.</p></section>
        {!session ? <div className="panel auth">
          <h2>Create an account or sign in</h2>
          <p className="muted">Use a valid email and a unique password. Never share your password or private keys.</p>
          <form onSubmit={signIn}>
            <label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
            <label>Password<input type="password" autoComplete="current-password" minLength="8" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
            <div className="actions"><button className="primary">Sign in</button><button type="button" className="secondary" onClick={signUp}>Create account</button></div>
          </form><p className="status">{status}</p>
        </div> : <div className="panel">
          <div className="welcome-row"><div><div className="eyebrow">SIGNED IN</div><h2>{profile?.display_name || session.user.email}</h2><p className="muted">Your account is connected to RLM.</p></div><button className="secondary" onClick={signOut}>Sign out</button></div>
          <p className="status">{status}</p>
        </div>}
        <div className="grid">
          <div className="panel"><div className="icon">✉</div><h3>Private messages</h3><p className="muted">Friend-only conversations are part of the next feature milestone.</p></div>
          <div className="panel"><div className="icon">🎮</div><h3>Minigames</h3><p className="muted">Game modules will connect to verified player profiles and scores.</p></div>
          <div className="panel"><div className="icon">🏆</div><h3>Progression</h3><p className="muted">Quests, coins, XP and leaderboards will be stored server-side.</p></div>
        </div>
        <div className="notice"><strong>Launch safety:</strong> Public chat needs reporting, blocking, moderation, rate limits and privacy controls before strangers can message each other. Staff roles and coin balances must be verified by the backend, never trusted from browser code.</div>
      </div>
    </main>
  </div>
}
createRoot(document.getElementById('root')).render(<App />)
