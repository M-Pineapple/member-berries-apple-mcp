# Changelog

All notable changes to Member Berries Apple MCP will be documented in this file.

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

### Performance Improvements
Tested with 70 reminders:
- Get all reminders: ~10-12s (first time), 0ms (cached)
- Search reminders: ~47s → <1ms
- Get incomplete: ~105s → <1ms

### Technical Details
- JXA `.whose()` filtering is extremely slow for large datasets
- Bulk property access (e.g., `reminders.name()`) is much faster than individual access
- Cache implementation prevents repeated expensive operations
- No forced app activation prevents macOS from triggering restart loops

## [1.1.0] - 2025-06-05

### Fixed
- Calendar read operations timing out when processing large numbers of events
- Calendar module not returning any events despite having proper permissions
- Performance issues when checking calendars with extensive historical data

### Added
- Time-window filtering for calendar operations:
  - Default looks back 14 days for context
  - Default looks forward 90 days for future planning
  - Significantly improves performance by reducing events to process
- Priority calendar processing - checks main calendars first (Home, Work, Calendar, iCloud)
- Configurable time window settings in CONFIG object

### Changed
- Increased MAX_CALENDARS from 1 to 15 to support users with multiple calendars
- Improved calendar access logic to handle large event counts gracefully
- Calendar operations now filter events by date range before processing

### Technical Details
- Original timeout handling with Promise.race was causing read operations to fail
- Restored original JXA execution logic while adding minimal date filtering
- Time-window approach reduces processed events from thousands to ~100-200

## [1.0.0] - 2025-06-04

### Initial Release
- Fork of apple-mcp focused on Calendar, Notes, and Reminders
- Added Member Berries memory layer for natural conversations
- Secure implementation with only essential Apple app access
- Custom prompt for Claude Desktop integration
