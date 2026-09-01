#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

// -----------------------------------------------------------------------------
// CONFIGURATION & GLOBAL STATE
// -----------------------------------------------------------------------------
const SONGS_DIR = path.join(__dirname, "songs");

// Ensure the songs directory exists
if (!fs.existsSync(SONGS_DIR)) {
    fs.mkdirSync(SONGS_DIR, { recursive: true });
}

let songs = [];
let cursor = 0;
let currentPlayingIndex = -1;

// Playback process state
let audioProcess = null;
let isPaused = false;
let isPlaying = false;
let manualStop = false;

// Progress bar tracking
let songDuration = 0;
let startTime = 0;
let elapsedOffset = 0;
let progressInterval = null;

// -----------------------------------------------------------------------------
// DURATION EXTRACTION (afinfo helper for macOS)
// -----------------------------------------------------------------------------
function getSongDuration(songPath) {
    try {
        const output = execSync(`afinfo "${songPath}"`, { encoding: "utf8" });
        const match = output.match(/estimated duration:\s*([\d.]+)\s*sec/i) ||
                      output.match(/([\d.]+)\s*sec/i);
        return match ? parseFloat(match[1]) : 0;
    } catch (err) {
        return 0;
    }
}

// Format seconds into MM:SS
function formatTime(sec) {
    if (isNaN(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// -----------------------------------------------------------------------------
// SONGS DISCOVERY
// -----------------------------------------------------------------------------
function loadSongs() {
    try {
        songs = fs
            .readdirSync(SONGS_DIR)
            .filter((file) => file.toLowerCase().endsWith(".mp3"))
            .sort();
    } catch (err) {
        songs = [];
    }
}

// -----------------------------------------------------------------------------
// UI TERMINAL RENDERER
// -----------------------------------------------------------------------------
function renderUI() {
    // Clear terminal screen and reset cursor to home
    process.stdout.write("\x1b[2J");
    process.stdout.write("\x1b[H");

    process.stdout.write("🎵 CLI Music Player (Integrated Application)\n");
    process.stdout.write("=============================================\n\n");

    if (songs.length === 0) {
        process.stdout.write("⚠️  No .mp3 songs found in ./songs directory.\n");
        process.stdout.write("Please add .mp3 files to the ./songs folder and restart.\n\n");
        process.stdout.write("Press Q or Ctrl+C to quit.\n");
        return;
    }

    // Render song playlist menu
    songs.forEach((song, idx) => {
        const isCursorHere = idx === cursor;
        const isCurrentlyPlayingTrack = idx === currentPlayingIndex;

        let prefix = "  ";
        if (isCursorHere) {
            prefix = "> ";
        }

        let stateIcon = " ";
        if (isCurrentlyPlayingTrack) {
            stateIcon = isPaused ? "⏸ " : "▶ ";
        }

        const line = `${prefix}${stateIcon}${idx + 1}. ${song}`;
        if (isCursorHere) {
            process.stdout.write(`\x1b[36m\x1b[1m${line}\x1b[0m\n`); // Cyan bold for selection cursor
        } else if (isCurrentlyPlayingTrack) {
            process.stdout.write(`\x1b[32m${line}\x1b[0m\n`); // Green for playing track
        } else {
            process.stdout.write(`${line}\n`);
        }
    });

    process.stdout.write("\n---------------------------------------------\n");

    // Render progress bar if a track is actively playing or paused
    if (isPlaying && currentPlayingIndex >= 0 && currentPlayingIndex < songs.length) {
        let elapsed = elapsedOffset;
        if (!isPaused && startTime > 0) {
            elapsed += (Date.now() - startTime) / 1000;
        }
        if (songDuration > 0) {
            elapsed = Math.min(elapsed, songDuration);
        }

        const barLength = 24;
        const percent = songDuration > 0 ? Math.min(1, elapsed / songDuration) : 0;
        const filled = Math.round(barLength * percent);
        const empty = barLength - filled;
        const progressBar = "█".repeat(filled) + "░".repeat(empty);

        const statusLabel = isPaused ? "⏸ PAUSED" : "▶ PLAYING";
        const currentSongName = songs[currentPlayingIndex];

        process.stdout.write(`${statusLabel}: ${currentSongName}\n`);
        process.stdout.write(
            `Progress: [${progressBar}] ${Math.round(percent * 100)}% (${formatTime(elapsed)} / ${formatTime(songDuration)})\n`
        );
        process.stdout.write("---------------------------------------------\n");
    }

    // Render keybindings control footer
    process.stdout.write("\n🎮 CONTROLS:\n");
    process.stdout.write("  ↑ / ↓      : Navigate songs\n");
    process.stdout.write("  Enter      : Play selected song\n");
    process.stdout.write("  Space / P  : Pause / Resume\n");
    process.stdout.write("  N          : Next track\n");
    process.stdout.write("  B          : Previous track\n");
    process.stdout.write("  Q / Ctrl+C : Quit application\n\n");
}

// -----------------------------------------------------------------------------
// PLAYBACK ENGINE
// -----------------------------------------------------------------------------
function stopCurrentAudio() {
    manualStop = true;
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    if (audioProcess) {
        audioProcess.removeAllListeners("close");
        try {
            audioProcess.stdin.write("quit\n");
        } catch (e) {}
        audioProcess = null;
    }
    isPlaying = false;
    isPaused = false;
}

function playSong(index) {
    if (songs.length === 0) return;

    // Bounds safety
    if (index < 0) index = songs.length - 1;
    if (index >= songs.length) index = 0;

    stopCurrentAudio();
    manualStop = false;

    currentPlayingIndex = index;
    cursor = index;

    const selectedSong = songs[currentPlayingIndex];
    const songPath = path.join(SONGS_DIR, selectedSong);

    // Duration metadata
    songDuration = getSongDuration(songPath);
    startTime = Date.now();
    elapsedOffset = 0;
    isPaused = false;
    isPlaying = true;

    // Spawn VLC process in Remote Control (rc) mode (matching Activity-04)
    const vlcPath = fs.existsSync("/Applications/VLC.app/Contents/MacOS/VLC")
        ? "/Applications/VLC.app/Contents/MacOS/VLC"
        : "vlc";

    audioProcess = spawn(vlcPath, [
        "-I",
        "rc",
        "--play-and-exit",
        songPath,
    ]);

    // Update progress bar UI periodically
    renderUI();
    progressInterval = setInterval(() => {
        if (isPlaying) {
            renderUI();
        }
    }, 500);

    // Handle song completion
    audioProcess.on("close", (code) => {
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }

        // If the song ended naturally (not stopped manually to change track)
        if (!manualStop) {
            isPlaying = false;
            isPaused = false;
            audioProcess = null;

            // Auto-play next song
            const nextIndex = (currentPlayingIndex + 1) % songs.length;
            playSong(nextIndex);
        }
    });

    audioProcess.on("error", (err) => {
        // Fallback or error handling
        renderUI();
    });
}

function togglePauseResume() {
    if (!isPlaying || !audioProcess) return;

    if (!isPaused) {
        // Send pause command to VLC stdin (Remote Control interface)
        try {
            audioProcess.stdin.write("pause\n");
        } catch (e) {}
        elapsedOffset += (Date.now() - startTime) / 1000;
        isPaused = true;
    } else {
        // Send resume command to VLC stdin (Remote Control interface)
        try {
            audioProcess.stdin.write("pause\n");
        } catch (e) {}
        startTime = Date.now();
        isPaused = false;
    }

    renderUI();
}

function nextSong() {
    if (songs.length === 0) return;
    const nextIdx = (currentPlayingIndex >= 0 ? currentPlayingIndex + 1 : cursor + 1) % songs.length;
    playSong(nextIdx);
}

function prevSong() {
    if (songs.length === 0) return;
    const prevIdx = (currentPlayingIndex >= 0 ? currentPlayingIndex - 1 + songs.length : cursor - 1 + songs.length) % songs.length;
    playSong(prevIdx);
}

// -----------------------------------------------------------------------------
// CLEANUP & EXIT HANDLER
// -----------------------------------------------------------------------------
function cleanupAndExit() {
    stopCurrentAudio();

    // Restore terminal settings & cursor
    if (process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
    }
    process.stdin.pause();

    process.stdout.write("\x1b[?25h"); // Show cursor
    process.stdout.write("\x1b[2J");   // Clear screen
    process.stdout.write("\x1b[H");    // Move cursor top-left

    console.log("👋 Thanks for using CLI Music Player! Goodbye.");
    process.exit(0);
}

// -----------------------------------------------------------------------------
// KEYBOARD INPUT PROCESSOR
// -----------------------------------------------------------------------------
function setupInputHandling() {
    if (!process.stdin.isTTY) {
        console.error("Error: Terminal must be interactive (TTY) to run CLI Music Player.");
        process.exit(1);
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    // Hide terminal cursor for cleaner UI display
    process.stdout.write("\x1b[?25l");

    process.stdin.on("data", (key) => {
        // Ctrl+C (0x03)
        if (key === "\u0003") {
            cleanupAndExit();
            return;
        }

        // Arrow Key Detection (\x1b[A for Up, \x1b[B for Down)
        if (key === "\u001b[A") {
            // Up Arrow
            if (songs.length > 0) {
                cursor = cursor > 0 ? cursor - 1 : songs.length - 1;
                renderUI();
            }
            return;
        } else if (key === "\u001b[B") {
            // Down Arrow
            if (songs.length > 0) {
                cursor = cursor < songs.length - 1 ? cursor + 1 : 0;
                renderUI();
            }
            return;
        }

        const lowerKey = key.toLowerCase();

        switch (lowerKey) {
            case "\r":
            case "\n":
                // Enter key -> Play selected song
                if (songs.length > 0) {
                    playSong(cursor);
                }
                break;

            case " ":
            case "p":
                // Space or P -> Pause/Resume
                togglePauseResume();
                break;

            case "n":
                // N -> Next track
                nextSong();
                break;

            case "b":
                // B -> Previous track
                prevSong();
                break;

            case "q":
                // Q -> Quit
                cleanupAndExit();
                break;
        }
    });

    // Handle unexpected termination signals
    process.on("SIGINT", cleanupAndExit);
    process.on("SIGTERM", cleanupAndExit);
}

// -----------------------------------------------------------------------------
// APPLICATION INITIALIZATION
// -----------------------------------------------------------------------------
function main() {
    loadSongs();
    renderUI();
    setupInputHandling();
}

main();
