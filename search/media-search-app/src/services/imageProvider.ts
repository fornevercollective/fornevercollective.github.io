import axios from 'axios';

const API_KEY = 'YOUR_API_KEY'; // Replace with your actual API key
const IMAGE_API_URL = 'https://api.example.com/images'; // Replace with the actual image API endpoint

export const fetchImages = async (query: string) => {
    try {
        const response = await axios.get(IMAGE_API_URL, {
            params: {
                q: query,
                key: API_KEY,
                image_type: 'photo',
                per_page: 10,
            },
        });
        return response.data.hits; // Adjust based on the actual API response structure
    } catch (error) {
        console.error('Error fetching images:', error);
        throw error;
    }
};