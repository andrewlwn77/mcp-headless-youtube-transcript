// Helper function to extract video ID from YouTube URL
export function extractVideoId(input: string): string | null {
  // If it's already just a video ID (11 characters), return it
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  // Extract from various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// Helper function to format time from seconds to MM:SS format
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Helper function to extract channel identifier from various YouTube channel URL formats
export function extractChannelIdentifier(input: string): string {
  // If it's already a channel ID (starts with UC) or a handle (starts with @)
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(input) || /^@[\w.-]+$/.test(input)) {
    return input;
  }

  // Extract from various YouTube channel URL formats
  const patterns = [
    /youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/,
    /youtube\.com\/c\/([^\/]+)/,
    /youtube\.com\/user\/([^\/]+)/,
    /youtube\.com\/(@[\w.-]+)/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // If no pattern matches, return the input as-is (might be a channel name)
  return input;
}

// Helper function to format/normalize channel URLs
export function formatChannelUrl(identifier: string): string {
  // If it's a handle, construct the URL with the handle
  if (identifier.startsWith('@')) {
    return `https://www.youtube.com/${identifier}`;
  }
  
  // If it's a channel ID, use the channel URL format
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(identifier)) {
    return `https://www.youtube.com/channel/${identifier}`;
  }
  
  // Otherwise, assume it's a custom URL/username
  return `https://www.youtube.com/c/${identifier}`;
}

// Helper function to truncate text for large responses
export function truncateText(text: string, maxLength: number = 50000): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength) + '\n\n[Content truncated due to length...]';
}