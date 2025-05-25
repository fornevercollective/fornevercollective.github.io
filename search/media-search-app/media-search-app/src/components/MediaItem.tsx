import React from 'react';

interface MediaItemProps {
    media: {
        id: string;
        title: string;
        thumbnailUrl: string;
        type: 'image' | 'gif' | 'video';
        onClick: () => void;
    };
}

const MediaItem: React.FC<MediaItemProps> = ({ media }) => {
    return (
        <div className="media-item" onClick={media.onClick}>
            <img src={media.thumbnailUrl} alt={media.title} />
            <h3>{media.title}</h3>
        </div>
    );
};

export default MediaItem;