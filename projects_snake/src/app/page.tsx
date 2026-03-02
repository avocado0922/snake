'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };
type GameMode = 'CLASSIC' | 'MAZE';
type Food = Position & { color: string; points: number };

const GRID_SIZE = 30;
const CELL_SIZE = 20;

export default function SnakeGame() {
  const [snake, setSnake] = useState<Position[]>(() => {
    const startX = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
    const startY = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
    return [{ x: startX, y: startY }];
  });
  const [foods, setFoods] = useState<Food[]>([]);
  const foodsRef = useRef<Food[]>([]); // 使用 ref 存储 foods 的最新值
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('CLASSIC');
  const [obstacles, setObstacles] = useState<Position[]>([]);
  const [showModeSelect, setShowModeSelect] = useState(true);
  const [gameSpeed, setGameSpeed] = useState(150);
  const [isMobile, setIsMobile] = useState(false);
  const [showLandscapeHint, setShowLandscapeHint] = useState(false);
  const [highestScore, setHighestScore] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('snakeGameHighestScore');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  // 食物配色和分数映射
  const getFoodColor = useCallback(() => {
    const colors = [
      { color: '#FF6B6B', points: 1 },
      { color: '#4ECDC4', points: 2 },
      { color: '#45B7D1', points: 3 },
      { color: '#96CEB4', points: 4 },
      { color: '#FFEAA7', points: 5 },
      { color: '#DDA0DD', points: 6 },
      { color: '#87CEEB', points: 7 },
      { color: '#98D8C8', points: 8 }
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }, []);

  // 生成单个食物
  const generateSingleFood = useCallback((existingFoods: Food[], existingSnake: Position[], existingObstacles: Position[]): Food => {
    let newFood: Position;
    const foodData = getFoodColor();
    
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (
      existingSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y) ||
      existingObstacles.some(obs => obs.x === newFood.x && obs.y === newFood.y) ||
      existingFoods.some(f => f.x === newFood.x && f.y === newFood.y)
    );
    
    return {
      ...newFood,
      color: foodData.color,
      points: foodData.points
    };
  }, [getFoodColor]);

  // 生成3个食物
  const generateFoods = useCallback((existingSnake: Position[], existingObstacles: Position[]): Food[] => {
    const newFoods: Food[] = [];
    
    for (let i = 0; i < 3; i++) {
      const food = generateSingleFood(newFoods, existingSnake, existingObstacles);
      newFoods.push(food);
    }
    
    return newFoods;
  }, [generateSingleFood]);

  // 生成迷宫障碍物
  const generateMaze = useCallback((snakeStartPos?: Position) => {
    const mazeObstacles: Position[] = [];
    const obstacleCount = 77;
    
    while (mazeObstacles.length < obstacleCount) {
      const x = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
      const y = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
      
      if (!mazeObstacles.some(obs => obs.x === x && obs.y === y)) {
        if (snakeStartPos) {
          const distance = Math.abs(x - snakeStartPos.x) + Math.abs(y - snakeStartPos.y);
          if (distance < 3) continue;
        }
        mazeObstacles.push({ x, y });
      }
    }
    
    setObstacles(mazeObstacles);
    return mazeObstacles;
  }, []);

  // 游戏循环
  useEffect(() => {
    if (!isStarted || isPaused || gameOver) return;

    const gameLoop = setInterval(() => {
      setSnake(prevSnake => {
        const newSnake = [...prevSnake];
        const head = { ...newSnake[0] };

        switch (direction) {
          case 'UP':
            head.y -= 1;
            break;
          case 'DOWN':
            head.y += 1;
            break;
          case 'LEFT':
            head.x -= 1;
            break;
          case 'RIGHT':
            head.x += 1;
            break;
        }

        // 撞墙
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setGameOver(true);
          return prevSnake;
        }

        // 撞自己
        if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
          setGameOver(true);
          return prevSnake;
        }

        // 撞障碍物
        if (gameMode === 'MAZE' && obstacles.some(obs => obs.x === head.x && obs.y === head.y)) {
          setGameOver(true);
          return prevSnake;
        }

        newSnake.unshift(head);

        // 检查是否吃到任意一个食物（使用 ref 获取最新值）
        const eatenFoodIndex = foodsRef.current.findIndex(f => f.x === head.x && f.y === head.y);
        
        if (eatenFoodIndex !== -1) {
          const eatenFood = foodsRef.current[eatenFoodIndex];
          setScore(prev => prev + eatenFood.points);
          
          // 使用 newSnake（包含蛇头新位置）生成新食物，避免生成在蛇身上
          const newFood = generateSingleFood(
            foodsRef.current.filter((_, i) => i !== eatenFoodIndex),
            newSnake,
            obstacles
          );
          
          setFoods(prevFoods => {
            const updated = [...prevFoods];
            updated[eatenFoodIndex] = newFood;
            foodsRef.current = updated; // 同步更新 ref
            return updated;
          });
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, gameSpeed);

    return () => clearInterval(gameLoop);
  }, [direction, gameOver, isPaused, isStarted, generateSingleFood, gameSpeed, gameMode, obstacles]);

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isStarted) {
        if (e.key === 'Enter' || e.key === ' ') {
          startGame();
        }
        return;
      }

      if (e.key === ' ' || e.key === 'p') {
        setIsPaused(prev => !prev);
        return;
      }

      if (gameOver) {
        if (e.key === 'Enter' || e.key === ' ') {
          resetGame();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          setDirection(prev => prev !== 'DOWN' ? 'UP' : prev);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          setDirection(prev => prev !== 'UP' ? 'DOWN' : prev);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          setDirection(prev => prev !== 'RIGHT' ? 'LEFT' : prev);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          setDirection(prev => prev !== 'LEFT' ? 'RIGHT' : prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStarted, gameOver]);

  // 更新最高分
  useEffect(() => {
    if (gameOver && score > highestScore) {
      setHighestScore(score);
      localStorage.setItem('snakeGameHighestScore', score.toString());
    }
  }, [gameOver, score, highestScore]);

  // 检测移动端和横屏状态
  useEffect(() => {
    const checkMobileAndOrientation = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
      
      if (mobile && window.innerHeight > window.innerWidth) {
        setShowLandscapeHint(true);
        setShowModeSelect(false);
        
        const timer = setTimeout(() => {
          setShowLandscapeHint(false);
          setShowModeSelect(true);
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    };

    checkMobileAndOrientation();
    
    const handleResize = () => {
      checkMobileAndOrientation();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // 触摸控制
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 30) {
        setDirection(prev => prev !== 'LEFT' ? 'RIGHT' : prev);
      } else if (deltaX < -30) {
        setDirection(prev => prev !== 'RIGHT' ? 'LEFT' : prev);
      }
    } else {
      if (deltaY > 30) {
        setDirection(prev => prev !== 'UP' ? 'DOWN' : prev);
      } else if (deltaY < -30) {
        setDirection(prev => prev !== 'DOWN' ? 'UP' : prev);
      }
    }

    setTouchStart(null);
  };

  const startGame = () => {
    setIsStarted(true);
  };

  const resetGame = () => {
    const startX = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
    const startY = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
    const startPos = { x: startX, y: startY };
    
    setSnake([startPos]);
    setDirection('RIGHT');
    setGameOver(false);
    setScore(0);
    setIsPaused(false);
    
    if (gameMode === 'MAZE') {
      generateMaze(startPos);
    } else {
      setObstacles([]);
    }
    
    const newFoods = generateFoods([startPos], obstacles);
    foodsRef.current = newFoods; // 同步更新 ref
    setFoods(newFoods);
  };

  const selectMode = (mode: GameMode) => {
    setGameMode(mode);
    setShowModeSelect(false);
    setGameSpeed(mode === 'MAZE' ? 250 : 150);
    
    const startX = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
    const startY = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
    const startPos = { x: startX, y: startY };
    setSnake([startPos]);
    
    if (mode === 'MAZE') {
      generateMaze(startPos);
    } else {
      setObstacles([]);
    }
    
    const newFoods = generateFoods([startPos], obstacles);
    foodsRef.current = newFoods; // 同步更新 ref
    setFoods(newFoods);
  };

  // 计算3D变换角度
  const getSnakeTransform = (index: number, totalSegments: number) => {
    const wave = Math.sin((index / totalSegments) * Math.PI * 2) * 5;
    return `rotateX(${wave}deg) rotateY(${wave}deg)`;
  };

  // 颜色转换工具
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const blendColors = (color1: string, color2: string, ratio: number) => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return color2;
    
    const r = Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio);
    const g = Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio);
    const b = Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio);
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  // 计算蛇身渐变色
  const getSnakeColor = (index: number, totalSegments: number, isHead: boolean, foodColor: string) => {
    if (isHead) {
      return `linear-gradient(135deg, #22c55e 0%, #16a34a 100%)`;
    }
    
    const ratio = index / totalSegments;
    const startColor = foodColor;
    const endColor = '#22c55e';
    
    const segmentColor = blendColors(startColor, endColor, ratio);
    const lightness = 1 - ratio * 0.2;
    
    return `linear-gradient(135deg, ${segmentColor} 0%, ${blendColors(startColor, endColor, ratio + 0.1)} 100%)`;
  };

  return (
    <div className={`flex h-full items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden min-h-screen ${isMobile ? 'w-full h-full' : ''}`}>
      <div className={`flex flex-col items-center justify-center gap-6 ${isMobile ? 'w-full h-full p-2' : 'p-8'}`}>
        {/* 标题和分数 */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            3D 贪吃蛇
          </h1>
          <div className="flex gap-6 text-sm">
            <div className={`px-3 py-1 rounded-full font-medium ${
              gameMode === 'CLASSIC' 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-purple-500/20 text-purple-400'
            }`}>
              {gameMode === 'CLASSIC' ? '经典模式' : '迷宫模式'}
            </div>
          </div>
          <div className="flex gap-8 text-lg">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">分数:</span>
              <span className="font-bold text-2xl text-green-400">{score}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">最高分:</span>
              <span className="font-bold text-2xl text-yellow-400">{highestScore}</span>
            </div>
          </div>
          
          {/* 颜色分数说明 */}
          <div className="flex flex-wrap justify-center gap-1.5 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{background: '#FF6B6B'}}></div>
              <span className="text-gray-400">2分</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{background: '#4ECDC4'}}></div>
              <span className="text-gray-400">4分</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{background: '#45B7D1'}}></div>
              <span className="text-gray-400">6分</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{background: '#96CEB4'}}></div>
              <span className="text-gray-400">8分</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{background: '#FFEAA7'}}></div>
              <span className="text-gray-400">10分</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{background: '#DDA0DD'}}></div>
              <span className="text-gray-400">12分</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{background: '#87CEEB'}}></div>
              <span className="text-gray-400">14分</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{background: '#98D8C8'}}></div>
              <span className="text-gray-400">16分</span>
            </div>
          </div>
        </div>

        {/* 游戏区域 */}
        <div style={{ perspective: '1000px' }}>
          <div
            className="relative rounded-2xl border-4 border-gray-700 bg-gray-900/50 shadow-2xl backdrop-blur-sm"
            style={{
              width: isMobile ? '100%' : GRID_SIZE * CELL_SIZE,
              height: isMobile ? 'auto' : GRID_SIZE * CELL_SIZE,
              aspectRatio: isMobile ? `${GRID_SIZE}/${GRID_SIZE}` : undefined,
              transform: 'rotateX(20deg) rotateY(0deg)',
              transformStyle: 'preserve-3d',
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* 网格背景 */}
            <div className="absolute inset-0 grid grid-cols-30 grid-rows-30 gap-0.5 opacity-20">
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-600 rounded-sm"
                  style={{
                    width: `${CELL_SIZE}px`,
                    height: `${CELL_SIZE}px`,
                  }}
                />
              ))}
            </div>

            {/* 蛇 */}
            {snake.map((segment, index) => (
              <div
                key={index}
                className="absolute transition-all duration-100 ease-out rounded-md"
                style={{
                  left: `${segment.x * CELL_SIZE}px`,
                  top: `${segment.y * CELL_SIZE}px`,
                  width: `${CELL_SIZE - 2}px`,
                  height: `${CELL_SIZE - 2}px`,
                  background: getSnakeColor(index, snake.length, index === 0, foods[0]?.color || '#FF6B6B'),
                  transform: getSnakeTransform(index, snake.length),
                  transformStyle: 'preserve-3d',
                  boxShadow: index === 0
                    ? '0 0 15px rgba(34, 197, 94, 0.8), inset 0 2px 4px rgba(255,255,255,0.3)'
                    : '0 0 8px rgba(74, 222, 128, 0.6), inset 0 1px 2px rgba(255,255,255,0.2)',
                  zIndex: 0,
                }}
              >
                {index === 0 && (
                  <>
                    <div className="absolute w-2 h-2 bg-white rounded-full" style={{ left: '3px', top: '4px', boxShadow: '0 0 4px rgba(0,0,0,0.5)' }} />
                    <div className="absolute w-2 h-2 bg-white rounded-full" style={{ right: '3px', top: '4px', boxShadow: '0 0 4px rgba(0,0,0,0.5)' }} />
                  </>
                )}
              </div>
            ))}

            {/* 3个食物 */}
            {foods.map((food, index) => (
              <div key={`food-${index}`} className="absolute" style={{
                left: `${food.x * CELL_SIZE}px`,
                top: `${food.y * CELL_SIZE}px`,
                width: `${CELL_SIZE}px`,
                height: `${CELL_SIZE}px`,
                zIndex: 0,
              }}>
                <div
                  className="absolute rounded-full animate-pulse animate-food-rotate"
                  style={{
                    left: '2px',
                    top: '2px',
                    width: `${CELL_SIZE - 4}px`,
                    height: `${CELL_SIZE - 4}px`,
                    background: `radial-gradient(circle at 30% 30%, ${food.color} 0%, ${food.color}dd 50%, ${food.color}88 100%)`,
                    boxShadow: `0 0 20px ${food.color}88, inset 0 -2px 4px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.4)`,
                    transformStyle: 'preserve-3d',
                  }}
                />
                <div
                  className="absolute flex items-center justify-center font-bold text-white text-xs"
                  style={{
                    left: '0',
                    top: '0',
                    width: '100%',
                    height: '100%',
                    textShadow: '0 0 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)',
                    pointerEvents: 'none',
                  }}
                >
                  {food.points}
                </div>
              </div>
            ))}

            {/* 障碍物 */}
            {obstacles.map((obs, index) => (
              <div
                key={`obs-${index}`}
                className="absolute"
                style={{
                  left: `${obs.x * CELL_SIZE}px`,
                  top: `${obs.y * CELL_SIZE}px`,
                  width: `${CELL_SIZE}px`,
                  height: `${CELL_SIZE}px`,
                  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 50%, #374151 100%)',
                  boxShadow: '0 0 10px rgba(107, 114, 128, 0.5), inset 0 1px 2px rgba(255,255,255,0.1)',
                  transformStyle: 'preserve-3d',
                  zIndex: 0,
                }}
              />
            ))}

            {/* 横屏提示 */}
            {showLandscapeHint && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl">
                <div className="flex flex-col items-center gap-4 text-center px-8">
                  <div className="text-6xl mb-4">📱</div>
                  <p className="text-2xl font-bold text-white mb-2">建议横屏操作</p>
                  <p className="text-gray-300 mb-4">旋转手机以获得更好的游戏体验</p>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <div className="animate-spin">↻</div>
                    <span>3秒后自动进入游戏...</span>
                  </div>
                </div>
              </div>
            )}

            {/* 模式选择 */}
            {!isStarted && showModeSelect && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
                <div className="flex flex-col items-center gap-6 text-center px-8">
                  <p className="text-3xl font-bold text-white mb-2">选择游戏模式</p>
                  
                  <div className="flex flex-col gap-4 w-full max-w-xs">
                    <button
                      onClick={() => selectMode('CLASSIC')}
                      className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-green-500/50 transform hover:scale-105"
                    >
                      <div className="text-lg mb-1">经典模式</div>
                      <div className="text-xs opacity-80">快速 · 空旷</div>
                    </button>
                    
                    <button
                      onClick={() => selectMode('MAZE')}
                      className="px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-purple-500/50 transform hover:scale-105"
                    >
                      <div className="text-lg mb-1">迷宫模式</div>
                      <div className="text-xs opacity-80">较慢 · 障碍</div>
                    </button>
                  </div>
                  
                  <p className="text-gray-400 text-sm">PC端：方向键/WASD · 移动端：滑动</p>
                </div>
              </div>
            )}

            {/* 游戏开始 */}
            {!isStarted && !showModeSelect && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
                <div className="flex flex-col items-center gap-4 text-center px-8">
                  <p className="text-2xl font-bold text-white mb-2">
                    {gameMode === 'CLASSIC' ? '经典模式' : '迷宫模式'}
                  </p>
                  <p className="text-gray-300 mb-4">PC端：方向键或 WASD 控制移动</p>
                  <p className="text-gray-300 mb-6">移动端：滑动屏幕控制方向</p>
                  <button
                    onClick={startGame}
                    className={`px-8 py-3 ${
                      gameMode === 'CLASSIC'
                        ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-green-500/50'
                        : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 hover:shadow-purple-500/50'
                    } text-white font-bold rounded-lg transition-all duration-300 shadow-lg transform hover:scale-105`}
                  >
                    开始游戏
                  </button>
                </div>
              </div>
            )}

            {/* 游戏结束 */}
            {gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl">
                <div className="flex flex-col items-center gap-4 text-center px-8">
                  <p className="text-3xl font-bold text-red-500 mb-2">游戏结束</p>
                  <p className="text-6xl font-bold text-white mb-4">{score}</p>
                  <p className="text-gray-300 mb-6">最终得分</p>
                  <button
                    onClick={resetGame}
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-blue-500/50 transform hover:scale-105"
                  >
                    再来一次
                  </button>
                  <button
                    onClick={() => {
                      setGameOver(false);
                      setIsStarted(false);
                      setShowModeSelect(true);
                      setObstacles([]);
                    }}
                    className="px-8 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-medium rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-lg hover:shadow-gray-500/50 transform hover:scale-105 text-sm"
                  >
                    切换模式
                  </button>
                </div>
              </div>
            )}

            {/* 暂停 */}
            {isPaused && !gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
                <div className="flex flex-col items-center gap-4">
                  <p className="text-3xl font-bold text-yellow-400">已暂停</p>
                  <p className="text-gray-300">按空格键继续</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 控制说明 */}
        <div className="flex flex-col items-center gap-2 text-sm text-gray-400">
          <p>PC端：方向键 / WASD 移动 · 空格键 暂停</p>
          <p>移动端：滑动屏幕控制方向</p>
        </div>
      </div>
    </div>
  );
}
