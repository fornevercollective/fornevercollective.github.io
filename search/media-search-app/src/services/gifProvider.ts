import axios from 'axios';
import { GIFProviderResponse, MediaItem } from '../types';

const GIPHY_API_KEY = 'YOUR_GIPHY_API_KEY';
const GIPHY_URL = 'https://api.giphy.com/v1/gifs/search';

export const fetchGifs = async (query: string): Promise<MediaItem[]> => {
    try {
        const response = await axios.get<GIFProviderResponse>(GIPHY_URL, {
            params: {
                api_key: GIPHY_API_KEY,
                q: query,
                limit: 25,
                offset: 0,
                rating: 'G',
                lang: 'en'
            }
        });

        return response.data.data.map(gif => ({
            id: gif.id,
            title: gif.title,
            url: gif.images.fixed_height_small.url,
            type: 'gif'
        }));
    } catch (error) {
        console.error('Error fetching GIFs:', error);
        return [];
    }
};