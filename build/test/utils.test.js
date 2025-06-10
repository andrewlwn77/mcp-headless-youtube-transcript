import { describe, it, expect } from 'vitest';
import { extractVideoId, formatTime } from '../utils.js';
describe('extractVideoId', () => {
    it('should extract video ID from standard YouTube watch URL', () => {
        const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });
    it('should extract video ID from youtu.be short URL', () => {
        const url = 'https://youtu.be/dQw4w9WgXcQ';
        expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });
    it('should extract video ID from embed URL', () => {
        const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
        expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });
    it('should extract video ID from v/ URL format', () => {
        const url = 'https://www.youtube.com/v/dQw4w9WgXcQ';
        expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });
    it('should return the input if it is already a valid video ID', () => {
        const videoId = 'dQw4w9WgXcQ';
        expect(extractVideoId(videoId)).toBe('dQw4w9WgXcQ');
    });
    it('should handle URLs with additional query parameters', () => {
        const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120s';
        expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });
    it('should handle URLs without protocol', () => {
        const url = 'youtube.com/watch?v=dQw4w9WgXcQ';
        expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });
    it('should return null for invalid URLs', () => {
        const invalidUrl = 'https://example.com/video';
        expect(extractVideoId(invalidUrl)).toBeNull();
    });
    it('should return null for invalid video IDs', () => {
        const invalidId = 'invalidid';
        expect(extractVideoId(invalidId)).toBeNull();
    });
    it('should return null for empty string', () => {
        expect(extractVideoId('')).toBeNull();
    });
    it('should handle video IDs with special characters', () => {
        const videoId = 'dQw4w9WgX-Q';
        expect(extractVideoId(videoId)).toBe('dQw4w9WgX-Q');
    });
    it('should handle video IDs with underscores', () => {
        const videoId = 'dQw4w9Wg_cQ';
        expect(extractVideoId(videoId)).toBe('dQw4w9Wg_cQ');
    });
});
describe('formatTime', () => {
    it('should format seconds to MM:SS format', () => {
        expect(formatTime(0)).toBe('00:00');
        expect(formatTime(30)).toBe('00:30');
        expect(formatTime(60)).toBe('01:00');
        expect(formatTime(90)).toBe('01:30');
        expect(formatTime(3661)).toBe('61:01');
    });
    it('should handle single digit minutes and seconds', () => {
        expect(formatTime(9)).toBe('00:09');
        expect(formatTime(69)).toBe('01:09');
    });
    it('should handle large time values', () => {
        expect(formatTime(3600)).toBe('60:00'); // 1 hour
        expect(formatTime(7200)).toBe('120:00'); // 2 hours
    });
    it('should floor fractional seconds', () => {
        expect(formatTime(90.7)).toBe('01:30');
        expect(formatTime(90.9)).toBe('01:30');
    });
    it('should handle negative values by flooring them', () => {
        // Note: In practice, negative values shouldn't occur, but this tests the Math.floor behavior
        expect(formatTime(-1)).toBe('-1:-1');
    });
});
//# sourceMappingURL=utils.test.js.map