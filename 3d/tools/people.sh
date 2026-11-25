#!/bin/sh
# every motion in fbx/anims goes onto both bodies; then packed small and written as JSON glTF for the page
set -e
cd /tmp/pp
A=$(ls /home/claude/sosed3d/fbx/anims/*.fbx | xargs -n1 basename | sed 's/\.fbx$//' | tr '\n' ' ')
node convert.mjs $A 2>&1 | grep -E "clip_|err" || true
for n in boss aj; do node pack.mjs /home/claude/sosed3d/raw/$n.glb /home/claude/sosed3d/models/$n.glb 1024 >/dev/null 2>&1; node tojson.mjs /home/claude/sosed3d/models/$n.glb /home/claude/sosed3d/models/$n.json; done
