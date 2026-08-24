#!/Users/rashmianand/.local/state/fnm_multishells/85151_1787032433894/bin/node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const SONGS_DIR = path.join(__dirname, "songs");

let allSongs = [];
let cursor = 0;
let currentProcess = null;

// -----------------------------
// LIST / RENDER SONGS
// -----------------------------
function listSongs(songDirPath) {

    allSongs = fs.readdirSync(songDirPath)
        .filter(songName => songName.endsWith(".mp3"));

    // Move cursor to top-left
    process.stdout.write("\x1b[H");

    const menuText = allSongs
        .map((songName, index) => {
            return `${index === cursor ? ">" : " "} ${songName}`;
        })
        .join("\n");

    // Clear old menu and write new menu
    process.stdout.write(menuText);
    process.stdout.write("\x1b[J");
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

    // Move below menu
    process.stdout.write("\n\n");
    process.stdout.write(`▶ Playing: ${songName}\n`);

    currentProcess = spawn("afplay", [songPath]);

    currentProcess.on("close", () => {
        currentProcess = null;

        // Return to menu
        listSongs(SONGS_DIR);
    });
}

// -----------------------------
// KEYBOARD INPUT
// -----------------------------
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");

// process.stdin.on("data", (key) => {
    

//     // -------------------------
//     // UP → PREVIOUS
//     // -------------------------
//     if (key === "\u001b[A") {

//         cursor--;

//         // Loop: first → last
//         if (cursor < 0) {
//             cursor = allSongs.length - 1;
//         }

//         listSongs(SONGS_DIR);
//     }

//     // -------------------------
//     // DOWN → NEXT
//     // -------------------------
//     else if (key === "\u001b[B") {

//         cursor++;

//         // Loop: last → first
//         if (cursor >= allSongs.length) {
//             cursor = 0;
//         }

//         listSongs(SONGS_DIR);
//     }

//     // -------------------------
//     // ENTER → PLAY
//     // -------------------------
//     else if (key === "\r" || key === "\n") {

//         const selectedSong = allSongs[cursor];

//         playSong(selectedSong);
//     }

//     // -------------------------
//     // Q → QUIT
//     // -------------------------
//     else if (key === "q") {

//         if (currentProcess) {
//             currentProcess.kill();
//         }

//         process.stdin.setRawMode(false);
//         process.stdin.pause();

//         process.stdout.write("\x1b[2J");
//         process.stdout.write("\x1b[H");

//         process.exit(0);
//     }
// });

// // -----------------------------
// // START PLAYER
// // -----------------------------

// // Clear terminal once at start
// process.stdout.write("\x1b[2J");
// process.stdout.write("\x1b[H");

process.stdin.on("data", (key) => {
    // N → NEXT SONG + PLAY
    if (key === "n") {

        cursor++;

        if (cursor >= allSongs.length) {
            cursor = 0;
        }

        listSongs(SONGS_DIR);
        playSong(allSongs[cursor]);
    }
    // B → PREVIOUS SONG + PLAY
    else if (key === "b") {

        cursor--;

        if (cursor < 0) {
            cursor = allSongs.length - 1;
        }

        listSongs(SONGS_DIR);
        playSong(allSongs[cursor]);
    }

    // Q → QUIT
    else if (key === "q") {

        if (currentProcess) {
            currentProcess.kill();
        }

        process.stdin.setRawMode(false);
        process.stdin.pause();

        process.stdout.write("\x1b[2J");
        process.stdout.write("\x1b[H");

        process.exit(0);
    }
});
listSongs(SONGS_DIR);