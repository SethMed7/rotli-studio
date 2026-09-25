#!/bin/zsh
# Start rotli studio if it isn't running, then open it in the browser.
cd "$(dirname "$0")"
if ! /usr/bin/curl -s -o /dev/null http://127.0.0.1:4500/api/posts; then
  nohup bun server.ts > /tmp/rotli-studio.log 2>&1 &
  for i in {1..30}; do /usr/bin/curl -s -o /dev/null http://127.0.0.1:4500/api/posts && break; sleep 0.2; done
fi
open http://127.0.0.1:4500/
