export const DIFFICULTY_REWARDS={easy:1,medium:3,hard:5};
export const EXPERIENCE_TYPES=Object.freeze(['puzzle','board','simulation']);

// All games use one shell. Capability defaults depend on the experience type;
// a board match or an ongoing simulation is not automatically a Daily puzzle.
export const withContract=config=>{
  const experienceType=config.experienceType||'puzzle';
  const puzzle=experienceType==='puzzle';
  return {
    ...config,
    experienceType,
    capabilities:{hint:puzzle,solution:puzzle,solutionSteps:puzzle,drag:false,daily:puzzle,ranking:puzzle,...(config.capabilities||{})},
    ranking:{enabled:puzzle,proofType:puzzle?'generic':'none',scoreModel:puzzle?'performance':'none',...(config.ranking||{})}
  };
};

export const GAMES = [
  withContract({key:'echo-step',slug:'echo-step',name:'Echo Step',featured:true,category:'Logic',tagline:'Move now. Echo follows later.',description:'Move purple YOU while cyan Echo repeats each accepted move after a delay. Medium and Hard add crooked timing routes, false shortcuts and delayed traps before YOU and Echo can finish together.',socialInsight:'Every move matters twice. A step that is safe for YOU now can fail when Echo repeats it later, so plan for both positions before committing.',heroPills:['YOU → P · Echo → E','Echo repeats later','Same-turn finish'],metrics:[['time','TIME'],['moves','MOVES'],['delay','ECHO DELAY'],['score','SCORE']],levels:[['easy','Easy','6×6 · learn the 2-step delay'],['medium','Medium','8×8 · false routes · 3-step delay'],['hard','Hard','10×10 · deep traps · 4-step delay']],howTo:['Move purple YOU toward P. Echo repeats each accepted move after the displayed delay.','Purple striped cells block YOU only. Cyan striped cells block Echo only. Dark striped cells block both.','Reach YOU → P and Echo → E on the same turn. Reaching one goal alone does not finish the puzzle. Medium and Hard may require leaving P and returning at the right moment.','If Echo repeats into a blocked cell, leaves the board, or hits YOU, use Retry. Hint shows the next three moves; Guide teaches the puzzle step by step.'],seoTitle:'Echo Step – Free Delayed-Movement Puzzle Game | Snapoki',seoDescription:'Play Echo Step free online with delayed Echo movement, false shortcuts, timing traps and same-turn P/E finishes across Easy, Medium and Hard.',capabilities:{solutionSteps:false},ranking:{proofType:'actions',scoreModel:'timeline-efficiency'}}),
  withContract({key:'maze',slug:'maze',name:'Maze',featured:true,category:'Path',tagline:'Find the route. Beat the clock.',description:'Navigate a fresh maze with real decision pressure, deep false branches, deceptive dead ends and increasingly demanding routes.',socialInsight:'The obvious direction is not always the shortest route. Hard boards reward players who notice when they need to move away from the finish before coming back.',heroPills:['Drag + swipe + keyboard','Difficulty by deception','Daily challenge'],metrics:[['time','TIME'],['moves','MOVES'],['hints','HINTS'],['score','SCORE']],levels:[['easy','Easy','16×16 · cleaner routes'],['medium','Medium','24×24 · deceptive branches'],['hard','Hard','32×32 · dense expert traps']],howTo:['Move from the purple start marker to the green finish.','Hold and drag through open corridors, swipe on touch, click an adjacent cell, or use Arrow/WASD keys.','Hard boards increase decision density, deep false branches and late-route traps — not only board size.','Hint draws a short next-route guide. Solution draws the full route and makes that attempt practice-only.'],seoTitle:'Free Online Maze Game – Daily Mazes & Challenges | Snapoki',seoDescription:'Play free online mazes with Easy, Medium and expert Hard route deception, daily challenges, actionable hints, scores and replayable challenges.',capabilities:{drag:true},ranking:{proofType:'trace',scoreModel:'route-efficiency'}}),
  withContract({key:'number-path',slug:'number-path',name:'Number Path',featured:true,category:'Number',tagline:'Connect the numbers. Fill every open cell.',description:'Build one continuous path through an irregular board while landing on numbered checkpoints at the exact path step.',socialInsight:'A locally correct move can ruin the entire route later. The challenge is preserving enough space for every remaining checkpoint.',heroPills:['Smooth drag + tap','Direct path backtracking','Daily challenge'],metrics:[['time','TIME'],['cells','CELLS'],['mistakes','MISTAKES'],['hints','HINTS']],levels:[['easy','Easy','6×6 · varied routes'],['medium','Medium','8×8 · scattered blockers'],['hard','Hard','10×10 · sparse clues & false routes']],howTo:['Start at 1 and move to orthogonally adjacent open cells.','A numbered checkpoint is the exact step number where your path must land on that cell.','If a branch is wrong, tap or drag back onto any earlier path cell to trim the route to that point, then continue in a different direction.','Hint reveals a real next action. Solution shows one full numbered route for practice.'],seoTitle:'Number Path Puzzle – Free Daily Number Path Game | Snapoki',seoDescription:'Play Number Path online for free with scattered blocked cells, exact-step checkpoints, false routes, smooth drag controls, hints and a daily challenge.',capabilities:{drag:true},ranking:{proofType:'path',scoreModel:'path-efficiency'}}),
  withContract({key:'color-connect',slug:'color-connect',name:'Color Connect',featured:true,category:'Path',tagline:'Connect every pair. Cover the open board.',description:'Link matching endpoints across solver-verified boards where tempting short routes, shared space and route dependencies force real backtracking instead of obvious lane-by-lane play.',socialInsight:'The shortest-looking connection is often the trap. Long endpoint pairs force you to reserve space before committing to an easy-looking path.',heroPills:['Intent-aware drag','Solver-verified difficulty','Daily challenge'],metrics:[['time','TIME'],['paths','PATHS'],['redraws','REDRAWS'],['hints','HINTS']],levels:[['easy','Easy','6×6 · classic routing'],['medium','Medium','9×9 · solver-verified traps'],['hard','Hard','12×12 · 11 colors · deep dependencies']],howTo:['Drag from one colored endpoint to its matching endpoint.','Paths remain after release and may not overlap, cross blocked cells, or pass through another color endpoint. Every open cell must be covered to finish.','Medium and Hard are accepted only after a solver tests alternate routes, dead ends and greedy shortcuts; Hard uses 11 color pairs and deeper route dependencies.','Hint guides a short section of one route. Solution shows all ghost routes at once for practice; colors may be traced in any order.'],seoTitle:'Color Connect Puzzle – Free Flow-Style Path Game | Snapoki',seoDescription:'Connect matching colors across solver-verified boards with full coverage, tempting shortcuts, route dependencies and increasingly deep backtracking.',capabilities:{drag:true,solutionSteps:false},ranking:{proofType:'routes',scoreModel:'route-efficiency'}}),
  withContract({key:'lights-out',slug:'lights-out',name:'Lights Out',featured:false,category:'Logic',tagline:'Switch them off in fewer moves.',description:'Press a light to toggle it and its neighbors. Difficulty is calibrated by the true minimum number of presses.',socialInsight:'Every press changes several cells at once. Strong solves come from thinking in patterns instead of chasing one lit tile at a time.',heroPills:['Tap to toggle','Minimum-move difficulty','Daily challenge'],metrics:[['time','TIME'],['moves','MOVES'],['lit','LIT'],['hints','HINTS']],levels:[['easy','Easy','3–5 minimum presses'],['medium','Medium','9–12 minimum presses'],['hard','Hard','15–20 minimum presses']],howTo:['Tap a light to toggle it plus its up, down, left and right neighbors.','Your goal is to switch every light off.','Difficulty reflects the board’s minimum solution length, not only board size.','Solution highlights one shortest set of presses. The highlighted cells may be pressed in any order and the guide recalculates after every move.'],seoTitle:'Lights Out Puzzle – Free Online Logic Game | Snapoki',seoDescription:'Play Lights Out online with difficulty calibrated by minimum solution moves, actionable hints and a no-order practice solution guide.',capabilities:{solutionSteps:false},ranking:{proofType:'presses',scoreModel:'minimum-moves'}}),
  withContract({key:'loop-puzzle',slug:'loop-puzzle',name:'Loop Puzzle',featured:false,category:'Logic',tagline:'Draw one loop. Satisfy every clue.',description:'Build one closed loop from strategically selected clues. V4 shapes avoid easy perimeter routes while Hard boards favor meaningful 2/3 anchors, sparse isolated 0s and deeper deductions.',socialInsight:'A clue constrains several edges at once. The fastest progress often comes from combining neighboring clues instead of solving cells in isolation.',heroPills:['Strategic clue anchors','Quality-gated loop shapes','Daily challenge'],metrics:[['time','TIME'],['edges','EDGES'],['mistakes','CONFLICTS'],['hints','HINTS']],levels:[['easy','Easy','5×5 · guided deductions'],['medium','Medium','7×7 · strategic anchors'],['hard','Hard','9×9 · expert interior loops']],howTo:['Tap grid edges to draw one continuous closed loop.','A number is the exact count of that cell’s four sides used by the loop. Blank cells have no clue, so any number of their sides may be used.','Any single loop satisfying every visible clue is accepted; edge order never matters. Hard boards use more turns, shorter straight runs and strategic clue placement instead of simply hiding more clues.','Hint marks one exact edge to add or remove. Solution shows ghost edges for one valid loop and makes the attempt practice-only.'],seoTitle:'Loop Puzzle – Free Online Slitherlink-Style Logic Game | Snapoki',seoDescription:'Draw one closed loop through quality-gated boards with strategic clues, deeper interior turns, hints and expert daily challenges.',capabilities:{solutionSteps:false},ranking:{proofType:'edges',scoreModel:'logic-efficiency'}}),
  withContract({key:'bridges',slug:'bridges',name:'Bridges',featured:false,category:'Logic',tagline:'Connect every island. Build one network.',description:'Connect numbered islands with one or two horizontal or vertical bridges. Match every island number, never cross another bridge, and finish with one connected network.',socialInsight:'Matching every number is only half the puzzle. The final bridge pattern must also keep every island in one connected network, so local choices can create global traps.',heroPills:['Tap island → island','No crossing · max 2','One connected network'],metrics:[['time','TIME'],['moves','MOVES'],['links','LINKS'],['solved','ISLANDS DONE']],levels:[['easy','Easy','7×7 · 7–9 islands · clear deductions'],['medium','Medium','9×9 · 12–15 islands · branching choices'],['hard','Hard','11×11 · 18–22 islands · network traps']],howTo:['Tap one island, then a highlighted island to add one bridge. Repeat the same pair to make a double bridge. Tap an existing bridge to remove one.','The number on an island is the exact total of bridges touching it. Two islands may share at most two bridges, and bridges can never cross or pass through an island.','A puzzle is solved only when every number is exact and all islands belong to one connected network. Matching numbers in disconnected groups is not enough.','Hint shows one specific add/remove action, highlights the connection and explains the logic before you choose Apply Hint. Solution shows missing bridges in cyan and wrong bridges in red for practice.'],seoTitle:'Bridges Puzzle – Free Hashiwokakero Game Online | Snapoki',seoDescription:'Play Bridges online for free. Connect numbered islands with up to two bridges, avoid crossings, build one network, use logical hints and solve daily Hashiwokakero puzzles.',capabilities:{solutionSteps:false},ranking:{proofType:'bridges',scoreModel:'network-efficiency'}}),
  withContract({
    key:'animal-chess',
    slug:'animal-chess',
    experienceType:'board',
    name:'Animal Chess',
    featured:false,
    category:'Board',
    tagline:'Outrank. Outsmart. Reach the den.',
    description:'Play Dou Shou Qi on a premium 7×9 Animal Chess board with local two-player play or three computer strengths. Move eight ranked animals across rivers and traps, capture weaker rivals and reach the enemy den.',
    socialInsight:'The smallest Rat can defeat the strongest Elephant, while Lion and Tiger can leap rivers. Winning depends on terrain, timing and rank—not brute strength alone.',
    heroPills:['2 Players + vs CPU','8 animals · ranks 1–8','Rivers · traps · dens'],
    metrics:[['turn','TURN'],['red','RED PIECES'],['blue','BLUE PIECES'],['moves','MOVES']],
    levels:[['local','Local 2P','same device · Red moves first']],
    howTo:['Red moves first. Select one of your animals, then choose a highlighted square. Animals normally move one square up, down, left or right.','Higher or equal ranks capture lower ranks. The Rat can capture the Elephant, but the Elephant cannot capture the Rat. Only Rats may enter rivers.','Lion and Tiger may leap across a river in a straight line unless any Rat blocks the water squares. Enemy animals standing in your traps lose their rank and can be captured by any animal.','Win by moving any animal into the enemy den, capturing every enemy animal, or leaving the opponent with no legal move. You may never enter your own den.'],
    seoTitle:'Animal Chess – Play Dou Shou Qi Online Free | Snapoki',
    seoDescription:'Play premium Animal Chess (Dou Shou Qi) free online with local two-player or computer opponents, ranked animals, rivers, traps, dens and classic capture rules.',
    capabilities:{hint:false,solution:false,solutionSteps:false,drag:false,daily:false,ranking:false},
    ranking:{enabled:false,proofType:'none',scoreModel:'none'},
    guide:{
      focus:'Animal Chess (Dou Shou Qi) is a turn-based strategy match on a standard seven-column, nine-row board. Each side begins with eight different animals, from Rat (rank one) to Elephant (rank eight). Red moves first. Your goal is to enter the opponent’s den, capture all opposing animals, or leave the other side without any legal move. Stronger animals usually capture weaker animals, but terrain and special abilities create decisive exceptions. The Rat can defeat an Elephant on land, and the Elephant cannot capture a Rat. The Rat is also the only animal allowed into rivers, while Lions and Tigers can jump across an uninterrupted river. Carefully read the board before every move: arriving in an opponent-owned trap reduces your animal’s effective rank to zero until it moves out.',
      tips:[
        'First map the three traps surrounding each den. An attacking animal standing in your traps loses its rank and can be captured even by your lowest-ranked defender, so control these squares when defending or pressuring a den.',
        'Use the Rat’s ability to enter rivers and to capture an Elephant on land, but remember that Rats cannot capture directly between water and land. A Rat occupying the river also blocks Lion and Tiger river jumps.',
        'Before moving your Lion or Tiger, check all river squares in the intended jump path. Any Rat in that stretch prevents the jump, regardless of which side owns the Rat.',
        'Play with the next reply in mind. A high-ranked piece may win a capture but expose your den; a simple blocking move near a trap can be more valuable than advancing toward the opposite side.',
        'In Local 2P both players take turns on the same device. In CPU mode, the computer controls Blue; Easy is approachable, Smart uses immediate tactical evaluation, and Expert searches replies more deeply.'
      ],
      mistakes:[
        'Trying to move an Elephant into a river. Only Rats can enter water; Lion and Tiger may cross only via a clear river jump.',
        'Assuming a Rat can capture an Elephant from a water square. The special Rat-versus-Elephant capture applies only on land.',
        'Believing high rank guarantees safety inside the opponent’s trap. Your animal is treated as rank zero there.',
        'Attempting to enter your own den or moving diagonally. Animals ordinarily move one orthogonal square and cannot occupy their home den.',
        'Using New Game when you intended to Undo. New Game resets the full position, while Undo takes back previous turns.'
      ],
      controls:{heading:'Playing locally or against the CPU',body:'Choose 2P for local two-player mode or CPU for a computer opponent. In CPU mode select Easy, Smart or Expert. Select an animal and then a highlighted legal destination. Keyboard players can use arrow keys to move across the board and Enter to select or move. Undo restores a previous turn; New starts a fresh standard match. The optional sound switch only controls game feedback.'},
      format:{heading:'Match format and winning conditions',body:'One match uses the traditional 7×9 layout. Red always moves first. Each player has eight ranked animals, a protected home den and three traps. Victory comes from entering the enemy den, capturing all enemy pieces, or leaving the opponent with no legal move. After 120 moves without a capture, the game declares a draw to prevent endless repetition. Animal Chess has no Daily Challenge, puzzle hints or public player rankings.'},
      difficultyCopy:'The board stays seven columns by nine rows for every mode. Local 2P is a same-device human match; CPU Easy favors approachable play, Smart weighs positional and capture opportunities, and Expert searches tactical replies more deeply. Choose your mode in the in-game toolbar rather than expecting the puzzle difficulty buttons.',
      ctaCopy:'Start with Local 2P or Easy CPU, protect your own den and learn which terrain changes the capture rules. Move to Smart and Expert once you are comfortable planning more than one turn ahead.'
    },
    modeLabel:'Local 2 Players',
    ui:{controlTitle:'Game mode',controlHint:'Two players or computer',guideControlTitle:'Animal ranks',newLabel:'New Game',resetLabel:'Reset Game'}
  }),
withContract({
    key:'world-loop',
    slug:'world-loop',
    experienceType:'simulation',
    name:'World Loop',
    featured:false,
    category:'Simulation',
    tagline:'Pick your countries. Run forever. No finish line.',
    description:'Choose 4–12 countries from 196 choices and watch an endless horizontal race with no finish line, no rounds and no automatic reset.',
    socialInsight:'The race never ends. Neutral seeded traits, comeback pressure and short bursts create lead changes while every racer keeps accumulating distance instead of returning to a start line.',
    heroPills:['196 countries · choose 4–12','No finish line · no rounds','Full Screen + Wake Lock'],
    metrics:[['distance','LEADER DISTANCE'],['leader','LEADER'],['gap','P1 → P2 GAP'],['racers','RACERS']],
    levels:[['easy','Cruise','slower pace · gentle movement'],['medium','Dynamic','balanced pace · active lead changes'],['hard','Sprint','faster pace · stronger bursts']],
    howTo:['Search 196 country choices, pick between 4 and 12, then start the endless race. Every country keeps its own horizontal lane.','There is no finish line and no round reset. Each racer keeps adding distance continuously while the road scrolls under the pack.','Country identity never grants a permanent speed bonus. Neutral seeded traits, comeback pressure and brief bursts let the order change over time.','Use Pause for a temporary hold. Press Stop to return to country selection. Restart intentionally returns every distance to zero and starts a new session with the same countries.'],
    seoTitle:'World Loop – Endless Flag Race With No Finish Line | Snapoki',
    seoDescription:'Choose from 196 countries and watch an endless lane race with no finish line or round reset. Distance grows forever with Full Screen, current order, leader gap and optional Screen Wake Lock.',
    capabilities:{hint:false,solution:false,solutionSteps:false,drag:false,daily:false,ranking:false},
    ranking:{enabled:false,proofType:'none',scoreModel:'none'},
    modeLabel:'Endless Race',
    ui:{controlTitle:'Race pace',controlHint:'Choose the feel',guideControlTitle:'Race pace presets',newLabel:'Change Countries',resetLabel:'Restart Race'}
  }),
  withContract({
    key:'animal-loop',slug:'animal-loop',experienceType:'simulation',
    name:'Animal Loop',featured:false,category:'Simulation',
    tagline:'Pick your animals. Watch them run forever.',
    description:'Choose 4–12 animals from 24 friendly characters and enjoy an endless, calming side-scrolling race with no finish line. Change Cruise, Dynamic or Sprint at any time without resetting.',
    socialInsight:'Animal Loop is a relaxing race to watch: each animal runs at a neutral, independently seeded pace, with gentle surprises and occasional changes of leader.',
    heroPills:['24 animals · choose 4–12','No flags · no finish line','Live pace · optional music'],
    metrics:[['distance','LEADER DISTANCE'],['leader','LEADER'],['gap','P1 → P2 GAP'],['racers','RACERS']],
    levels:[['easy','Cruise','slower pace · gentle movement'],['medium','Dynamic','balanced pace · changing leads'],['hard','Sprint','faster pace · stronger bursts']],
    howTo:[
      'Choose four to twelve animals from the searchable list or use Random 8. Each animal gets its own lane and recognizable animal character instead of a flag.',
      'The animals run continuously in the same shared endless race engine used by World Loop. There is no finish line or automatic round reset.',
      'Switch Cruise, Dynamic or Sprint while the race continues. The current session, distances and animal selection are preserved.',
      'Pause to freeze the animation, Restart to start the same animals again from zero, or Stop to change the animal roster. Music is optional and off by default.'
    ],
    guide:{
      focus:'Animal Loop is a gentle, watch-forever animal race. Pick your favorite animals, then enjoy how their positions shift naturally over time. It is a relaxing screensaver rather than a competitive puzzle or a betting game.',
      tips:['Choose four to eight animals for an uncluttered view of the track.','Use Cruise for a relaxing ambient screen or Dynamic for occasional changes of leader.','Use Full Screen and optional music when you want to let the animals run in the background.'],
      mistakes:['Expecting an automatic winner or finish line.','Using Restart instead of Pause when you want to keep the current distance.','Assuming each animal species has a built-in speed advantage; speed is seeded independently of the character.'],
      controls:{heading:'Live screensaver controls',body:'Choose Cruise, Dynamic or Sprint without resetting the race. Pause and Resume hold the same session. Restart resets all distances. Stop lets you choose animals again. Play Sound, Mute and Volume work independently.'},
      format:{heading:'Relaxed endless format',body:'This simulation has no finish line, rounds or winner. Animal characters are for fun; speed and bursts are chosen independently of species. The displayed Top 5 and distance counters update continuously.'},
      difficultyCopy:'The Cruise, Dynamic and Sprint presets alter movement speed and bursts. They are visual pace settings, not difficulty levels, and changing them never restarts the race.',
      ctaCopy:'Pick four to twelve animals or start with the default eight, then leave the soothing race running as long as you like.'
    },
    seoTitle:'Animal Loop – Endless Animal Race Screensaver | Snapoki',
    seoDescription:'Pick from 24 cute animals and watch a relaxing endless race. No finish line, no flags, live Cruise/Dynamic/Sprint, optional music, Top 5 and full-screen screensaver.',
    capabilities:{hint:false,solution:false,solutionSteps:false,drag:false,daily:false,ranking:false},
    ranking:{enabled:false,proofType:'none',scoreModel:'none'},
    modeLabel:'Endless Race',
    ui:{controlTitle:'Race pace',controlHint:'Choose the mood',guideControlTitle:'Race pace presets',newLabel:'Change Animals',resetLabel:'Restart Race'}
  }),
  withContract({
    key:'aquarium-loop',slug:'aquarium-loop',experienceType:'simulation',
    name:'Aquarium Loop',featured:false,category:'Simulation',
    tagline:'Choose your sea creatures. Watch them swim.',
    description:'Build a peaceful underwater aquarium with 4–12 sea creatures from 16 choices. Watch naturally wandering fish, slow bubbles and swaying seaweed. No races, points, winners or finish line.',
    socialInsight:'An ambient underwater scene that never ends: each sea creature wanders through a fluid 2D space, gradually turning and softly avoiding its neighbors.',
    heroPills:['16 sea creatures · choose 4–12','Relaxing underwater swim','Drift / Flow / Playful · Ocean sound'],
    metrics:[['swimmers','CREATURES'],['flow','SWIM PACE'],['time','SESSION'],['scene','SCENE']],
    levels:[['easy','Drift','very calm, slow swimming'],['medium','Flow','natural, balanced motion'],['hard','Playful','lively but gentle swimming']],
    howTo:[
      'Watch a starting group of eight sea creatures swim freely in a colorful underwater environment, or press Change to select your own group of four to twelve.',
      'Choose from 16 sea creatures, including tropical fish, dolphins, sea turtles, jellyfish and octopuses. Creatures wander through the tank without race lanes, rankings or species speed bonuses.',
      'Switch Drift, Flow or Playful live to adjust the swim pace without restarting. Fish change direction gradually, stay inside the aquarium and gently avoid their neighbors.',
      'Pause to freeze the scene, Restart to create a fresh swimming session with your chosen creatures, or Change to edit the roster. Ocean Sound is off until you turn it on. Full Screen provides a quiet screensaver.'
    ],
    guide:{
      focus:'Aquarium Loop is an interactive 2D ambient aquarium, made for relaxing rather than winning. Watch 4–12 sea creatures drift and change direction naturally, with optional Web Audio ocean ambience and no download or account.',
      tips:['Start with eight species for a balanced tank and use Drift for a softer screensaver.','Try a combination of larger creatures and tiny fish for an interesting visual mix.','Enter Full Screen and enable Ocean Sound only if you want audio. The aquarium stays silent by default.'],
      mistakes:['Expecting race rankings or a finish line; Aquarium Loop is not a race.','Thinking each species has special speed advantages; swim motion is generated independently of species.','Using Restart when you only intend to pause the scene; Pause and Resume preserve the ongoing session.'],
      controls:{heading:'Aquarium controls',body:'Drift, Flow and Playful change motion immediately. Pause and Resume freeze and continue the same session; Restart creates new movement paths for the same selected creatures. Change opens the sea creature picker. Ocean Sound and Volume work independently, and Full Screen expands the aquarium.'},
      format:{heading:'Natural Swim ambient format',body:'Swimmers move continuously in two dimensions, choose soft steering targets, stay within the scene and use gentle local separation. No lanes, scoreboard, finish line, scoring, timed challenges or public rankings. Your chosen sea creature list stays in this browser.'},
      difficultyCopy:'The three options are visual motion settings rather than challenge levels. Drift is slower, Flow is balanced and Playful is quicker; they do not change the chosen animals.',
      ctaCopy:'Choose four to twelve sea creatures, select your preferred swim pace and enjoy a relaxing aquarium screensaver.'
    },
    seoTitle:'Aquarium Loop – Relaxing Underwater Screensaver | Snapoki',
    seoDescription:'Relax with a free underwater aquarium screensaver. Choose from 16 sea creatures, watch natural 2D swimming, bubbles and swaying plants, and try optional ocean ambience.',
    capabilities:{hint:false,solution:false,solutionSteps:false,drag:false,daily:false,ranking:false},
    ranking:{enabled:false,proofType:'none',scoreModel:'none'},
    modeLabel:'Ambient Swim',
    ui:{controlTitle:'Swim pace',controlHint:'Choose the mood',guideControlTitle:'Swim modes',newLabel:'Change Creatures',resetLabel:'Restart Aquarium'}
  })

];

export const GAME_MAP=Object.fromEntries(GAMES.map(game=>[game.key,game]));
export const FEATURED_GAMES=GAMES.filter(game=>game.featured).slice(0,4);
export const GAME_CATEGORIES=[...new Set(GAMES.map(game=>game.category))];
export function getGame(key){return GAME_MAP[key]||null;}
