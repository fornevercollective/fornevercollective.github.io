import axios from 'axios';

const API_ENDPOINTS = {
    // Add your image search API endpoints here
    unsplash: 'https://api.unsplash.com/photos',
    pexels: 'https://api.pexels.com/v1/search',
    // Add more APIs as needed
};

const fetchImagesFromUnsplash = async (query, page = 1, perPage = 30) => {
    const response = await axios.get(API_ENDPOINTS.unsplash, {
        params: {
            query,
            page,
            per_page: perPage,
        },
        headers: {
            Authorization: `Client-ID YOUR_UNSPLASH_ACCESS_KEY`,
        },
    });
    return response.data;
};

const fetchImagesFromPexels = async (query, page = 1, perPage = 30) => {
    const response = await axios.get(API_ENDPOINTS.pexels, {
        params: {
            query,
            page,
            per_page: perPage,
        },
        headers: {
            Authorization: `Bearer YOUR_PEXELS_ACCESS_KEY`,
        },
    });
    return response.data.photos;
};

// Add more fetch functions for other APIs as needed

export const fetchImages = async (query, page = 1, perPage = 30) => {
    const unsplashImages = await fetchImagesFromUnsplash(query, page, perPage);
    const pexelsImages = await fetchImagesFromPexels(query, page, perPage);
    
    // Combine and return images from all sources
    return [...unsplashImages, ...pexelsImages];
};