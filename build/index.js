#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
// @ts-ignore - Types are defined in global.d.ts
import { getSubtitles, getChannelVideos, searchChannelVideos, getVideoComments } from 'headless-youtube-captions';
import { extractVideoId, extractChannelIdentifier, formatChannelUrl, truncateText } from './utils.js';
// In-memory cache
const transcriptCache = new Map();
// Get cache TTL from environment variable (default 5 minutes)
const CACHE_TTL_SECONDS = parseInt(process.env.TRANSCRIPT_CACHE_TTL || '300');
// Cache helper functions
function getCacheKey(videoId, lang) {
    return `${videoId}:${lang}`;
}
function getCachedTranscript(videoId, lang) {
    const key = getCacheKey(videoId, lang);
    const entry = transcriptCache.get(key);
    if (!entry)
        return null;
    const now = Date.now();
    if (now > entry.expiresAt) {
        transcriptCache.delete(key);
        return null;
    }
    // Update expiration time on read
    entry.expiresAt = now + (CACHE_TTL_SECONDS * 1000);
    return entry.transcript;
}
function setCachedTranscript(videoId, lang, transcript) {
    const key = getCacheKey(videoId, lang);
    const expiresAt = Date.now() + (CACHE_TTL_SECONDS * 1000);
    transcriptCache.set(key, { transcript, expiresAt });
}
function cleanupExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of transcriptCache.entries()) {
        if (now > entry.expiresAt) {
            transcriptCache.delete(key);
        }
    }
}
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
                        segment: {
                            type: 'number',
                            description: 'Segment number to retrieve (1-based). Each segment is ~98k characters. Defaults to 1',
                            default: 1,
                        },
                    },
                    required: ['videoId'],
                },
            },
            {
                name: 'get_channel_videos',
                description: 'Extract videos from a YouTube channel with pagination support',
                inputSchema: {
                    type: 'object',
                    properties: {
                        channelUrl: {
                            type: 'string',
                            description: 'YouTube channel URL, @handle, or channel ID',
                        },
                        maxVideos: {
                            type: 'number',
                            description: 'Maximum number of videos to retrieve. Defaults to 50',
                            default: 50,
                        },
                    },
                    required: ['channelUrl'],
                },
            },
            {
                name: 'search_channel_videos',
                description: 'Search for specific videos within a YouTube channel',
                inputSchema: {
                    type: 'object',
                    properties: {
                        channelUrl: {
                            type: 'string',
                            description: 'YouTube channel URL, @handle, or channel ID',
                        },
                        query: {
                            type: 'string',
                            description: 'Search query to find videos in the channel',
                        },
                    },
                    required: ['channelUrl', 'query'],
                },
            },
            {
                name: 'get_video_comments',
                description: 'Retrieve comments from a YouTube video',
                inputSchema: {
                    type: 'object',
                    properties: {
                        videoId: {
                            type: 'string',
                            description: 'YouTube video ID or full URL',
                        },
                        sortBy: {
                            type: 'string',
                            description: 'Sort comments by "top" or "newest". Defaults to "top"',
                            enum: ['top', 'newest'],
                            default: 'top',
                        },
                        maxComments: {
                            type: 'number',
                            description: 'Maximum number of comments to retrieve. Defaults to 100',
                            default: 100,
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
            const { videoId, lang = 'en', segment = 1 } = args;
            // Extract video ID from URL if a full URL is provided
            const extractedVideoId = extractVideoId(videoId);
            if (!extractedVideoId) {
                throw new Error('Invalid YouTube video ID or URL');
            }
            // Check cache first
            let fullTranscript = getCachedTranscript(extractedVideoId, lang);
            if (!fullTranscript) {
                // Get subtitles using headless-youtube-captions
                const subtitles = await getSubtitles({
                    videoID: extractedVideoId,
                    lang: lang,
                });
                // Get the full raw text content
                fullTranscript = subtitles.map(s => s.text).join(' ');
                // Cache the full transcript
                setCachedTranscript(extractedVideoId, lang, fullTranscript);
            }
            // Split into 98k character chunks
            const chunkSize = 98000;
            const chunks = [];
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
        finally {
            // Cleanup expired cache entries after each request
            cleanupExpiredCache();
        }
    }
    if (name === 'get_channel_videos') {
        try {
            const { channelUrl, maxVideos = 50 } = args;
            // Extract and format channel URL
            const channelIdentifier = extractChannelIdentifier(channelUrl);
            const formattedUrl = formatChannelUrl(channelIdentifier);
            // Get channel videos
            const result = await getChannelVideos({
                channelURL: formattedUrl,
                limit: maxVideos
            });
            // Format the response
            const response = {
                channel: {
                    name: result.channel.name,
                    subscribers: result.channel.subscribers,
                    videoCount: result.channel.videoCount,
                },
                videos: result.videos.map((video) => ({
                    id: video.id,
                    title: video.title,
                    url: video.url,
                    views: video.views,
                    uploadTime: video.uploadTime,
                    duration: video.duration,
                    thumbnail: video.thumbnail,
                })),
                totalVideosRetrieved: result.totalLoaded,
                hasMore: result.hasMore,
            };
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(response, null, 2),
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
                        text: `Error getting channel videos: ${errorMessage}`,
                    },
                ],
                isError: true,
            };
        }
    }
    if (name === 'search_channel_videos') {
        try {
            const { channelUrl, query } = args;
            // Extract and format channel URL
            const channelIdentifier = extractChannelIdentifier(channelUrl);
            const formattedUrl = formatChannelUrl(channelIdentifier);
            // Search channel videos
            const result = await searchChannelVideos({
                channelURL: formattedUrl,
                query: query
            });
            // Format the response
            const response = {
                query: result.query,
                channelUrl: formattedUrl,
                results: result.results.map((video) => ({
                    id: video.id,
                    title: video.title,
                    url: video.url,
                    views: video.views,
                    uploadTime: video.uploadTime,
                    duration: video.duration,
                    thumbnail: video.thumbnail,
                })),
                totalResults: result.totalFound,
            };
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(response, null, 2),
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
                        text: `Error searching channel videos: ${errorMessage}`,
                    },
                ],
                isError: true,
            };
        }
    }
    if (name === 'get_video_comments') {
        try {
            const { videoId, sortBy = 'top', maxComments = 100 } = args;
            // Extract video ID from URL if needed
            const extractedVideoId = extractVideoId(videoId);
            if (!extractedVideoId) {
                throw new Error('Invalid YouTube video ID or URL');
            }
            // Get video comments
            const result = await getVideoComments({
                videoID: extractedVideoId,
                sortBy: sortBy,
                limit: maxComments
            });
            // Format the response (truncate if needed)
            const response = {
                video: {
                    id: result.video.id,
                    title: result.video.title,
                    channel: result.video.channel,
                    views: result.video.views,
                },
                sortBy: result.sortBy,
                comments: result.comments.map((comment) => ({
                    author: comment.author,
                    text: comment.text,
                    likes: comment.likes,
                    replyCount: comment.replyCount,
                    time: comment.time,
                })),
                totalComments: result.totalComments,
                totalLoaded: result.totalLoaded,
                hasMore: result.hasMore,
            };
            const responseText = JSON.stringify(response, null, 2);
            const truncatedResponse = truncateText(responseText);
            return {
                content: [
                    {
                        type: 'text',
                        text: truncatedResponse,
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
                        text: `Error getting video comments: ${errorMessage}`,
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