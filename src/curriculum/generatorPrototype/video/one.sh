#!/bin/zsh
id=$1; cd ${0:a:h}; mkdir -p out/$id
node record.mjs $id out/$id > out/$id.log 2>&1 && python3 post.py out/$id out/$id.mp4 >> out/$id.log 2>&1 && echo "$id ok: $(tail -1 out/$id.log)" || echo "$id FAILED"
