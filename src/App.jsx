import { useState } from 'react'
import manningFace from './assets/manning.png'
import './App.css'

const PRO_LEAGUES = [
  { id: 'mlb', label: 'MLB ⚾', sport: 'baseball', slug: 'mlb' },
  { id: 'nba', label: 'NBA 🏀', sport: 'basketball', slug: 'nba' },
  { id: 'nhl', label: 'NHL 🏒', sport: 'hockey', slug: 'nhl' },
  { id: 'nfl', label: 'NFL 🏈', sport: 'football', slug: 'nfl' },
]

const COLLEGE_LEAGUES = [
  { id: 'cfb', label: 'Football 🏈', sport: 'football', slug: 'college-football' },
  { id: 'cbb', label: "Men's Hoops 🏀", sport: 'basketball', slug: 'mens-college-basketball', groups: '50', limit: '365' },
  { id: 'cwbb', label: "Women's Hoops 🏀", sport: 'basketball', slug: 'womens-college-basketball', groups: '50', limit: '365' },
  { id: 'cbase', label: 'Baseball ⚾', sport: 'baseball', slug: 'college-baseball' },
  { id: 'csoft', label: 'Softball 🥎', sport: 'baseball', slug: 'college-softball' },
]

const PRO_SNARKY = [
  "No games today. The athletes are busy being paid to not play.",
  "Nothing to see here. Go touch grass.",
  "The league said 'not yet.' Who are we to argue?",
  "Even the refs aren't ready yet. Check back in a few weeks.",
  "No games. The players are still on vacation. Like you should be.",
  "Season's not here yet. Maybe go watch baseball like a normal person. ⚾",
  "The athletes are resting. You should too.",
  "Nothing scheduled. The commissioner is probably playing golf.",
]

const COLLEGE_SNARKY = [
  "No games yet. The Razorbacks are in the weight room getting ready to make you cry tears of joy. WOO PIG! 🐗",
  "Off season. Arkansas is recruiting while LSU fans are at home smelling like corndogs.",
  "Nothing today. Coach Sam Pittman is somewhere being an absolute legend. WOO PIG. 🐗",
  "No games scheduled. LSU fans thought today was a game day because someone left a corndog wrapper on the calendar.",
  "Season hasn't started. The Hogs are training. LSU is eating corndogs in the parking lot.",
  "No games yet. Arkansas Athletics is quietly building something special. WOO PIG SOOIE! 🐗",
  "Off season. Somewhere an LSU fan just dropped a corndog on their jersey and called it a day.",
  "Nothing scheduled. The Razorbacks don't rest — they just reload. 🐗",
]

function getSnarky(isCollege) {
  const list = isCollege ? COLLEGE_SNARKY : PRO_SNARKY
  return list[Math.floor(Math.random() * list.length)]
}

function buildUrl(league) {
  let url = `https://site.api.espn.com/apis/site/v2/sports/${league.sport}/${league.slug}/scoreboard`
  const params = []
  if (league.groups) params.push(`groups=${league.groups}`)
  if (league.limit) params.push(`limit=${league.limit}`)
  if (params.length) url += '?' + params.join('&')
  return url
}

function isOffSeason(events) {
  if (events.length === 0) return true
  const firstGame = new Date(events[0].date)
  const today = new Date()
  const daysAway = (firstGame - today) / (1000 * 60 * 60 * 24)
  return daysAway > 30
}

function GameCard({ game }) {
  const [revealed, setRevealed] = useState(false)

  const comp = game.competitions[0]
  const home = comp.competitors.find(c => c.homeAway === 'home')
  const away = comp.competitors.find(c => c.homeAway === 'away')
  const status = game.status.type
  const hasScore = status.completed || status.name === 'STATUS_IN_PROGRESS'

  const gameTime = new Date(game.date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })

  return (
    <div className="game-card">
      <div className="card-left">
        <div className="team-name">{away.team.displayName}</div>
        <div className="team-name">{home.team.displayName}</div>
        <div className="badge">
          {status.name === 'STATUS_SCHEDULED'
            ? gameTime
            : game.status.type.detail}
        </div>
      </div>

      <div className="card-right">
        {!revealed ? (
          <button className="score-btn" onClick={() => setRevealed(true)}>
            SCORE
          </button>
        ) : hasScore ? (
          <div className="score-revealed">
            <div className="score-line">
              <span className="score-name">{away.team.abbreviation}</span>
              <span className="score-num">{away.score}</span>
            </div>
            <div className="score-line">
              <span className="score-name">{home.team.abbreviation}</span>
              <span className="score-num">{home.score}</span>
            </div>
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
  const [showCollege, setShowCollege] = useState(false)
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(false)
  const [snarkyMessage, setSnarkyMessage] = useState(null)

  async function fetchGames(league, isCollege = false) {
    setSelectedLeague(league)
    setShowCollege(true)
    setLoading(true)
    setGames([])
    setSnarkyMessage(null)

    try {
      const res = await fetch(buildUrl(league))
      const data = await res.json()
      const events = data.events || []

      if (isOffSeason(events)) {
        setSnarkyMessage(getSnarky(isCollege))
        setGames([])
      } else {
        const sorted = [...events].sort((a, b) => {
        const aHasArk = JSON.stringify(a).toLowerCase().includes('arkansas')
        const bHasArk = JSON.stringify(b).toLowerCase().includes('arkansas')
        if (aHasArk && !bHasArk) return -1
        if (!aHasArk && bHasArk) return 1
        return 0
      })
      setGames(sorted)
      }
    } catch (err) {
      console.error('Failed to fetch games:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleCollegeClick() {
    setShowCollege(prev => !prev)
    setSelectedLeague(null)
    setGames([])
    setSnarkyMessage(null)
  }

  return (
    <div className="app">
      <h1>Scoreboard</h1>

      <div className="leagues">
        {PRO_LEAGUES.map(league => (
          <button
            key={league.id}
            onClick={() => fetchGames(league, false)}
            className={selectedLeague?.id === league.id ? 'active' : ''}
          >
            {league.label}
          </button>
        ))}

        <button
          onClick={handleCollegeClick}
          className={showCollege ? 'active' : ''}
        >
          COLLEGE 🎓
        </button>
      </div>

      {showCollege && (
        <div className="college-leagues">
          {COLLEGE_LEAGUES.map(league => (
            <button
              key={league.id}
              onClick={() => fetchGames(league, true)}
              className={selectedLeague?.id === league.id ? 'active' : ''}
            >
              {league.label}
            </button>
          ))}
        </div>
      )}

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