import React, { useState } from 'react';

interface DrilldownModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: string[]; // Array of image URLs
    currentLayer: number; // Current depth of drilldown
}

const DrilldownModal: React.FC<DrilldownModalProps> = ({ isOpen, onClose, images, currentLayer }) => {
    const [currentImages, setCurrentImages] = useState(images.slice(0, 100)); // Preload max 100 images

    const handleImageClick = (image: string) => {
        // Logic to handle image click and drill down
        if (currentLayer < 5) {
            // Fetch and set new images based on the clicked image
            // This is a placeholder for the actual image fetching logic
            const newImages = fetchImagesForDrilldown(image);
            setCurrentImages(newImages);
        }
    };

    const fetchImagesForDrilldown = (image: string): string[] => {
        // Placeholder function to simulate fetching images based on the clicked image
        return []; // Return new images based on the clicked image
    };

    return (
        <div className={`modal ${isOpen ? 'is-active' : ''}`}>
            <div className="modal-background" onClick={onClose}></div>
            <div className="modal-content">
                <div className="image-grid">
                    {currentImages.map((image, index) => (
                        <img
                            key={index}
                            src={image}
                            alt={`Drilldown image ${index}`}
                            onClick={() => handleImageClick(image)}
                        />
                    ))}
                </div>
            </div>
            <button className="modal-close is-large" aria-label="close" onClick={onClose}></button>
        </div>
    );
};

export default DrilldownModal;