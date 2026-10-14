# Changelog

All notable changes to Member Berries Apple MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Root LICENSE is now the standard MIT text (copyright holder Pineapple, no emoji) so GitHub can detect it
- README adds a badge row, a Usage section, and a More MCP servers by M-Pineapple block
- README conversion pass: one-line value hook, scripted demo GIF (`docs/demo.gif`), 3-step quick start, and a gentle star ask. GIF is a simulated two-session Notes loop, not a live Mac capture. Regenerator: `docs/render-demo.py`.

## [2.1.1] - 2026-08-02

### Fixed
- README logo now uses `assets/logo.png` so GitHub renders it reliably (SVG source kept)

### Changed
- README restores the fun Member Berries personality and notes the South Park homage (no affiliation)

## [2.1.0] - 2026-08-02

### Added
- Product logo (`assets/logo.svg` / `assets/logo.png`) and CPC-style README packaging
- `briefing` tool (`today`) — calendar, due reminders, note titles, starters
- Reminders `complete` and `delete` operations
- Notes `get` operation, `includeBody` flag, folder scoping on list/search
- Built-in conversation starters (custom host prompt now optional)
- Bun unit tests and GitHub Actions CI
- Root `LICENSE`, `AGENTS.md`, `CLAUDE.md`

### Fixed
- Clone / package URLs now point at `M-Pineapple/member-berries-apple-mcp`
- Version pin: package and server both **2.1.0** (was 1.2.0 vs 2.0.0)
- `listById` now filters by list ID (no longer returns every reminder)
- Notes list/search default to title + snippet (no full-body dump)
- Memory file written with mode `0o600`
- Access failures surface clear errors instead of silent empty arrays
- Input length limits on tool string arguments
- Removed personal calendar name from priority list
- `rememberReminder` records `reminder_created` (not completed)

### Changed
- Slimmed calendar module (shared event walker, stderr-only diagnostics)
- Dropped unused dependencies (`mcp-proxy`, `@hono/node-server`, `run-applescript`, …)
- Removed tracked `.DS_Store` and `calendar.ts.original-backup`

## [1.2.0] - 2025-06-05

### Fixed
- **Critical: Reminders restart loop** - Fixed issue where accessing Reminders would cause infinite app restart cycles
- **Reminders performance** - Operations timing out with large numbers of reminders (70+)
- **Memory efficiency** - Replaced slow JXA filtering with fast JavaScript filtering

### Added
- App state checking - `isRemindersRunning()` prevents operations when app is closed
- Smart caching system - 30-second cache dramatically improves performance
- Bulk property access - Retrieves all reminder properties in one operation

### Changed
- Removed all `Reminders.activate()` calls that were forcing app to stay open
- Search operations now use JavaScript filtering (instant) instead of JXA `.whose()` (100+ seconds)
- All operations return empty arrays on failure instead of throwing errors
- Increased timeout from 5s to handle large reminder lists

## [1.1.0] - 2025-06-05

### Fixed
- Calendar read operations timing out when processing large numbers of events
- Calendar module not returning any events despite having proper permissions
- Performance issues when checking calendars with extensive historical data

### Added
- Time-window filtering for calendar operations
- Priority calendar processing for main calendars first
- Configurable time window settings in CONFIG object

## [1.0.0] - 2025-06-04

### Initial Release
- Fork of apple-mcp focused on Calendar, Notes, and Reminders
- Added Member Berries memory layer for natural conversations
- Secure implementation with only essential Apple app access
- Custom prompt for Claude Desktop integration
