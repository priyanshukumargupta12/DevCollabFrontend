import { Award, Trophy, Play, Star, Calendar } from 'lucide-react';

const ACHIEVEMENTS = [
  {
    id: 'hello_world',
    title: 'Hello World',
    description: 'Launch your first mini-game in the Dev Arcade.',
    icon: '👋',
    color: '#8b5cf6',
  },
  {
    id: 'bug_squasher',
    title: 'Bug Squasher',
    description: 'Score 1,500+ points in a single Bug Hunter game.',
    icon: '🐛',
    color: '#ef4444',
  },
  {
    id: 'keyboard_warrior',
    title: 'Keyboard Warrior',
    description: 'Reach a score of 60+ (WPM equivalent) in Typing Sprint.',
    icon: '⌨️',
    color: '#3b82f6',
  },
  {
    id: 'docker_master',
    title: 'Docker Master',
    description: 'Match all Docker cards with 1,200+ points in Memory Match.',
    icon: '🐳',
    color: '#10b981',
  },
  {
    id: 'conflict_resolver',
    title: 'Conflict Resolver',
    description: 'Resolve all conflicts with 2,200+ points in Git Merge Puzzle.',
    icon: '🌳',
    color: '#f59e0b',
  },
  {
    id: 'arcade_legend',
    title: 'Arcade Legend',
    description: 'Reach a total cumulative score of 8,000+ points across all games.',
    icon: '👑',
    color: '#ec4899',
  },
];

const ArcadeStats = () => {
  // Load stats from localStorage
  const snakeHigh = parseInt(localStorage.getItem('arcade_snake_highscore') || '0', 10);
  const bugHigh = parseInt(localStorage.getItem('arcade_bughunter_highscore') || '0', 10);
  const memoryHigh = parseInt(localStorage.getItem('arcade_memory_highscore') || '0', 10);
  const typingHigh = parseInt(localStorage.getItem('arcade_typing_highscore') || '0', 10);
  const gitHigh = parseInt(localStorage.getItem('arcade_git_highscore') || '0', 10);
  
  const totalPlayed = parseInt(localStorage.getItem('arcade_total_played_count') || '0', 10);
  const cumulativeScore = snakeHigh + bugHigh + memoryHigh + typingHigh + gitHigh;

  // Calculate user Rank
  let rank = 'Script Kiddie 👶';
  let rankColor = 'var(--color-text-muted)';
  if (cumulativeScore >= 8000) {
    rank = 'Principal Architect 👑';
    rankColor = '#ec4899';
  } else if (cumulativeScore >= 5000) {
    rank = 'Senior Lead Engineer 🚀';
    rankColor = '#8b5cf6';
  } else if (cumulativeScore >= 2500) {
    rank = 'Fullstack Developer 💻';
    rankColor = '#3b82f6';
  } else if (cumulativeScore >= 1000) {
    rank = 'Junior QA Tester 🔍';
    rankColor = '#10b981';
  }

  // Check if achievements are unlocked
  const isUnlocked = (id) => {
    switch (id) {
      case 'hello_world':
        return totalPlayed >= 1;
      case 'bug_squasher':
        return bugHigh >= 1500;
      case 'keyboard_warrior':
        return typingHigh >= 60;
      case 'docker_master':
        return memoryHigh >= 1200;
      case 'conflict_resolver':
        return gitHigh >= 2200;
      case 'arcade_legend':
        return cumulativeScore >= 8000;
      default:
        return false;
    }
  };

  const unlockedCount = ACHIEVEMENTS.filter(ach => isUnlocked(ach.id)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      
      {/* Overview Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem',
      }}>
        {/* Player Profile / Rank */}
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent-light)' }}>
            <Award size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Arcade Rank</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: rankColor, marginTop: '0.15rem' }}>{rank}</div>
          </div>
        </div>

        {/* Total Cumulative Score */}
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-warning)' }}>
            <Trophy size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Cumulative Score</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginTop: '0.15rem' }}>
              {cumulativeScore.toLocaleString()} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>pts</span>
            </div>
          </div>
        </div>

        {/* Total Games Played */}
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
            <Play size={18} />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Sessions Played</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginTop: '0.15rem' }}>
              {totalPlayed} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>runs</span>
            </div>
          </div>
        </div>

        {/* Badges Unlocked */}
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
            <Star size={18} />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Badges Unlocked</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginTop: '0.15rem' }}>
              {unlockedCount} / {ACHIEVEMENTS.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Game High Scores vs Badges list */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '1.5rem',
      }} className="lg:grid-cols-3">
        
        {/* Left Column: High Scores list */}
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '20px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }} className="lg:col-span-1">
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            <Trophy size={16} color="var(--color-warning)" />
            Game High Scores
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {[
              { name: '🎯 Bug Hunter', score: bugHigh, color: '#ef4444' },
              { name: '🐍 Dev Snake', score: snakeHigh, color: '#8b5cf6' },
              { name: '🧠 Memory Match', score: memoryHigh, color: '#10b981' },
              { name: '⌨️ Typing Sprint', score: typingHigh, color: '#3b82f6' },
              { name: '🌳 Git Merge Puzzle', score: gitHigh, color: '#f59e0b' },
            ].map((game) => (
              <div
                key={game.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--color-border)',
                  padding: '0.875rem 1rem',
                  borderRadius: '12px',
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{game.name}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: game.score > 0 ? game.color : 'var(--color-text-muted)' }}>
                  {game.score > 0 ? `${game.score.toLocaleString()} pts` : 'Not Played'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Achievements Badges grid */}
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '20px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }} className="lg:col-span-2">
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            <Award size={16} color="var(--color-accent-light)" />
            Developer Achievements
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1rem'
          }}>
            {ACHIEVEMENTS.map((ach) => {
              const unlocked = isUnlocked(ach.id);
              return (
                <div
                  key={ach.id}
                  style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid',
                    borderColor: unlocked ? ach.color : 'var(--color-border)',
                    borderRadius: '14px',
                    padding: '1rem',
                    display: 'flex',
                    gap: '0.875rem',
                    alignItems: 'flex-start',
                    opacity: unlocked ? 1 : 0.45,
                    filter: unlocked ? 'none' : 'grayscale(0.6)',
                    boxShadow: unlocked ? `0 0 15px ${ach.color}15` : 'none',
                    transition: 'all 0.3s ease',
                    textAlign: 'left'
                  }}
                >
                  {/* Badge Emoji icon */}
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    background: unlocked ? `${ach.color}15` : 'rgba(255,255,255,0.03)',
                    border: '1px solid',
                    borderColor: unlocked ? `${ach.color}30` : 'var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    flexShrink: 0
                  }}>
                    {ach.icon}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: unlocked ? '#fff' : 'var(--color-text-secondary)' }}>
                      {ach.title}
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                      {ach.description}
                    </p>
                    {unlocked && (
                      <span style={{ fontSize: '0.625rem', color: ach.color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>
                        ✓ Unlocked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ArcadeStats;
