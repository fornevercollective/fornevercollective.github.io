import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import SearchBar from '../components/SearchBar';
import ThumbnailGrid from '../components/ThumbnailGrid';
import { MediaItem } from '../types';

const HomeScreen: React.FC = () => {
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    
    const handleSearch = (query: string) => {
        // Implement search logic to fetch media items based on the query
        // Update mediaItems state with the fetched results
    };

    return (
        <View style={styles.container}>
            <SearchBar onSearch={handleSearch} />
            <ThumbnailGrid mediaItems={mediaItems} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
});

export default HomeScreen;