# Image Indexer App

## Overview
The Image Indexer App is a mobile-friendly web application designed to index and display thumbnails from various image search sites in an Instagram-style layout. The app allows users to explore images without visible metadata, click through to view larger images or GIFs with autoplay functionality, and sort images based on various criteria.

## Features
- **Instagram-style Layout**: Displays thumbnails in a grid format for easy browsing.
- **GIF Autoplay**: Click on GIF thumbnails to view them in an autoplay mode.
- **Drilldown Functionality**: Users can drill down up to five layers deep to explore more images.
- **Sorting Options**: Sort images based on face shape, pose estimation, color variant, and clothing.
- **Image Fetching**: Integrates with multiple image search APIs to fetch and display images.

## Project Structure
```
image-indexer-app
├── public
│   ├── index.html        # Main HTML entry point
│   └── favicon.ico       # Favicon for the website
├── src
│   ├── components
│   │   ├── ImageFeed.tsx # Component for displaying indexed thumbnails
│   │   ├── Thumbnail.tsx  # Component for individual image thumbnails
│   │   ├── SortBar.tsx    # Component for sorting options
│   │   └── DrilldownModal.tsx # Component for displaying additional details
│   ├── pages
│   │   └── Home.tsx      # Main page of the application
│   ├── utils
│   │   ├── imageSearchApis.ts # Functions to interact with image search APIs
│   │   ├── sorting.ts     # Utility functions for sorting images
│   │   └── poseEstimation.ts # Functions for pose estimation
│   ├── styles
│   │   └── main.css       # CSS styles for the application
│   ├── App.tsx            # Main application component
│   └── index.tsx          # Entry point for the React application
├── package.json           # npm configuration file
├── tsconfig.json          # TypeScript configuration file
└── README.md              # Project documentation
```

## Installation
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/image-indexer-app.git
   ```
2. Navigate to the project directory:
   ```
   cd image-indexer-app
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Usage
To start the development server, run:
```
npm start
```
Open your browser and navigate to `http://localhost:3000` to view the application.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any suggestions or improvements.

## License
This project is licensed under the MIT License. See the LICENSE file for details.