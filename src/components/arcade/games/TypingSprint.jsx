import { useState, useEffect, useRef } from 'react';
import { RotateCcw, Volume2, VolumeX, Keyboard, Timer, CheckCircle } from 'lucide-react';
import { playClickSound, playSuccessSound, playErrorSound, playGameOverSound } from '../utils/audio';

const SNIPPETS = [
  {
    lang: 'React JSX',
    code: `const Button = ({ label, onClick }) => {
  return (
    <button onClick={onClick} className="px-4 py-2 bg-blue-500 rounded">
      {label}
    </button>
  );
};`
  },
  {
    lang: 'JavaScript Async',
    code: `const fetchData = async (url) => {
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Fetch failed:", err);
  }
};`
  },
  {
    lang: 'Express Route',
    code: `app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});`
  },
  {
    lang: 'Python Helper',
    code: `def find_primes(n):
    primes = []
    for num in range(2, n):
        is_prime = all(num % i != 0 for i in range(2, int(num**0.5) + 1))
        if is_prime:
            primes.append(num)
    return primes`
  },
  {
    lang: 'Mongoose Schema',
    code: `const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });`
  }
];

const TypingSprint = ({ onBack, onScoreSubmit }) => {
  const [snippet, setSnippet] = useState(SNIPPETS[0]);
  const [typedText, setTypedText] = useState('');
  const [timeMode, setTimeMode] = useState(60); // 30, 60, 120
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem('arcade_typing_highscore') || '0', 10)
  );
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem('arcade_sound_enabled') !== 'false'
  );
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef(null);
  const gameIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const totalKeystrokesRef = useRef(0);
  const mistakeCountRef = useRef(0);

  // Sound Toggle
  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('arcade_sound_enabled', String(newState));
    playClickSound();
  };

  // Init/Restart Game
  const initGame = (mode = timeMode) => {
    const randomSnippet = SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)];
    setSnippet(randomSnippet);
    setTypedText('');
    setTimeRemaining(mode);
    setWpm(0);
    setAccuracy(100);
    setIsGameOver(false);
    setIsPlaying(false);
    totalKeystrokesRef.current = 0;
    mistakeCountRef.current = 0;
    startTimeRef.current = null;
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    playClickSound();
  };

  // Start the timer
  const startTimer = () => {
    setIsPlaying(true);
    startTimeRef.current = Date.now();
    gameIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          triggerGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Typing Input Change Handler
  const handleInputChange = (e) => {
    if (isGameOver) return;

    const value = e.target.value;
    
    // Auto-start game on first keystroke
    if (!isPlaying) {
      startTimer();
    }

    // Only allow typing within the code snippet limits
    if (value.length > snippet.code.length) return;

    const lastCharTyped = value[value.length - 1];
    const expectedChar = snippet.code[value.length - 1];
    totalKeystrokesRef.current += 1;

    // Accuracy & Mistake checks
    if (lastCharTyped === expectedChar) {
      playClickSound();
    } else {
      playErrorSound();
      mistakeCountRef.current += 1;
    }

    setTypedText(value);
    calculateStats(value);

    // If fully typed, complete successfully
    if (value.length === snippet.code.length) {
      triggerSuccessComplete();
    }
  };

  const calculateStats = (currentTypedText) => {
    const totalTyped = currentTypedText.length;
    if (totalTyped === 0) {
      setAccuracy(100);
      return;
    }

    // Calculate accuracy: (correct characters / total keystrokes) * 100
    const correctCount = currentTypedText.split('').filter((c, i) => c === snippet.code[i]).length;
    const calcAccuracy = Math.round((correctCount / totalKeystrokesRef.current) * 100);
    setAccuracy(calcAccuracy);

    // Calculate WPM: (correct characters / 5) / time elapsed in minutes
    if (startTimeRef.current) {
      const elapsedMinutes = (Date.now() - startTimeRef.current) / 60000;
      if (elapsedMinutes > 0.01) {
        const calcWpm = Math.round((correctCount / 5) / elapsedMinutes);
        setWpm(calcWpm);
      }
    }
  };

  // Complete snippet early
  const triggerSuccessComplete = () => {
    playSuccessSound();
    // Fetch next snippet or finish
    const randomSnippet = SNIPPETS.find(s => s.code !== snippet.code) || SNIPPETS[0];
    setSnippet(randomSnippet);
    setTypedText('');
    // Give time bonus (+10s)
    setTimeRemaining(prev => Math.min(timeMode, prev + 10));
    toastSuccessSnippet();
  };

  const toastSuccessSnippet = () => {
    playSuccessSound();
  };

  // Game Over
  const triggerGameOver = () => {
    setIsGameOver(true);
    setIsPlaying(false);
    playGameOverSound();
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);

    // Score is WPM scaled by accuracy percentage
    const finalScore = Math.round(wpm * (accuracy / 100));

    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('arcade_typing_highscore', String(finalScore));
    }

    if (onScoreSubmit) {
      onScoreSubmit('typing', finalScore);
    }
  };

  // Focus invisible input area
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    initGame(timeMode);
    return () => {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '650px', margin: '0 auto' }}>
      
      {/* Top dashboard metrics status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Time Left</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: timeRemaining <= 10 ? 'var(--color-error)' : '#fff', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Timer size={16} color="var(--color-accent-light)" />
            {timeRemaining}s
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>WPM</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{wpm}</div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Accuracy</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: accuracy < 85 ? 'var(--color-error)' : 'var(--color-success)' }}>
            {accuracy}%
          </div>
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

      {/* Time Mode Toggles */}
      {!isPlaying && !isGameOver && (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          {[30, 60, 120].map(mode => (
            <button
              key={mode}
              onClick={() => { setTimeMode(mode); initGame(mode); }}
              className={timeMode === mode ? 'btn-primary' : 'btn-logout'}
              style={{ width: 'auto', padding: '0.35rem 1rem', fontSize: '0.8rem' }}
            >
              {mode}s Sprint
            </button>
          ))}
        </div>
      )}

      {/* Hidden Textarea for mobile compatibility */}
      <textarea
        ref={inputRef}
        value={typedText}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          height: 0,
          width: 0,
          overflow: 'hidden'
        }}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck="false"
      />

      {/* Main code display window */}
      <div
        onClick={focusInput}
        style={{
          position: 'relative',
          width: '100%',
          background: '#090a0f',
          padding: '2rem 1.5rem',
          borderRadius: '20px',
          border: `2px solid ${isFocused ? 'var(--color-accent-light, #8b5cf6)' : 'rgba(255,255,255,0.05)'}`,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          cursor: 'text',
          transition: 'all 0.2s ease',
          minHeight: '220px',
        }}
      >
        {/* Language Pill */}
        <div style={{ position: 'absolute', top: '10px', right: '15px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {snippet.lang}
        </div>

        {/* Character overlay renderer */}
        <pre style={{
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          fontFamily: 'monospace',
          fontSize: '0.95rem',
          lineHeight: '1.6',
          color: 'rgba(255, 255, 255, 0.2)',
          textAlign: 'left'
        }}>
          {snippet.code.split('').map((char, index) => {
            let charColor = 'rgba(255,255,255,0.2)';
            let isCurrent = index === typedText.length;
            let isSpace = char === ' ';
            let isNewline = char === '\n';

            if (index < typedText.length) {
              const correct = typedText[index] === char;
              charColor = correct ? 'var(--color-success, #10b981)' : 'var(--color-error, #ef4444)';
            }

            return (
              <span
                key={index}
                style={{
                  color: charColor,
                  background: isCurrent && isFocused 
                    ? 'rgba(139, 92, 246, 0.3)' 
                    : !isCurrent && index < typedText.length && typedText[index] !== char 
                    ? 'rgba(239, 68, 68, 0.15)' 
                    : 'transparent',
                  borderLeft: isCurrent && isFocused ? '2px solid var(--color-accent-light)' : 'none',
                  marginLeft: isCurrent && isFocused && index > 0 && snippet.code[index-1] === '\n' ? '-2px' : 'none',
                  borderRadius: '2px',
                  textDecoration: !isCurrent && index < typedText.length && typedText[index] !== char && isSpace ? 'underline' : 'none'
                }}
              >
                {isNewline ? '\n' : char}
              </span>
            );
          })}
        </pre>

        {/* Focus prompt */}
        {!isFocused && !isGameOver && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10, 11, 16, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '20px', pointerEvents: 'none' }}>
            <span style={{
              background: 'rgba(10, 11, 16, 0.9)',
              border: '1px solid var(--color-border)',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              fontSize: '0.8rem',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: 'var(--shadow-md)'
            }}>
              <Keyboard size={15} color="var(--color-accent-light)" /> Click here to start typing
            </span>
          </div>
        )}

        {/* Win Modal overlay */}
        {isGameOver && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10, 11, 16, 0.95)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', borderRadius: '20px', zIndex: 30 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyCenter: 'center', display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
              <CheckCircle size={22} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Sprint Complete!</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '0.75rem 1.5rem', marginTop: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>WPM</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{wpm}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Accuracy</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)' }}>{accuracy}%</div>
                </div>
              </div>
              <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '12px', padding: '0.5rem 1rem', marginTop: '1rem', fontSize: '0.85rem', fontWeight: 800 }}>
                Score: <span style={{ color: 'var(--color-accent-light)' }}>{Math.round(wpm * (accuracy / 100))} pts</span>
              </div>
            </div>
            <button onClick={() => initGame(timeMode)} className="btn-primary" style={{ width: 'auto', padding: '0.625rem 1.25rem', fontSize: '0.85rem' }}>
              <RotateCcw size={16} /> Play Again
            </button>
          </div>
        )}
      </div>

      {/* Footer controls */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={() => initGame(timeMode)} className="btn-logout" style={{ flex: 1, padding: '0.625rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <RotateCcw size={15} />
          Reset Sprint
        </button>
      </div>
    </div>
  );
};

export default TypingSprint;
