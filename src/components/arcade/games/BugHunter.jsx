import { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
import { playClickSound, playSuccessSound, playLaserSound, playGameOverSound } from '../utils/audio';

const BUG_TYPES = [
  { char: '🐛', name: 'Caterpillar Bug', points: 100, speedMultiplier: 1 },
  { char: '🐜', name: 'Ant Bug', points: 150, speedMultiplier: 1.4 },
  { char: '🕷️', name: 'Spider Bug', points: 200, speedMultiplier: 1.8 },
  { char: '🐞', name: 'Ladybug Bug', points: 250, speedMultiplier: 2.2 },
];

const BugHunter = ({ onBack, onScoreSubmit }) => {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem('arcade_bughunter_highscore') || '0', 10)
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [bugs, setBugs] = useState([]);
  const [splats, setSplats] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem('arcade_sound_enabled') !== 'false'
  );

  const containerRef = useRef(null);
  const bugIdRef = useRef(0);
  const gameTimeIntervalRef = useRef(null);
  const bugSpawnTimeoutRef = useRef(null);
  const bugMoveIntervalRef = useRef(null);

  // Toggle audio sound
  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('arcade_sound_enabled', String(newState));
    playClickSound();
  };

  // Start game
  const startGame = () => {
    setScore(0);
    setTimeRemaining(60);
    setIsGameOver(false);
    setIsPlaying(true);
    setBugs([]);
    setSplats([]);
    bugIdRef.current = 0;
    playClickSound();
  };

  // Trigger GameOver
  const triggerGameOver = () => {
    setIsGameOver(true);
    setIsPlaying(false);
    playGameOverSound();
    
    // Clear all timers
    if (gameTimeIntervalRef.current) clearInterval(gameTimeIntervalRef.current);
    if (bugSpawnTimeoutRef.current) clearTimeout(bugSpawnTimeoutRef.current);
    if (bugMoveIntervalRef.current) clearInterval(bugMoveIntervalRef.current);

    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('arcade_bughunter_highscore', String(score));
    }

    if (onScoreSubmit) {
      onScoreSubmit('bughunter', score);
    }
  };

  // Game countdown timer
  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    gameTimeIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          triggerGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (gameTimeIntervalRef.current) clearInterval(gameTimeIntervalRef.current);
    };
  }, [isPlaying, isGameOver, score]);

  // Crawling movement loops
  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    bugMoveIntervalRef.current = setInterval(() => {
      setBugs(prevBugs =>
        prevBugs.map(bug => {
          // Crawl in somewhat random directions
          const angleOffset = (Math.random() - 0.5) * 0.5;
          const newAngle = bug.angle + angleOffset;

          const distance = 2.5 * bug.type.speedMultiplier;
          let newX = bug.x + Math.cos(newAngle) * distance;
          let newY = bug.y + Math.sin(newAngle) * distance;

          // Bounce off container boundary edges
          if (newX < 5 || newX > 95) {
            newX = Math.max(5, Math.min(95, newX));
            return { ...bug, x: newX, y: newY, angle: newAngle + Math.PI };
          }
          if (newY < 5 || newY > 95) {
            newY = Math.max(5, Math.min(95, newY));
            return { ...bug, x: newX, y: newY, angle: newAngle + Math.PI };
          }

          return { ...bug, x: newX, y: newY, angle: newAngle };
        })
      );
    }, 60);

    return () => {
      if (bugMoveIntervalRef.current) clearInterval(bugMoveIntervalRef.current);
    };
  }, [isPlaying, isGameOver]);

  // Bug spawning loops
  const spawnBug = () => {
    if (!isPlaying || isGameOver) return;

    const randomType = BUG_TYPES[Math.floor(Math.random() * BUG_TYPES.length)];
    const edge = Math.floor(Math.random() * 4); // 0: Top, 1: Right, 2: Bottom, 3: Left
    let startX = 0;
    let startY = 0;

    switch (edge) {
      case 0: // Top
        startX = Math.random() * 90 + 5;
        startY = 5;
        break;
      case 1: // Right
        startX = 95;
        startY = Math.random() * 90 + 5;
        break;
      case 2: // Bottom
        startX = Math.random() * 90 + 5;
        startY = 95;
        break;
      case 3: // Left
        startX = 5;
        startY = Math.random() * 90 + 5;
        break;
      default:
        break;
    }

    const newBug = {
      id: bugIdRef.current++,
      x: startX,
      y: startY,
      type: randomType,
      angle: Math.random() * Math.PI * 2,
    };

    setBugs(prev => [...prev, newBug]);

    // Schedule next spawn - decreases interval dynamically as score increases
    const minInterval = 400;
    const maxInterval = 1400;
    const intervalRange = maxInterval - minInterval;
    const scoreFactor = Math.min(1, score / 5000); // Max spawn speed reached at 5000 score
    const nextInterval = maxInterval - (intervalRange * scoreFactor);

    bugSpawnTimeoutRef.current = setTimeout(spawnBug, nextInterval);
  };

  useEffect(() => {
    if (isPlaying && !isGameOver) {
      bugSpawnTimeoutRef.current = setTimeout(spawnBug, 800);
    }

    return () => {
      if (bugSpawnTimeoutRef.current) clearTimeout(bugSpawnTimeoutRef.current);
    };
  }, [isPlaying, isGameOver]);

  // Click handler to squash bug
  const handleSquashBug = (e, targetBug) => {
    e.stopPropagation(); // Avoid triggering misses in grid clicking
    if (!isPlaying || isGameOver) return;

    playLaserSound();
    playSuccessSound();

    // Spawn Splat feedback particle
    const splat = {
      id: Math.random(),
      x: targetBug.x,
      y: targetBug.y,
      text: `+${targetBug.type.points}`,
      char: targetBug.type.char,
    };

    setSplats(prev => [...prev, splat]);
    setScore(prev => prev + targetBug.type.points);
    setBugs(prev => prev.filter(b => b.id !== targetBug.id));

    // Clear splats after fade animation finishes
    setTimeout(() => {
      setSplats(prev => prev.filter(s => s.id !== splat.id));
    }, 800);
  };

  // Clicking outside is counted as a miss (deducts 50 score to add penalty)
  const handleContainerClick = () => {
    if (!isPlaying || isGameOver) return;
    setScore(prev => Math.max(0, prev - 50));
    playClickSound();
  };

  // Stop all timers on component unmount
  useEffect(() => {
    return () => {
      if (gameTimeIntervalRef.current) clearInterval(gameTimeIntervalRef.current);
      if (bugSpawnTimeoutRef.current) clearTimeout(bugSpawnTimeoutRef.current);
      if (bugMoveIntervalRef.current) clearInterval(bugMoveIntervalRef.current);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '700px', margin: '0 auto' }}>
      
      {/* Top status header metrics */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Time Left</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: timeRemaining <= 10 ? 'var(--color-error)' : '#fff' }}>
            {timeRemaining}s
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Score</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-accent-light)' }}>{score}</div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>High Score</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-warning)' }}>{highScore}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={toggleSound} className="btn-logout" style={{ padding: '0.5rem', borderRadius: '50%' }} title="Toggle Sound">
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button onClick={onBack} className="btn-logout" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
            Back
          </button>
        </div>
      </div>

      {/* Main Gameplay Screen grid */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        style={{
          position: 'relative',
          width: '100%',
          height: '420px',
          background: '#090a0f',
          borderRadius: '20px',
          overflow: 'hidden',
          border: '2px solid rgba(255,255,255,0.06)',
          cursor: isPlaying && !isGameOver ? 'crosshair' : 'default',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)'
        }}
      >
        {/* Radar grids overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle, rgba(139,92,246,0.03) 10%, transparent 60%)',
          pointerEvents: 'none'
        }} />

        {/* Live crawling bugs */}
        {isPlaying && bugs.map(bug => (
          <button
            key={bug.id}
            onClick={(e) => handleSquashBug(e, bug)}
            style={{
              position: 'absolute',
              left: `${bug.x}%`,
              top: `${bug.y}%`,
              transform: `translate(-50%, -50%) rotate(${bug.angle * (180 / Math.PI) + 90}deg)`,
              fontSize: '2rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              outline: 'none',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              zIndex: 20,
              transition: 'transform 0.05s linear',
            }}
          >
            {bug.type.char}
          </button>
        ))}

        {/* Squashed splat visual markers */}
        {splats.map(splat => (
          <div
            key={splat.id}
            style={{
              position: 'absolute',
              left: `${splat.x}%`,
              top: `${splat.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'fadeOutUp 0.8s ease forwards'
            }}
          >
            {/* Flattened bug indicator */}
            <span style={{ fontSize: '1.75rem', opacity: 0.25, filter: 'grayscale(1)' }}>{splat.char}</span>
            {/* Floating text increment */}
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-success)', textShadow: '0 2px 4px rgba(0,0,0,0.5)', marginTop: '-8px' }}>
              {splat.text}
            </span>
          </div>
        ))}

        {/* CSS Animation declaration */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeOutUp {
            0% {
              opacity: 1;
              transform: translate(-50%, -50%) translateY(0);
            }
            100% {
              opacity: 0;
              transform: translate(-50%, -50%) translateY(-25px);
            }
          }
        `}} />

        {/* Initial/Gameover splash screen */}
        {!isPlaying && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10, 11, 16, 0.85)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', padding: '2rem', textAlign: 'center', zIndex: 30 }}>
            {isGameOver ? (
              <>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: 'var(--color-error)', display: 'flex', alignItems: 'center', justifyCenter: 'center', display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Time Expired!</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    You caught a total of <span style={{ color: '#fff', fontWeight: 700 }}>{bugs.length}</span> bugs. Final score: <span style={{ color: 'var(--color-success)', fontWeight: 800 }}>{score}</span>
                  </p>
                </div>
                <button onClick={startGame} className="btn-primary" style={{ width: 'auto', padding: '0.625rem 1.25rem', fontSize: '0.85rem' }}>
                  <RotateCcw size={16} /> Play Again
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '3rem' }}>🎯</div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Bug Hunter</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5, maxWidth: '360px', margin: '0 auto' }}>
                    Squash the bugs (🐛, 🐜, 🕷️, 🐞) crawling on your screen. Don't click empty spaces or you will lose points! Speed increases as your score goes up.
                  </p>
                </div>
                <button onClick={startGame} className="btn-primary" style={{ width: 'auto', padding: '0.625rem 1.5rem', fontSize: '0.85rem' }}>
                  <Play size={16} /> Start Game
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Guide HUD info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
        {BUG_TYPES.map(type => (
          <div key={type.name} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', padding: '0.5rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{type.char}</span>
            <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{type.name.split(' ')[0]}</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff' }}>{type.points} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BugHunter;
