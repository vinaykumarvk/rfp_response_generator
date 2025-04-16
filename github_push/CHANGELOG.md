# Changelog

## Version 1.2 (April 15, 2025)

### Added
- Auto-refresh UI after response generation - eliminates need for manual refresh
- Detailed API key validation with improved error handling
- Enhanced production deployment documentation (PRODUCTION_DEPLOYMENT.md)
- Added endpoint for fetching a single requirement by ID

### Fixed
- Resolved critical bugs in ReferencePanel component related to JSON parsing
- Fixed AbortController errors in ReferencePanel
- Fixed UI freezing during response generation
- Fixed issues with response editing not properly saving

## Version 1.1 (April 14, 2025)

### Added
- Support for WhatsApp sharing of responses
- Excel export with styled headers and formatting
- Response editing with save/cancel options
- Repository size optimization (reduced from 966MB to 118KB)

### Fixed
- Database optimization while maintaining data integrity
- Improved error handling for LLM API calls
- Fixed memory leaks in ReferencePanel component
- Added comprehensive environment variable validation