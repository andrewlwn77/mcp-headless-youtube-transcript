# MCP Headless YouTube Transcript

An MCP (Model Context Protocol) server that extracts YouTube video transcripts using the `headless-youtube-captions` library.

## Features

- Extract transcripts from YouTube videos using video ID or full URL
- Support for multiple languages
- Automatic pagination for large transcripts (98k character chunks)
- Clean text output optimized for LLM consumption
- Built with TypeScript and the MCP SDK

## Installation

Install via npm:

```bash
npm install -g mcp-headless-youtube-transcript
```

Or use directly with npx:

```bash
npx mcp-headless-youtube-transcript
```

## MCP Configuration

Add this server to your MCP settings:

```json
{
  "mcpServers": {
    "youtube-transcript": {
      "command": "npx",
      "args": ["-y", "mcp-headless-youtube-transcript"]
    }
  }
}
```

## Tools Available

### `get_youtube_transcript`

Extracts transcript/captions from a YouTube video with automatic pagination for large transcripts.

**Parameters:**
- `videoId` (required): YouTube video ID or full URL
- `lang` (optional): Language code for captions (e.g., "en", "es", "ko"). Defaults to "en"
- `segment` (optional): Segment number to retrieve (1-based). Each segment is ~98k characters. Defaults to 1

**Examples:**

Basic usage:
```json
{
  "name": "get_youtube_transcript",
  "arguments": {
    "videoId": "dQw4w9WgXcQ"
  }
}
```

With language:
```json
{
  "name": "get_youtube_transcript",
  "arguments": {
    "videoId": "dQw4w9WgXcQ",
    "lang": "es"
  }
}
```

With pagination:
```json
{
  "name": "get_youtube_transcript",
  "arguments": {
    "videoId": "dQw4w9WgXcQ",
    "segment": 2
  }
}
```

## Response Format

The tool returns the raw transcript text. For large transcripts, the response includes pagination information:

```
[Segment 1 of 3]

this is the actual transcript text content...
```

When multiple segments are available, you can retrieve subsequent segments by incrementing the `segment` parameter.

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