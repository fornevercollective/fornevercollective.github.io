import React from 'react';

interface ThumbnailProps {
    imageUrl: string;
    isGif: boolean;
    onClick: () => void;
}

const Thumbnail: React.FC<ThumbnailProps> = ({ imageUrl, isGif, onClick }) => {
    const handleClick = () => {
        if (isGif) {
            // Logic to autoplay GIF
        }
        onClick();
    };

    return (
        <div className="thumbnail" onClick={handleClick}>
            <img src={imageUrl} alt="Thumbnail" />
        </div>
    );
};

export default Thumbnail;