import axios from 'axios';
import { VideoItem } from '../types';

const API_KEY = 'YOUR_VIDEO_PROVIDER_API_KEY'; // Replace with your actual API key
const BASE_URL = 'https://api.video-provider.com/v1/search'; // Replace with the actual video provider API URL

export const fetchVideos = async (query: string): Promise<VideoItem[]> => {
    try {
        const response = await axios.get(BASE_URL, {
            params: {
                api_key: API_KEY,
                query: query,
                type: 'video',
            },
        });
        return response.data.results.map((video: any) => ({
            id: video.id,
            title: video.title,
            thumbnail: video.thumbnail_url,
            url: video.video_url,
        }));
    } catch (error) {
        console.error('Error fetching videos:', error);
        throw error;
    }
};