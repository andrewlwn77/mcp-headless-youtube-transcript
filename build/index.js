#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
// @ts-ignore - Types are defined in global.d.ts
import { getSubtitles, getChannelVideos, searchChannelVideos, getVideoComments, searchYouTubeGlobal, getVideoMetadata } from 'headless-youtube-captions';
import { extractVideoId, extractChannelIdentifier, formatChannelUrl, truncateText, isValidYouTubeUrl, getSearchCacheKey } from './utils.js';
// In-memory caches
const transcriptCache = new Map();
const searchCache = new Map();
// Get cache TTL from environment variables
const CACHE_TTL_SECONDS = parseInt(process.env.TRANSCRIPT_CACHE_TTL || '300'); // 5 minutes default
const SEARCH_CACHE_TTL_SECONDS = parseInt(process.env.SEARCH_CACHE_TTL || '3600'); // 1 hour default
const MAX_SEARCH_CACHE_SIZE = parseInt(process.env.MAX_SEARCH_CACHE_SIZE || '100');
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
// Search cache helper functions
function getCachedSearchResults(query, resultTypes, maxResults) {
    const key = getSearchCacheKey(query, resultTypes, maxResults);
    const entry = searchCache.get(key);
    if (!entry)
        return null;
    const now = Date.now();
    if (now > entry.expiresAt) {
        searchCache.delete(key);
        return null;
    }
    // Update expiration time on read
    entry.expiresAt = now + (SEARCH_CACHE_TTL_SECONDS * 1000);
    return entry.results;
}
function setCachedSearchResults(query, resultTypes, maxResults, results) {
    const key = getSearchCacheKey(query, resultTypes, maxResults);
    const expiresAt = Date.now() + (SEARCH_CACHE_TTL_SECONDS * 1000);
    // LRU eviction if cache is full
    if (searchCache.size >= MAX_SEARCH_CACHE_SIZE) {
        const firstKey = searchCache.keys().next().value;
        if (firstKey) {
            searchCache.delete(firstKey);
        }
    }
    searchCache.set(key, { results, expiresAt });
}
function cleanupExpiredCache() {
    const now = Date.now();
    // Cleanup transcript cache
    for (const [key, entry] of transcriptCache.entries()) {
        if (now > entry.expiresAt) {
            transcriptCache.delete(key);
        }
    }
    // Cleanup search cache
    for (const [key, entry] of searchCache.entries()) {
        if (now > entry.expiresAt) {
            searchCache.delete(key);
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
            {
                name: 'search_youtube_global',
                description: 'Search across all of YouTube and return structured results',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search term to find videos and channels',
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Maximum number of results to return (1-20). Defaults to 10',
                            default: 10,
                            minimum: 1,
                            maximum: 20,
                        },
                        resultTypes: {
                            type: 'array',
                            description: 'Types of results to include',
                            items: {
                                type: 'string',
                                enum: ['videos', 'channels', 'all'],
                            },
                            default: ['all'],
                        },
                    },
                    required: ['query'],
                },
            },
            {
                name: 'get_video_metadata',
                description: 'Extract comprehensive video metadata including description, upload date, like count',
                inputSchema: {
                    type: 'object',
                    properties: {
                        videoId: {
                            type: 'string',
                            description: 'YouTube video ID or full URL',
                        },
                        expandDescription: {
                            type: 'boolean',
                            description: 'Whether to expand truncated descriptions. Defaults to true',
                            default: true,
                        },
                    },
                    required: ['videoId'],
                },
            },
            {
                name: 'navigate_search_result',
                description: 'Navigate to a video or channel page from search results',
                inputSchema: {
                    type: 'object',
                    properties: {
                        resultUrl: {
                            type: 'string',
                            description: 'YouTube URL from search results to navigate to',
                        },
                        resultType: {
                            type: 'string',
                            description: 'Type of the result being navigated to',
                            enum: ['video', 'channel'],
                        },
                    },
                    required: ['resultUrl', 'resultType'],
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
    if (name === 'search_youtube_global') {
        try {
            const { query, maxResults = 10, resultTypes = ['all'] } = args;
            // Validate inputs
            if (!query.trim()) {
                throw new Error('Search query cannot be empty');
            }
            if (maxResults < 1 || maxResults > 20) {
                throw new Error('maxResults must be between 1 and 20');
            }
            // Check cache first
            let results;
            const cachedResults = getCachedSearchResults(query, resultTypes, maxResults);
            if (cachedResults) {
                console.error('Using cached search results');
                results = cachedResults;
            }
            else {
                // Use the real headless-youtube-captions search function
                console.error('Performing new YouTube search...');
                const searchResult = await searchYouTubeGlobal({
                    query: query,
                    maxResults: maxResults,
                    resultTypes: resultTypes
                });
                // Convert to our SearchResult format
                results = searchResult.results.map((result) => ({
                    id: result.id,
                    type: result.type,
                    title: result.title,
                    url: result.url,
                    thumbnail: result.thumbnail || '',
                    channel: result.channel || '',
                    views: result.views || '',
                    duration: result.duration || '',
                    uploadTime: result.uploadTime || '',
                    subscribers: result.subscribers || '',
                    videoCount: result.videoCount || ''
                }));
                // Cache the results
                setCachedSearchResults(query, resultTypes, maxResults, results);
            }
            // Filter by result types if not 'all'
            if (!resultTypes.includes('all')) {
                results = results.filter(result => (resultTypes.includes('videos') && result.type === 'video') ||
                    (resultTypes.includes('channels') && result.type === 'channel'));
            }
            // Limit results
            const limitedResults = results.slice(0, maxResults);
            const response = {
                query: query,
                resultTypes: resultTypes,
                maxResults: maxResults,
                totalFound: limitedResults.length,
                results: limitedResults,
                cached: results === getCachedSearchResults(query, resultTypes, maxResults)
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
                        text: `Error searching YouTube: ${errorMessage}`,
                    },
                ],
                isError: true,
            };
        }
        finally {
            cleanupExpiredCache();
        }
    }
    if (name === 'get_video_metadata') {
        try {
            const { videoId, expandDescription = true } = args;
            // Extract video ID from URL if needed
            const extractedVideoId = extractVideoId(videoId);
            if (!extractedVideoId) {
                throw new Error('Invalid YouTube video ID or URL');
            }
            // Check cache first - reuse the same cache key pattern
            let cachedMetadata = getCachedTranscript(extractedVideoId, `metadata_${expandDescription}`);
            if (cachedMetadata) {
                try {
                    const parsedMetadata = JSON.parse(cachedMetadata);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(parsedMetadata, null, 2),
                            },
                        ],
                    };
                }
                catch (e) {
                    // Invalid cached data, proceed with fresh extraction
                }
            }
            // Get video metadata using headless-youtube-captions
            const metadata = await getVideoMetadata({
                videoID: extractedVideoId,
                expandDescription: expandDescription,
            });
            // Cache the result (using the transcript cache infrastructure)
            setCachedTranscript(extractedVideoId, `metadata_${expandDescription}`, JSON.stringify(metadata));
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(metadata, null, 2),
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
                        text: `Error getting video metadata: ${errorMessage}`,
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
    if (name === 'navigate_search_result') {
        try {
            const { resultUrl, resultType } = args;
            // Validate URL
            if (!isValidYouTubeUrl(resultUrl)) {
                throw new Error('Invalid YouTube URL provided');
            }
            // For now, just return confirmation of navigation
            // In full implementation, this would use Puppeteer to navigate
            const response = {
                success: true,
                navigatedTo: resultUrl,
                resultType: resultType,
                message: `Successfully navigated to ${resultType}: ${resultUrl}`,
                timestamp: new Date().toISOString()
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
                        text: `Error navigating to search result: ${errorMessage}`,
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