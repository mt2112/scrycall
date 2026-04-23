## Context

The search command currently uses `process.stdout.isTTY` to decide between two output modes: numbered interactive list (TTY) or plain text list (piped). This means TTY users always get the interactive prompt loop and must press `q` to exit, even when they just want card names.

The change replaces the implicit TTY gate with an explicit `--interactive` / `-i` flag, making plain output the universal default.

## Goals / Non-Goals

**Goals:**
- Make plain-text output the default for all invocations (TTY and non-TTY)
- Provide `--interactive` / `-i` flag to opt into numbered list with prompt loop
- Silently ignore `--interactive` when stdout is not a TTY
- Maintain `--open` precedence over `--interactive`

**Non-Goals:**
- Changing the `card` command's disambiguation behavior
- Adding discoverability hints (e.g., "use -i for interactive mode")
- Changing the interactive prompt loop behavior itself (key bindings, commands)

## Decisions

### 1. Flag name: `--interactive` / `-i`

**Choice**: `--interactive` with `-i` short form.

**Alternatives considered**:
- `--list`: Ambiguous — both modes produce a list. Doesn't describe what's actually different.
- `--browse`: Reasonable but less standard. `-b` conflicts with potential `--batch` future use.
- `--pick`: Too informal for a CLI flag.

`--interactive` / `-i` is self-documenting and `-i` is quick to type.

### 2. TTY as a silent safety guard (Option B)

**Choice**: When `--interactive` is passed but stdout is not a TTY, silently fall back to plain output.

**Alternatives considered**:
- Option A (flag replaces TTY check entirely): Would allow `--interactive` in a pipe, which can't work — readline needs a terminal.
- Warn to stderr: Adds noise in pipelines. Unix convention is to do the right thing silently.

The condition becomes `options.interactive && process.stdout.isTTY`.

### 3. `--open` takes precedence over `--interactive`

When both flags are provided, `--open` wins — the browser opens and no output is shown. This matches existing behavior where `--open` is an early-exit path. No special handling needed; the `--open` check comes first in the existing code.

## Risks / Trade-offs

- **Existing users lose interactive by default** → This is the intended behavior change. Users who relied on TTY interactive mode need to add `-i`. The `--help` output documents the flag.
- **Silent `--interactive` ignore in pipes** → Could confuse a user who explicitly passes `-i` in a pipe and wonders why there's no prompt. Low likelihood — if you're piping, you don't want interactive mode.
