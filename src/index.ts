#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getSubtitles, Subtitle } from 'headless-youtube-captions';
import { extractVideoId, formatTime } from './utils.js';

const server = new Server(
  {
    name: 'mcp-headless-youtube-transcript',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_youtube_transcript',
        description: 'Extract transcript/captions from a YouTube video',
        inputSchema: {
          type: 'object',
          properties: {
            videoId: {
              type: 'string',
              description: 'YouTube video ID or full URL',
            },
            lang: {
              type: 'string',
              description: 'Language code for captions (e.g., "en", "es", "ko"). Defaults to "en"',
              default: 'en',
            },
            segment: {
              type: 'number',
              description: 'Segment number to retrieve (1-based). Each segment is ~98k characters. Defaults to 1',
              default: 1,
            },
          },
          required: ['videoId'],
        },
      },
    ],
  };
});

// Tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_youtube_transcript') {
    try {
      const { videoId, lang = 'en', segment = 1 } = args as {
        videoId: string;
        lang?: string;
        segment?: number;
      };

      // Extract video ID from URL if a full URL is provided
      const extractedVideoId = extractVideoId(videoId);
      
      if (!extractedVideoId) {
        throw new Error('Invalid YouTube video ID or URL');
      }

      // Get subtitles using headless-youtube-captions
      const subtitles = await getSubtitles({
        videoID: extractedVideoId,
        lang: lang,
      });

      // Get the full raw text content
      const fullTranscript = subtitles.map(s => s.text).join(' ');
      
      // Split into 98k character chunks
      const chunkSize = 98000;
      const chunks: string[] = [];
      
      for (let i = 0; i < fullTranscript.length; i += chunkSize) {
        chunks.push(fullTranscript.substring(i, i + chunkSize));
      }
      
      // Validate segment number
      if (segment < 1 || segment > chunks.length) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: Invalid segment ${segment}. Available segments: 1-${chunks.length}`,
            },
          ],
          isError: true,
        };
      }
      
      // Get the requested segment (convert to 0-based index)
      const requestedChunk = chunks[segment - 1];
      
      // Add metadata about segmentation
      const segmentInfo = chunks.length > 1 
        ? `[Segment ${segment} of ${chunks.length}]\n\n`
        : '';

      return {
        content: [
          {
            type: 'text',
            text: segmentInfo + requestedChunk,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        content: [
          {
            type: 'text',
            text: `Error getting YouTube transcript: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});


async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Headless YouTube Transcript server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});