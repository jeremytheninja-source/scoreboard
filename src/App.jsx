import { useState } from 'react'
import manningFace from './assets/manning.png'
import './App.css'

const LEAGUES = [
  { id: 'mlb', label: 'MLB ⚾', sport: 'baseball', slug: 'mlb' },
  { id: 'nfl', label: 'NFL 🏈', sport: 'football', slug: 'nfl' },
  { id: 'nba', label: 'NBA 🏀', sport: 'basketball', slug: 'nba' },
  { id: 'nhl', label: 'NHL 🏒', sport: 'hockey', slug: 'nhl' },
]

const SNARKY = [
  "Chill out. The season hasn't started yet. Go outside.",
  "No games. Touch grass. Come back later.",
  "The players are still on vacation. Like you should be.",
  "Nothing to see here. The season is taking its sweet time.",
  "Even the refs aren't ready yet. Check back in a few weeks.",
  "The league said 'not yet.' Who are we to argue?",
  "No games today. The athletes are busy being paid to not play.",
  "Season's not here yet. Maybe go watch baseball like a normal person. ⚾",
]

function GameCard({ game }) {
  const [revealed, setRevealed] = useState(false)

  const comp = game.competitions[0]
  const home = comp.competitors.find(c => c.homeAway === 'home')
  const away = comp.competitors.find(c => c.homeAway === 'away')
  const status = game.status.type
  const hasScore = status.completed || status.name === 'STATUS_IN_PROGRESS'

  return (
    <div className="game-card">
      <div className="card-left">
        <div className="teams">
          <span>{away.team.abbreviation}</span>
          <span className="vs">@</span>
          <span>{home.team.abbreviation}</span>
        </div>
        <div className="badge">{status.description}</div>
      </div>

      <div className="card-right">
        {!revealed ? (
          <button className="score-btn" onClick={() => setRevealed(true)}>
            SCORE
          </button>
        ) : hasScore ? (
          <div className="score-revealed">
            <span>{away.score}</span>
            <span className="score-dash">-</span>
            <span>{home.score}</span>
          </div>
        ) : (
          <img
            src={manningFace}
            alt="No score yet"
            className="manning"
          />
        )}
      </div>
    </div>
  )
}

function App() {
  const [selectedLeague, setSelectedLeague] = useState(null)
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(false)
  const [snarkyMessage, setSnarkyMessage] = useState(null)

  async function fetchGames(league) {
    setSelectedLeague(league)
    setLoading(true)
    setGames([])
    setSnarkyMessage(null)

    const url = `https://site.api.espn.com/apis/site/v2/sports/${league.sport}/${league.slug}/scoreboard`

    try {
      const res = await fetch(url)
      const data = await res.json()
      const events = data.events || []

      if (events.length > 0) {
        const firstGame = new Date(events[0].date)
        const today = new Date()
        const daysAway = (firstGame - today) / (1000 * 60 * 60 * 24)

        if (daysAway > 30) {
          const msg = SNARKY[Math.floor(Math.random() * SNARKY.length)]
          setSnarkyMessage(msg)
          setGames([])
          return
        }
      }

      setGames(events)

      if (events.length === 0) {
        setSnarkyMessage(SNARKY[Math.floor(Math.random() * SNARKY.length)])
      }

    } catch (err) {
      console.error('Failed to fetch games:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <h1>📊 Scoreboard</h1>

      <div className="leagues">
        {LEAGUES.map(league => (
          <button
            key={league.id}
            onClick={() => fetchGames(league)}
            className={selectedLeague?.id === league.id ? 'active' : ''}
          >
            {league.label}
          </button>
        ))}
      </div>

      {loading && <p className="status">Loading games...</p>}

      {!loading && snarkyMessage && (
        <p className="status snarky">{snarkyMessage}</p>
      )}

      {!loading && selectedLeague && games.length === 0 && !snarkyMessage && (
        <p className="status">No games today.</p>
      )}

      <div className="games">
        {games.map(game => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  )
}

export default App