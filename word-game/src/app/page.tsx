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

export default function Home() {
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

  const gridRef = useRef<HTMLDivElement>(null);

  // Initialize Game
  useEffect(() => {
    const fetchWords = async () => {
      try {
        const res = await fetch('/api/generate-words');
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const words = data.words || ["NEXTJS", "REACT", "VERCEL"]; // Fallback
        setWordsToFind(words);
        const { grid: newGrid, placedWords } = generateGrid(GRID_SIZE, words);
        setWordsToFind(placedWords);
        setGrid(newGrid);
      } catch (error) {
        console.error(error);
        // Fallback
        const fallback = ["NEXTJS", "REACT", "API", "ERROR"];
        const { grid: fallbackGrid, placedWords: fallbackPlaced } = generateGrid(GRID_SIZE, fallback);
        setWordsToFind(fallbackPlaced);
        setGrid(fallbackGrid);
      } finally {
        setLoading(false);
      }
    };
    fetchWords();
  }, []);

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

    // We only allow horizontal, vertical, and diagonal lines
    // To do this, we check if the angle is roughly correct
    // Or simpler: force the line to be one of the 8 directions

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
      // Horizontal logic: if dy is small compared to dx, snap to horizontal.
      // However, standard word search strictly enforces straight lines.
      // Let's enforce strict 0 or equal abs slope.
      if (dy === 0) {
        stepX = dx > 0 ? 1 : -1;
        stepY = 0;
      } else {
        // If not perfectly aligned, stick to start cell (or handle visually as invalid)
        // For better UX, we can try to snap to the closest valid line
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

    // Even if we snapped, let's verify exact alignment for strictness or just allow the snap
    // Implementation: simple bresenham-like for these specific 8 directions

    // Re-check strict alignment for diagonal to be safe if we rely on the else-ifs above
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
      // Capture pointer to handle moves outside the initial cell
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
    // Construct word string from selection
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

  // Helper to check if a cell is selected or found
  const getCellClass = (y: number, x: number) => {
    const id = `${y}-${x}`;
    if (selection.includes(id)) return `${styles.cell} ${styles.selected}`;

    // Check if this cell is part of any found word? 
    // This is trickier because we need to know WHICH cells formed the word.
    // For a simple version, we won't highlight found words on the grid PERMANENTLY 
    // unless we store the coordinate paths of found words.
    // Let's improve this: store found paths.

    if (isCellFound(id)) return `${styles.cell} ${styles.found}`;

    return styles.cell;
  };

  // To highlight found words on the grid, we need to store their paths or search for them again.
  // Simplification: We will just check if the letter matches vaguely? No, that's bad.
  // Let's rely on the user finding them. 
  // Better improvement: Store found ranges. But for now, let's ship the core loop.
  // Actually, users want to see the words crossed out on the grid too usually.

  // Let's add a quick state for foundCells
  // State moved to top

  const isCellFound = (id: string) => foundCells.has(id);

  // Update handlePointerUp to save found cells
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

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.title}>Word Search</div>

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
          onPointerLeave={handlePointerUpWithSave} // End selection if dragging out too far
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

      </main>
    </div>
  );
}

// ------ LOGIC HELPERS ------

function generateGrid(size: number, words: string[]): { grid: Grid, placedWords: string[] } {
  // Initialize empty grid
  const grid: Cell[][] = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => ({
      letter: '',
      x,
      y,
      id: `${y}-${x}`
    }))
  );

  const placedWords: string[] = [];

  // Place words
  for (const word of words) {
    if (placeWord(grid, word, size)) {
      placedWords.push(word);
    }
  }

  // Fill remaining
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!grid[y][x].letter) {
        grid[y][x].letter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
    }
  }

  return { grid, placedWords };
}

function placeWord(grid: Grid, word: string, size: number): boolean {
  let placed = false;
  let attempts = 0;

  // All 8 directions: horizontal, vertical, and 4 diagonals (including reverse directions)
  const directions = [
    { dx: 1, dy: 0 },   // horizontal right
    { dx: -1, dy: 0 },  // horizontal left
    { dx: 0, dy: 1 },   // vertical down
    { dx: 0, dy: -1 },  // vertical up
    { dx: 1, dy: 1 },   // diagonal down-right
    { dx: -1, dy: -1 }, // diagonal up-left
    { dx: 1, dy: -1 },  // diagonal up-right
    { dx: -1, dy: 1 },  // diagonal down-left
  ];

  while (!placed && attempts < 100) {
    // Randomly select a direction
    const dir = directions[Math.floor(Math.random() * directions.length)];
    const row = Math.floor(Math.random() * size);
    const col = Math.floor(Math.random() * size);

    if (canPlace(grid, word, row, col, dir.dx, dir.dy, size)) {
      for (let i = 0; i < word.length; i++) {
        grid[row + i * dir.dy][col + i * dir.dx].letter = word[i];
      }
      placed = true;
    }
    attempts++;
  }
  return placed;
}

function canPlace(grid: Grid, word: string, row: number, col: number, dx: number, dy: number, size: number) {
  // Calculate the end position
  const endRow = row + dy * (word.length - 1);
  const endCol = col + dx * (word.length - 1);

  // Check if the word fits within the grid bounds
  if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) return false;
  if (row < 0 || row >= size || col < 0 || col >= size) return false;

  // Check if we can place each letter
  for (let i = 0; i < word.length; i++) {
    const cell = grid[row + i * dy][col + i * dx];
    if (cell.letter && cell.letter !== word[i]) return false;
  }
  return true;
}
