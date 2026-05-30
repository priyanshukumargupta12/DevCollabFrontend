import { useState, useEffect, useRef } from 'react';
import { RotateCcw, Volume2, VolumeX, CheckCircle, AlertTriangle, HelpCircle, ArrowRight } from 'lucide-react';
import { playClickSound, playSuccessSound, playErrorSound, playGameOverSound } from '../utils/audio';

const PUZZLES = [
  {
    id: 1,
    title: 'User Login Verification',
    prompt: 'Resolve Conflict: Keep the incoming branch feature changes which add the isVerified check to user login.',
    currentBranch: 'main',
    incomingBranch: 'feature/user-verification',
    conflictText: `<<<<<<< HEAD
if (user && user.password === inputPassword) {
  return loginSuccess(user);
}
=======
if (user && user.password === inputPassword) {
  if (!user.isVerified) return sendOTP(user.email);
  return loginSuccess(user);
}
>>>>>>> feature/user-verification`,
    options: [
      {
        label: 'Keep HEAD (No verification check)',
        code: `if (user && user.password === inputPassword) {
  return loginSuccess(user);
}`
      },
      {
        label: 'Keep feature/user-verification (Includes verification check)',
        code: `if (user && user.password === inputPassword) {
  if (!user.isVerified) return sendOTP(user.email);
  return loginSuccess(user);
}`
      }
    ],
    correctIdx: 1,
    explanation: 'Adding the isVerified check ensures users confirm their email via OTP before gaining full system access. Selecting the incoming feature preserves this security flow.'
  },
  {
    id: 2,
    title: 'Database Connection URL',
    prompt: 'Resolve Conflict: Keep the main branch version which has the correct MongoDB connection parameter (MONGO_URI).',
    currentBranch: 'main',
    incomingBranch: 'feature/db-cleanup',
    conflictText: `<<<<<<< HEAD
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });
=======
mongoose.connect(process.env.MONGO_URL);
>>>>>>> feature/db-cleanup`,
    options: [
      {
        label: 'Keep HEAD (Uses MONGO_URI)',
        code: `mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });`
      },
      {
        label: 'Keep feature/db-cleanup (Uses MONGO_URL)',
        code: `mongoose.connect(process.env.MONGO_URL);`
      }
    ],
    correctIdx: 0,
    explanation: 'The platform backend is configured with the environment variable name MONGO_URI. Renaming it to MONGO_URL will cause database connection crashes.'
  },
  {
    id: 3,
    title: 'Helmet COOP Configuration',
    prompt: 'Resolve Conflict: Keep the incoming branch which disables Helmet\'s COOP header to fix Google OAuth popup login communication.',
    currentBranch: 'main',
    incomingBranch: 'fix/google-oauth',
    conflictText: `<<<<<<< HEAD
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin" }
}));
=======
app.use(helmet({
  crossOriginOpenerPolicy: false
}));
>>>>>>> fix/google-oauth`,
    options: [
      {
        label: 'Keep HEAD (policy: "same-origin")',
        code: `app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin" }
}));`
      },
      {
        label: 'Keep fix/google-oauth (policy: false)',
        code: `app.use(helmet({
  crossOriginOpenerPolicy: false
}));`
      }
    ],
    correctIdx: 1,
    explanation: 'Setting crossOriginOpenerPolicy to false (or unsafe-none) is required to allow Google\'s OAuth popup iframe to send token payloads back to the frontend window.'
  },
  {
    id: 4,
    title: 'Vercel Routing Fallback',
    prompt: 'Resolve Conflict: Keep the incoming branch which implements the filesystem fallback handler in vercel.json to fix client-side refresh 404s.',
    currentBranch: 'main',
    incomingBranch: 'fix/routing-fallback',
    conflictText: `<<<<<<< HEAD
"rewrites": [
  { "source": "/(.*)", "destination": "/index.html" }
]
=======
"routes": [
  { "handle": "filesystem" },
  { "src": "/(.*)", "dest": "/index.html" }
]
>>>>>>> fix/routing-fallback`,
    options: [
      {
        label: 'Keep HEAD (Basic rewrites configuration)',
        code: `"rewrites": [
  { "source": "/(.*)", "destination": "/index.html" }
]`
      },
      {
        label: 'Keep fix/routing-fallback (Routes with filesystem handler)',
        code: `"routes": [
  { "handle": "filesystem" },
  { "src": "/(.*)", "dest": "/index.html" }
]`
      }
    ],
    correctIdx: 1,
    explanation: 'The handle: filesystem directive ensures Vercel serves actual JS/CSS static assets first, and only falls back to index.html for virtual React routing paths.'
  },
  {
    id: 5,
    title: 'CORS & Port Combination',
    prompt: 'Resolve Conflict: Combine the changes to keep BOTH the local listening Port AND the CORS allowed origins headers configuration.',
    currentBranch: 'main',
    incomingBranch: 'feature/cors-config',
    conflictText: `<<<<<<< HEAD
const PORT = process.env.PORT || 5000;
=======
app.use(cors({ origin: 'https://dev-collab-bice.vercel.app' }));
>>>>>>> feature/cors-config`,
    options: [
      {
        label: 'Only keep local Port',
        code: `const PORT = process.env.PORT || 5000;`
      },
      {
        label: 'Only keep CORS headers config',
        code: `app.use(cors({ origin: 'https://dev-collab-bice.vercel.app' }));`
      },
      {
        label: 'Combine both changes (Integrate Port and CORS configurations)',
        code: `const PORT = process.env.PORT || 5000;
app.use(cors({ origin: 'https://dev-collab-bice.vercel.app' }));`
      }
    ],
    correctIdx: 2,
    explanation: 'In git merge conflicts, sometimes you must combine both blocks to prevent losing critical configurations from both branches.'
  }
];

const GitMergePuzzle = ({ onBack, onScoreSubmit }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(25); // 25s per puzzle
  const [isPlaying, setIsPlaying] = useState(false);
  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem('arcade_git_highscore') || '0', 10)
  );
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem('arcade_sound_enabled') !== 'false'
  );

  const puzzleTimerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Toggle Sound
  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('arcade_sound_enabled', String(newState));
    playClickSound();
  };

  // Start game
  const startGame = () => {
    setCurrentIdx(0);
    setScore(0);
    setSelectedIdx(null);
    setIsAnswered(false);
    setIsGameOver(false);
    setIsPlaying(true);
    playClickSound();
    startPuzzle(0);
  };

  const startPuzzle = (idx) => {
    setTimeRemaining(25);
    setSelectedIdx(null);
    setIsAnswered(false);
    startTimeRef.current = Date.now();

    if (puzzleTimerRef.current) clearInterval(puzzleTimerRef.current);
    puzzleTimerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeOut = () => {
    if (puzzleTimerRef.current) clearInterval(puzzleTimerRef.current);
    playErrorSound();
    setIsCorrect(false);
    setIsAnswered(true);
    setSelectedIdx(-1);
  };

  const handleSelectOption = (optIdx) => {
    if (isAnswered) return;

    if (puzzleTimerRef.current) clearInterval(puzzleTimerRef.current);
    setSelectedIdx(optIdx);
    setIsAnswered(true);

    const puzzle = PUZZLES[currentIdx];
    const correct = optIdx === puzzle.correctIdx;
    setIsCorrect(correct);

    if (correct) {
      playSuccessSound();
      // Calculate score based on speed
      const timeSpent = (Date.now() - startTimeRef.current) / 1000;
      const speedBonus = Math.max(10, Math.round((25 - timeSpent) * 10));
      setScore(prev => prev + 500 + speedBonus);
    } else {
      playErrorSound();
    }
  };

  const handleNextPuzzle = () => {
    playClickSound();
    if (currentIdx < PUZZLES.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      startPuzzle(nextIdx);
    } else {
      triggerGameOver();
    }
  };

  const triggerGameOver = () => {
    setIsGameOver(true);
    setIsPlaying(false);
    playGameOverSound();
    if (puzzleTimerRef.current) clearInterval(puzzleTimerRef.current);

    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('arcade_git_highscore', String(score));
    }

    if (onScoreSubmit) {
      onScoreSubmit('git', score);
    }
  };

  useEffect(() => {
    return () => {
      if (puzzleTimerRef.current) clearInterval(puzzleTimerRef.current);
    };
  }, []);

  const activePuzzle = PUZZLES[currentIdx];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '700px', margin: '0 auto' }}>
      
      {/* Top dashboard stats metrics */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Puzzle</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
            {isPlaying ? `${currentIdx + 1} / ${PUZZLES.length}` : '—'}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Timer</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: timeRemaining <= 5 ? 'var(--color-error)' : '#fff' }}>
            {isPlaying ? `${timeRemaining}s` : '—'}
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

      {/* Main git merge puzzle display grid */}
      <div style={{
        background: '#090a0f',
        borderRadius: '20px',
        border: '2px solid rgba(255,255,255,0.05)',
        padding: '2rem 1.5rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        minHeight: '350px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative'
      }}>
        {isPlaying ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header: Puzzle Title & Directive prompt */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ background: 'rgba(240,80,50,0.1)', border: '1px solid rgba(240,80,50,0.3)', color: '#f05032', fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  git merge conflict
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Merging <code style={{ color: '#fff', fontSize: '0.75rem' }}>{activePuzzle.incomingBranch}</code> into <code style={{ color: '#fff', fontSize: '0.75rem' }}>{activePuzzle.currentBranch}</code>
                </span>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', textAlign: 'left', lineHeight: '1.4' }}>
                {activePuzzle.prompt}
              </h3>
            </div>

            {/* Git conflict marker code block */}
            <div style={{
              background: '#040508',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '1.25rem',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              lineHeight: '1.5',
              color: 'var(--color-text-secondary)',
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              borderLeft: '4px solid #f05032'
            }}>
              {activePuzzle.conflictText}
            </div>

            {/* Answer Options grid selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              {activePuzzle.options.map((opt, optIdx) => {
                const isSelected = selectedIdx === optIdx;
                let btnBorder = 'rgba(255,255,255,0.05)';
                let btnBg = 'rgba(255,255,255,0.01)';

                if (isAnswered) {
                  const isCorrectOpt = optIdx === activePuzzle.correctIdx;
                  if (isCorrectOpt) {
                    btnBorder = 'var(--color-success, #10b981)';
                    btnBg = 'rgba(16, 185, 129, 0.05)';
                  } else if (isSelected) {
                    btnBorder = 'var(--color-error, #ef4444)';
                    btnBg = 'rgba(239, 68, 68, 0.05)';
                  }
                } else {
                  btnBorder = 'rgba(255,255,255,0.05)';
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    disabled={isAnswered}
                    style={{
                      border: `1px solid ${btnBorder}`,
                      background: btnBg,
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      cursor: isAnswered ? 'default' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    className={!isAnswered ? "hover:border-[var(--color-accent-light)]" : ""}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isSelected ? 'var(--color-accent-light)' : '#fff' }}>
                      {opt.label}
                    </span>
                    <pre style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '0.5rem' }}>
                      {opt.code}
                    </pre>
                  </button>
                );
              })}
            </div>

            {/* Answer Feedbacks panel (Educational explanation) */}
            {isAnswered && (
              <div style={{
                background: isCorrect ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
                border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                animation: 'fadeIn 0.3s ease both',
                textAlign: 'left'
              }}>
                <div style={{ color: isCorrect ? 'var(--color-success)' : 'var(--color-error)', flexShrink: 0, marginTop: '2px' }}>
                  {isCorrect ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isCorrect ? 'Conflict Resolved Successfully!' : selectedIdx === -1 ? 'Time Expired!' : 'Merge Conflict Breakout!'}
                    <span style={{ fontSize: '0.75rem', color: isCorrect ? 'var(--color-success)' : 'var(--color-error)' }}>
                      {isCorrect ? `+${500} points` : '0 points'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', lineHeight: '1.4' }}>
                    {activePuzzle.explanation}
                  </p>
                  
                  <button onClick={handleNextPuzzle} className="btn-primary" style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.75rem' }}>
                    {currentIdx < PUZZLES.length - 1 ? 'Next Puzzle' : 'Finish'} <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Initial/Gameover splash screen */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', padding: '1rem', textAlign: 'center' }}>
            {isGameOver ? (
              <>
                <div style={{ fontSize: '3rem' }}>🌳</div>
                <div>
                  <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Repository Clean!</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', maxWidth: '340px', margin: '0 auto', lineHeight: 1.4 }}>
                    You resolved all merge conflict puzzles successfully. Final score: <span style={{ color: 'var(--color-success)', fontWeight: 800 }}>{score}</span>
                  </p>
                </div>
                <button onClick={startGame} className="btn-primary" style={{ width: 'auto', padding: '0.625rem 1.25rem', fontSize: '0.85rem' }}>
                  <RotateCcw size={16} /> Play Again
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '3.5rem' }}>🌳</div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Git Merge Puzzle</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5, maxWidth: '380px', margin: '0 auto' }}>
                    Simulate resolving actual Git merge conflicts. Read the prompt description, view the conflict code segment, and choose the correct code block (HEAD, Incoming, or Combined) within the 25-second timer.
                  </p>
                </div>
                <button onClick={startGame} className="btn-primary" style={{ width: 'auto', padding: '0.625rem 1.5rem', fontSize: '0.85rem' }}>
                  Start Merge
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Animation Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />

      {/* Educational info helper HUD */}
      {isPlaying && (
        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', textAlign: 'left' }}>
          <HelpCircle size={16} color="var(--color-accent-light)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.15rem' }}>Git Tip</h4>
            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              Merge conflicts happen when different branches modify the same line of code. Code blocks between <code style={{ color: '#fff' }}>&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD</code> and <code style={{ color: '#fff' }}>=======</code> belong to the current branch, while blocks between <code style={{ color: '#fff' }}>=======</code> and <code style={{ color: '#fff' }}>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code> belong to the incoming branch.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GitMergePuzzle;
