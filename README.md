# Open MIDI Piano

基于浏览器的 3D 钢琴演奏器，支持 MIDI 文件播放、多乐器音色、用户曲库管理。

## 功能特性

- **3D 钢琴键盘** — 基于 Three.js 的交互式 3D 键盘，支持鼠标点击、键盘快捷键、触摸操作
- **SoundFont 高品质音色** — 通过 Web Audio API 加载 MusyngKite SoundFont，支持 128 种 GM 标准乐器
- **MIDI 文件播放** — 内置二进制 MIDI 解析器，支持多轨道多乐器同时播放
- **用户曲库管理** — 上传自定义 MIDI 文件并命名，IndexedDB 持久化存储，支持删除
- **乐器静音控制** — 播放多乐器曲目时可单独静音某个乐器声部
- **现代播放控制** — 进度条拖拽、上一首/下一首、音量调节
- **键盘快捷键** — Z-M 行映射低八度，Q-U 行映射高八度，方向键切换八度，空格键播放/暂停

## 预置曲目

所有预置曲目均为公共领域（Public Domain）古典音乐。

| 曲目 | 作曲家 |
|---|---|
| 致爱丽丝 | 贝多芬 |
| 月光奏鸣曲 第一乐章 | 贝多芬 |
| 悲怆奏鸣曲 第一乐章 | 贝多芬 |
| C大调前奏曲 BWV 846 | 巴赫 |
| D大调卡农 | 帕赫贝尔 |
| 土耳其进行曲 | 莫扎特 |
| C大调奏鸣曲 K.545 第一乐章 | 莫扎特 |
| 降E大调夜曲 Op.9 No.2 | 肖邦 |
| 音乐的瞬间 Op.94 No.3 | 舒伯特 |
| 抒情小品 "蝴蝶" Op.43 No.1 | 格里格 |
| 野蜂飞舞 | 里姆斯基-科萨科夫 |

> MIDI 文件需自行放入 `assets/midi/` 目录，不包含在本仓库中。

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/doiiaioiiiailphin-cmyk/open-midi-piano.git
cd open-midi-piano

# 准备 MIDI 文件（放入 assets/midi/ 目录）
mkdir -p assets/midi

# 启动本地服务器
npx serve . -l 3000
```

浏览器打开 `http://localhost:3000` 即可使用。

## 技术栈

- **Three.js** — 3D 钢琴键盘渲染与交互（Raycaster）
- **Web Audio API** — 音频合成与 SoundFont 解码
- **IndexedDB** — 用户上传曲目的持久化存储
- **ES Modules** — 原生模块化，无需构建工具

## 项目结构

```
├── index.html              # 主页面
├── css/style.css           # 样式
├── js/
│   ├── app.js              # 应用入口，UI 逻辑，上传/删除管理
│   ├── audio-engine.js     # 音频引擎，SoundFont 加载与播放
│   ├── piano-keyboard.js   # Three.js 3D 键盘
│   ├── song-player.js      # MIDI 播放引擎
│   ├── song-data.js        # 预置曲目列表
│   ├── midi-parser.js      # 二进制 MIDI 文件解析器
│   └── instrument-panel.js # 乐器面板与静音控制
├── assets/midi/            # MIDI 文件目录（不包含在仓库中）
└── LICENSE                 # GPL-3.0
```

## 键盘映射

```
低八度 (C3-B3):
Z  S  X  D  C  V  G  B  H  N  J  M
C  C# D  D# E  F  F# G  G# A  A# B

高八度 (C4-B4):
Q  2  W  3  E  R  5  T  6  Y  7  U
C  C# D  D# E  F  F# G  G# A  A# B

← → 切换八度范围
空格 播放/暂停
鼠标滚轮 缩放钢琴视角
```

## 声明

本项目代码由 AI 辅助生成。

## 许可证

[GPL-3.0](LICENSE)
