// Shared editorial contract for puzzle, board and simulation guide pages.
// Game-specific guide data belongs here or in game.guide, never in post-build HTML replacements.
const GUIDE={
  'echo-step':{focus:'Echo Step asks you to plan one command sequence for two moments. YOU moves immediately, while Echo repeats accepted moves after the displayed delay, and both goals must be occupied on the same turn.',tips:['Before each move, check where YOU will land now and what Echo is about to repeat.','Use purple, cyan and dark striped cells as actor-specific constraints rather than ordinary walls.','Near P and E, count the delay instead of rushing to the first goal.'],mistakes:['Treating P as the only finish condition.','Forgetting that a move safe for YOU can later send Echo into a blocked cell.','Using Guide before trying the three-move Hint forecast.']},
  maze:{focus:'Maze rewards route reading rather than speed alone. The fastest-looking corridor can lead deep into a dead end, especially on Medium and Hard.',tips:['Scan junctions before committing to a long corridor.','Use landmarks such as unusual wall shapes to avoid rechecking the same branch.','On Hard, treat long uninterrupted movement as a risk: deceptive routes often hide the costly decision farther ahead.'],mistakes:['Dragging too fast through a junction and entering the wrong branch.','Repeatedly revisiting the same dead end instead of remembering its entrance.','Using Solution before you have tried a Hint, which turns the board into practice-only play.']},
  'number-path':{focus:'Number Path is a full-board path puzzle: reaching the next numbered checkpoint is not enough. Your route must leave a future path for every remaining open cell.',tips:['Before entering a narrow pocket, ask how you will leave it.','Use checkpoint numbers as distance information, not only as destinations.','Watch blocked cells as walls that create forced turns and isolated regions.'],mistakes:['Following a visually short line to the next checkpoint and trapping unused cells behind you.','Treating a checkpoint as merely ordered instead of requiring the exact path step.','Ignoring a contradiction marker instead of using Undo to reconsider the branch.']},
  'color-connect':{focus:'Color Connect becomes difficult when several colors compete for the same corridors. A locally perfect short connection can make the entire board impossible later.',tips:['Identify narrow corridors before drawing the obvious short pairs.','Delay colors with many routing options and solve constrained pairs first.','Remember that every open cell must be covered, so empty pockets are evidence that an earlier route is wrong.'],mistakes:['Connecting the closest endpoints immediately.','Blocking an endpoint behind another completed path.','Leaving an isolated open cell that no remaining color can cover.']},
  'lights-out':{focus:'Lights Out is an algebraic toggle puzzle disguised as a simple grid. Every press changes several cells, so the important question is which combination of presses can clear the board.',tips:['Think in patterns rather than repeatedly pressing the brightest-looking area.','A cell only needs to be pressed zero or one time in an optimal solution because pressing it twice cancels itself.','Use Hint as a directional clue, then continue reasoning from the changed board.'],mistakes:['Random clicking until the board looks better.','Repeating a press that simply cancels an earlier move.','Assuming Hard means a bigger board; Snapoki calibrates it by true minimum presses.']},
  'world-loop':{focus:'World Loop is an endless spectator race with no finish line. Every selected country owns one lane, distance increases continuously, and the camera scrolls with the pack instead of ending a round or returning racers to zero.',tips:['Search 196 country choices, including Taiwan; use 6–8 racers for the clearest television-style view, or up to 12 for a crowded pack.','Full Screen is the intended screensaver view; supported browsers also request Screen Wake Lock after Start.','Leave the session alone as long as you want. Pause preserves the same distances. Restart begins again from zero with the same countries, while Stop returns to country selection.'],mistakes:['Waiting for a finish line—there is none. The distance counter is the permanent progress measure.','Assuming one country has a permanent built-in advantage; country identity never changes the speed formula.','Pressing Restart when you only meant to Pause, because Restart resets every racer distance to zero.'],
    controls:{heading:'Controls and observation',body:'This experience is designed for watching rather than solving. Pause preserves the same distances. Full Screen is the screensaver view. Stop returns to country selection. Restart begins a new endless session from zero with the same countries.'},
    format:{heading:'Endless format',body:'There are no rounds and no finish line. Racer distance increases continuously for as long as the page stays running. The scrolling camera keeps the leading pack visible while the underlying distance values continue growing.'},
    difficultyCopy:'Race pace changes absolute speed, comeback pressure and burst strength while preserving the same no-finish-line endless session.',
    ctaCopy:'Choose your countries and a pace preset to start the endless race. Pause instead of Restart when you want to preserve the current session.'},
  'loop-puzzle':{focus:'Loop Puzzle is about local clues and global topology at the same time. Every visible number constrains its four edges, but the finished drawing must also be one continuous closed loop with no branches.',tips:['Start with high-information clues such as isolated 0s and strategic 2/3 patterns.','After every local deduction, check whether an edge would create a premature small loop.','Blank cells are not zeroes: they simply provide no clue and may have any valid number of loop edges.'],mistakes:['Treating blank cells as if no edge may pass around them.','Completing a small closed loop before all other required edges are connected.','Following the outer border by habit instead of letting clues determine the shape.']}
};

const DEFAULTS={
  puzzle:{
    controls:{heading:'Hints and practice',body:'Hint gives a limited concrete next action. The full Solution or Guide is a study tool for the current board. Start a New Puzzle whenever you want a fresh challenge.'},
    format:{heading:'Daily Challenge',body:null},
    difficultyCopy:'Difficulty on Snapoki is designed to change the reasoning pressure, not simply enlarge the board. The exact pressure depends on the engine: route dependencies, fewer clues, delayed consequences, deceptive branches or higher minimum logical actions.',
    ctaCopy:'Start on Easy to learn the interaction, then move up when the board stops forcing your decisions.',
    mistakes:['Moving before checking the current constraints.','Ignoring how one choice changes the remaining board.','Opening the full practice guide before trying a Hint.']
  },
  board:{
    controls:{heading:'Controls and opponents',body:'Use the on-board controls to select legal moves and follow the match rules for the chosen opponent or local player mode. A new game starts a fresh match. Not every board game offers hints or solutions.'},
    format:{heading:'Match format',body:'Board games use legal moves, turns and a match-ending objective rather than automatic Daily puzzle completion. Match modes and win conditions depend on the game rules described above; public rankings are not required.'},
    difficultyCopy:'Board game options can change the opponent or match setup, not merely the board dimensions. Read each mode description before choosing how to play.',
    ctaCopy:'Review the move rules, choose the match mode and begin a new game. Practice locally before trying stronger opponents.',
    mistakes:['Making a move without checking the reply available to the other player.','Forgetting that special spaces or pieces can change an otherwise legal move.','Resetting a match when you only meant to review the current position.']
  },
  simulation:{
    controls:{heading:'Controls and observation',body:'Choose a setup, start the simulation and use its Pause, Resume or Reset controls when available. Refer to the game-specific controls above for what each action changes.'},
    format:{heading:'Simulation format',body:'This is an interactive simulation rather than a puzzle with a required solution. It does not require Daily puzzle completion or public rankings.'},
    difficultyCopy:'Simulation presets adjust the behavior or pace of the experience instead of measuring puzzle-solving difficulty.',
    ctaCopy:'Try the available presets, observe how the simulation changes and restart when you want a different session.',
    mistakes:['Expecting a single puzzle solution in an observational experience.','Confusing Pause with a reset or a new session.','Changing presets without reviewing what that control affects.']
  }
};
export function getGameGuide(game){
  const type=game.experienceType||'puzzle';
  const defaults=DEFAULTS[type]||DEFAULTS.puzzle;
  const custom={...(GUIDE[game.key]||{}),...(game.guide||{})};
  const howTo=Array.isArray(game.howTo)?game.howTo:[];
  const format=custom.format||{
    ...defaults.format,
    heading:type==='puzzle'&&game.capabilities?.daily===false?'Play format':defaults.format.heading,
    body:type==='puzzle'&&game.capabilities?.daily!==false
      ?`The Daily Challenge gives every player the same ${game.name} board for a given UTC date and difficulty. Complete Easy, Medium and Hard to finish that game’s daily set. Progress is stored only in this browser.`
      :type==='puzzle'
        ?'Play fresh practice boards without any required Daily completion or public leaderboard.'
        :defaults.format.body
  };
  return{
    focus:custom.focus||game.description||`Explore ${game.name} using the rules and controls below.`,
    tips:custom.tips||howTo.slice(0,3),
    mistakes:custom.mistakes||defaults.mistakes,
    controls:custom.controls||defaults.controls,
    format,
    difficultyCopy:custom.difficultyCopy||defaults.difficultyCopy,
    ctaCopy:custom.ctaCopy||defaults.ctaCopy
  };
}
