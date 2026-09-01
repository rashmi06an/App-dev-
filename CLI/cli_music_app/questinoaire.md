# Understanding Questionnaire — CLI Music Player

**1. Your first arrow-navigation version printed the song list again and again. Why did that happen, and how did you make the list redraw in the same place?**

In the early version (Activity-02), every time an arrow key was pressed, we called `console.log()` to print the song list. The problem is that `console.log` always adds new lines at the bottom of the terminal — it doesn't know where the previous list was. So every keypress pushed a fresh copy of the list below the old one, making it scroll endlessly.

The fix was to use ANSI escape codes before drawing the list. We write `\x1b[2J` to clear the entire screen and `\x1b[H` to move the cursor back to the very top-left (home) position. Now every redraw wipes the old content first and prints the fresh list starting from the same spot — so it looks like the list is just updating in place.

**2. Why do we need both cursor movement and line clearing while redrawing the terminal UI? What problem can happen if we only move the cursor?**

Moving the cursor (`\x1b[H`) only tells the terminal "start writing from the top." But if the old text is still there and your new text is shorter (say, fewer songs), the leftover characters from the previous render will still be visible on screen. You'd end up with a messy overlap — new content on top of old content.

Clearing the screen (`\x1b[2J`) wipes everything first. Together, they give us a clean slate every single time we redraw. Think of it like an Etch-a-Sketch — you shake it before drawing again, not just move your hand back to the corner.

Note: it is also possible to clear individual lines rather than the entire screen, but using `\x1b[2J` followed by `\x1b[H` is the simplest and most reliable approach for our implementation.

**3. What does the selected-song variable represent? How do you make sure the user cannot move above the first song or below the last song?**

In our app, `cursor` is the index of the song the user is currently highlighting in the list. It is not the song being played — it is just where the selection pointer (`>`) is sitting.

To prevent the cursor from becoming an invalid array index, we use wrap-around logic:

When pressing Up:
```js
if (cursor === 0) {
    cursor = songs.length - 1;
} else {
    cursor--;
}
```

When pressing Down:
```js
if (cursor === songs.length - 1) {
    cursor = 0;
} else {
    cursor++;
}
```

This gives a circular navigation experience — you can keep pressing down and it loops back to the top. JavaScript arrays do not throw an exception for out-of-bounds access, they simply return `undefined`, so the wrap-around logic is what keeps the selection meaningful and safe.

**4. Why was `afplay + SIGSTOP/SIGCONT` not a reliable solution for a real pause/resume feature? What changed in your final approach?**

`afplay` does not provide a native pause or resume command. The only way to freeze it was to suspend the entire OS process using `SIGSTOP` and then resume it with `SIGCONT`. While this technically works, it is brittle — it is an OS-level hack, not a music player feature, and it is not portable or clean.

In the final version, we switched to VLC's Remote Control interface by launching it with the `-I rc` flag. This is what enables stdin-based control. The `--play-and-exit` flag is separate — it tells VLC to exit automatically after playback finishes, which handles auto-advance. The actual pause and quit commands come from `-I rc`, which allows our Node.js process to send commands such as `pause` and `quit` through VLC's standard input. This is a proper IPC-based solution — we are communicating with VLC the way it was designed to be controlled.

**5. How would you prove that your pause/resume implementation is correct? Describe a small test you would perform.**

A simple test would be:

1. Start the app with `node index.js`.
2. Press **Enter** to play a song and wait for audio to start.
3. Note the progress bar position (e.g., at 20%).
4. Press **Space** — audio should pause at approximately 20%.
5. Wait 5 seconds without pressing anything — the position should remain at approximately 20%.
6. Press **Space** again — audio should resume from the same position, and the progress bar should continue ticking forward from ~20%.

What we are really testing is this chain:

```
Pause  →  time stops increasing  →  Resume  →  playback continues from same position
```

The key values being verified are that `elapsedOffset` was correctly saved at the moment of pause, and that `startTime` was correctly reset at the moment of resume — which is exactly what our code does.

**6. How is the progress percentage calculated? What should happen to the progress value while the song is paused?**

The elapsed playback time is calculated as:

```
elapsed = elapsedOffset + (Date.now() - startTime) / 1000
```

The progress percentage is then:

```
percent = (elapsed / songDuration) * 100
```

Note: dividing `elapsed` by `songDuration` alone gives a ratio between 0 and 1. Multiplying by 100 gives the actual percentage. For example:

```
elapsed = 30 seconds
duration = 120 seconds

30 / 120 = 0.25   ← ratio
0.25 × 100 = 25%  ← percentage
```

- `elapsedOffset` stores how much time had passed before the last pause.
- `Date.now() - startTime` measures how long we have been playing since the last resume.

While the song is **paused**, we stop adding new time to the equation. We freeze `elapsedOffset` at its current value and skip the `Date.now()` part entirely. This means the progress bar stays frozen at exactly the right position during a pause — it does not tick forward, and it does not jump or reset when resumed.

**7. When the user starts a new song while another song is already playing, what needs to be stopped or cleaned up? What could happen if you do not do this?**

Before starting a new song, we call `stopCurrentAudio()` which does the following:
- Sets `manualStop = true` so the old song's `close` event does not accidentally trigger auto-play.
- Clears the progress bar interval timer (`clearInterval`).
- Sends `"quit\n"` to VLC's stdin to close the current audio stream.
- Sets `audioProcess = null` to release the reference.

If we do not do this:
- **Two songs would play simultaneously** because a new VLC process starts while the old one is still running.
- The old song's `close` event could fire later and trigger auto-advance, skipping the song the user just chose.
- Orphaned processes and unnecessary resource usage can accumulate over time, especially in long sessions.

It is like changing the TV channel — you need to stop the current broadcast before switching, not just start a new one on top.

**8. Describe one bug or unexpected behaviour you faced while refining this application. What did you initially think was wrong, how did you investigate it, and what was the actual fix?**

One unexpected issue was that the application exited immediately instead of showing the interactive player — it printed the goodbye message and terminated right away.

We initially suspected a problem with the songs directory not being found, or the `main()` function not running correctly.

We investigated by tracing the execution flow step by step, adding debug output around `setupInputHandling()` and checking the value of `process.stdin.isTTY`. We found that the input setup was triggering an early exit when stdin was not detected as an interactive TTY, which happens when the program is run through certain piped or non-interactive environments.

The fix involved two things: ensuring the program is always run in a proper interactive terminal, and making sure `renderUI()` is called before `setupInputHandling()` in `main()`, so the UI always renders before input initialization is attempted.

**9. If you had to add "jump forward 10 seconds" next, which part of your current application would you change and what existing playback information would you reuse?**

To add a "jump forward 10 seconds" feature, the changes would be:

**What to change:**
- **Keyboard handler** — add a binding for the Right Arrow key (`\u001b[C`) to trigger the seek.
- **A new `seekForward()` function** — this would calculate the current playback position, add 10 seconds, cap it at `songDuration` so we do not go past the end, stop the current VLC process, and re-launch VLC from the new position using VLC's `--start-time=<seconds>` flag.

**What to reuse:**
- `elapsedOffset` — already tracks how far into the song we are, so it gives us our current position.
- `songDuration` — already fetched via `afinfo`, used to cap the seek value.
- The existing `stopCurrentAudio()` and `playSong()` cleanup logic — to safely stop and restart VLC.

**Important detail:** after restarting VLC at the new position, we must also reset `startTime = Date.now()` so the progress calculation continues correctly from that point. If we forget this step, the elapsed time calculation will be wrong because it would still be measuring time from the old `startTime`.

So the core of `seekForward()` would look something like:

```js
function seekForward() {
    if (!isPlaying) return;
    let currentPosition = elapsedOffset + (Date.now() - startTime) / 1000;
    elapsedOffset = Math.min(currentPosition + 10, songDuration);
    // restart VLC from elapsedOffset using --start-time
    // then reset startTime = Date.now()
}
```
