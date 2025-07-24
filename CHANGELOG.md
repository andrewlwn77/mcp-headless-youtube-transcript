# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2025-01-24

### Added
- **Global YouTube Search**: New `search_youtube_global` tool for searching across all of YouTube
  - Search for videos and channels with customizable result types
  - Configurable max results (1-20)
  - Rich result data including titles, URLs, view counts, upload times, durations
  - Separate caching with 1-hour TTL for search results
- Updated dependency to headless-youtube-captions v1.3.0
- Added search and automation keywords to package.json

### Technical Details
- Utilizes validated DOM selectors from discovery work
- Container-safe Chrome browser configuration
- Comprehensive error handling and validation
- Type-safe integration with existing MCP tools

## [0.5.0] - Previous Release

### Added
- Initial MCP server implementation
- YouTube transcript extraction tools
- Channel video listing and search
- Video comment extraction
- Comprehensive caching system