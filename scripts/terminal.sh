#!/bin/zsh
# Photographs the dancer in a real Terminal.app window (the default profile,
# so the same font and line spacing as the person's), for judging pixel art
# as that terminal draws it rather than as a rendering of exact half blocks.
# macOS asks once to let this terminal control Terminal.app, and screenshots
# need Screen Recording for Terminal.
#
#   scripts/terminal.sh poses out.png              # every pose, labelled
#                                                  # (POSES_ARGS passes poses.ts more)
#   scripts/terminal.sh piece <0-18> out <s> [s...] # a piece, at those seconds
#   scripts/terminal.sh piece live out <s> [s...]   # the live dancer (play.ts --live)
#
# The window is opened, photographed and closed again.
dir=${0:A:h:h}
mode=$1; shift
if [[ $mode == poses ]]; then
  cmd="node --experimental-transform-types --no-warnings scripts/poses.ts --seconds 5 $POSES_ARGS"; cols=112; rows=48; out=$1; shift; times=(4)
else
  piece=$1; out=$2; shift 2; times=("$@")
  # It plays until just after the last photograph, so it has exited when the
  # window closes (else Terminal asks first, and the window stays open).
  cmd="node --experimental-transform-types --no-warnings scripts/play.ts $([[ $piece == live ]] && echo --live || echo --piece $piece) --seconds $(( ${times[-1]} + 0.5 ))"; cols=100; rows=14
fi
osascript - "$dir" "$cmd" "$cols" "$rows" "$out" "$mode" "${times[@]}" <<'OSA'
on run argv
  set {dir, cmd, cols, rows, out, mode} to items 1 thru 6 of argv
  tell application "Terminal"
    -- The new window is the one whose id wasn't there already: never "the
    -- front window", which may be the person's own session.
    set existing to id of every window
    set t to do script "cd " & quoted form of dir & " && clear && " & cmd
    delay 1
    set wid to missing value
    repeat with w in (every window)
      if (id of w) is not in existing then set wid to id of w
    end repeat
    if wid is missing value then error "couldn't find the new window"
    set number of columns of t to cols as integer
    set number of rows of t to rows as integer
  end tell
  set lastAt to 1
  repeat with i from 7 to count of argv
    set tAt to (item i of argv) as real
    delay (tAt - lastAt)
    set lastAt to tAt
    if mode is "poses" then
      set shotPath to out
    else
      set shotPath to out & "_" & (item i of argv) & ".png"
    end if
    do shell script "screencapture -x -o -l " & wid & " " & quoted form of shotPath
  end repeat
  -- Once its program has exited, so Terminal closes it without asking;
  -- only this window.
  tell application "Terminal"
    repeat 40 times
      if not (busy of tab 1 of window id wid) then exit repeat
      delay 0.25
    end repeat
    close window id wid
  end tell
end run
OSA
