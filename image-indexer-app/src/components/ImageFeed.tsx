import React, { useEffect, useState } from 'react';
import Thumbnail from './Thumbnail';
import SortBar from './SortBar';
import DrilldownModal from './DrilldownModal';
import { fetchImages } from '../utils/imageSearchApis';

const ImageFeed = () => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);
    const [sortCriteria, setSortCriteria] = useState('default');
    const [page, setPage] = useState(1);

    useEffect(() => {
        const loadImages = async () => {
            const newImages = await fetchImages(page);
            setImages(prevImages => [...prevImages, ...newImages]);
            setLoading(false);
        };

        loadImages();
    }, [page]);

    const handleImageClick = (image) => {
        setSelectedImage(image);
    };

    const handleCloseModal = () => {
        setSelectedImage(null);
    };

    const handleSortChange = (criteria) => {
        setSortCriteria(criteria);
        // Implement sorting logic based on criteria
    };

    return (
        <div className="image-feed">
            <SortBar onSortChange={handleSortChange} />
            <div className="thumbnails">
                {loading ? (
                    <p>Loading images...</p>
                ) : (
                    images.map((image) => (
                        <Thumbnail
                            key={image.id}
                            image={image}
                            onClick={() => handleImageClick(image)}
                        />
                    ))
                )}
            </div>
            {selectedImage && (
                <DrilldownModal
                    image={selectedImage}
                    onClose={handleCloseModal}
                />
            )}
            <button onClick={() => setPage(prevPage => prevPage + 1)}>
                Load More
            </button>
        </div>
    );
};

export default ImageFeed;