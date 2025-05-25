export interface MediaItem {
    id: string;
    title: string;
    type: 'image' | 'gif' | 'video';
    thumbnailUrl: string;
    fullUrl: string;
}

export interface SearchResult {
    items: MediaItem[];
    totalResults: number;
    currentPage: number;
    totalPages: number;
}