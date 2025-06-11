#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { getSubtitles } from 'headless-youtube-captions';
import { extractVideoId } from './utils.js';
const server = new Server({
    name: 'mcp-headless-youtube-transcript',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
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
            const { videoId, lang = 'en' } = args;
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
            // Just get the raw text content, no timestamps
            const transcript = subtitles.map(s => s.text).join(' ');
            return {
                content: [
                    {
                        type: 'text',
                        text: transcript,
                    },
                ],
            };
        }
        catch (error) {
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
//# sourceMappingURL=index.js.map