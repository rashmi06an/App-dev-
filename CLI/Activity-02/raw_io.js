
// process.stdin.setRawMode(true);
// process.stdin.on('data', (data) => {
//     console.log(data.toString(),data)
//     if(data[0] === 0x03) { 
//         console.log('Exiting...');
//         process.exit(0);
//     }
//     if (data[0] === 0x1b && data[1] === 0x5b) { 
//         if (data[2] === 41) {
//             console.log('Up arrow pressed');
//         } else if (data[2] === 42) {
//             console.log('Down arrow pressed');
//         }
//     }
// })

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const SONGS_DIR = path.join(
    __dirname,
    "../Activity-01/ad-3/songs"
);;

let songs = [];
let userSelectionIndex = 0;

// -----------------------------
// LIST AVAILABLE SONGS
// -----------------------------
function listSongs(songDirectoryPath) {
    songs = fs
        .readdirSync(songDirectoryPath)
        .filter((file) => file.endsWith(".mp3"));

    // Clear terminal
    console.clear();

    console.log("🎵 My Music Player");
    console.log("------------------");

    songs.forEach((song, ind) => {
        if (ind === userSelectionIndex) {
            console.log(`> ${song}`);
        } else {
            console.log(`  ${song}`);
        }
    });

    console.log("\n↑ ↓ = Select");
    console.log("Enter = Play");
    console.log("Ctrl + C = Exit");
}

// -----------------------------
// PLAY SONG
// -----------------------------
function playSong(songFilePath) {
    console.log(`\n▶️ Playing: ${songFilePath}`);

    const play = spawn("afplay", [songFilePath]);

    play.on("close", (code) => {
        if (code === 0) {
            console.log("\n✓ Song finished playing.");
        } else {
            console.log(`\nPlayer exited with code ${code}`);
        }
    });
}

// -----------------------------
// INITIAL DISPLAY
// -----------------------------
listSongs(SONGS_DIR);

// -----------------------------
// TAKE USER INPUT
// -----------------------------
process.stdin.setRawMode(true);
process.stdin.resume();

process.stdin.on("data", (rawUserInput) => {

    // Enter key
    if (rawUserInput[0] === 0x0d) {
        console.log("\nUser selected");

        const selectedSong = songs[userSelectionIndex];

        playSong(SONGS_DIR + "/" + selectedSong);
    }

    // Ctrl + C
    else if (rawUserInput[0] === 0x03) {
        process.exit(0);
    }

    // Arrow keys
    else if (rawUserInput[0] === 0x1b) {

        // Check ESC [
        if (rawUserInput[1] === 0x5b) {

            // Up Arrow
            if (rawUserInput[2] === 0x41) {
                userSelectionIndex = Math.max(
                    0,
                    userSelectionIndex - 1
                );
            }

            // Down Arrow
            else if (rawUserInput[2] === 0x42) {
                userSelectionIndex = Math.min(
                    songs.length - 1,
                    userSelectionIndex + 1
                );
            }
        }
    }

    // Refresh song list
    listSongs(SONGS_DIR);
});
