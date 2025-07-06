# MCP Headless YouTube Transcript

An MCP (Model Context Protocol) server that extracts YouTube video transcripts, channel videos, and comments using the `headless-youtube-captions` library.

## Features

- Extract transcripts from YouTube videos using video ID or full URL
- Get videos from YouTube channels with pagination support
- Search for videos within a specific channel
- Retrieve comments from YouTube videos
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

### `get_channel_videos`

Extract videos from a YouTube channel with pagination support.

**Parameters:**
- `channelUrl` (required): YouTube channel URL, @handle, or channel ID
- `maxVideos` (optional): Maximum number of videos to retrieve. Defaults to 50

**Examples:**

Using handle:
```json
{
  "name": "get_channel_videos",
  "arguments": {
    "channelUrl": "@mkbhd"
  }
}
```

Using channel URL:
```json
{
  "name": "get_channel_videos",
  "arguments": {
    "channelUrl": "https://www.youtube.com/channel/UCBJycsmduvYEL83R_U4JriQ",
    "maxVideos": 100
  }
}
```

### `search_channel_videos`

Search for specific videos within a YouTube channel.

**Parameters:**
- `channelUrl` (required): YouTube channel URL, @handle, or channel ID
- `query` (required): Search query to find videos in the channel

**Example:**
```json
{
  "name": "search_channel_videos",
  "arguments": {
    "channelUrl": "@mkbhd",
    "query": "iPhone review"
  }
}
```

### `get_video_comments`

Retrieve comments from a YouTube video.

**Parameters:**
- `videoId` (required): YouTube video ID or full URL
- `sortBy` (optional): Sort comments by "top" or "newest". Defaults to "top"
- `maxComments` (optional): Maximum number of comments to retrieve. Defaults to 100

**Examples:**

Basic usage:
```json
{
  "name": "get_video_comments",
  "arguments": {
    "videoId": "dQw4w9WgXcQ"
  }
}
```

With sorting and limit:
```json
{
  "name": "get_video_comments",
  "arguments": {
    "videoId": "dQw4w9WgXcQ",
    "sortBy": "newest",
    "maxComments": 50
  }
}
```

## Response Formats

### Transcript Response
For `get_youtube_transcript`, the tool returns the raw transcript text. For large transcripts, the response includes pagination information:

```
[Segment 1 of 3]

this is the actual transcript text content...
```

When multiple segments are available, you can retrieve subsequent segments by incrementing the `segment` parameter.

### Channel Videos Response
For `get_channel_videos` and `search_channel_videos`, the response is a JSON object containing channel information and video details:

```json
{
  "channel": {
    "name": "Channel Name",
    "subscribers": "1.23M subscribers",
    "videoCount": "500 videos"
  },
  "videos": [
    {
      "id": "videoId123",
      "title": "Video Title",
      "url": "https://www.youtube.com/watch?v=videoId123",
      "views": "1.2M views",
      "uploadTime": "2 weeks ago",
      "duration": "10:34"
    }
  ],
  "totalVideosRetrieved": 50
}
```

### Comments Response
For `get_video_comments`, the response includes comment details:

```json
{
  "videoId": "dQw4w9WgXcQ",
  "sortBy": "top",
  "comments": [
    {
      "author": "Username",
      "text": "This is a comment",
      "likes": "1.2K",
      "replyCount": 23,
      "timeAgo": "2 weeks ago"
    }
  ],
  "totalComments": 100
}
```

## Caching

The server includes built-in caching to improve performance for paginated requests. The cache behavior can be configured with an environment variable:

- `TRANSCRIPT_CACHE_TTL`: Cache duration in seconds (default: 300 = 5 minutes)

### Cache Features:
- Full transcripts are cached on first fetch
- Cache expiration time is updated on each read or write
- Expired entries are automatically cleaned up after each request
- Each video+language combination is cached separately

### Setting Cache Duration:

```bash
# Set cache to 10 minutes
TRANSCRIPT_CACHE_TTL=600 npx mcp-headless-youtube-transcript
```

## Environment Variables

### PUPPETEER_EXECUTABLE_PATH

If you need to specify a custom path for the Chromium/Chrome executable used by Puppeteer, you can set the `PUPPETEER_EXECUTABLE_PATH` environment variable:

```bash
# Example: Using system Chrome
PUPPETEER_EXECUTABLE_PATH="/usr/bin/google-chrome" npx mcp-headless-youtube-transcript

# Example: Using a specific Chromium installation
PUPPETEER_EXECUTABLE_PATH="/path/to/chromium" npx mcp-headless-youtube-transcript
```

This is useful when:
- Running in containerized environments
- Using a system-installed Chrome/Chromium instead of the bundled one
- Working in environments with specific security requirements
- Troubleshooting Puppeteer launch issues

## Supported URL Formats

### Video URLs
- Video ID: `dQw4w9WgXcQ`
- YouTube URLs:
  - `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
  - `https://youtu.be/dQw4w9WgXcQ`
  - `https://www.youtube.com/embed/dQw4w9WgXcQ`
  - `https://www.youtube.com/v/dQw4w9WgXcQ`

### Channel URLs
- Handle: `@mkbhd`
- Channel ID: `UCBJycsmduvYEL83R_U4JriQ`
- Channel URLs:
  - `https://www.youtube.com/channel/UCBJycsmduvYEL83R_U4JriQ`
  - `https://www.youtube.com/c/mkbhd`
  - `https://www.youtube.com/user/marquesbrownlee`
  - `https://www.youtube.com/@mkbhd`

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