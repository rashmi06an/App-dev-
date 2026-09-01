# CLI Music Player

A fully interactive, terminal-based music player built with **Node.js** — no frameworks, no npm packages, just the Node.js standard library and VLC.

Navigate songs, play, pause, skip tracks, and watch a real-time progress bar — all from your terminal.

---

## Features

- **Auto song discovery** — scans your `./songs` folder for `.mp3` files automatically
- **Arrow key navigation** — move through your playlist with keyboard
- **Play on Enter** — instantly start the highlighted song
- **Pause / Resume** — toggle with `Space` or `P`, powered by VLC's stdin control
- **Next / Previous** — skip tracks instantly with `N` and `B`
- **Live progress bar** — real-time ASCII progress with elapsed and total time
- **Auto-advance** — automatically plays the next song when one finishes
- **Clean exit** — restores terminal to its original state on quit

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) installed
- [VLC media player](https://www.videolan.org/vlc/) installed at `/Applications/VLC.app` (macOS)

### Setup

1. Clone or download this folder.
2. Add your `.mp3` files to the `songs/` directory:
   ```
   cli_music_app/
   └── songs/
       ├── song1.mp3
       ├── song2.mp3
       └── song3.mp3
   ```
3. Run the player:
   ```bash
   node index.js
   ```

---

## Controls

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate up and down the song list |
| `Enter` | Play the selected song |
| `Space` or `P` | Pause / Resume playback |
| `N` | Skip to next track |
| `B` | Go back to previous track |
| `Q` or `Ctrl+C` | Quit the application |

---

## Progress Bar

While a song is playing, you'll see a live progress display:

```
PLAYING: Darshan_Raval_-_Tera_Zikr.mp3
Progress: [████████████░░░░░░░░░░░░] 50% (01:45 / 03:30)
```

The bar updates every 500ms using time tracking that correctly freezes during pause and resumes from the exact same position.

---

## Project Structure

```
cli_music_app/
├── index.js          <- Core application logic
├── architecture.md   <- System architecture diagram
├── questinoaire.md   <- Development Q&A and learning notes
├── README.md         <- This file
└── songs/            <- Drop your .mp3 files here
```

---

## How It Works

The app is built using three core Node.js primitives:

- **`fs`** — reads the songs directory
- **`child_process`** — spawns VLC in Remote Control mode (`-I rc --play-and-exit`) and communicates with it via stdin commands (`pause`, `quit`)
- **`process.stdin`** — set to raw mode to capture every keypress immediately, including arrow keys encoded as ANSI escape sequences

VLC is controlled entirely via its stdin interface — no OS process signals (`SIGSTOP`, `SIGKILL`, etc.) are used.

---

## Built With

- Node.js (built-in modules only)
- VLC Media Player (Remote Control Interface)

---

## Learning Context

This project was built progressively across four activities:

| Activity | Concept Introduced |
|---|---|
| Activity-01 | Basic song listing with `fs`, spawning `afplay` |
| Activity-02 | Raw mode stdin, ANSI escape codes for arrow keys |
| Activity-03 | Pause/resume state management |
| Activity-04 | VLC RC interface, progress bar, auto-advance |

The `cli_music_app` is the final integrated version combining everything.
