
type Cell = {
  letter: string;
  x: number;
  y: number;
  id: string;
};

type Grid = Cell[][];

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

  // All 8 directions
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

// --- Verification Logic ---

function verifyGrid(grid: Grid, placedWords: string[], size: number) {
  const errors: string[] = [];

  for (const word of placedWords) {
    let found = false;
    
    // Scan every cell and direction to see if the word exists
    // This is "brute force" finding
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const directions = [
          { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
          { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
          { dx: 1, dy: 1 }, { dx: -1, dy: -1 },
          { dx: 1, dy: -1 }, { dx: -1, dy: 1 },
        ];
        
        for (const dir of directions) {
           if (checkMatch(grid, word, y, x, dir.dx, dir.dy, size)) {
             found = true;
             break;
           }
        }
        if (found) break;
      }
      if (found) break;
    }

    if (!found) {
      errors.push(`Word "${word}" was in placedWords but NOT found in grid!`);
    }
  }
  return errors;
}

function checkMatch(grid: Grid, word: string, row: number, col: number, dx: number, dy: number, size: number) {
    const endRow = row + dy * (word.length - 1);
    const endCol = col + dx * (word.length - 1);

    if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) return false;

    for (let i = 0; i < word.length; i++) {
        if (grid[row + i * dy][col + i * dx].letter !== word[i]) {
            return false;
        }
    }
    return true;
}

// --- RUN TEST ---
console.log("Starting Grid Generation Test...");

const TEST_RUNS = 1000;
const POOL = ["REACT", "NEXTJS", "VERCEL", "TYPESCRIPT", "JAVASCRIPT", "NODE", "HTML", "CSS", "TAILWIND", "PRISMA"];

let totalErrors = 0;

for (let i = 0; i < TEST_RUNS; i++) {
    // Shuffle pool
    const words = [...POOL].sort(() => 0.5 - Math.random());
    const { grid, placedWords } = generateGrid(10, words);
    
    const errors = verifyGrid(grid, placedWords, 10);
    if (errors.length > 0) {
        console.error(`Run ${i} Failed:`, errors);
        totalErrors += errors.length;
        // Print grid for debugging
        console.log(grid.map(row => row.map(c => c.letter).join(" ")).join("\n"));
        break; // Stop on first failure
    }
}

if (totalErrors === 0) {
    console.log(`Passed ${TEST_RUNS} runs successfully.`);
} else {
    console.log(`Failed with ${totalErrors} errors.`);
}
