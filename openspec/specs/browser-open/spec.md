## ADDED Requirements

### Requirement: Cross-platform browser opening utility
The system SHALL provide an `openInBrowser(url)` utility function that opens the given URL in the user's default browser. The function SHALL use `child_process.execFile` with platform-specific commands: `cmd /c start "" "{url}"` on Windows, `open` on macOS, and `xdg-open` on Linux.

#### Scenario: Opens URL on Windows
- **WHEN** `openInBrowser("https://scryfall.com/card/lea/161")` is called on Windows (`process.platform === 'win32'`)
- **THEN** the system executes `cmd /c start "" "https://scryfall.com/card/lea/161"`

#### Scenario: Opens URL on macOS
- **WHEN** `openInBrowser("https://scryfall.com/card/lea/161")` is called on macOS (`process.platform === 'darwin'`)
- **THEN** the system executes `open "https://scryfall.com/card/lea/161"`

#### Scenario: Opens URL on Linux
- **WHEN** `openInBrowser("https://scryfall.com/card/lea/161")` is called on Linux (`process.platform === 'linux'`)
- **THEN** the system executes `xdg-open "https://scryfall.com/card/lea/161"`

#### Scenario: Unsupported platform
- **WHEN** `openInBrowser` is called on an unsupported platform
- **THEN** the function prints a message to stderr with the URL so the user can open it manually

### Requirement: Browser open does not block CLI
The `openInBrowser` function SHALL launch the browser process detached so that the CLI continues executing without waiting for the browser to close.

#### Scenario: CLI continues after browser launch
- **WHEN** `openInBrowser` is called and the browser opens
- **THEN** the calling function continues execution immediately without blocking

### Requirement: Browser launch failure is non-fatal
The `openInBrowser` function SHALL catch errors from `execFile` and print them to stderr. A failed browser launch SHALL NOT cause the CLI process to exit with an error code.

#### Scenario: Browser command fails
- **WHEN** `openInBrowser` is called but the browser command fails (e.g., no display server)
- **THEN** an error message is printed to stderr and the CLI continues normally
