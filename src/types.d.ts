declare module 'headless-youtube-captions' {
  export interface Subtitle {
    start: number;
    dur: number;
    text: string;
  }

  export interface GetSubtitlesOptions {
    videoID: string;
    lang?: string;
  }

  export function getSubtitles(options: GetSubtitlesOptions): Promise<Subtitle[]>;
}