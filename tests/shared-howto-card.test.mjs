import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const games=['echo-step','maze','number-path','color-connect','lights-out','loop-puzzle'];

test('all six games use the shared scan-first How to Play card',()=>{
  const css=fs.readFileSync('dist/assets/styles/how-to-card.css','utf8');
  assert.match(css,/\.game-howto-goal/);
  assert.match(css,/\.game-howto-row/);
  assert.match(css,/\.game-howto-tools/);
  for(const slug of games){
    const page=fs.readFileSync(`dist/${slug}/index.html`,'utf8');
    assert.match(page,new RegExp(`class="game-howto game-howto--${slug}"`));
    assert.match(page,/class="game-howto-goal"/);
    assert.match(page,/class="game-howto-row"/);
    assert.match(page,/class="game-howto-tools"/);
    assert.match(page,/\/assets\/styles\/how-to-card\.css/);
    assert.doesNotMatch(page,/<p><strong>[1-4]\.<\/strong>/);
  }
});

test('each How to Play card keeps a game-specific goal and concise actions',()=>{
  const expected={
    'echo-step':['YOU → P','Echo → E','Same turn','next 3 moves'],
    'maze':['START','FINISH','Find the exit','short next route'],
    'number-path':['1 → LAST','Fill every open cell','exact path step','Undo'],
    'color-connect':['PAIR → PAIR','Cover every open cell','Paths cannot overlap','all ghost routes'],
    'lights-out':['ALL LIGHTS → OFF','Clear the board','up, down, left and right','shortest press set'],
    'loop-puzzle':['ONE CLOSED LOOP','Match every clue','exact count','one ghost loop']
  };
  for(const [slug,phrases] of Object.entries(expected)){
    const page=fs.readFileSync(`dist/${slug}/index.html`,'utf8');
    for(const phrase of phrases)assert.match(page,new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'));
  }
});

test('legacy Echo-only How to Play stylesheet is gone',()=>{
  assert.equal(fs.existsSync('src/styles/echo-step-launch.css'),false);
  assert.equal(fs.existsSync('dist/assets/styles/echo-step-launch.css'),false);
});
