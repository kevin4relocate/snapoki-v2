export const GAMES = [
  {
    key: 'maze',
    slug: 'maze',
    name: 'Maze',
    featured: true,
    category: 'Path',
    tagline: 'Find the route. Beat the clock.',
    description: 'Navigate a fresh maze, find the shortest route, and improve your score across three difficulty levels.',
    heroPills: ['Keyboard + touch', 'Fresh boards', 'Daily challenge'],
    metrics: [['time','TIME'],['moves','MOVES'],['hints','HINTS'],['score','SCORE']],
    levels: [['easy','Easy','11×11'],['medium','Medium','15×15'],['hard','Hard','19×19']],
    howTo: [
      'Move from the start tile to the finish tile.',
      'Use arrow keys, swipe, tap controls, or the on-screen D-pad.',
      'Fewer moves and a faster finish improve your score.',
      'Hint reveals the next safe direction. Solution makes the run practice-only.'
    ],
    seoTitle: 'Free Online Maze Game – Daily Mazes & Rankings | Snapoki',
    seoDescription: 'Play free online mazes with Easy, Medium and Hard levels, daily challenges, hints, scores and cumulative rankings.'
  },
  {
    key: 'number-path',
    slug: 'number-path',
    name: 'Number Path',
    featured: true,
    category: 'Number',
    tagline: 'Connect the numbers. Fill every cell.',
    description: 'Build one continuous path through every open cell while visiting numbered checkpoints in the correct order.',
    heroPills: ['Drag + tap', 'Fill every cell', 'Daily challenge'],
    metrics: [['time','TIME'],['cells','CELLS'],['mistakes','MISTAKES'],['hints','HINTS']],
    levels: [['easy','Easy','5×5'],['medium','Medium','6×6'],['hard','Hard','7×7']],
    howTo: [
      'Start at number 1 and move to orthogonally adjacent cells.',
      'Visit every numbered checkpoint in order.',
      'Use every cell exactly once before reaching the final checkpoint.',
      'Undo helps you backtrack. Solution makes the run practice-only.'
    ],
    seoTitle: 'Number Path Puzzle – Free Daily Number Path Game | Snapoki',
    seoDescription: 'Play Number Path online for free. Connect numbered checkpoints in order, fill the board, use hints and tackle a new daily challenge.'
  },
  {
    key: 'color-connect',
    slug: 'color-connect',
    name: 'Color Connect',
    featured: true,
    category: 'Path',
    tagline: 'Connect every pair. Cover the board.',
    description: 'Link matching color endpoints without overlaps and cover every square on the board.',
    heroPills: ['Drag paths', 'No overlaps', 'Daily challenge'],
    metrics: [['time','TIME'],['paths','PATHS'],['redraws','REDRAWS'],['hints','HINTS']],
    levels: [['easy','Easy','5×5'],['medium','Medium','6×6'],['hard','Hard','7×7']],
    howTo: [
      'Drag from one colored endpoint to its matching endpoint.',
      'Paths may not overlap or pass through another color endpoint.',
      'Connect every pair and cover every board cell.',
      'A hint highlights a correct route. Solution makes the run practice-only.'
    ],
    seoTitle: 'Color Connect Puzzle – Free Flow-Style Path Game | Snapoki',
    seoDescription: 'Connect matching colors, fill the board and solve fresh Color Connect puzzles online with three levels and daily challenges.'
  },
  {
    key: 'lights-out',
    slug: 'lights-out',
    name: 'Lights Out',
    featured: true,
    category: 'Logic',
    tagline: 'Switch them off in fewer moves.',
    description: 'Press a light to toggle it and its neighbors. Turn every light off as efficiently as you can.',
    heroPills: ['Tap to toggle', 'Logic puzzle', 'Daily challenge'],
    metrics: [['time','TIME'],['moves','MOVES'],['lit','LIT'],['hints','HINTS']],
    levels: [['easy','Easy','5×5'],['medium','Medium','6×6'],['hard','Hard','7×7']],
    howTo: [
      'Tap a light to toggle it plus its up, down, left and right neighbors.',
      'Your goal is to switch every light off.',
      'Try to solve the board with fewer moves and less time.',
      'Hint performs one useful move. Solution makes the run practice-only.'
    ],
    seoTitle: 'Lights Out Puzzle – Free Online Logic Game | Snapoki',
    seoDescription: 'Play Lights Out online. Toggle lights, solve Easy to Hard boards, use hints and compete through daily puzzle rankings.'
  },
  {
    key: 'loop-puzzle',
    slug: 'loop-puzzle',
    name: 'Loop Puzzle',
    featured: false,
    category: 'Logic',
    tagline: 'Draw one loop. Satisfy every clue.',
    description: 'Toggle grid edges to recreate one closed loop while using the number clues to guide every turn.',
    heroPills: ['Tap edges', 'One closed loop', 'Daily challenge'],
    metrics: [['time','TIME'],['edges','EDGES'],['mistakes','MISTAKES'],['hints','HINTS']],
    levels: [['easy','Easy','5×5'],['medium','Medium','7×7'],['hard','Hard','9×9']],
    howTo: [
      'Tap grid edges to draw a single continuous closed loop.',
      'A number tells you how many of that cell’s four sides belong to the loop.',
      'The finished loop may not branch or leave loose ends.',
      'Hint adds one correct edge. Solution makes the run practice-only.'
    ],
    seoTitle: 'Loop Puzzle – Free Online Slitherlink-Style Logic Game | Snapoki',
    seoDescription: 'Draw one closed loop, satisfy number clues and solve free Loop Puzzles with Easy, Medium, Hard and daily challenges.'
  }
];

export const GAME_MAP = Object.fromEntries(GAMES.map(game => [game.key, game]));
export const FEATURED_GAMES = GAMES.filter(game => game.featured);
export function getGame(key) { return GAME_MAP[key] || null; }
