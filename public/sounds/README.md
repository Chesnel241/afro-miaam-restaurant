# Admin notification sounds

Drop a small (~50–200 KB) `.wav` or `.mp3` here named **`new-order.wav`** to
get an audible chime when a new order arrives in the admin dashboard.

If the file is missing the dashboard simply doesn't play anything — the
`<audio>.play()` promise rejects and is silently caught.

Recommended formats:
- WAV (uncompressed, ~100 KB) for instant playback
- MP3 (smaller, slight decode delay)

Suggested chimes (royalty-free, you must download yourself):
- https://mixkit.co/free-sound-effects/notification/
- https://freesound.org/browse/tags/notification/
