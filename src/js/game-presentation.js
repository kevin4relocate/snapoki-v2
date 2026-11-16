const PRESENTATION={
  'echo-step':{
    styles:['echo-step.css','echo-step-polish.css','echo-step-rulebar.css'],
    solutionLabel:'Guide',
    goal:{tokens:['YOU → P','Echo → E'],joiner:'+',note:'Same turn'},
    rows:[
      ['Move','Move YOU. Echo repeats each move after the delay shown above the board.'],
      ['Walls','Purple blocks YOU · Cyan blocks Echo · Dark blocks both.'],
      ['Avoid','If Echo hits a blocked cell, leaves the board, or hits YOU, use Retry.']
    ],
    tools:[['Hint','next 3 moves'],['Guide','step-by-step practice']],
    socialHook:'Can YOU and Echo finish together?',
    spotlight:{
      eyebrow:'New puzzle',
      heading:'Your moves come back.',
      text:'Move purple YOU now while cyan Echo repeats the same moves a few turns later. Purple, cyan and dark striped cells affect who can enter, so every move has to work now and later.',
      points:[['01','YOU → P','Your goal'],['02','ECHO → E','Echo’s goal'],['03','SAME TURN','Finish together']]
    }
  },
  maze:{
    goal:{tokens:['START','FINISH'],joiner:'→',note:'Find the exit'},
    rows:[['Move','On touch, briefly hold the purple marker to grab it, then drag in any direction. Release to stop. Mouse can drag or click; keyboard uses Arrow / WASD.'],['Watch','False branches and dead ends cost time. Hard boards add deeper traps and later decisions.'],['Finish','Reach the green finish marker with the shortest, cleanest route you can find.']],
    tools:[['Hint','short next route'],['Solution','full-route practice']],
    socialHook:'Can you find the exit?'
  },
  'number-path':{
    goal:{tokens:['1 → LAST'],note:'Fill every open cell'},
    rows:[['Move','Build one continuous path through orthogonally adjacent open cells.'],['Numbers','Each numbered checkpoint is the exact path step that must land on that cell.'],['Rethink','A contradictory route is allowed in Regular Play. Spot the conflict and use Undo to change the branch.']],
    tools:[['Hint','next real action'],['Solution','full-route practice']],
    socialHook:'Can you connect the path?'
  },
  'color-connect':{
    goal:{tokens:['PAIR → PAIR'],note:'Cover every open cell'},
    rows:[['Connect','Drag from one colored endpoint to its matching endpoint.'],['Rules','Paths cannot overlap, cross blocked cells, or pass through another color endpoint.'],['Plan','Every open cell must be covered, so an easy-looking short route can block another color later.']],
    tools:[['Hint','short route section'],['Solution','all ghost routes']],
    socialHook:'Can you connect them all?'
  },
  'lights-out':{
    goal:{tokens:['ALL LIGHTS → OFF'],note:'Clear the board'},
    rows:[['Press','Tap a light to toggle it plus its up, down, left and right neighbors.'],['Plan','One press changes several cells, so each move can help one area while reopening another.'],['Score','Difficulty is based on the board’s true minimum number of presses, not just board size.']],
    tools:[['Hint','next useful press'],['Solution','shortest press set']],
    socialHook:'Can you turn them all off?'
  },
  'loop-puzzle':{
    goal:{tokens:['ONE CLOSED LOOP'],note:'Match every clue'},
    rows:[['Draw','Tap grid edges to build one continuous loop.'],['Clues','A number is the exact count of that cell’s four sides used by the loop.'],['Finish','Any single closed loop satisfying every visible clue is accepted. Edge order does not matter.']],
    tools:[['Hint','exact edge to change'],['Solution','one ghost loop']],
    socialHook:'Can you close the loop?'
  },

  'animal-chess':{
    styles:['animal-chess.css'],
    solutionLabel:'Guide',
    goal:{tokens:['REACH ENEMY DEN'],note:'or capture every rival'},
    rows:[
      ['Move','Red moves first. Move one animal one square up, down, left or right.'],
      ['Ranks','Higher or equal ranks capture lower ranks. Rat can capture Elephant, and only Rats may enter rivers.'],
      ['Terrain','Lion and Tiger jump rivers unless a Rat blocks them. Enemy animals standing in your traps lose their rank.']
    ],
    tools:[['Undo','take back one move'],['Restart','new local game']],
    socialHook:'Can you reach the enemy den?'
  },
  'aquarium-loop':{
    styles:['aquarium-loop.css'],
    solutionLabel:'Guide',
    goal:{tokens:['CHOOSE CREATURES','WATCH THEM SWIM'],joiner:'→',note:'No race or winner'},
    rows:[['Choose','Select 4–12 sea creatures from the aquarium.'],['Relax','Fish wander in 2D, turn gently and stay within the tank.'],['Adjust','Change Drift, Flow or Playful without starting over.']],
    tools:[['Pause','freeze / resume'],['Full Screen','calm underwater mode'],['Ocean Sound','optional ambience']],
    socialHook:'Who is swimming in your aquarium today?'
  },
  'animal-loop':{
    styles:['world-loop.css','animal-loop.css'],
    solutionLabel:'Guide',
    goal:{tokens:['PICK ANIMALS','WATCH FOREVER'],joiner:'→',note:'No finish line'},
    rows:[['Choose','Pick four to twelve animals or try Random 8.'],['Watch','The same endless race rules apply, with no winner and no automatic reset.'],['Relax','Use Cruise for a gentle pace or change to Dynamic and Sprint live.']],
    tools:[['Pause','freeze / resume'],['Full Screen','ambient screensaver'],['Restart','new endless session']],
    socialHook:'Which animal will lead the pack next?'
  },
  'world-loop':{
    styles:['world-loop.css'],
    solutionLabel:'Guide',
    goal:{tokens:['PICK COUNTRIES','WATCH FOREVER'],joiner:'→',note:'No finish line'},
    rows:[['Run','Every country has one lane and keeps moving forward continuously. There is no finish line.'],['Distance','The camera scrolls with the pack while each racer accumulates distance forever instead of resetting.'],['Control','Pause keeps the same session. Stop returns to country selection; Restart returns all distances to zero with the same countries.']],
    tools:[['Pause','freeze / resume'],['Full Screen','screensaver view'],['Restart','new endless session']],
    socialHook:'Who leads after an hour?'
  },
  bridges:{
    styles:['bridges.css','bridges-progress-fix.css'],
    goal:{tokens:['MATCH NUMBERS'],joiner:'+',note:'One connected network'},
    rows:[
      ['Connect','Tap an island, then a glowing island to add one bridge. Repeat the same pair for a double bridge. Tap an existing bridge to remove one.'],
      ['Count','One line counts as 1 bridge; two parallel lines count as 2. Every island must receive exactly the number shown, and a pair can share at most two bridges.'],
      ['Finish','Bridges never cross or pass through another island. Match every number and keep every island inside one connected network.']
    ],
    tools:[['Hint','logic reason + Apply'],['Solution','missing + wrong links']],
    socialHook:'Can you connect every island?'
  }
};

const DEFAULT_ROW_LABELS=['Start','Rule','Finish'];

export function getGamePresentation(game){
  const custom=PRESENTATION[game.key]||{};
  const fallbackRows=(game.howTo||[]).slice(0,3).map((text,index)=>[DEFAULT_ROW_LABELS[index]||'Tip',text]);
  const experienceType=game.experienceType||'puzzle';
  const defaults=experienceType==='board'
    ?{goal:{tokens:[String(game.name||'BOARD GAME').toUpperCase()],note:'Make legal moves'},tools:[['Move','follow the match rules'],['New Game','start again']],socialHook:`Who will win ${game.name}?`}
    :experienceType==='simulation'
      ?{goal:{tokens:[String(game.name||'SIMULATION').toUpperCase()],note:'Watch the session'},tools:[['Start','begin the session'],['Reset','start again']],socialHook:`What happens in ${game.name}?`}
      :{goal:{tokens:[String(game.name||'PUZZLE').toUpperCase()],note:'Solve the board'},tools:[['Hint','next useful action'],['Solution','practice guide']],socialHook:`Can you solve ${game.name}?`};
  return {
    styles:[],
    solutionLabel:'Solution',
    rows:fallbackRows,
    ...defaults,
    ...custom
  };
}

export function gameStyleSheets(game){return getGamePresentation(game).styles||[];}
