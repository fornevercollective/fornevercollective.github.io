export const estimatePose = (image: HTMLImageElement): string => {
    // Placeholder function for pose estimation logic
    // This function should return a string representing the estimated pose
    return "neutral"; // Example return value
};

export const filterByPose = (images: Array<{ pose: string }>, targetPose: string): Array<{ pose: string }> => {
    return images.filter(image => image.pose === targetPose);
};

export const sortByPose = (images: Array<{ pose: string }>): Array<{ pose: string }> => {
    const poseOrder = ["neutral", "left", "right", "up", "down"];
    return images.sort((a, b) => poseOrder.indexOf(a.pose) - poseOrder.indexOf(b.pose));
};