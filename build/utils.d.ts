export declare function extractVideoId(input: string): string | null;
export declare function formatTime(seconds: number): string;
export declare function extractChannelIdentifier(input: string): string;
export declare function formatChannelUrl(identifier: string): string;
export declare function truncateText(text: string, maxLength?: number): string;
export interface SearchResult {
    id: string;
    type: 'video' | 'channel';
    title: string;
    url: string;
    thumbnail?: string;
    channel?: string;
    views?: string;
    duration?: string;
    uploadTime?: string;
}
export declare const SEARCH_SELECTORS: {
    readonly searchInput: "input[name=\"search_query\"]";
    readonly searchButton: "button[aria-label=\"Search\"]";
    readonly resultsContainer: "#contents";
    readonly videoResult: "ytd-video-renderer";
    readonly channelResult: "ytd-channel-renderer";
    readonly videoTitle: "h3 a";
    readonly channelName: "#text a[href*=\"/channel/\"], #text a[href*=\"/@\"]";
    readonly thumbnail: "img";
    readonly metadata: "#metadata-line";
};
export declare function parseSearchResults(resultsHtml: string): SearchResult[];
export declare function isValidYouTubeUrl(url: string): boolean;
export declare function getSearchCacheKey(query: string, resultTypes: string[], maxResults: number): string;
//# sourceMappingURL=utils.d.ts.map