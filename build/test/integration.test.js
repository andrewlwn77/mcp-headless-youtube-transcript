import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSubtitles } from 'headless-youtube-captions';
import { extractVideoId, formatTime } from '../utils.js';
// Mock the headless-youtube-captions module  
vi.mock('headless-youtube-captions', () => ({
    getSubtitles: vi.fn(),
}));
const mockGetSubtitles = vi.mocked(getSubtitles);
// Test the main logic that would be used in the MCP server
async function getYouTubeTranscript(videoId, lang = 'en') {
    const extractedVideoId = extractVideoId(videoId);
    if (!extractedVideoId) {
        throw new Error('Invalid YouTube video ID or URL');
    }
    const subtitles = await getSubtitles({
        videoID: extractedVideoId,
        lang: lang,
    });
    const transcript = subtitles
        .map((subtitle) => `[${formatTime(subtitle.start)}] ${subtitle.text}`)
        .join('\n');
    return {
        videoId: extractedVideoId,
        language: lang,
        transcript,
    };
}
describe('Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('getYouTubeTranscript', () => {
        const mockSubtitles = [
            { start: 0, dur: 2, text: 'Hello world' },
            { start: 2, dur: 3, text: 'This is a test' },
            { start: 5, dur: 2, text: 'YouTube transcript' },
            { start: 65, dur: 1, text: 'One minute mark' },
            { start: 125, dur: 2, text: 'Two minutes five seconds' },
        ];
        it('should successfully get transcript with video ID', async () => {
            mockGetSubtitles.mockResolvedValue(mockSubtitles);
            const result = await getYouTubeTranscript('dQw4w9WgXcQ', 'en');
            expect(mockGetSubtitles).toHaveBeenCalledWith({
                videoID: 'dQw4w9WgXcQ',
                lang: 'en',
            });
            expect(result.videoId).toBe('dQw4w9WgXcQ');
            expect(result.language).toBe('en');
            expect(result.transcript).toContain('[00:00] Hello world');
            expect(result.transcript).toContain('[00:02] This is a test');
            expect(result.transcript).toContain('[00:05] YouTube transcript');
            expect(result.transcript).toContain('[01:05] One minute mark');
            expect(result.transcript).toContain('[02:05] Two minutes five seconds');
        });
        it('should successfully get transcript with YouTube URL', async () => {
            mockGetSubtitles.mockResolvedValue(mockSubtitles);
            const result = await getYouTubeTranscript('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'es');
            expect(mockGetSubtitles).toHaveBeenCalledWith({
                videoID: 'dQw4w9WgXcQ',
                lang: 'es',
            });
            expect(result.videoId).toBe('dQw4w9WgXcQ');
            expect(result.language).toBe('es');
        });
        it('should handle short URL format', async () => {
            mockGetSubtitles.mockResolvedValue(mockSubtitles);
            const result = await getYouTubeTranscript('https://youtu.be/dQw4w9WgXcQ');
            expect(mockGetSubtitles).toHaveBeenCalledWith({
                videoID: 'dQw4w9WgXcQ',
                lang: 'en',
            });
            expect(result.videoId).toBe('dQw4w9WgXcQ');
        });
        it('should handle embed URL format', async () => {
            mockGetSubtitles.mockResolvedValue(mockSubtitles);
            const result = await getYouTubeTranscript('https://www.youtube.com/embed/dQw4w9WgXcQ');
            expect(mockGetSubtitles).toHaveBeenCalledWith({
                videoID: 'dQw4w9WgXcQ',
                lang: 'en',
            });
            expect(result.videoId).toBe('dQw4w9WgXcQ');
        });
        it('should default to English language', async () => {
            mockGetSubtitles.mockResolvedValue(mockSubtitles);
            const result = await getYouTubeTranscript('dQw4w9WgXcQ');
            expect(mockGetSubtitles).toHaveBeenCalledWith({
                videoID: 'dQw4w9WgXcQ',
                lang: 'en',
            });
            expect(result.language).toBe('en');
        });
        it('should throw error for invalid video ID', async () => {
            await expect(getYouTubeTranscript('invalid-id')).rejects.toThrow('Invalid YouTube video ID or URL');
        });
        it('should throw error for empty video ID', async () => {
            await expect(getYouTubeTranscript('')).rejects.toThrow('Invalid YouTube video ID or URL');
        });
        it('should handle API errors', async () => {
            mockGetSubtitles.mockRejectedValue(new Error('Video not found'));
            await expect(getYouTubeTranscript('dQw4w9WgXcQ')).rejects.toThrow('Video not found');
        });
        it('should handle empty subtitle response', async () => {
            mockGetSubtitles.mockResolvedValue([]);
            const result = await getYouTubeTranscript('dQw4w9WgXcQ');
            expect(result.transcript).toBe('');
        });
        it('should properly format transcript with multiple entries', async () => {
            mockGetSubtitles.mockResolvedValue(mockSubtitles);
            const result = await getYouTubeTranscript('dQw4w9WgXcQ');
            const lines = result.transcript.split('\n');
            expect(lines).toHaveLength(5);
            expect(lines[0]).toBe('[00:00] Hello world');
            expect(lines[1]).toBe('[00:02] This is a test');
            expect(lines[2]).toBe('[00:05] YouTube transcript');
            expect(lines[3]).toBe('[01:05] One minute mark');
            expect(lines[4]).toBe('[02:05] Two minutes five seconds');
        });
    });
    describe('End-to-end workflow', () => {
        it('should handle typical YouTube URL with various query parameters', async () => {
            const mockSubtitles = [
                { start: 30, dur: 5, text: 'Welcome to our tutorial' },
                { start: 35, dur: 4, text: 'Today we will learn about' },
            ];
            mockGetSubtitles.mockResolvedValue(mockSubtitles);
            const urlsToTest = [
                'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
                'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxyz&index=1',
                'https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ',
            ];
            for (const url of urlsToTest) {
                const result = await getYouTubeTranscript(url, 'en');
                expect(result.videoId).toBe('dQw4w9WgXcQ');
                expect(result.transcript).toContain('[00:30] Welcome to our tutorial');
                expect(result.transcript).toContain('[00:35] Today we will learn about');
            }
        });
        it('should work with different languages', async () => {
            const mockSubtitles = [
                { start: 0, dur: 3, text: 'Hola mundo' },
                { start: 3, dur: 4, text: 'Esto es una prueba' },
            ];
            mockGetSubtitles.mockResolvedValue(mockSubtitles);
            const result = await getYouTubeTranscript('dQw4w9WgXcQ', 'es');
            expect(mockGetSubtitles).toHaveBeenCalledWith({
                videoID: 'dQw4w9WgXcQ',
                lang: 'es',
            });
            expect(result.language).toBe('es');
            expect(result.transcript).toContain('[00:00] Hola mundo');
            expect(result.transcript).toContain('[00:03] Esto es una prueba');
        });
    });
});
//# sourceMappingURL=integration.test.js.map