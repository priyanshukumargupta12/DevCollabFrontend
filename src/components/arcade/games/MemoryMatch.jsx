import { useState, useEffect, useRef } from 'react';
import { RotateCcw, Volume2, VolumeX, Timer, Sparkles } from 'lucide-react';
import { playClickSound, playSuccessSound, playErrorSound, playGameOverSound } from '../utils/audio';

const CARD_DATA = [
  { id: 'react', name: 'React', color: '#61dafb', logo: '⚛️' },
  { id: 'node', name: 'Node.js', color: '#43853d', logo: '🟢' },
  { id: 'mongodb', name: 'MongoDB', color: '#47a248', logo: '🍃' },
  { id: 'docker', name: 'Docker', color: '#2496ed', logo: '🐳' },
  { id: 'git', name: 'Git', color: '#f05032', logo: '🌿' },
  { id: 'ts', name: 'TypeScript', color: '#3178c6', logo: '🟦' },
  { id: 'js', name: 'JavaScript', color: '#f1e05a', logo: '🟨' },
  { id: 'rust', name: 'Rust', color: '#dea584', logo: '🦀' },
  { id: 'py', name: 'Python', color: '#3776ab', logo: '🐍' },
  { id: 'html', name: 'HTML5', color: '#e34c26', logo: '🔥' },
  { id: 'css', name: 'CSS3', color: '#1572b6', logo: '🎨' },
  { id: 'docker-alt', name: 'Kubernetes', color: '#326ce5', logo: '☸️' },
];

const MemoryMatch = ({ onBack, onScoreSubmit }) => {
  const [difficulty, setDifficulty] = useState('easy'); // 'easy' (4x4) or 'hard' (6x4)
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedIds, setMatchedIds] = useState([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem('arcade_memory_highscore') || '0', 10)
  );
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem('arcade_sound_enabled') !== 'false'
  );

  const timerRef = useRef(null);

  // Toggle Audio Sound
  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('arcade_sound_enabled', String(newState));
    playClickSound();
  };

  // Initialize Game
  const initGame = (diff = difficulty) => {
    const pairCount = diff === 'easy' ? 8 : 12; // 4x4 or 6x4
    const selectedCards = CARD_DATA.slice(0, pairCount);
    
    // Duplicate cards to form pairs
    const doubleCards = [...selectedCards, ...selectedCards].map((card, idx) => ({
      ...card,
      uniqueId: idx,
    }));

    // Shuffle cards
    for (let i = doubleCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [doubleCards[i], doubleCards[j]] = [doubleCards[j], doubleCards[i]];
    }

    setCards(doubleCards);
    setFlippedIndices([]);
    setMatchedIds([]);
    setMoves(0);
    setTime(0);
    setIsGameOver(false);
    setIsPlaying(true);
    playClickSound();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTime(prev => prev + 1);
    }, 1000);
  };

  // Card Flip Handler
  const handleCardClick = (index) => {
    if (flippedIndices.length >= 2 || flippedIndices.includes(index) || matchedIds.includes(cards[index].id)) {
      return;
    }

    playClickSound();
    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    // Two cards flipped
    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      const [firstIdx, secondIdx] = newFlipped;
      
      // Match Check
      if (cards[firstIdx].id === cards[secondIdx].id) {
        // Match Success
        setTimeout(() => {
          setMatchedIds(prev => {
            const nextMatched = [...prev, cards[firstIdx].id];
            playSuccessSound();

            const pairCount = difficulty === 'easy' ? 8 : 12;
            if (nextMatched.length === pairCount) {
              triggerWin();
            }
            return nextMatched;
          });
          setFlippedIndices([]);
        }, 500);
      } else {
        // Mismatch Failure
        setTimeout(() => {
          playErrorSound();
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  // Game Won
  const triggerWin = () => {
    setIsGameOver(true);
    playGameOverSound();
    if (timerRef.current) clearInterval(timerRef.current);

    // Calculate score: base score minus move and time penalties
    const baseScore = difficulty === 'easy' ? 2000 : 4000;
    const finalScore = Math.max(100, baseScore - (moves * 15) - (time * 5));

    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('arcade_memory_highscore', String(finalScore));
    }

    if (onScoreSubmit) {
      onScoreSubmit('memory', finalScore);
    }
  };

  // Switch difficulty
  const changeDifficulty = (diff) => {
    setDifficulty(diff);
    initGame(diff);
  };

  // Cleanup timers
  useEffect(() => {
    initGame(difficulty);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format Time Helper
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '650px', margin: '0 auto' }}>
      
      {/* Top dashboard metrics status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Time</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Timer size={16} color="var(--color-accent-light)" />
            {formatTime(time)}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Moves</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{moves}</div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Best Score</span>
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

      {/* Difficulty Toggles */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        <button
          onClick={() => changeDifficulty('easy')}
          className={difficulty === 'easy' ? 'btn-primary' : 'btn-logout'}
          style={{ width: 'auto', padding: '0.35rem 1rem', fontSize: '0.8rem' }}
        >
          Easy (4x4)
        </button>
        <button
          onClick={() => changeDifficulty('hard')}
          className={difficulty === 'hard' ? 'btn-primary' : 'btn-logout'}
          style={{ width: 'auto', padding: '0.35rem 1rem', fontSize: '0.8rem' }}
        >
          Hard (6x4)
        </button>
      </div>

      {/* Main card grid board */}
      <div style={{
        position: 'relative',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: difficulty === 'easy' ? 'repeat(4, 1fr)' : 'repeat(6, 1fr)',
        gap: '0.75rem',
        background: '#090a0f',
        padding: '1rem',
        borderRadius: '20px',
        border: '2px solid rgba(255,255,255,0.05)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      }}>
        {cards.map((card, idx) => {
          const isFlipped = flippedIndices.includes(idx);
          const isMatched = matchedIds.includes(card.id);
          const showFace = isFlipped || isMatched;

          return (
            <button
              key={card.uniqueId}
              onClick={() => handleCardClick(idx)}
              style={{
                aspectRatio: '1/1.2',
                borderRadius: '12px',
                border: '1px solid',
                borderColor: showFace ? card.color : 'rgba(255,255,255,0.06)',
                background: showFace 
                  ? `linear-gradient(135deg, rgba(10,11,15,0.9) 0%, rgba(20,22,30,0.9) 100%)` 
                  : 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                cursor: isMatched ? 'default' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transform: showFace ? 'scale(1.02)' : 'none',
                boxShadow: showFace ? `0 0 15px ${card.color}25` : 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none',
                position: 'relative',
                overflow: 'hidden'
              }}
              className="hover:border-[var(--color-accent-light)]"
            >
              {showFace ? (
                <>
                  <span style={{ fontSize: '2.5rem', filter: isMatched ? 'grayscale(0.3)' : 'none' }}>{card.logo}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: card.color }}>{card.name}</span>
                </>
              ) : (
                <>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.2)'
                  }}>
                    ?
                  </div>
                </>
              )}

              {/* Matched overlay badge check */}
              {isMatched && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(9, 10, 15, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10
                }}>
                  <span style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Matched
                  </span>
                </div>
              )}
            </button>
          );
        })}

        {/* Win Modal overlay */}
        {isGameOver && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10, 11, 16, 0.9)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', borderRadius: '20px', zIndex: 30 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyCenter: 'center', display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
              <Sparkles size={22} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Success!</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', maxWidth: '300px', margin: '0 auto', lineHeight: 1.4 }}>
                You matched all developer tags in <span style={{ color: '#fff', fontWeight: 700 }}>{moves} moves</span> and <span style={{ color: '#fff', fontWeight: 700 }}>{formatTime(time)}</span>.
              </p>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '0.5rem 1rem', marginTop: '1rem', fontSize: '0.85rem', fontWeight: 800 }}>
                Score: <span style={{ color: 'var(--color-success)' }}>{Math.max(100, (difficulty === 'easy' ? 2000 : 4000) - (moves * 15) - (time * 5))} pts</span>
              </div>
            </div>
            <button onClick={() => initGame(difficulty)} className="btn-primary" style={{ width: 'auto', padding: '0.625rem 1.25rem', fontSize: '0.85rem' }}>
              <RotateCcw size={16} /> Play Again
            </button>
          </div>
        )}
      </div>

      {/* Footer controls */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button onClick={() => initGame(difficulty)} className="btn-logout" style={{ width: '100%', padding: '0.625rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <RotateCcw size={15} />
          Reset Board
        </button>
      </div>
    </div>
  );
};

export default MemoryMatch;
