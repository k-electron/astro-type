import json, sys, wave
d = sys.argv[1]
m = json.load(open(f'{d}/marks.json'))
RATE = 22050
OFFSET = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
total = int((m['total'] + 2) * RATE)
buf = bytearray(total * 2)
for mark in m['marks']:
    w = wave.open(f"{d}/clips/{mark['i']}.wav")
    frames = w.readframes(w.getnframes())
    start = int((mark['t'] + OFFSET) * RATE) * 2
    buf[start:start + len(frames)] = frames
out = wave.open(f'{d}/voice.wav', 'wb')
out.setnchannels(1); out.setsampwidth(2); out.setframerate(RATE)
out.writeframes(bytes(buf)); out.close()
print('ok', len(m['marks']), 'clips', round(total / RATE, 1), 's')
