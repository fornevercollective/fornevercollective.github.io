import React from 'react';
import MediaItem from './MediaItem';

interface ThumbnailGridProps {
    mediaItems: Array<{
        id: string;
        title: string;
        thumbnailUrl: string;
        mediaType: 'image' | 'gif' | 'video';
    }>;
    onMediaItemClick: (id: string) => void;
}

const ThumbnailGrid: React.FC<ThumbnailGridProps> = ({ mediaItems, onMediaItemClick }) => {
    return (
        <div className="thumbnail-grid">
            {mediaItems.map(item => (
                <MediaItem
                    key={item.id}
                    mediaData={item}
                    onClick={() => onMediaItemClick(item.id)}
                />
            ))}
        </div>
    );
};

export default ThumbnailGrid;