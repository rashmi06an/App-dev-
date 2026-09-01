#!/Users/rashmianand/.local/state/fnm_multishells/85151_1787032433894/bin/node

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const SONGS_DIR = path.join(__dirname, "songs");

let allSongs = [];
let cursor = 0;
let currentProcess = null;
let isPaused = false;

// Progress bar tracking variables
let songDuration = 0;
let startTime = 0;
let elapsedOffset = 0;
let intervalId = null;

// -----------------------------
// HELPER FOR PROGRESS BAR
// -----------------------------
function getSongDuration(songPath) {
    try {
        const output = execSync(`afinfo "${songPath}"`, { encoding: "utf8" });
        const match = output.match(/estimated duration:\s*([\d.]+)\s*sec/i);
        return match ? parseFloat(match[1]) : 0;
    } catch (err) {
        return 0;
    }
}

function renderProgressBar() {
    if (!currentProcess) return;

    let elapsed = elapsedOffset;
    if (!isPaused && startTime > 0) {
        elapsed += (Date.now() - startTime) / 1000;
    }
    elapsed = Math.min(elapsed, songDuration);

    const barLength = 20;
    const percent = songDuration > 0 ? Math.min(1, elapsed / songDuration) : 0;
    const filled = Math.round(barLength * percent);
    const empty = barLength - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);

    const formatTime = (sec) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    listSongs(SONGS_DIR);
    process.stdout.write(`\n${isPaused ? "⏸ Paused" : "▶ Playing"}: ${allSongs[cursor]}\n`);
    process.stdout.write(
        `Progress: [${bar}] ${Math.round(percent * 100)}% (${formatTime(elapsed)} / ${formatTime(songDuration)})\n`
    );
}

// -----------------------------
// LIST / RENDER SONGS
// -----------------------------
function listSongs(songDirPath) {
    allSongs = fs
        .readdirSync(songDirPath)
        .filter((songName) => songName.endsWith(".mp3"));

    // Move cursor to top-left
    process.stdout.write("\x1b[H");

    // Clear terminal
    process.stdout.write("\x1b[2J");

    const menuText = allSongs
        .map((songName, index) => {
            return `${index === cursor ? ">" : " "} ${songName}`;
        })
        .join("\n");

    process.stdout.write(menuText);

    process.stdout.write("\n\n");
    process.stdout.write(
        "N = Next | B = Previous | P = Pause/Resume | Q = Quit\n"
    );
}

// -----------------------------
// PLAY SONG
// -----------------------------
function playSong(songName) {
    const songPath = path.join(SONGS_DIR, songName);

    // Stop currently playing song & clear interval
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    if (currentProcess) {
        currentProcess.removeAllListeners("close");
        try {
            currentProcess.stdin.write("quit\n");
        } catch (e) {}
        currentProcess.kill("SIGKILL");
        currentProcess = null;
    }

    // Reset pause & progress state
    isPaused = false;
    songDuration = getSongDuration(songPath);
    startTime = Date.now();
    elapsedOffset = 0;

    // Start VLC
    currentProcess = spawn("/Applications/VLC.app/Contents/MacOS/VLC", [
        "-I",
        "rc",
        "--play-and-exit",
        songPath,
    ]);

    // Start timer interval for progress bar
    renderProgressBar();
    intervalId = setInterval(renderProgressBar, 500);

    // When song finishes
    currentProcess.on("close", () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        currentProcess = null;
        isPaused = false;

        // Automatically move to next song
        cursor++;

        if (cursor >= allSongs.length) {
            cursor = 0;
        }

        playSong(allSongs[cursor]);
    });
}

// -----------------------------
// KEYBOARD INPUT
// -----------------------------
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");

process.stdin.on("data", (key) => {
    // -------------------------
    // N → NEXT SONG + PLAY
    // -------------------------
    if (key === "n") {
        cursor++;

        if (cursor >= allSongs.length) {
            cursor = 0;
        }

        playSong(allSongs[cursor]);
    }

    // -------------------------
    // B → PREVIOUS SONG + PLAY
    // -------------------------
    else if (key === "b") {
        cursor--;

        if (cursor < 0) {
            cursor = allSongs.length - 1;
        }

        playSong(allSongs[cursor]);
    }

    // -------------------------
    // P → PAUSE / RESUME
    // -------------------------
    else if (key === "p") {
        // No song playing
        if (!currentProcess) {
            return;
        }

        // Currently playing → PAUSE
        if (!isPaused) {
            currentProcess.stdin.write("pause\n");
            elapsedOffset += (Date.now() - startTime) / 1000;
            isPaused = true;
        }

        // Currently paused → RESUME
        else {
            currentProcess.stdin.write("pause\n");
            startTime = Date.now();
            isPaused = false;
        }

        renderProgressBar();
    }

    // -------------------------
    // Q → QUIT
    // -------------------------
    else if (key === "q") {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }

        // Stop music
        if (currentProcess) {
            currentProcess.removeAllListeners("close");
            try {
                currentProcess.stdin.write("quit\n");
            } catch (e) {}
            currentProcess.kill("SIGKILL");
            currentProcess = null;
        }

        // Restore normal terminal input
        process.stdin.setRawMode(false);
        process.stdin.pause();

        // Clear terminal
        process.stdout.write("\x1b[2J");
        process.stdout.write("\x1b[H");

        process.exit(0);
    }
});

// -----------------------------
// START PLAYER
// -----------------------------

// Clear terminal
process.stdout.write("\x1b[2J");
process.stdout.write("\x1b[H");

// Load songs
listSongs(SONGS_DIR);
