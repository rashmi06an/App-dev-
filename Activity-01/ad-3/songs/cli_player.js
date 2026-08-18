#!/Users/rashmianand/.local/state/fnm_multishells/85151_1787032433894/bin/node
// const { spawn } = require("child_process");

// const SONGS_DIR = ".";

// let songs = [];

// // -----------------------------
// // LIST SONGS
// // -----------------------------
// function listSongs(directoryPath) {
//     const scanner = spawn("ls", [directoryPath]);

//     scanner.stdout.on("data", (data) => {
//         songs = data
//             .toString()
//             .split("\n")
//             .filter(song => song.trim() !== "")
//             .filter(song => song.endsWith(".mp3"));

//         console.log("\n🎵 My Music Player");
//         console.log("------------------");

//         songs.forEach((song, index) => {
//             console.log(`${index + 1}. ${song}`);
//         });

//         console.log("\nEnter song number:");
//     });

//     scanner.stderr.on("data", (data) => {
//         console.error(`Error: ${data}`);
//     });
// }

// // -----------------------------
// // PLAY SONG
// // -----------------------------
// function playSong(songPath) {
//     console.log(`\n▶️ Playing: ${songPath}`);

//     const player = spawn("afplay", [songPath]);

//     player.stderr.on("data", (data) => {
//         console.error(`Error playing song: ${data}`);
//     });

//     player.on("close", (code) => {
//         if (code === 0) {
//             console.log("\n✓ Song finished playing.");
//         } else {
//             console.log(`\nPlayer exited with code ${code}`);
//         }

//         console.log("\nEnter another song number:");
//     });
// }

// // -----------------------------
// // USER INPUT
// // -----------------------------
// process.stdin.on("data", (data) => {
//     const input = data.toString().trim();

//     const songNumber = Number(input);

//     if (songNumber >= 1 && songNumber <= songs.length) {

//         const selectedSong = songs[songNumber - 1];

//         playSong(`./${selectedSong}`);

//     } else {
//         console.log("❌ Invalid song number.");
//         console.log("Please enter a valid song number:");
//     }
// });

// // -----------------------------
// // START APP
// // -----------------------------
// listSongs(SONGS_DIR);

// by introducing path and fs
// by introducing path and fs
// by introducing path and fs
// by introducing path and fs

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const SONGS_DIR = path.join(__dirname, ".");

let songs = [];

// -----------------------------
// LIST SONGS
// -----------------------------
function listSongs(directoryPath) {
    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            console.error("Error reading songs folder:", err);
            return;
        }
        songs = files.filter(file => file.endsWith(".mp3"));

        console.log("\n🎵 My Music Player");
        console.log("------------------");

        songs.forEach((song, index) => {
            console.log(`${index + 1}. ${song}`);
        });

        console.log("\nEnter song number:");
    });
}


// -----------------------------
// PLAY SONG
// -----------------------------
function playSong(songName) {
    const songPath = path.join(SONGS_DIR, songName);
    console.log(`\n▶️ Playing: ${songName}`);
    const player = spawn("afplay", [songPath]);
    player.stderr.on("data", (data) => {
        console.error(`Error playing song: ${data}`);
    });

    player.on("close", (code) => {

        if (code === 0) {
            console.log("\n✓ Song finished playing.");
        } else {
            console.log(`\nPlayer exited with code ${code}`);
        }

        console.log("\nEnter another song number:");
    });
}


// -----------------------------
// USER INPUT
// -----------------------------
process.stdin.on("data", (data) => {

    const input = data.toString().trim();

    const songNumber = Number(input);

    if (songNumber >= 1 && songNumber <= songs.length) {

        const selectedSong = songs[songNumber - 1];

        playSong(selectedSong);

    } else {

        console.log("❌ Invalid song number.");
        console.log("Please enter a valid song number:");

    }
});


// -----------------------------
// START APP
// -----------------------------
listSongs(SONGS_DIR);