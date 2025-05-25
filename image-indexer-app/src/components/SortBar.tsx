import React, { useState } from 'react';

const SortBar = ({ onSortChange }) => {
    const [selectedSort, setSelectedSort] = useState('faceShape');

    const handleSortChange = (event) => {
        const value = event.target.value;
        setSelectedSort(value);
        onSortChange(value);
    };

    return (
        <div className="sort-bar">
            <select value={selectedSort} onChange={handleSortChange}>
                <option value="faceShape">Face Shape</option>
                <option value="poseEstimation">Pose Estimation</option>
                <option value="colorVariant">Color Variant</option>
                <option value="clothing">Clothing</option>
            </select>
        </div>
    );
};

export default SortBar;