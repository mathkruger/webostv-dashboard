#!/bin/sh
# Dashboard return watcher: brings the dashboard back when the user leaves an app
# launched from the dashboard. Installed and started by the Dashboard app through
# the Homebrew Channel while the "Voltar ao sair dos apps" option is enabled.

PATH=/usr/bin:/bin:/usr/sbin:/sbin
export PATH

APP="com.mathkruger.dashboard"
HOME_APP="com.webos.app.home"
LOG="/var/lib/webosbrew/dashboard-return.log"
PIDFILE="/var/run/dashboard-return.pid"
ARMED="/var/run/dashboard-return.armed"
PREV="/var/run/dashboard-return.prev"

log_line() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"
}

if [ -f "$PIDFILE" ]; then
  old="$(cat "$PIDFILE" 2>/dev/null)"
  if [ -n "$old" ] && kill -0 "$old" 2>/dev/null && grep -q 'dashboard-return.sh' "/proc/$old/cmdline" 2>/dev/null; then
    log_line "already running pid=$old"
    exit 0
  fi
fi
echo "$$" > "$PIDFILE"
log_line "start pid=$$ v3"

cleanup() {
  [ -n "$SUB_PID" ] && kill "$SUB_PID" 2>/dev/null
  if [ "$(cat "$PIDFILE" 2>/dev/null)" = "$$" ]; then
    rm -f "$PIDFILE"
  fi
  log_line "stop pid=$$"
  exit 0
}
trap cleanup INT TERM HUP

foreground_app() {
  out="$(/usr/bin/luna-send -n 1 luna://com.webos.applicationManager/getForegroundAppInfo '{}' 2>/dev/null)"
  printf '%s' "$out" | sed -n 's/.*"appId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p'
}

is_return_target() {
  case "$1" in
    "$HOME_APP"|"com.webos.app.livetv"|"com.webos.app.launcher"|"com.webos.app.hdmi"[0-9]|"com.webos.app.externalinput"*)
      return 0
      ;;
  esac
  return 1
}

launch_dashboard() {
  log_line "app closed; launching $APP"
  sleep 1
  current="$(foreground_app)"
  if ! is_return_target "$current"; then
    log_line "foreground changed to $current; skipping launch"
    return
  fi
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
}

while true; do
  prev=""
  [ -f "$PREV" ] && prev="$(cat "$PREV" 2>/dev/null)"
  armed=0
  [ -f "$ARMED" ] && armed=1
  /usr/bin/tail -f /dev/null | /usr/bin/luna-send -i luna://com.webos.applicationManager/getForegroundAppInfo '{"subscribe":true}' 2>>"$LOG" | while IFS= read -r line; do
    case "$line" in
      *'"appId"'*) ;;
      *) continue ;;
    esac
    app="$(printf '%s' "$line" | sed -n 's/.*"appId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
    [ -n "$app" ] || continue
    if [ "$app" != "$prev" ]; then
      log_line "foreground: $app"
    fi

    if [ "$armed" = "1" ]; then
      if [ "$app" = "$APP" ]; then
        armed=0
        rm -f "$ARMED"
        log_line "dashboard foreground; disarm"
      elif is_return_target "$app"; then
        armed=0
        rm -f "$ARMED"
        launch_dashboard
      fi
    fi

    if [ "$prev" = "$APP" ] && [ "$app" != "$APP" ]; then
      if is_return_target "$app"; then
        armed=0
        rm -f "$ARMED"
        log_line "left dashboard to $app; not armed"
      else
        armed=1
        : > "$ARMED"
        log_line "armed by $app"
      fi
    fi

    prev="$app"
    printf '%s' "$app" > "$PREV"
  done
  log_line "subscription ended; retrying in 5s"
  sleep 5
done
