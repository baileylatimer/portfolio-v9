// Thematic kanji pool — white space, silence, breath, memory, presence/absence
export const KANJI_POOL = '余白間墨字空沈黙呼吸存在不緊張文記憶静絆活字版組版';
export const NUMBER_POOL = '0123456789';

// Filler characters for outside-face cells
export const FILLER_POOL: Array<{ char: string; weight: number }> = [
  { char: '·', weight: 70 },
  { char: '.', weight: 15 },
  { char: '-', weight: 10 },
  { char: '*', weight: 5 },
];

// Seeded random filler — pre-generate a large array so it's stable per render
const FILLER_SEQ_LEN = 8192;
export const FILLER_SEQ: string[] = (() => {
  const pool: string[] = [];
  for (const { char, weight } of FILLER_POOL) {
    for (let i = 0; i < weight; i++) pool.push(char);
  }
  const seq: string[] = [];
  // Simple LCG for deterministic sequence
  let s = 0x9e3779b9;
  for (let i = 0; i < FILLER_SEQ_LEN; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    seq.push(pool[s % pool.length]);
  }
  return seq;
})();

// Body text pool — kanji 80%, numbers 20%
const BODY_SEQ_LEN = 16384;
export const BODY_SEQ: string[] = (() => {
  const kanji = KANJI_POOL.split('');
  const nums = NUMBER_POOL.split('');
  const seq: string[] = [];
  let s = 0xdeadbeef;
  for (let i = 0; i < BODY_SEQ_LEN; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const pct = s % 100;
    if (pct < 80) {
      seq.push(kanji[s % kanji.length]);
    } else {
      seq.push(nums[s % nums.length]);
    }
  }
  return seq;
})();

export const LEFT_DIALOGUE: string[] = [
  '[ピー、ピー、ピー]',
  'もしもし。',
  'YEAH.',
  'I SEE IT.',
  '見える？',
  'THE SPACE.',
  'BETWEEN.',
  'うん。',
  '[STATIC]',
  '間。',
  'MA.',
  'THE PAUSE.',
  'DO YOU HEAR IT?',
  'わかる？',
  'YEAH YEAH.',
  'THE SILENCE.',
  '— IT CARRIES WEIGHT',
  'THE LINE WENT DEAD AROUND 3 IN THE MORNING.',
  '[DIAL TONE]',
  'WAIT.',
  'まだいる？',
  "I'M HERE.",
  'OKAY.',
  'うん、うん。',
  '[PAPER]',
  'NOT NOTHING.',
  '余白。',
  'RIGHT.',
  'BREATH.',
  'そう。',
  "YOU DON'T HEAR IT UNTIL IT STOPS.",
  '[CLICK]',
  'HELLO?',
  'まだいる。',
  'GOOD.',
  'I SEE.',
  '見えた。',
  '[BEEP]',
  'OKAY.',
  'うん。',
  '— THE MARK.',
  'AND THE SPACE.',
  'BOTH.',
  '両方。',
  'SOMEBODY PICKED UP AND IT WAS JUST SILENCE.',
  '[LONG PAUSE]',
  'STILL THERE?',
  'います。',
  'GOOD.',
  'TYPOGRAPHY.',
  'タイポグラフィ。',
  'YEAH.',
  'INVISIBLE.',
  '見えない。',
  "THAT'S THE POINT.",
  'そう。',
  "IT'S THE SPACE BETWEEN THE NOTES — THAT'S WHERE THE MUSIC LIVES.",
  '[CLICK]',
  'HELLO?',
  'GONE.',
  '[ピー]',
  'OKAY.',
  'I SEE.',
  'わかった。',
  '[END]',
  '...',
  '[ピー、ピー]',
  'もしもし。',
  'AGAIN.',
  'また。',
  'THE SPACE.',
  'STILL THERE.',
  'うん。',
  '[STATIC]',
  'BREATH.',
  'BREATH.',
  '呼吸。',
  'RIGHT.',
  'そう。',
  'WHAT HARA SAID — THE ABSENCE IS THE DESIGN.',
  '[DIAL TONE]',
  'WAIT.',
  'まだ。',
  'OKAY.',
  'うん。',
  '[END]',
  '...',
  'THE WEIGHT OF A STROKE.',
  'THE SPACE BETWEEN LINES.',
  'THE SILENCE AT THE MARGIN.',
  'うん、うん。',
  '[STATIC]',
  'BREATH.',
  'そう。',
  '[END]',
];

export const RIGHT_DIALOGUE: string[] = [
  '[SOMEBODY PICKS UP]',
  'HELLO?',
  '...NEGATIVE SPACE...',
  '[MUFFLED]',
  'WHAT HARA SAID —',
  'THE ABSENCE.',
  "I'M LISTENING.",
  'はい。',
  'YES.',
  '[RUSTLING]',
  "IT'S NOT NOTHING.",
  "IT'S BREATH.",
  '余白。',
  'RIGHT.',
  'わかった。',
  'THE MARK.',
  'AND THE SPACE.',
  'BOTH.',
  '両方。',
  'THE BEST DECISIONS ARE THE ONES NOBODY NOTICES.',
  '[LONG PAUSE]',
  'STILL THERE?',
  'います。',
  'GOOD.',
  'TYPOGRAPHY.',
  'タイポグラフィ。',
  'YEAH.',
  'INVISIBLE.',
  '見えない。',
  "THAT'S THE POINT.",
  'そう。',
  'EVERY DECISION IS A DECISION ABOUT MEANING.',
  '[CLICK]',
  'HELLO?',
  'GONE.',
  '[ピー]',
  'OKAY.',
  'I SEE.',
  'わかった。',
  '[END]',
  '...',
  '[SOMEBODY PICKS UP]',
  'HELLO?',
  'AGAIN.',
  'また。',
  'THE ABSENCE.',
  'YES.',
  'はい。',
  '[RUSTLING]',
  "IT'S BREATH.",
  '余白。',
  'RIGHT.',
  'わかった。',
  'THE MARK.',
  'BOTH.',
  '両方。',
  'THE PAGE REMEMBERS EVERYTHING YOU LEFT OUT.',
  '[PAUSE]',
  'STILL THERE?',
  'います。',
  'GOOD.',
  'INVISIBLE.',
  '見えない。',
  "THAT'S IT.",
  'そう。',
  '[CLICK]',
  'GONE.',
  '[ピー]',
  'OKAY.',
  'わかった。',
  '[END]',
  '...',
  'LANGUAGE BECOMES VISIBLE.',
  'IT IS NOT DECORATION.',
  'IT IS NOT STYLE.',
  'はい。',
  '[STATIC]',
  'BREATH.',
  'そう。',
  '[END]',
  '...',
];
