#!/usr/bin/env bash
# Shared helpers for the PreToolUse Bash guards (protect-secrets.sh, block-destructive.sh).
#
# strip_heredocs: reads a shell command on stdin, prints it with every heredoc
# *body* removed — the line that opens the heredoc is kept, the data lines up to
# and including the terminator are dropped.
#
# Why: the guards scan the command string for dangerous tokens (git reset --hard,
# rm -rf, .env, *.key ...). A heredoc body is data headed for a file, not an
# executed command, so writing a doc/plan that merely *mentions* `git reset --hard`
# must not be blocked. This removes that false positive.
#
# Scope/limits (intentional — these guards are local speed-bumps, not a security
# boundary; CI gitleaks + permissions.deny are the real boundary):
#   - here-strings (<<<) are left untouched (single line, no body)
#   - a dangerous token hidden inside a quoted inline string (echo "git reset
#     --hard") is NOT stripped and may still trip the guard
strip_heredocs() {
  awk -v sq="'" '
    BEGIN {
      q     = "[" sq "\"]?"                                   # optional surrounding quote
      start = "(^|[^<])<<-?[ \t]*" q "[A-Za-z_][A-Za-z0-9_]*" q
    }
    {
      if (indelim != "") {                                   # inside a heredoc body
        cmp = $0
        if (dash) sub(/^\t+/, "", cmp)                       # <<- ignores leading tabs on terminator
        if (cmp == indelim) { indelim = ""; dash = 0 }       # terminator -> stop dropping
        next                                                 # drop the body/terminator line
      }
      if (match($0, start)) {                                # this line opens a heredoc
        tok = substr($0, RSTART, RLENGTH)
        sub(/^[^<]*/, "", tok)                               # drop the [^<] guard char
        dash = (tok ~ /^<<-/) ? 1 : 0
        d = tok
        sub(/^<<-?[ \t]*/, "", d)                            # strip << / <<-
        gsub("^[" sq "\"]|[" sq "\"]$", "", d)               # strip surrounding quotes
        indelim = d
        print; next                                          # keep the opening command line
      }
      print
    }
  '
}
