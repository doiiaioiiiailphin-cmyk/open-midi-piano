function buildSong(notes, bpm = 120) {
  const beatDuration = 60 / bpm;
  let currentTime = 0;
  const result = [];
  for (const [midi, beats] of notes) {
    if (midi !== null) {
      result.push({ midi, time: currentTime, duration: beats * beatDuration * 0.9, program: 0, instrument: 'piano', instrumentName: '钢琴' });
    }
    currentTime += beats * beatDuration;
  }
  return { notes: result, duration: currentTime, instruments: ['piano'] };
}

export const SONGS = [
  {
    name: '波西米亚狂想曲', artist: 'Queen', difficulty: 'hard',
    type: 'midi', url: './assets/midi/bohemian_rhapsody.mid', data: null
  },
  {
    name: 'Never Gonna Give You Up', artist: 'Rick Astley', difficulty: 'medium',
    type: 'midi', url: './assets/midi/never_gonna_give_you_up.mid', data: null
  },
  {
    name: '超级马里奥64 合奏', artist: '近藤浩治', difficulty: 'medium',
    type: 'midi', url: './assets/midi/mario64_medley.mid', data: null
  },
  {
    name: '致爱丽丝 (完整版)', artist: '贝多芬', difficulty: 'medium',
    type: 'midi', url: './assets/midi/fur_elise.mid', data: null
  },
  {
    name: '卡农 (完整版)', artist: '帕赫贝尔', difficulty: 'medium',
    type: 'midi', url: './assets/midi/canon.mid', data: null
  },
  {
    name: '月光奏鸣曲', artist: '贝多芬', difficulty: 'hard',
    type: 'midi', url: './assets/midi/moonlight.mid', data: null
  },
  {
    name: '土耳其进行曲', artist: '莫扎特', difficulty: 'hard',
    type: 'midi', url: './assets/midi/turkish_march.mid', data: null
  },
  {
    name: 'River Flows in You', artist: '李闰珉', difficulty: 'medium',
    type: 'midi', url: './assets/midi/river_flows.mid', data: null
  },
  {
    name: '野蜂飞舞', artist: '里姆斯基-科萨科夫', difficulty: 'hard',
    type: 'midi', url: './assets/midi/bumblebee.mid', data: null
  },
  {
    name: '小星星', artist: '莫扎特', difficulty: 'easy', bpm: 100,
    data: buildSong([
      [60,1],[60,1],[67,1],[67,1],[69,1],[69,1],[67,2],
      [65,1],[65,1],[64,1],[64,1],[62,1],[62,1],[60,2],
      [67,1],[67,1],[65,1],[65,1],[64,1],[64,1],[62,2],
      [67,1],[67,1],[65,1],[65,1],[64,1],[64,1],[62,2],
      [60,1],[60,1],[67,1],[67,1],[69,1],[69,1],[67,2],
      [65,1],[65,1],[64,1],[64,1],[62,1],[62,1],[60,2],
    ], 100)
  },
  {
    name: '欢乐颂', artist: '贝多芬', difficulty: 'easy', bpm: 108,
    data: buildSong([
      [64,1],[64,1],[65,1],[67,1],[67,1],[65,1],[64,1],[62,1],
      [60,1],[60,1],[62,1],[64,1],[64,1.5],[62,0.5],[62,2],
      [64,1],[64,1],[65,1],[67,1],[67,1],[65,1],[64,1],[62,1],
      [60,1],[60,1],[62,1],[64,1],[62,1.5],[60,0.5],[60,2],
      [62,1],[62,1],[64,1],[60,1],[62,1],[64,0.5],[64,0.5],[60,1],
      [62,1],[64,0.5],[64,0.5],[67,1],[65,1],[64,1],[62,1],[64,1],
      [64,1],[64,1],[65,1],[67,1],[67,1],[65,1],[64,1],[62,1],
      [60,1],[60,1],[62,1],[64,1],[62,1.5],[60,0.5],[60,2],
    ], 108)
  },
  {
    name: '生日快乐', artist: '传统', difficulty: 'easy', bpm: 100,
    data: buildSong([
      [null,0.75],[60,0.25],[60,1],[62,1],[60,1],[65,1],[64,2],
      [null,0.75],[60,0.25],[60,1],[62,1],[60,1],[67,1],[65,2],
      [null,0.75],[60,0.25],[60,1],[72,1],[69,1],[65,1],[64,1],[62,1],
      [null,0.75],[71,0.25],[71,1],[69,1],[65,1],[67,1],[65,2],
    ], 100)
  },
  {
    name: '玛丽的小羊羔', artist: '传统', difficulty: 'easy', bpm: 110,
    data: buildSong([
      [64,1],[62,1],[60,1],[62,1],[64,1],[64,1],[64,2],
      [62,1],[62,1],[62,2],[64,1],[67,1],[67,2],
      [64,1],[62,1],[60,1],[62,1],[64,1],[64,1],[64,1],[64,1],
      [62,1],[62,1],[64,1],[62,1],[60,4],
    ], 110)
  },
];
