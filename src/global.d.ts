declare module 'headless-youtube-captions' {
  export interface SubtitleSegment {
    start: string;
    dur: string;
    text: string;
  }

  export interface GetSubtitlesOptions {
    videoID: string;
    lang?: string;
  }

  export function getSubtitles(options: GetSubtitlesOptions): Promise<SubtitleSegment[]>;

  // Channel types
  export interface VideoInfo {
    id: string;
    title: string;
    views: string;
    uploadTime: string;
    duration: string;
    thumbnail: string;
    url: string;
  }

  export interface ChannelInfo {
    name: string;
    subscribers: string;
    videoCount: string;
  }

  export interface GetChannelVideosOptions {
    channelURL: string;
    limit?: number;
    pageToken?: string | null;
  }

  export interface ChannelVideosResult {
    channel: ChannelInfo;
    videos: VideoInfo[];
    totalLoaded: number;
    hasMore: boolean;
  }

  export function getChannelVideos(options: GetChannelVideosOptions): Promise<ChannelVideosResult>;

  export interface SearchChannelVideosOptions {
    channelURL: string;
    query: string;
    limit?: number;
  }

  export interface SearchChannelVideosResult {
    query: string;
    results: VideoInfo[];
    totalFound: number;
  }

  export function searchChannelVideos(options: SearchChannelVideosOptions): Promise<SearchChannelVideosResult>;

  // Comments types
  export interface Comment {
    author: string;
    authorUrl: string;
    authorAvatar: string;
    text: string;
    time: string;
    likes: string;
    replyCount: string;
  }

  export interface VideoDetails {
    id: string;
    title: string;
    channel: {
      name: string;
      url: string;
    };
    views: string;
  }

  export interface GetVideoCommentsOptions {
    videoID: string;
    limit?: number;
    sortBy?: 'top' | 'newest';
    pageToken?: string | null;
  }

  export interface VideoCommentsResult {
    video: VideoDetails;
    comments: Comment[];
    totalComments: number;
    totalLoaded: number;
    hasMore: boolean;
    sortBy: 'top' | 'newest';
  }

  export function getVideoComments(options: GetVideoCommentsOptions): Promise<VideoCommentsResult>;
}