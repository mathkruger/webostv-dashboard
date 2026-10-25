#!/bin/sh
# Dashboard wake watcher: launches the dashboard when the TV resumes from standby.
# Started at boot by /var/lib/webosbrew/startup.sh; safe to run only once.

PATH=/usr/bin:/bin:/usr/sbin:/sbin
export PATH

APP="com.mathkruger.dashboard"
LOG="/var/lib/webosbrew/dashboard-wake.log"
PIDFILE="/var/run/dashboard-wake.pid"

log_line() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"
}

if [ -f "$PIDFILE" ]; then
  old="$(cat "$PIDFILE" 2>/dev/null)"
  if [ -n "$old" ] && kill -0 "$old" 2>/dev/null && grep -q 'dashboard-wake.sh' "/proc/$old/cmdline" 2>/dev/null; then
    log_line "already running pid=$old"
    exit 0
  fi
fi
echo "$$" > "$PIDFILE"
log_line "start pid=$$ v2"

cleanup() {
  [ -n "$SUB_PID" ] && kill "$SUB_PID" 2>/dev/null
  if [ "$(cat "$PIDFILE" 2>/dev/null)" = "$$" ]; then
    rm -f "$PIDFILE"
  fi
  log_line "stop pid=$$"
  exit 0
}
trap cleanup INT TERM HUP

while true; do
  /usr/bin/tail -f /dev/null | /usr/bin/luna-send -i luna://com.webos.service.tvpower/power/getPowerState '{"subscribe":true}' 2>>"$LOG" | while IFS= read -r line; do
    log_line "power: $line"
    case "$line" in
      *'"state": "Suspend"'*|*'"state":"Suspend"'*)
        armed=1
        ;;
      *'"state": "Active"'*|*'"state":"Active"'*)
        if [ "$armed" = "1" ]; then
          armed=0
          log_line "wake detected; launching $APP"
          sleep 3
          i=0
          while [ "$i" -lt 5 ]; do
            i=$((i + 1))
            out="$(/usr/bin/luna-send -n 1 luna://com.webos.applicationManager/launch "{\"id\":\"$APP\",\"params\":{}}" 2>&1)"
            log_line "launch try $i: $out"
            case "$out" in
              *'"returnValue":true'*) break ;;
            esac
            sleep 2
          done
        fi
        ;;
    esac
  done
  log_line "subscription ended; retrying in 5s"
  sleep 5
done
