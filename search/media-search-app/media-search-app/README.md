# Media Search App

## Overview
The Media Search App is a mobile application that allows users to search for images, GIFs, and videos from various major providers. The app presents the search results in a user-friendly thumbnail format, making it easy to browse and select media items.

## Features
- Search functionality for images, GIFs, and videos.
- Display of search results in a grid format.
- Detailed view of selected media items.
- Responsive design for mobile devices.

## Project Structure
```
media-search-app
├── src
│   ├── components
│   │   ├── SearchBar.tsx
│   │   ├── ThumbnailGrid.tsx
│   │   └── MediaItem.tsx
│   ├── screens
│   │   ├── HomeScreen.tsx
│   │   └── DetailScreen.tsx
│   ├── services
│   │   ├── imageProvider.ts
│   │   ├── gifProvider.ts
│   │   └── videoProvider.ts
│   ├── types
│   │   └── index.ts
│   ├── App.tsx
│   └── navigation
│       └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Installation
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/media-search-app.git
   ```
2. Navigate to the project directory:
   ```
   cd media-search-app
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Usage
To start the application, run:
```
npm start
```
This will launch the app in your default web browser.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.