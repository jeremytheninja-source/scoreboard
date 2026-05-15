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
  { id: 'cfb',   label: 'Football 🏈',      sport: 'football',   slug: 'college-football' },
  { id: 'cbb',   label: "Men's Hoops 🏀",   sport: 'basketball', slug: 'mens-college-basketball',  groups: '50', limit: '365' },
  { id: 'cwbb',  label: "Women's Hoops 🏀", sport: 'basketball', slug: 'womens-college-basketball', groups: '50', limit: '365' },
  { id: 'cbase', label: 'Baseball ⚾',       sport: 'baseball',   slug: 'college-baseball' },
  { id: 'csoft', label: 'Softball 🥎',       sport: 'baseball',   slug: 'college-softball' },
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

function buildScoreboardUrl(league) {
  let url = `https://site.api.espn.com/apis/site/v2/sports/${league.sport}/${league.slug}/scoreboard`
  const params = []
  if (league.groups) params.push(`groups=${league.groups}`)
  if (league.limit)  params.push(`limit=${league.limit}`)
  if (params.length) url += '?' + params.join('&')
  return url
}

function buildStandingsUrl(league) {
  return `https://site.api.espn.com/apis/v2/sports/${league.sport}/${league.slug}/standings?level=3`
}

function isOffSeason(events) {
  if (events.length === 0) return true
  const firstGame = new Date(events[0].date)
  const today = new Date()
  const daysAway = (firstGame - today) / (1000 * 60 * 60 * 24)
  return daysAway > 30
}

function formatRecord(entry) {
  const stats = entry.stats
  if (!stats) return { w: '-', l: '-', pct: '-', gb: '-' }
  const w   = stats.find(s => s.name === 'wins')?.value ?? '-'
  const l   = stats.find(s => s.name === 'losses')?.value ?? '-'
  const pct = stats.find(s => s.name === 'winPercent')?.displayValue ?? '-'
  const gb  = stats.find(s => s.name === 'gamesBehind')?.displayValue ?? '-'
  return { w, l, pct, gb }
}

function isSEC(name) {
  return name?.toUpperCase().includes('SOUTHEASTERN')
}

// Parse raw standings data into flat conference groups
// Pro sports: children → league → children → division
// College sports: children → conference (no division nesting)
function groupToDisplay(group) {
  const entries = group.standings?.entries || []
  const teams = entries.map((entry, idx) => ({
    team:             entry.team,
    record:           entry,
    standingPosition: idx + 1,
  }))
  return { name: group.name || group.abbreviation, teams }
}

function parseStandingsGroups(standData, isCollege) {
  const rawGroups = []

  if (isCollege) {
    for (const top of standData.children || []) {
      if (top.standings?.entries?.length > 0) {
        rawGroups.push(top)
      } else {
        for (const conf of top.children || []) {
          rawGroups.push(conf)
        }
      }
    }
  } else {
    for (const top of standData.children || []) {
      if (top.children && top.children.length > 0) {
        for (const division of top.children) {
          rawGroups.push(division)
        }
      } else {
        rawGroups.push(top)
      }
    }
  }

  return rawGroups
}

// ─── GAME CARD ────────────────────────────────────────────────────────────────

function GameCard({ game, featuredTeam }) {
  const [revealed, setRevealed] = useState(false)

  const comp     = game.competitions[0]
  const home     = comp.competitors.find(c => c.homeAway === 'home')
  const away     = comp.competitors.find(c => c.homeAway === 'away')
  const status   = game.status.type
  const hasScore = status.completed || status.name === 'STATUS_IN_PROGRESS'

  const gameTime = new Date(game.date).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  })

  const top    = featuredTeam === home.team.id ? home : away
  const bottom = featuredTeam === home.team.id ? away : home

  const topRank    = top.curatedRank?.current
  const bottomRank = bottom.curatedRank?.current
  const isArk      = top.team.displayName.toLowerCase().includes('arkansas')

  return (
    <div className={`game-card ${isArk ? 'arkansas-card' : ''}`}>
      <div className="card-left">
        <div className="team-name">
          {topRank && topRank <= 25 && <span className="rank">#{topRank} </span>}
          {top.team.displayName}
        </div>
        <div className="team-name opponent">
          {bottomRank && bottomRank <= 25 && <span className="rank">#{bottomRank} </span>}
          {bottom.team.displayName}
        </div>
        <div className="badge">
          {status.name === 'STATUS_SCHEDULED' ? gameTime : status.detail}
        </div>
      </div>
      <div className="card-right">
        {!revealed ? (
          <button className="score-btn" onClick={() => setRevealed(true)}>SCORE</button>
        ) : hasScore ? (
          <div className="score-revealed">
            <div className="score-line">
              <span className="score-name">{top.team.abbreviation}</span>
              <span className="score-num">{top.score}</span>
            </div>
            <div className="score-line">
              <span className="score-name">{bottom.team.abbreviation}</span>
              <span className="score-num">{bottom.score}</span>
            </div>
          </div>
        ) : (
          <img src={manningFace} alt="No score yet" className="manning" />
        )}
      </div>
    </div>
  )
}

// ─── CONFERENCE TEAM ROW ──────────────────────────────────────────────────────

function ConferenceTeamRow({ team, game, featuredTeamId, view }) {
  const [revealed, setRevealed] = useState(false)
  const rec   = formatRecord(team.record)
  const isArk = team.team.displayName.toLowerCase().includes('arkansas')

  const comp     = game ? game.competitions[0] : null
  const home     = comp ? comp.competitors.find(c => c.homeAway === 'home') : null
  const away     = comp ? comp.competitors.find(c => c.homeAway === 'away') : null
  const status   = game ? game.status.type : null
  const hasScore = status ? (status.completed || status.name === 'STATUS_IN_PROGRESS') : false
  const featured = comp ? (featuredTeamId === home.team.id ? home : away) : null
  const opponent = comp ? (featuredTeamId === home.team.id ? away : home) : null
  const atSymbol = comp ? (featuredTeamId === away.team.id ? '@ ' : 'vs ') : ''
  const gameTime = game ? new Date(game.date).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  }) : ''

  return (
    <div className={`conf-row ${isArk ? 'arkansas-row' : ''}`}>
      <div className="conf-row-left">
        <span className="conf-standing-pos">{team.standingPosition}.</span>
        <span className="conf-team-name">{team.team.displayName}</span>
      </div>

      <div className="conf-row-right">
        {view === 'scores' ? (
          !game ? (
            <span className="no-game">No game today</span>
          ) : !revealed ? (
            <div className="conf-score-block">
              <span className="conf-opponent-label">{atSymbol}{opponent.team.abbreviation}</span>
              <span className="badge center">
                {status.name === 'STATUS_SCHEDULED' ? gameTime : status.detail}
              </span>
              <button className="score-btn small" onClick={() => setRevealed(true)}>SCORE</button>
            </div>
          ) : hasScore ? (
            <div className="conf-score-block">
              <span className="conf-opponent-label">{atSymbol}{opponent.team.abbreviation}</span>
              <div className="score-revealed small">
                <div className="score-line">
                  <span className="score-name">{featured.team.abbreviation}</span>
                  <span className="score-num">{featured.score}</span>
                </div>
                <div className="score-line">
                  <span className="score-name">{opponent.team.abbreviation}</span>
                  <span className="score-num">{opponent.score}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="conf-score-block">
              <span className="conf-opponent-label">{atSymbol}{opponent.team.abbreviation}</span>
              <img src={manningFace} alt="No score yet" className="manning small" />
            </div>
          )
        ) : (
          <div className="standings-stats">
            <span className="stat-wl">{rec.w}-{rec.l}</span>
            <span className="stat-pct">{rec.pct}</span>
            <span className="stat-gb">GB {rec.gb}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SINGLE CONFERENCE VIEW ───────────────────────────────────────────────────

function SingleConferenceView({ group, gameMap, view }) {
  return (
    <div className="conf-group">
      <div className="conf-group-header">{group.name}</div>
      {group.teams.map(team => {
        const entry = gameMap[team.team.id]
        return (
          <ConferenceTeamRow
            key={team.team.id}
            team={team}
            game={entry?.game || null}
            featuredTeamId={team.team.id}
            view={view}
          />
        )
      })}
    </div>
  )
}

// ─── SCREENS ─────────────────────────────────────────────────────────────────

function HomeScreen({ onSelectLeague, onCollege }) {
  return (
    <div className="app">
      <h1>Scoreboard</h1>
      <p className="screen-label">PRO LEAGUES</p>
      <div className="leagues">
        {PRO_LEAGUES.map(league => (
          <button key={league.id} onClick={() => onSelectLeague(league, false)}>
            {league.label}
          </button>
        ))}
      </div>
      <div className="leagues college-entry">
        <button className="college-btn" onClick={onCollege}>COLLEGE 🎓</button>
      </div>
    </div>
  )
}

function CollegeScreen({ onSelectLeague, onBack }) {
  return (
    <div className="app">
      <div className="nav-bar">
        <button className="back-btn" onClick={onBack}>◀ Pro Leagues</button>
        <h1>Scoreboard</h1>
        <div className="nav-spacer" />
      </div>
      <p className="screen-label">COLLEGE SPORTS</p>
      <div className="leagues">
        {COLLEGE_LEAGUES.map(league => (
          <button key={league.id} onClick={() => onSelectLeague(league, true)}>
            {league.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function GamesScreen({ league, games, loading, snarkyMessage, isCollege, onBack, onConference }) {
  const backLabel = isCollege ? '◀ College' : '◀ Pro Leagues'
  return (
    <div className="app">
      <div className="nav-bar">
        <button className="back-btn" onClick={onBack}>{backLabel}</button>
        <h1>{league.label}</h1>
        <div className="nav-spacer" />
      </div>

      <button className="conf-nav-btn" onClick={onConference}>
        All Games by Conference
      </button>

      {loading && <p className="status">Loading games...</p>}
      {!loading && snarkyMessage && <p className="status snarky">{snarkyMessage}</p>}
      {!loading && !snarkyMessage && games.length === 0 && <p className="status">No games today.</p>}

      <div className="games">
        {games.map((slot) => (
          <GameCard
            key={`${slot.game.id}-${slot.featuredTeam}`}
            game={slot.game}
            featuredTeam={slot.featuredTeam}
          />
        ))}
      </div>
    </div>
  )
}

// Pro conference screen — all divisions
function ProConferenceScreen({ league, onBack }) {
  const [view,    setView]    = useState('scores')
  const [groups,  setGroups]  = useState([])
  const [gameMap, setGameMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useState(() => {
    async function load() {
      try {
        const [standRes, scoreRes] = await Promise.all([
          fetch(buildStandingsUrl(league)),
          fetch(buildScoreboardUrl(league)),
        ])
        const standData = await standRes.json()
        const scoreData = await scoreRes.json()

        const map = {}
        for (const event of scoreData.events || []) {
          const comp = event.competitions[0]
          for (const competitor of comp.competitors) {
            map[competitor.team.id] = { game: event, teamId: competitor.team.id }
          }
        }
        setGameMap(map)

        const rawGroups = parseStandingsGroups(standData, false)
        setGroups(rawGroups.map(groupToDisplay).filter(g => g.teams.length > 0))
      } catch (err) {
        console.error(err)
        setError('Could not load conference data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="app">
      <div className="nav-bar">
        <button className="back-btn" onClick={onBack}>◀ Back</button>
        <h1>{league.label}</h1>
        <div className="nav-spacer" />
      </div>

      <div className="toggle-bar">
        <button className={`toggle-btn ${view === 'scores' ? 'active' : ''}`} onClick={() => setView('scores')}>Scores</button>
        <button className={`toggle-btn ${view === 'standings' ? 'active' : ''}`} onClick={() => setView('standings')}>Standings</button>
      </div>

      {loading && <p className="status">Loading...</p>}
      {error   && <p className="status snarky">{error}</p>}

      {!loading && !error && groups.map(group => (
        <SingleConferenceView key={group.name} group={group} gameMap={gameMap} view={view} />
      ))}
    </div>
  )
}

// College conference screen — SEC default, all conferences list option
function CollegeConferenceScreen({ league, onBack }) {
  const [view,        setView]        = useState('scores')
  const [secGroup,    setSecGroup]    = useState(null)
  const [allGroups,   setAllGroups]   = useState([])
  const [gameMap,     setGameMap]     = useState({})
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  // null = SEC view, 'list' = conference list, group object = single conf view
  const [confView,    setConfView]    = useState(null)

  useState(() => {
    async function load() {
      try {
        const [standRes, scoreRes] = await Promise.all([
          fetch(buildStandingsUrl(league)),
          fetch(buildScoreboardUrl(league)),
        ])
        const standData = await standRes.json()
        const scoreData = await scoreRes.json()

        const map = {}
        for (const event of scoreData.events || []) {
          const comp = event.competitions[0]
          for (const competitor of comp.competitors) {
            map[competitor.team.id] = { game: event, teamId: competitor.team.id }
          }
        }
        setGameMap(map)

        const rawGroups = parseStandingsGroups(standData, true)
        const displayed = rawGroups.map(groupToDisplay).filter(g => g.teams.length > 0)

        // SEC first, rest alphabetical
        const sec  = displayed.find(g => isSEC(g.name))
        const rest = displayed
          .filter(g => !isSEC(g.name))
          .sort((a, b) => a.name.localeCompare(b.name))

        setSecGroup(sec || null)
        setAllGroups([sec, ...rest].filter(Boolean))
      } catch (err) {
        console.error(err)
        setError('Could not load conference data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Single conference drill-down view
  if (confView && confView !== 'list') {
    return (
      <div className="app">
        <div className="nav-bar">
          <button className="back-btn" onClick={() => setConfView('list')}>◀ Back</button>
          <h1>{confView.name}</h1>
          <div className="nav-spacer" />
        </div>
        <div className="toggle-bar">
          <button className={`toggle-btn ${view === 'scores' ? 'active' : ''}`} onClick={() => setView('scores')}>Scores</button>
          <button className={`toggle-btn ${view === 'standings' ? 'active' : ''}`} onClick={() => setView('standings')}>Standings</button>
        </div>
        <SingleConferenceView group={confView} gameMap={gameMap} view={view} />
      </div>
    )
  }

  // All conferences list
  if (confView === 'list') {
    return (
      <div className="app">
        <div className="nav-bar">
          <button className="back-btn" onClick={() => setConfView(null)}>◀ Back</button>
          <h1>Conferences</h1>
          <div className="nav-spacer" />
        </div>
        <div className="conf-list">
          {allGroups.map(group => (
            <button
              key={group.name}
              className={`conf-list-btn ${isSEC(group.name) ? 'conf-list-sec' : ''}`}
              onClick={() => setConfView(group)}
            >
              {group.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Default: SEC view
  return (
    <div className="app">
      <div className="nav-bar">
        <button className="back-btn" onClick={onBack}>◀ Back</button>
        <h1>{league.label}</h1>
        <div className="nav-spacer" />
      </div>

      <button className="conf-nav-btn" onClick={() => setConfView('list')}>
        All Conferences
      </button>

      <div className="toggle-bar">
        <button className={`toggle-btn ${view === 'scores' ? 'active' : ''}`} onClick={() => setView('scores')}>Scores</button>
        <button className={`toggle-btn ${view === 'standings' ? 'active' : ''}`} onClick={() => setView('standings')}>Standings</button>
      </div>

      {loading && <p className="status">Loading...</p>}
      {error   && <p className="status snarky">{error}</p>}

      {!loading && !error && secGroup && (
        <SingleConferenceView group={secGroup} gameMap={gameMap} view={view} />
      )}

      {!loading && !error && !secGroup && (
        <p className="status">No SEC data found.</p>
      )}
    </div>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

function App() {
  const [screen,         setScreen]         = useState('home')
  const [selectedLeague, setSelectedLeague] = useState(null)
  const [isCollege,      setIsCollege]      = useState(false)
  const [games,          setGames]          = useState([])
  const [loading,        setLoading]        = useState(false)
  const [snarkyMessage,  setSnarkyMessage]  = useState(null)

  async function fetchGames(league, college) {
    setSelectedLeague(league)
    setIsCollege(college)
    setScreen('games')
    setLoading(true)
    setGames([])
    setSnarkyMessage(null)

    try {
      const res    = await fetch(buildScoreboardUrl(league))
      const data   = await res.json()
      const events = data.events || []

      if (isOffSeason(events)) {
        setSnarkyMessage(getSnarky(college))
        setGames([])
        return
      }

      if (!college) {
        setGames(events.map(game => ({
          game,
          featuredTeam: game.competitions[0].competitors
            .find(c => c.homeAway === 'away').team.id
        })))
        return
      }

      const slots = []
      events.forEach(game => {
        const comp = game.competitions[0]
        const home = comp.competitors.find(c => c.homeAway === 'home')
        const away = comp.competitors.find(c => c.homeAway === 'away')

        const homeRank  = home.curatedRank?.current
        const awayRank  = away.curatedRank?.current
        const homeIsArk = home.team.displayName.toLowerCase().includes('arkansas')
        const awayIsArk = away.team.displayName.toLowerCase().includes('arkansas')

        if (homeIsArk) slots.push({ game, featuredTeam: home.team.id, sortKey: 0 })
        if (awayIsArk) slots.push({ game, featuredTeam: away.team.id, sortKey: 0 })
        if (homeRank && homeRank <= 25 && !homeIsArk)
          slots.push({ game, featuredTeam: home.team.id, sortKey: homeRank })
        if (awayRank && awayRank <= 25 && !awayIsArk)
          slots.push({ game, featuredTeam: away.team.id, sortKey: awayRank })
      })

      slots.sort((a, b) => a.sortKey - b.sortKey)
      setGames(slots)

    } catch (err) {
      console.error('Failed to fetch games:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleBack() {
    if (screen === 'conference') { setScreen('games');                         return }
    if (screen === 'games')      { setScreen(isCollege ? 'college' : 'home'); return }
    setScreen('home')
  }

  if (screen === 'home')       return <HomeScreen onSelectLeague={fetchGames} onCollege={() => setScreen('college')} />
  if (screen === 'college')    return <CollegeScreen onSelectLeague={fetchGames} onBack={() => setScreen('home')} />
  if (screen === 'conference') {
    return isCollege
      ? <CollegeConferenceScreen league={selectedLeague} onBack={handleBack} />
      : <ProConferenceScreen league={selectedLeague} onBack={handleBack} />
  }

  return (
    <GamesScreen
      league={selectedLeague}
      games={games}
      loading={loading}
      snarkyMessage={snarkyMessage}
      isCollege={isCollege}
      onBack={handleBack}
      onConference={() => setScreen('conference')}
    />
  )
}

export default App