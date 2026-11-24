# Prototype walkthroughs (throwaway)

How the narrated walkthrough videos for the Debrief (#147) and Analytics (#148) prototypes were made. The videos are in a private artifact owned by the project owner. These are the tools and the pages, kept so the next prototype can reuse the pipeline. macOS only.

1. Start the prototype: `pnpm exec vite --port=3147 --strictPort`.
2. Record: `node prototype-walkthroughs/narrate.mjs <out-dir>` (versions A–C) or `narrateD.mjs` (D · Together).
   - Playwright records 1280×800 video.
   - A yellow spotlight (`#vo-hl`), a caption (`#vo-cap`) and a label (`#vo-tag`) are injected on the page.
   - The narration is spoken with `say -v Samantha -r 178` and converted to WAV with `afconvert`.
   - Each line's start time goes into `marks.json`.
3. `python3 prototype-walkthroughs/mix.py <out-dir>` places the clips at their marks in one `voice.wav`.
4. Dump the video's frames to PNG with Playwright's bundled ffmpeg. It has png and VP9 encoders but no audio or H.264 encoder.
5. `swiftc -O prototype-walkthroughs/mux.swift -o mux`, then run `mux` on the frames and `voice.wav` to get one H.264 + AAC MP4. The audio is interleaved with the frames; writing all the video first deadlocks AVAssetWriter.
6. `grab.swift` pulls a frame from the MP4 to check it.

Artifact uploads must stay under 15 MB per file, and a `.mp4` is published with no content type. `debrief-prototype.html` and `analytics-prototype.html` are the artifact pages, with chapter buttons.

The typing is the beginner model in `src/screens/debriefPrototype/beginner.ts`: about 12 WPM and about 93% accuracy.
