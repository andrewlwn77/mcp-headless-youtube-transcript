# MCP Headless YouTube Transcript

An MCP (Model Context Protocol) server that extracts YouTube video transcripts using the `headless-youtube-captions` library.

## Features

- Extract transcripts from YouTube videos using video ID or full URL
- Support for multiple languages
- Timestamped transcript output
- Built with TypeScript and the MCP SDK

## Installation

```bash
npm install
npm run build
```

## Usage

### As an MCP Server

This server implements the Model Context Protocol and can be used with MCP clients.

### Tools Available

#### `get_youtube_transcript`

Extracts transcript/captions from a YouTube video.

**Parameters:**
- `videoId` (required): YouTube video ID or full URL
- `lang` (optional): Language code for captions (e.g., "en", "es", "ko"). Defaults to "en"

**Example:**
```json
{
  "name": "get_youtube_transcript",
  "arguments": {
    "videoId": "dQw4w9WgXcQ",
    "lang": "en"
  }
}
```

## Supported URL Formats

- Video ID: `dQw4w9WgXcQ`
- YouTube URLs:
  - `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
  - `https://youtu.be/dQw4w9WgXcQ`
  - `https://www.youtube.com/embed/dQw4w9WgXcQ`
  - `https://www.youtube.com/v/dQw4w9WgXcQ`

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start the server
npm start

# Run tests
npm test

# Run tests once (CI mode)
npm run test:run
```

## Testing

The project includes comprehensive tests:

- **Unit tests**: Test helper functions like URL parsing and time formatting
- **Integration tests**: Test the core transcript extraction logic with mocked APIs
- **Manual tests**: Optional tests that call real YouTube APIs (skipped by default)

All tests use Vitest and include mocking of the headless-youtube-captions library to ensure reliable testing without external API dependencies.

## Dependencies

- `@modelcontextprotocol/sdk`: MCP SDK for building servers
- `headless-youtube-captions`: Library for extracting YouTube captions

## License

MIT