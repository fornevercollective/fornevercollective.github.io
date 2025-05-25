import React from 'react';
import ImageFeed from '../components/ImageFeed';
import SortBar from '../components/SortBar';

const Home: React.FC = () => {
    return (
        <div className="home-container">
            <SortBar />
            <ImageFeed />
        </div>
    );
};

export default Home;