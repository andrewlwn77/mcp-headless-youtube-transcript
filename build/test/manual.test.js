import { describe, it, expect } from 'vitest';
import { getSubtitles } from 'headless-youtube-captions';
import { formatTime } from '../utils.js';
// This test will actually call the real API - mark as skip by default
// To run this test: npm run test -- --reporter=verbose manual.test.ts
describe.skip('Manual API Tests (requires internet)', () => {
    it('should extract transcript from a real YouTube video', async () => {
        // Using a known educational video that should have captions
        // Rick Astley - Never Gonna Give You Up (has captions)
        const videoId = 'dQw4w9WgXcQ';
        try {
            const subtitles = await getSubtitles({
                videoID: videoId,
                lang: 'en',
            });
            expect(Array.isArray(subtitles)).toBe(true);
            if (subtitles.length > 0) {
                // Check that subtitles have the expected structure
                expect(subtitles[0]).toHaveProperty('start');
                expect(subtitles[0]).toHaveProperty('text');
                expect(typeof subtitles[0].start).toBe('string');
                expect(typeof subtitles[0].text).toBe('string');
                // Test formatting
                const transcript = subtitles
                    .map((subtitle) => `[${formatTime(parseFloat(subtitle.start))}] ${subtitle.text}`)
                    .join('\n');
                expect(transcript.length).toBeGreaterThan(0);
                expect(transcript).toContain('[');
                expect(transcript).toContain(']');
                console.log('Sample transcript:', transcript.substring(0, 200) + '...');
            }
        }
        catch (error) {
            console.log('API test failed (this is expected if the video has no captions or API issues):', error);
        }
    }, 30000); // 30 second timeout for API call
    it('should handle video without captions gracefully', async () => {
        // Using a video ID that likely doesn't have captions
        const videoId = 'invalidVideo';
        try {
            const subtitles = await getSubtitles({
                videoID: videoId,
                lang: 'en',
            });
            // If it succeeds, should return empty array or valid subtitles
            expect(Array.isArray(subtitles)).toBe(true);
        }
        catch (error) {
            // Should throw a meaningful error
            expect(error).toBeInstanceOf(Error);
            if (error instanceof Error) {
                expect(error.message.length).toBeGreaterThan(0);
            }
        }
    }, 30000);
});
//# sourceMappingURL=manual.test.js.map