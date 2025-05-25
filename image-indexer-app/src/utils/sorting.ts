export const sortByFaceShape = (images, faceShape) => {
    return images.filter(image => image.faceShape === faceShape);
};

export const sortByPoseEstimation = (images, pose) => {
    return images.filter(image => image.pose === pose);
};

export const sortByColorVariant = (images, color) => {
    return images.filter(image => image.colorVariant === color);
};

export const sortByClothing = (images, clothingType) => {
    return images.filter(image => image.clothing === clothingType);
};

export const sortImages = (images, criteria) => {
    switch (criteria) {
        case 'faceShape':
            return sortByFaceShape(images, criteria.value);
        case 'pose':
            return sortByPoseEstimation(images, criteria.value);
        case 'color':
            return sortByColorVariant(images, criteria.value);
        case 'clothing':
            return sortByClothing(images, criteria.value);
        default:
            return images;
    }
};