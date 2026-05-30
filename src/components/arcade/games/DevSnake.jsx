import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { playClickSound, playSuccessSound, playGameOverSound } from '../utils/audio';

const FOOD_TYPES = [
  { label: 'JS', color: '#f1e05a', name: 'JavaScript' },
  { label: 'TS', color: '#3178c6', name: 'TypeScript' },
  { label: 'Py', color: '#3572a5', name: 'Python' },
  { label: 'Go', color: '#00add8', name: 'Go' },
  { label: 'Rust', color: '#dea584', name: 'Rust' },
];

const GRID_SIZE = 20;
const CELL_COUNT = 20;

const DevSnake = ({ onBack, onScoreSubmit }) => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem('arcade_snake_highscore') || '0', 10)
  );
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem('arcade_sound_enabled') !== 'false'
  );
  const [currentFoodType, setCurrentFoodType] = useState(FOOD_TYPES[0]);

  // Game loop references
  const snakeRef = useRef([{ x: 10, y: 10 }]);
  const directionRef = useRef({ x: 1, y: 0 });
  const lastDirectionRef = useRef({ x: 1, y: 0 });
  const foodRef = useRef({ x: 5, y: 5 });
  const speedRef = useRef(150); // ms per tick
  const gameIntervalRef = useRef(null);

  // Generate random food position not on snake
  const generateFood = () => {
    const snake = snakeRef.current;
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * CELL_COUNT),
        y: Math.floor(Math.random() * CELL_COUNT),
      };
      // Check collision with snake
      const onSnake = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!onSnake) break;
    }
    foodRef.current = newFood;
    const randomFood = FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)];
    setCurrentFoodType(randomFood);
  };

  const handleKeyPress = (e) => {
    if (isGameOver || isPaused) return;

    let newDir = null;
    const lastDir = lastDirectionRef.current;

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        if (lastDir.y === 0) newDir = { x: 0, y: -1 };
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        if (lastDir.y === 0) newDir = { x: 0, y: 1 };
        e.preventDefault();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        if (lastDir.x === 0) newDir = { x: -1, y: 0 };
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        if (lastDir.x === 0) newDir = { x: 1, y: 0 };
        e.preventDefault();
        break;
      default:
        break;
    }

    if (newDir) {
      directionRef.current = newDir;
    }
  };

  const setDirection = (x, y) => {
    if (isGameOver || isPaused) return;
    const lastDir = lastDirectionRef.current;
    if (x !== 0 && lastDir.x === 0) directionRef.current = { x, y };
    if (y !== 0 && lastDir.y === 0) directionRef.current = { x, y };
    playClickSound();
  };

  // Sound Toggle
  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('arcade_sound_enabled', String(newState));
    playClickSound();
  };

  const initGame = () => {
    snakeRef.current = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    directionRef.current = { x: 1, y: 0 };
    lastDirectionRef.current = { x: 1, y: 0 };
    speedRef.current = 150;
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    generateFood();
    playClickSound();
  };

  const triggerGameOver = () => {
    setIsGameOver(true);
    playGameOverSound();
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('arcade_snake_highscore', String(score));
    }
    // Submit score for achievements
    if (onScoreSubmit) {
      onScoreSubmit('snake', score);
    }
  };

  // Core Game Update Step
  const gameTick = () => {
    if (isGameOver || isPaused) return;

    const snake = [...snakeRef.current];
    const direction = directionRef.current;
    lastDirectionRef.current = direction;

    // Calculate new head position
    const head = {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y,
    };

    // Wall Collision
    if (head.x < 0 || head.x >= CELL_COUNT || head.y < 0 || head.y >= CELL_COUNT) {
      triggerGameOver();
      return;
    }

    // Self Collision
    const selfCollision = snake.some(segment => segment.x === head.x && segment.y === head.y);
    if (selfCollision) {
      triggerGameOver();
      return;
    }

    // Add new head to front
    snake.unshift(head);

    // Food Collision
    const food = foodRef.current;
    if (head.x === food.x && head.y === food.y) {
      setScore(prev => {
        const newScore = prev + 100;
        playSuccessSound();
        
        // Speed scaling up every 500 points
        if (newScore % 500 === 0 && speedRef.current > 70) {
          speedRef.current = Math.max(70, speedRef.current - 15);
        }
        return newScore;
      });
      generateFood();
    } else {
      // Remove tail segment if food was not eaten
      snake.pop();
    }

    snakeRef.current = snake;
    drawCanvas();
  };

  // Canvas Drawing Routine
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const size = w / CELL_COUNT;

    // 1. Draw Background
    ctx.fillStyle = '#0f111a';
    ctx.fillRect(0, 0, w, h);

    // Subtle Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    for (let i = 0; i < CELL_COUNT; i++) {
      ctx.beginPath();
      ctx.moveTo(i * size, 0);
      ctx.lineTo(i * size, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * size);
      ctx.lineTo(w, i * size);
      ctx.stroke();
    }

    // 2. Draw Food item
    const food = foodRef.current;
    ctx.shadowBlur = 10;
    ctx.shadowColor = currentFoodType.color;
    ctx.fillStyle = currentFoodType.color;
    ctx.beginPath();
    ctx.roundRect(food.x * size + 2, food.y * size + 2, size - 4, size - 4, 4);
    ctx.fill();

    // Food labels text overlays (e.g. "JS", "Py")
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a0a0f';
    ctx.font = `bold ${Math.floor(size * 0.55)}px var(--font-sans), monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentFoodType.label, food.x * size + size / 2, food.y * size + size / 2);

    // 3. Draw Snake (Glowing segmented code theme)
    const snake = snakeRef.current;
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.shadowBlur = isHead ? 8 : 4;
      ctx.shadowColor = 'var(--color-accent-light, #8b5cf6)';
      
      // Gradient glow along the body
      ctx.fillStyle = isHead ? '#a78bfa' : `rgba(139, 92, 246, ${1 - index / (snake.length * 1.5)})`;

      ctx.beginPath();
      ctx.roundRect(segment.x * size + 1.5, segment.y * size + 1.5, size - 3, size - 3, isHead ? 6 : 4);
      ctx.fill();
    });

    ctx.shadowBlur = 0;
  };

  // Tick Timer Loop manager
  useEffect(() => {
    if (isGameOver || isPaused) {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
      return;
    }

    const runLoop = () => {
      gameTick();
      gameIntervalRef.current = setTimeout(runLoop, speedRef.current);
    };

    gameIntervalRef.current = setTimeout(runLoop, speedRef.current);

    return () => {
      if (gameIntervalRef.current) clearTimeout(gameIntervalRef.current);
    };
  }, [isGameOver, isPaused]);

  // Initial draw & resize handler
  useEffect(() => {
    initGame();
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (gameIntervalRef.current) clearTimeout(gameIntervalRef.current);
    };
  }, []);

  // Update canvas when state changes
  useEffect(() => {
    drawCanvas();
  }, [currentFoodType]);

  const togglePause = () => {
    setIsPaused(prev => !prev);
    playClickSound();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Top dashboard controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Score</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{score}</div>
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

      {/* Screen area with CRT retro effect wrapper */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: '#0a0b10', borderRadius: '18px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
        
        {/* Retro Scanlines overlays */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
          backgroundSize: '100% 4px',
          zIndex: 10,
          pointerEvents: 'none'
        }} />

        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {/* Next food helper HUD */}
        <div style={{ position: 'absolute', bottom: '10px', left: '10px', zIndex: 20, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.625rem', background: 'rgba(10,11,16,0.85)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Next Language:</span>
          <span style={{ fontWeight: 800, color: currentFoodType.color }}>
            {currentFoodType.name} ({currentFoodType.label})
          </span>
        </div>

        {/* GameOver or Paused Modals */}
        {(isGameOver || isPaused) && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10, 11, 16, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', zIndex: 30 }}>
            {isGameOver ? (
              <>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-error)' }}>GAME OVER</h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '-0.5rem' }}>
                  You hit a bug! Final score: <span style={{ color: '#fff', fontWeight: 800 }}>{score}</span>
                </p>
                <button onClick={initGame} className="btn-primary" style={{ width: 'auto', padding: '0.625rem 1.25rem', fontSize: '0.85rem' }}>
                  <RotateCcw size={16} /> Play Again
                </button>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-accent-light)' }}>PAUSED</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={togglePause} className="btn-primary" style={{ width: 'auto', padding: '0.625rem 1.25rem', fontSize: '0.85rem' }}>
                    <Play size={16} /> Resume
                  </button>
                  <button onClick={initGame} className="btn-logout" style={{ padding: '0.625rem 1.25rem', fontSize: '0.85rem' }}>
                    <RotateCcw size={16} /> Restart
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Control Actions (Pause/Restart) */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        {!isGameOver && (
          <button onClick={togglePause} className="btn-logout" style={{ flex: 1, padding: '0.625rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {isPaused ? <Play size={15} /> : <Pause size={15} />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        )}
        <button onClick={initGame} className="btn-logout" style={{ flex: 1, padding: '0.625rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <RotateCcw size={15} />
          Reset Game
        </button>
      </div>

      {/* On-Screen Mobile D-Pad Controls */}
      <div className="flex flex-col items-center gap-1 mt-2 sm:hidden">
        <button onClick={() => setDirection(0, -1)} className="btn-logout flex items-center justify-center" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
          <ArrowUp size={20} />
        </button>
        <div className="flex gap-8">
          <button onClick={() => setDirection(-1, 0)} className="btn-logout flex items-center justify-center" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
            <ArrowLeft size={20} />
          </button>
          <button onClick={() => setDirection(1, 0)} className="btn-logout flex items-center justify-center" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
            <ArrowRight size={20} />
          </button>
        </div>
        <button onClick={() => setDirection(0, 1)} className="btn-logout flex items-center justify-center" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
          <ArrowDown size={20} />
        </button>
      </div>
    </div>
  );
};

export default DevSnake;
