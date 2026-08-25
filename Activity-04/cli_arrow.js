#!/Users/rashmianand/.local/state/fnm_multishells/85151_1787032433894/bin/node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const SONGS_DIR = path.join(__dirname, "songs");

let allSongs = [];
let cursor = 0;
let currentProcess = null;
let isPaused = false;

// -----------------------------
// LIST / RENDER SONGS
// -----------------------------
function listSongs(songDirPath) {

    allSongs = fs.readdirSync(songDirPath)
        .filter(songName => songName.endsWith(".mp3"));

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

    // Stop currently playing song
    if (currentProcess) {
        currentProcess.kill();
        currentProcess = null;
    }

    // Reset pause state
    isPaused = false;

    // Render menu
    listSongs(SONGS_DIR);

    // Show currently playing song
    process.stdout.write(`\n▶ Playing: ${songName}\n`);

    // Start VLC
    // currentProcess = spawn("afplay", [songPath]);
currentProcess = spawn(
    "/Applications/VLC.app/Contents/MacOS/VLC",
    [
        "--intf",
        "dummy",
        "--play-and-exit",
        songPath
    ]
);
    // When song finishes
    currentProcess.on("close", () => {

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

            currentProcess.kill("SIGSTOP");

            isPaused = true;

            process.stdout.write("\n⏸ Paused\n");
        }

        // Currently paused → RESUME
        else {

            currentProcess.kill("SIGCONT");

            isPaused = false;

            process.stdout.write("\n▶ Resumed\n");
        }
    }


    // -------------------------
    // Q → QUIT
    // -------------------------
    else if (key === "q") {

        // Stop music
        if (currentProcess) {
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