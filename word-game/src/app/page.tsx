"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import styles from "./page.module.css";

const GRID_SIZE = 10;
const WORDS_TO_FIND = ["NEXTJS", "REACT", "VERCEL", "CODE", "GAME", "WEB", "CSS", "HTML"];

type Cell = {
  letter: string;
  x: number;
  y: number;
  id: string;
};

type Grid = Cell[][];

type WordLocation = {
  word: string;
  path: string[];
};

// LocalStorage helpers
const getUser = () => typeof window !== 'undefined' ? localStorage.getItem('wordgame_user') : null;
const saveUser = (name: string) => localStorage.setItem('wordgame_user', name);
const getBestTime = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('wordgame_best') : null;
  return t ? parseInt(t) : null;
};
const saveBestTime = (time: number) => {
  const best = getBestTime();
  if (!best || time < best) localStorage.setItem('wordgame_best', time.toString());
};

export default function Home() {
  // Login & Timer state
  const [username, setUsername] = useState<string | null>(null);
  const [inputName, setInputName] = useState('');
  const [timerActive, setTimerActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [gameComplete, setGameComplete] = useState(false);

  // Original state
  const [grid, setGrid] = useState<Grid>([]);
  const [wordsToFind, setWordsToFind] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [startCell, setStartCell] = useState<Cell | null>(null);
  const [loading, setLoading] = useState(true);
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const [definition, setDefinition] = useState<{ word: string; text: string } | null>(null);
  const [defining, setDefining] = useState(false);
  const [wordLocations, setWordLocations] = useState<WordLocation[]>([]);

  const gridRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load user on mount
  useEffect(() => {
    const saved = getUser();
    if (saved) setUsername(saved);
    setBestTime(getBestTime());
  }, []);

  // Timer logic
  useEffect(() => {
    if (timerActive && !gameComplete) {
      timerRef.current = setInterval(() => {
        setElapsedTime(t => t + 1);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, gameComplete]);

  // Check game completion
  useEffect(() => {
    if (wordsToFind.length > 0 && foundWords.length === wordsToFind.length && timerActive) {
      setTimerActive(false);
      setGameComplete(true);
      saveBestTime(elapsedTime);
      setBestTime(getBestTime());
    }
  }, [foundWords, wordsToFind, timerActive, elapsedTime]);

  const startNewGame = useCallback(async () => {
    setLoading(true);
    // Reset State
    setFoundWords([]);
    setLog([]);
    setSelection([]);
    setStartCell(null);
    setFoundCells(new Set());
    setDefinition(null);
    setWordLocations([]);
    setElapsedTime(0);
    setGameComplete(false);
    setTimerActive(false); // Timer is optional - user starts it
    // Grid will be overwritten

    try {
      const res = await fetch('/api/generate-words');
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const words = data.words || ["NEXTJS", "REACT", "VERCEL"]; // Fallback

      const { grid: newGrid, placedWords, locations } = generateGrid(GRID_SIZE, words);
      setWordsToFind(placedWords);
      setGrid(newGrid);
      setWordLocations(locations);
    } catch (error) {
      console.error(error);
      // Fallback
      const fallback = ["NEXTJS", "REACT", "API", "ERROR"];
      const { grid: fallbackGrid, placedWords: fallbackPlaced, locations: fallbackLocations } = generateGrid(GRID_SIZE, fallback);
      setWordsToFind(fallbackPlaced);
      setGrid(fallbackGrid);
      setWordLocations(fallbackLocations);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize Game
  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const fetchDefinition = async (word: string) => {
    setDefining(true);
    setDefinition({ word, text: "Loading definition..." });
    try {
      const res = await fetch('/api/define-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word })
      });
      const data = await res.json();
      if (data.definition) {
        setDefinition({ word, text: data.definition });
      } else {
        setDefinition({ word, text: "Could not define this word." });
      }
    } catch (e) {
      setDefinition({ word, text: "Error fetching definition." });
    } finally {
      setDefining(false);
    }
  };

  const addToLog = (word: string) => {
    setLog((prev) => [`You found "${word}"!`, ...prev]);
  };

  const getCellFromElement = (element: Element): Cell | null => {
    const id = element.getAttribute("data-id");
    if (!id) return null;
    const [y, x] = id.split("-").map(Number);
    return grid[y][x];
  };

  const calculateSelection = useCallback((start: Cell, current: Cell) => {
    const dx = current.x - start.x;
    const dy = current.y - start.y;

    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    if (steps === 0) return [start.id];

    // Determine step direction
    let stepX = 0;
    let stepY = 0;

    if (Math.abs(dx) === Math.abs(dy)) {
      // Diagonal
      stepX = dx > 0 ? 1 : -1;
      stepY = dy > 0 ? 1 : -1;
    } else if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal
      if (dy === 0) {
        stepX = dx > 0 ? 1 : -1;
        stepY = 0;
      } else {
        return [start.id];
      }
    } else {
      // Vertical
      if (dx === 0) {
        stepX = 0;
        stepY = dy > 0 ? 1 : -1;
      } else {
        return [start.id];
      }
    }

    if (stepX !== 0 && stepY !== 0 && Math.abs(dx) !== Math.abs(dy)) return [start.id];

    const path: string[] = [];
    let cx = start.x;
    let cy = start.y;

    for (let i = 0; i <= steps; i++) {
      path.push(`${cy}-${cx}`);
      cx += stepX;
      cy += stepY;
    }
    return path;
  }, [grid]);


  const handlePointerDown = (e: React.PointerEvent) => {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target) return;

    const cell = getCellFromElement(target);
    if (cell) {
      setSelecting(true);
      setStartCell(cell);
      setSelection([cell.id]);
      (e.target as Element).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!selecting || !startCell) return;

    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target) return;

    const cell = getCellFromElement(target);
    if (cell) {
      const newSelection = calculateSelection(startCell, cell);
      setSelection(newSelection);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!selecting) return;
    setSelecting(false);

    // Check word
    const selectedWord = selection.map(id => {
      const [y, x] = id.split("-").map(Number);
      return grid[y][x].letter;
    }).join("");

    const reversedWord = selectedWord.split("").reverse().join("");

    if (wordsToFind.includes(selectedWord) && !foundWords.includes(selectedWord)) {
      setFoundWords(prev => [...prev, selectedWord]);
      addToLog(selectedWord);
    } else if (wordsToFind.includes(reversedWord) && !foundWords.includes(reversedWord)) {
      setFoundWords(prev => [...prev, reversedWord]);
      addToLog(reversedWord);
    }

    setSelection([]);
    setStartCell(null);
  };

  const getCellClass = (y: number, x: number) => {
    const id = `${y}-${x}`;
    if (selection.includes(id)) return `${styles.cell} ${styles.selected}`;
    if (isCellFound(id)) return `${styles.cell} ${styles.found}`;
    return styles.cell;
  };

  const isCellFound = (id: string) => foundCells.has(id);

  const handlePointerUpWithSave = (e: React.PointerEvent) => {
    if (!selecting) return;
    setSelecting(false);

    const selectedWord = selection.map(id => {
      const [y, x] = id.split("-").map(Number);
      return grid[y] && grid[y][x] ? grid[y][x].letter : "";
    }).join("");

    const reversedWord = selectedWord.split("").reverse().join("");

    let found = "";
    if (wordsToFind.includes(selectedWord) && !foundWords.includes(selectedWord)) {
      found = selectedWord;
    } else if (wordsToFind.includes(reversedWord) && !foundWords.includes(reversedWord)) {
      found = reversedWord;
    }

    if (found) {
      setFoundWords(prev => [...prev, found]);
      addToLog(found);
      setFoundCells(prev => {
        const newSet = new Set(prev);
        selection.forEach(id => newSet.add(id));
        return newSet;
      });
    }

    setSelection([]);
    setStartCell(null);
  };

  const handleRevealAll = () => {
    const allFoundCells = new Set(foundCells);
    const allFoundWords = new Set(foundWords);

    wordLocations.forEach(loc => {
      loc.path.forEach(cellId => allFoundCells.add(cellId));
      allFoundWords.add(loc.word);
    });

    setFoundCells(allFoundCells);
    setFoundWords(Array.from(allFoundWords));
    addToLog("Revealed all words!");
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const handleLogin = () => {
    if (inputName.trim()) {
      saveUser(inputName.trim());
      setUsername(inputName.trim());
    }
  };

  // Login Screen
  if (!username) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <div className={styles.title}>Word Search</div>
          <div style={{
            background: 'rgba(128,128,128,0.1)',
            padding: '2rem',
            borderRadius: '12px',
            textAlign: 'center',
            maxWidth: '300px'
          }}>
            <p style={{ marginBottom: '1rem' }}>Enter your name to play:</p>
            <input
              type="text"
              value={inputName}
              onChange={e => setInputName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Your name"
              style={{
                padding: '10px',
                fontSize: '1rem',
                borderRadius: '8px',
                border: '1px solid #ccc',
                width: '100%',
                marginBottom: '1rem'
              }}
            />
            <button
              onClick={handleLogin}
              style={{
                padding: '10px 24px',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              Start Playing
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.title}>Word Search</div>

        {/* User info & Timer bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          background: 'rgba(128,128,128,0.1)',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '10px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <span>👋 {username}</span>

          {/* Timer section */}
          {!timerActive && !gameComplete ? (
            <button
              onClick={() => { setElapsedTime(0); setTimerActive(true); }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}
            >
              ⏱️ Start Timed Mode
            </button>
          ) : (
            <span style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              color: gameComplete ? '#00c853' : '#ff9800'
            }}>
              ⏱️ {formatTime(elapsedTime)}
            </span>
          )}

          {bestTime && <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>🏆 Best: {formatTime(bestTime)}</span>}
        </div>

        {/* Game Complete Modal */}
        {gameComplete && (
          <div style={{
            background: 'linear-gradient(135deg, #00c853, #0070f3)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: '10px',
            width: '100%'
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>🎉 You Won!</div>
            <div>Time: {formatTime(elapsedTime)}</div>
            {bestTime === elapsedTime && <div style={{ marginTop: '5px' }}>🏆 New Best Time!</div>}
          </div>
        )}

        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <button
            onClick={startNewGame}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              marginBottom: '10px'
            }}
          >
            {loading ? 'Generating...' : 'Start New Game'}
          </button>
        </div>

        <div className={styles.wordList}>
          {loading ? <div>Loading words...</div> : wordsToFind.map(word => (
            <div
              key={word}
              className={`${styles.wordItem} ${foundWords.includes(word) ? styles.wordFound : ''}`}
            >
              {word}
            </div>
          ))}
        </div>

        <div
          className={styles.gridContainer}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpWithSave}
          onPointerLeave={handlePointerUpWithSave}
        >
          <div className={styles.grid} style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
          }}>
            {grid.map((row, y) => (
              row.map((cell, x) => (
                <div
                  key={cell.id}
                  className={getCellClass(y, x)}
                  data-id={cell.id}
                >
                  {cell.letter}
                </div>
              ))
            ))}
          </div>
        </div>

        <div className={styles.logContainer}>
          <div className={styles.logTitle}>Game Log</div>
          <div className={styles.logEntries}>
            {log.length === 0 && <div className={styles.logEntry}>Drag across letters to find words!</div>}
            {log.map((entry, i) => {
              const match = entry.match(/"([^"]+)"/);
              const word = match ? match[1] : null;
              return (
                <div key={i} className={styles.logEntry}>
                  {word ? (
                    <>
                      You found <span
                        className={styles.clickableWord}
                        onClick={() => fetchDefinition(word)}
                      >
                        "{word}"
                      </span>!
                    </>
                  ) : entry}
                </div>
              );
            })}
          </div>
        </div>

        {definition && (
          <div className={styles.definitionBox}>
            <div className={styles.definitionHeader}>
              <strong>{definition.word}</strong>
              <button onClick={() => setDefinition(null)}>×</button>
            </div>
            <p>{definition.text}</p>
          </div>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={handleRevealAll}
            style={{
              padding: '10px 20px',
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cheat: Reveal All Words
          </button>
        </div>

      </main>
    </div>
  );
}

// ------ LOGIC HELPERS ------

function generateGrid(size: number, words: string[]): { grid: Grid, placedWords: string[], locations: WordLocation[] } {
  const grid: Cell[][] = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => ({
      letter: '',
      x,
      y,
      id: `${y}-${x}`
    }))
  );

  const placedWords: string[] = [];
  const locations: WordLocation[] = [];

  for (const word of words) {
    const result = placeWord(grid, word, size);
    if (result.placed) {
      placedWords.push(word);
      locations.push({ word, path: result.path });
    }
  }

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!grid[y][x].letter) {
        grid[y][x].letter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
    }
  }

  return { grid, placedWords, locations };
}

function placeWord(grid: Grid, word: string, size: number): { placed: boolean, path: string[] } {
  let placed = false;
  let attempts = 0;
  let path: string[] = [];

  // Restricted to readable directions: Horizontal (Right), Vertical (Down), Diagonal (Down-Right)
  const directions = [
    { dx: 1, dy: 0 },   // horizontal right
    { dx: 0, dy: 1 },   // vertical down
    { dx: 1, dy: 1 },   // diagonal down-right
  ];

  while (!placed && attempts < 100) {
    const dir = directions[Math.floor(Math.random() * directions.length)];
    const row = Math.floor(Math.random() * size);
    const col = Math.floor(Math.random() * size);

    if (canPlace(grid, word, row, col, dir.dx, dir.dy, size)) {
      for (let i = 0; i < word.length; i++) {
        const r = row + i * dir.dy;
        const c = col + i * dir.dx;
        grid[r][c].letter = word[i];
        path.push(`${r}-${c}`);
      }
      placed = true;
    }
    attempts++;
  }
  return { placed, path };
}

function canPlace(grid: Grid, word: string, row: number, col: number, dx: number, dy: number, size: number) {
  const endRow = row + dy * (word.length - 1);
  const endCol = col + dx * (word.length - 1);

  if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) return false;
  if (row < 0 || row >= size || col < 0 || col >= size) return false;

  for (let i = 0; i < word.length; i++) {
    const cell = grid[row + i * dy][col + i * dx];
    if (cell.letter && cell.letter !== word[i]) return false;
  }
  return true;
}
