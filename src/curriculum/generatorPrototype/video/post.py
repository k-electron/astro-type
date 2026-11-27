# PROTOTYPE: turns one recording into an MP4 with the voice inside (#189).
# Fast-forward spans keep every k-th frame; each voice clip is placed where its
# line started, on the shortened timeline.
# Usage: python3 post.py <out dir> <mp4 path>
import json, os, subprocess, sys, wave
d, mp4 = sys.argv[1], sys.argv[2]
FPS = 25
m = json.load(open(f'{d}/marks.json'))
spans = m['ff']

def out_t(t):
    cut = 0.0
    for s in spans:
        if t <= s['a']: break
        inside = min(t, s['b']) - s['a']
        cut += inside * (1 - 1 / s['k'])
    return t - cut

RATE = 22050
total = int((out_t(m['total']) + 2) * RATE)
buf = bytearray(total * 2)
for mark in m['marks']:
    w = wave.open(f"{d}/clips/{mark['i']}.wav")
    fr = w.readframes(w.getnframes())
    start = int(out_t(mark['t']) * RATE) * 2
    end = min(len(buf), start + len(fr))
    buf[start:end] = fr[: end - start]
o = wave.open(f'{d}/voice.wav', 'wb'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(RATE); o.writeframes(bytes(buf)); o.close()

keep = '+'.join([f"not({'+'.join(f'between(t,{s['a']:.3f},{s['b']:.3f})' for s in spans)})"] +
                [f"between(t,{s['a']:.3f},{s['b']:.3f})*not(mod(n,{s['k']}))" for s in spans]) if spans else '1'
vf = f"fps={FPS},select='{keep}',setpts=N/{FPS}/TB"
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', m['path'], '-i', f'{d}/voice.wav', '-vf', vf,
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-pix_fmt', 'yuv420p', '-tune', 'animation',
                '-c:a', 'aac', '-b:a', '64k', '-shortest', '-movflags', '+faststart', mp4], check=True)
print(os.path.basename(mp4), f'{out_t(m["total"]):.1f}s', f'{os.path.getsize(mp4) / 1e6:.1f}MB')
