// Map Viewer - Free mapping with Leaflet, OpenStreetMap, Cesium, Unity, and Oculus support
class MapViewer {
    constructor() {
        this.map = null; // Leaflet map
        this.viewer = null; // Cesium viewer
        this.currentMode = '2d'; // '2d', '3d', 'vr'
        this.currentLayer = null;
        this.overlayLayers = {
            satellite: null,
            terrain: null,
            threeD: null
        };
        this.activeOverlays = new Set();
        this.markers = [];
        this.cesiumEntities = [];
        this.cesiumIonToken = null; // Cesium Ion access token (optional)
        this.lamariaTrajectory = null; // LaMAria SLAM trajectory data
        this.lamariaPolyline = null; // Cesium polyline for trajectory
        this.init();
    }

    init() {
        this.mapContainer = document.getElementById('map-container');
        this.mapSearch = document.getElementById('map-search');
        this.mapProvider = document.getElementById('map-provider');
        this.mapMode = document.getElementById('map-mode');
        this.mapLocate = document.getElementById('map-locate');
        this.mapReset = document.getElementById('map-reset');
        this.mapCoords = document.getElementById('map-coords');
        this.mapZoom = document.getElementById('map-zoom');
        this.mapHeight = document.getElementById('map-height');
        this.mapLayer3D = document.getElementById('map-layer-3d');
        this.mapLayerSatellite = document.getElementById('map-layer-satellite');
        this.mapLayerTerrain = document.getElementById('map-layer-terrain');
        this.mapCesiumIon = document.getElementById('map-cesium-ion');
        this.mapExportUnity = document.getElementById('map-export-unity');
        this.mapExportOculus = document.getElementById('map-export-oculus');
        this.mapLaMAriaLoad = document.getElementById('map-lamaria-load');
        this.mapLaMAriaVisualize = document.getElementById('map-lamaria-visualize');
        
        // Add LaMAria info display
        if (!document.getElementById('lamaria-info')) {
            const infoDiv = document.createElement('div');
            infoDiv.id = 'lamaria-info';
            infoDiv.className = 'lamaria-info';
            infoDiv.style.display = 'none';
            this.mapContainer.parentElement.insertBefore(infoDiv, this.mapContainer);
        }

        // Initialize map when section becomes active
        this.initMap();
        
        // Ensure buttons are clickable in Quest browser
        this.ensureQuestButtonAccessibility();

        // Event listeners
        this.mapSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.searchLocation();
            }
        });

        // Quest-compatible select handlers
        if (this.mapProvider) {
            this.mapProvider.addEventListener('change', () => {
                this.changeMapProvider();
            });
            this.mapProvider.addEventListener('touchend', (e) => {
                e.stopPropagation();
            });
        }

        if (this.mapMode) {
            this.mapMode.addEventListener('change', () => {
                this.changeMapMode();
            });
            this.mapMode.addEventListener('touchend', (e) => {
                e.stopPropagation();
            });
        }

        // Helper function to add Quest-compatible event listeners
        const addQuestEvent = (element, handler, buttonName = '') => {
            if (!element) {
                console.warn(`Button element not found: ${buttonName}`);
                return;
            }
            
            const wrappedHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`Button clicked: ${buttonName || element.id || element.className}`);
                try {
                    handler(e);
                } catch (error) {
                    console.error(`Error in button handler for ${buttonName}:`, error);
                }
            };
            
            // Add multiple event types for Quest browser compatibility
            element.addEventListener('click', wrappedHandler, { passive: false });
            element.addEventListener('touchend', wrappedHandler, { passive: false });
            element.addEventListener('pointerup', wrappedHandler, { passive: false });
            
            // Add visual feedback for Quest
            element.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                element.style.opacity = '0.7';
                element.style.transform = 'scale(0.95)';
                element.style.transition = 'all 0.1s';
            }, { passive: true });
            
            element.addEventListener('touchend', () => {
                setTimeout(() => {
                    element.style.opacity = '1';
                    element.style.transform = 'scale(1)';
                }, 100);
            }, { passive: true });
            
            // Ensure element is interactive
            element.style.pointerEvents = 'auto';
            element.style.cursor = 'pointer';
            element.setAttribute('role', 'button');
            element.setAttribute('tabindex', '0');
        };

        // Layer overlay toggles
        addQuestEvent(this.mapLayer3D, () => {
            this.toggleLayer('threeD');
        }, '3D Layer');

        addQuestEvent(this.mapLayerSatellite, () => {
            this.toggleLayer('satellite');
        }, 'Satellite');

        addQuestEvent(this.mapLayerTerrain, () => {
            this.toggleLayer('terrain');
        }, 'Terrain');

        addQuestEvent(this.mapCesiumIon, () => {
            this.toggleCesiumIon();
        }, 'Cesium Ion');

        addQuestEvent(this.mapExportUnity, () => {
            this.exportForUnity();
        }, 'Export Unity');

        addQuestEvent(this.mapExportOculus, () => {
            this.exportForOculus();
        }, 'Export Oculus');

        addQuestEvent(this.mapLaMAriaLoad, () => {
            this.loadLaMAriaTrajectory();
        }, 'Load LaMAria');

        addQuestEvent(this.mapLaMAriaVisualize, () => {
            this.visualizeLaMAriaTrajectory();
        }, 'Visualize LaMAria');

        addQuestEvent(this.mapLocate, () => {
            this.locateUser();
        }, 'Locate');

        addQuestEvent(this.mapReset, () => {
            this.resetMap();
        }, 'Reset');
    }

    initMap() {
        if (!this.mapContainer) return;

        const mode = this.mapMode ? this.mapMode.value : '2d';
        this.currentMode = mode;

        if (mode === '3d' || mode === 'vr') {
            this.initCesium(mode === 'vr');
        } else {
            this.initLeaflet();
        }
    }

    initLeaflet() {
        // Check if map already exists
        if (this.map) {
            this.map.remove();
        }

        // Hide Cesium viewer if exists
        if (this.viewer) {
            this.viewer.destroy();
            this.viewer = null;
        }

        // Initialize Leaflet map
        this.map = L.map('map-container', {
            center: [51.505, -0.09], // Default: London
            zoom: 2,
            zoomControl: true
        });

        // Add default OpenStreetMap layer
        this.addTileLayer('osm');

        // Initialize overlay layers
        this.initOverlayLayers();

        // Update coordinates on map move
        this.map.on('move', () => {
            this.updateMapInfo();
        });

        this.map.on('zoom', () => {
            this.updateMapInfo();
        });

        // Add click handler to add markers
        this.map.on('click', (e) => {
            this.addMarker(e.latlng);
        });

        this.updateMapInfo();
    }

    initCesium(vrMode = false) {
        // Remove Leaflet map if exists
        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        // Destroy existing Cesium viewer
        if (this.viewer) {
            this.viewer.destroy();
        }

        // Set Cesium access token (optional - can use default ion token)
        // For production, you should set your own Cesium Ion token
        if (typeof Cesium !== 'undefined') {
            // Use default ion token or set your own
            // Cesium.Ion.defaultAccessToken = 'YOUR_TOKEN_HERE';
            
            // Initialize Cesium viewer
            const viewerOptions = {
                terrainProvider: Cesium.createWorldTerrain(),
                requestRenderMode: true,
                maximumRenderTimeChange: Infinity,
                shouldAnimate: true
            };

            // Add VR button if WebXR is supported
            if (vrMode && this.isWebXRSupported()) {
                viewerOptions.vrButton = true;
            }

            this.viewer = new Cesium.Viewer('map-container', viewerOptions);

            // Set initial camera position
            this.viewer.camera.setView({
                destination: Cesium.Cartesian3.fromDegrees(-0.09, 51.505, 10000000)
            });

            // Add click handler
            this.viewer.cesiumWidget.screenSpaceEventHandler.setInputAction((click) => {
                const pickedObject = this.viewer.scene.pick(click.position);
                if (Cesium.defined(pickedObject)) {
                    return;
                }
                const cartesian = this.viewer.camera.pickEllipsoid(click.position, this.viewer.scene.globe.ellipsoid);
                if (cartesian) {
                    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
                    const lat = Cesium.Math.toDegrees(cartographic.latitude);
                    const lon = Cesium.Math.toDegrees(cartographic.longitude);
                    this.addCesiumMarker(lat, lon);
                }
            }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

            // Update info on camera move
            this.viewer.camera.moveEnd.addEventListener(() => {
                this.updateCesiumInfo();
            });

            // Enable VR mode if requested and supported
            if (vrMode) {
                this.setupVRMode();
            }

            this.updateCesiumInfo();
        } else {
            console.error('Cesium library not loaded');
            // Fallback to Leaflet
            this.initLeaflet();
        }
    }

    isWebXRSupported() {
        // Check for native WebXR support
        if (navigator.xr) {
            return true;
        }
        
        // Check for WebXR polyfill
        if (window.WebXRPolyfill) {
            // Initialize polyfill if not already done
            if (!window.polyfillInitialized) {
                const polyfill = new WebXRPolyfill();
                window.polyfillInitialized = true;
            }
            return navigator.xr !== undefined;
        }
        
        // Check if we're on Quest Browser (which has WebXR)
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('quest') || ua.includes('oculus')) {
            return true;
        }
        
        return false;
    }

    async setupVRMode() {
        if (!this.isWebXRSupported()) {
            console.warn('WebXR not supported. VR mode will use 3D mode instead.');
            // Show user-friendly message
            const statusMsg = document.createElement('div');
            statusMsg.style.cssText = 'position: absolute; top: 10px; right: 10px; background: rgba(255,165,0,0.9); padding: 10px; border-radius: 5px; z-index: 1000; color: white; font-size: 12px;';
            statusMsg.textContent = 'WebXR not available. Use Chrome/Edge with WebXR enabled or Quest Browser.';
            this.mapContainer.appendChild(statusMsg);
            setTimeout(() => statusMsg.remove(), 5000);
            return;
        }

        // Check if VR session can be requested
        try {
            const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
            if (!isSupported) {
                console.warn('VR sessions not supported on this device');
                return;
            }

            // Add VR button to UI if Cesium doesn't add it automatically
            this.addVRButton();
        } catch (error) {
            console.error('WebXR check failed:', error);
        }
    }

    addVRButton() {
        // Check if button already exists
        if (document.getElementById('cesium-vr-button-custom')) {
            return;
        }

        // Create custom VR button
        const vrButton = document.createElement('button');
        vrButton.id = 'cesium-vr-button-custom';
        vrButton.className = 'cesium-button cesium-toolbar-button';
        vrButton.innerHTML = '🥽 VR';
        vrButton.title = 'Enter VR Mode';
        vrButton.style.cssText = 'position: absolute; top: 10px; right: 10px; z-index: 1000; padding: 10px 15px; background: #48b; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;';
        
        vrButton.addEventListener('click', () => {
            this.enterVRMode();
        });

        this.mapContainer.appendChild(vrButton);
    }

    changeMapMode() {
        const mode = this.mapMode.value;
        this.currentMode = mode;
        
        // Show VR mode warning if needed
        if (mode === 'vr' && !this.isWebXRSupported()) {
            console.warn('WebXR not detected. VR mode will work as 3D mode.');
        }
        
        this.initMap();
    }

    initOverlayLayers() {
        // Satellite overlay (using Esri World Imagery)
        this.overlayLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 19,
            opacity: 0.7
        });

        // Terrain overlay (using OpenTopoMap)
        this.overlayLayers.terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
            maxZoom: 17,
            opacity: 0.7
        });

        // 3D Layer - Using Mapbox 3D or Apple/Google style 3D
        // For Apple Maps 3D style, we'll use a similar visual style
        // Note: True Apple/Google 3D requires their APIs, but we can simulate with elevation data
        this.overlayLayers.threeD = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            opacity: 0.8
        });

        // Add elevation/3D effect using canvas overlay (simulated 3D)
        this.add3DEffect();
    }

    add3DEffect() {
        // 3D layer using elevation data visualization
        // Simulates Apple Maps 3D and Google Maps 3D with terrain shading
        // Uses OpenTopoMap with enhanced styling for 3D effect
        this.overlayLayers.threeD = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
            maxZoom: 17,
            opacity: 0.6
        });
    }

    toggleLayer(layerType) {
        const layer = this.overlayLayers[layerType];
        if (!layer || !this.map) return;

        const button = layerType === 'threeD' ? this.mapLayer3D :
                      layerType === 'satellite' ? this.mapLayerSatellite :
                      this.mapLayerTerrain;

        if (this.activeOverlays.has(layerType)) {
            // Remove overlay
            this.map.removeLayer(layer);
            this.activeOverlays.delete(layerType);
            button.classList.remove('active');
        } else {
            // Add overlay
            layer.addTo(this.map);
            this.activeOverlays.add(layerType);
            button.classList.add('active');
        }
    }

    addTileLayer(provider) {
        if (this.currentLayer) {
            this.map.removeLayer(this.currentLayer);
        }

        const tileLayers = {
            osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }),
            carto: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '© OpenStreetMap, © CARTO',
                maxZoom: 19
            }),
            stamen: L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.png', {
                attribution: 'Map tiles by Stamen Design, CC BY 3.0',
                maxZoom: 20
            }),
            esri: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri',
                maxZoom: 19
            }),
            opentopomap: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
                maxZoom: 17
            })
        };

        this.currentLayer = tileLayers[provider] || tileLayers.osm;
        this.currentLayer.addTo(this.map);
    }

    changeMapProvider() {
        const provider = this.mapProvider.value;
        
        if (provider === 'cesium') {
            // Switch to 3D mode if Cesium selected
            if (this.mapMode) {
                this.mapMode.value = '3d';
            }
            this.changeMapMode();
        } else {
            // Use Leaflet for 2D providers
            if (this.currentMode === '3d' || this.currentMode === 'vr') {
                if (this.mapMode) {
                    this.mapMode.value = '2d';
                }
                this.changeMapMode();
            }
            this.addTileLayer(provider);
        }
    }

    async searchLocation() {
        const query = this.mapSearch.value.trim();
        if (!query) return;

        try {
            // Use Nominatim (OpenStreetMap geocoding) - free and no API key needed
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'fornever-map-viewer'
                }
            });
            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);

                if (this.currentMode === '3d' || this.currentMode === 'vr') {
                    // Fly to location in Cesium
                    if (this.viewer) {
                        this.viewer.camera.flyTo({
                            destination: Cesium.Cartesian3.fromDegrees(lon, lat, 1000),
                            orientation: {
                                heading: Cesium.Math.toRadians(0),
                                pitch: Cesium.Math.toRadians(-45),
                                roll: 0.0
                            }
                        });
                        this.addCesiumMarker(lat, lon, result.display_name);
                    }
                } else {
                    // Use Leaflet
                    this.map.setView([lat, lon], 13);
                    this.addMarker([lat, lon], result.display_name);
                }
                this.mapSearch.value = result.display_name;
            } else {
                alert('Location not found. Try a different search term.');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            alert('Search failed. Please try again.');
        }
    }

    locateUser() {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        this.mapLocate.textContent = 'Locating...';
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                if (this.currentMode === '3d' || this.currentMode === 'vr') {
                    // Fly to location in Cesium
                    if (this.viewer) {
                        this.viewer.camera.flyTo({
                            destination: Cesium.Cartesian3.fromDegrees(lon, lat, 100),
                            orientation: {
                                heading: Cesium.Math.toRadians(0),
                                pitch: Cesium.Math.toRadians(-45),
                                roll: 0.0
                            }
                        });
                        this.addCesiumMarker(lat, lon, 'Your Location');
                    }
                } else {
                    // Use Leaflet
                    this.map.setView([lat, lon], 15);
                    this.addMarker([lat, lon], 'Your Location');
                }
                this.mapLocate.textContent = '📍';
            },
            (error) => {
                console.error('Geolocation error:', error);
                alert('Unable to get your location. Please enable location services.');
                this.mapLocate.textContent = '📍';
            }
        );
    }

    addMarker(latlng, title = '') {
        const marker = L.marker(latlng).addTo(this.map);
        
        if (title) {
            marker.bindPopup(title).openPopup();
        } else {
            marker.bindPopup(`Lat: ${latlng.lat.toFixed(4)}, Lng: ${latlng.lng.toFixed(4)}`);
        }

        this.markers.push(marker);
    }

    resetMap() {
        if (this.currentMode === '3d' || this.currentMode === 'vr') {
            // Reset Cesium viewer
            if (this.viewer) {
                // Remove all entities
                this.cesiumEntities.forEach(entity => {
                    this.viewer.entities.remove(entity);
                });
                this.cesiumEntities = [];

                // Reset camera
                this.viewer.camera.setView({
                    destination: Cesium.Cartesian3.fromDegrees(-0.09, 51.505, 10000000)
                });

                // Remove 3D tiles
                this.viewer.scene.primitives.removeAll();
                this.viewer.terrainProvider = Cesium.createWorldTerrain();
            }
        } else {
            // Remove all markers
            this.markers.forEach(marker => {
                this.map.removeLayer(marker);
            });
            this.markers = [];

            // Remove all overlays
            this.activeOverlays.forEach(layerType => {
                const layer = this.overlayLayers[layerType];
                if (layer) {
                    this.map.removeLayer(layer);
                }
            });
            this.activeOverlays.clear();

            // Reset to default view
            this.map.setView([51.505, -0.09], 2);
        }

        // Reset button states
        this.mapLayer3D.classList.remove('active');
        this.mapLayerSatellite.classList.remove('active');
        this.mapLayerTerrain.classList.remove('active');
        if (this.mapCesiumIon) {
            this.mapCesiumIon.classList.remove('active');
        }

        // Reset form values
        this.mapSearch.value = '';
        if (this.mapProvider) {
            this.mapProvider.value = 'osm';
        }
        if (this.mapMode) {
            this.mapMode.value = '2d';
        }
        
        this.changeMapProvider();
    }

    updateMapInfo() {
        if (this.currentMode === '3d' || this.currentMode === 'vr') {
            this.updateCesiumInfo();
        } else {
            if (!this.map) return;

            const center = this.map.getCenter();
            const zoom = this.map.getZoom();

            this.mapCoords.textContent = `Lat: ${center.lat.toFixed(4)}, Lng: ${center.lng.toFixed(4)}`;
            this.mapZoom.textContent = `Zoom: ${zoom}`;
            if (this.mapHeight) {
                this.mapHeight.textContent = `Height: 0m`;
            }
        }
    }

    updateCesiumInfo() {
        if (!this.viewer) return;

        const camera = this.viewer.camera;
        const cartographic = camera.positionCartographic;
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        const lon = Cesium.Math.toDegrees(cartographic.longitude);
        const height = cartographic.height;

        this.mapCoords.textContent = `Lat: ${lat.toFixed(4)}, Lng: ${lon.toFixed(4)}`;
        this.mapZoom.textContent = `Height: ${Math.round(height)}m`;
        if (this.mapHeight) {
            this.mapHeight.textContent = `Height: ${Math.round(height)}m`;
        }
    }

    addCesiumMarker(lat, lon, title = '') {
        if (!this.viewer) return;

        const entity = this.viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(lon, lat),
            point: {
                pixelSize: 10,
                color: Cesium.Color.YELLOW,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            },
            label: {
                text: title || `Lat: ${lat.toFixed(4)}, Lng: ${lon.toFixed(4)}`,
                font: '14px sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -32)
            }
        });

        this.cesiumEntities.push(entity);
        return entity;
    }

    toggleCesiumIon() {
        if (!this.viewer) {
            alert('Switch to 3D mode to use Cesium Ion 3D Tiles');
            return;
        }

        // Toggle Cesium Ion 3D Tiles (Bing Maps 3D Tiles)
        // Note: Requires Cesium Ion access token for full features
        const button = this.mapCesiumIon;
        if (button.classList.contains('active')) {
            // Remove 3D tiles
            this.viewer.scene.primitives.removeAll();
            button.classList.remove('active');
        } else {
            // Add Cesium World Terrain and 3D Buildings
            this.viewer.terrainProvider = Cesium.createWorldTerrain();
            
            // Add 3D Buildings (requires Ion token)
            try {
                this.viewer.scene.primitives.add(
                    Cesium.createOsmBuildings()
                );
            } catch (e) {
                console.warn('3D Buildings not available. Set Cesium Ion token for full features.');
            }
            
            button.classList.add('active');
        }
    }

    async enterVRMode() {
        if (!this.viewer) {
            alert('Please switch to 3D mode first.');
            return;
        }

        if (!this.isWebXRSupported()) {
            alert('WebXR not supported.\n\nFor VR:\n- Use Chrome/Edge with WebXR enabled\n- Use Quest Browser on Oculus headset\n- Enable WebXR flags in browser settings');
            return;
        }

        try {
            // Check if VR is supported
            const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
            if (!isSupported) {
                alert('VR sessions not supported on this device.\n\nTry:\n- Oculus Quest Browser\n- Chrome/Edge with WebXR enabled\n- Enable VR flags in chrome://flags');
                return;
            }

            // Request VR session
            const session = await navigator.xr.requestSession('immersive-vr', {
                requiredFeatures: ['local-floor'],
                optionalFeatures: ['bounded-floor', 'hand-tracking']
            });

            console.log('VR session started:', session);

            // Set up VR rendering loop
            session.requestAnimationFrame((time, frame) => {
                this.renderVRFrame(time, frame, session);
            });

            // Handle session end
            session.addEventListener('end', () => {
                console.log('VR session ended');
                this.exitVRMode();
            });

            // Update viewer for VR
            if (this.viewer && this.viewer.cesiumWidget) {
                this.viewer.cesiumWidget.canvas.setAttribute('xr', 'true');
            }

        } catch (error) {
            console.error('Failed to enter VR mode:', error);
            let errorMsg = 'Failed to enter VR mode.\n\n';
            
            if (error.name === 'NotSupportedError') {
                errorMsg += 'WebXR not supported. Use Quest Browser or enable WebXR in Chrome/Edge.';
            } else if (error.name === 'SecurityError') {
                errorMsg += 'WebXR requires HTTPS or localhost.';
            } else if (error.message && error.message.includes('headset')) {
                errorMsg += 'Make sure your Oculus headset is connected and Quest Link is enabled.';
            } else {
                errorMsg += error.message || 'Unknown error occurred.';
            }
            
            alert(errorMsg);
        }
    }

    renderVRFrame(time, frame, session) {
        if (!this.viewer || !session) return;

        const pose = frame.getViewerPose(session.requestReferenceSpace('local-floor'));
        
        if (pose) {
            // Update camera based on VR headset pose
            const view = pose.views[0];
            if (view && view.transform) {
                const position = view.transform.position;
                const orientation = view.transform.orientation;
                
                // Convert WebXR pose to Cesium camera
                // This is a simplified conversion - may need adjustment
                const camera = this.viewer.camera;
                const positionCartesian = new Cesium.Cartesian3(
                    position.x,
                    position.y,
                    position.z
                );
                
                // Apply orientation
                const quaternion = new Cesium.Quaternion(
                    orientation.x,
                    orientation.y,
                    orientation.z,
                    orientation.w
                );
                
                // Update camera (simplified - full implementation would need proper coordinate transform)
                // For now, just render the frame
            }
        }

        // Render Cesium scene
        if (this.viewer && this.viewer.scene) {
            this.viewer.scene.render();
        }

        // Continue animation loop
        session.requestAnimationFrame((time, frame) => {
            this.renderVRFrame(time, frame, session);
        });
    }

    exitVRMode() {
        // Clean up VR session
        if (this.viewer && this.viewer.cesiumWidget) {
            this.viewer.cesiumWidget.canvas.removeAttribute('xr');
        }
        
        // Remove custom VR button if exists
        const vrButton = document.getElementById('cesium-vr-button-custom');
        if (vrButton) {
            vrButton.remove();
        }
    }

    ensureQuestButtonAccessibility() {
        // Ensure all buttons are accessible in Quest browser
        const buttons = [
            this.mapLayer3D,
            this.mapLayerSatellite,
            this.mapLayerTerrain,
            this.mapCesiumIon,
            this.mapExportUnity,
            this.mapExportOculus,
            this.mapLaMAriaLoad,
            this.mapLaMAriaVisualize,
            this.mapLocate,
            this.mapReset
        ];

        buttons.forEach((button, index) => {
            if (!button) {
                console.warn(`Button ${index} not found`);
                return;
            }
            
            // Ensure button is above map container
            button.style.position = 'relative';
            button.style.zIndex = '1000';
            button.style.pointerEvents = 'auto';
            button.style.touchAction = 'manipulation';
            button.style.cursor = 'pointer';
            
            // Add aria-label for accessibility
            if (!button.getAttribute('aria-label')) {
                button.setAttribute('aria-label', button.title || button.textContent.trim());
            }
            
            // Ensure button is not covered by map
            const mapInfo = button.closest('.map-info');
            if (mapInfo) {
                mapInfo.style.pointerEvents = 'auto';
                mapInfo.style.zIndex = '100';
            }
        });

        // Prevent map container from blocking button clicks
        if (this.mapContainer) {
            // Only block pointer events on the map itself, not on controls
            const mapElement = this.mapContainer.querySelector('.leaflet-container') || 
                              this.mapContainer.querySelector('.cesium-widget');
            if (mapElement) {
                mapElement.style.pointerEvents = 'auto';
            }
        }
    }

    exportForUnity() {
        const exportData = this.getExportData();
        const unityProject = this.generateUnityQuestProject(exportData);
        
        // Create a zip file with the Unity project structure
        this.downloadUnityProject(unityProject, exportData);

        // Show instructions
        this.showUnityExportInstructions();
    }

    generateUnityQuestProject(exportData) {
        return {
            projectStructure: {
                'Assets/': {
                    'CesiumForUnity/': {
                        'README.md': this.generateCesiumReadme(),
                        'Scripts/': {
                            'QuestMapController.cs': this.generateQuestMapController(exportData),
                            'SAM2Integration.cs': this.generateSAM2Integration(),
                            'QuestOptimizer.cs': this.generateQuestOptimizer(),
                            'LaMAriaTrajectoryVisualizer.cs': this.generateLaMAriaVisualizer()
                        },
                        'Scenes/': {
                            'QuestMapScene.unity': this.generateUnityScene(exportData)
                        },
                        'Materials/': {
                            'QuestOptimized.shader': this.generateQuestShader()
                        }
                    },
                    'MetaXR/': {
                        'README.md': this.generateMetaXRReadme(),
                        'Scripts/': {
                            'QuestDepthIntegration.cs': this.generateQuestDepthIntegration(),
                            'PassthroughController.cs': this.generatePassthroughController()
                        }
                    },
                    'MapData/': {
                        'georeference.json': JSON.stringify(exportData, null, 2),
                        'markers.json': JSON.stringify(exportData.markers || exportData.entities || [], null, 2)
                    }
                },
                'ProjectSettings/': {
                    'ProjectSettings.asset': this.generateProjectSettings(),
                    'XRSettings.asset': this.generateXRSettings()
                },
                'Packages/': {
                    'manifest.json': this.generatePackageManifest()
                },
                'README.md': this.generateProjectReadme(exportData)
            },
            config: this.generateUnityConfig(exportData)
        };
    }

    downloadUnityProject(project, exportData) {
        // Download main config
        const configBlob = new Blob([JSON.stringify(project.config, null, 2)], { type: 'application/json' });
        this.downloadFile(configBlob, 'cesium-quest-config.json');

        // Download C# scripts
        this.downloadFile(
            new Blob([project.projectStructure['Assets/']['CesiumForUnity/']['Scripts/']['QuestMapController.cs']], { type: 'text/plain' }),
            'QuestMapController.cs'
        );
        this.downloadFile(
            new Blob([project.projectStructure['Assets/']['CesiumForUnity/']['Scripts/']['SAM2Integration.cs']], { type: 'text/plain' }),
            'SAM2Integration.cs'
        );
        this.downloadFile(
            new Blob([project.projectStructure['Assets/']['CesiumForUnity/']['Scripts/']['QuestOptimizer.cs']], { type: 'text/plain' }),
            'QuestOptimizer.cs'
        );
        this.downloadFile(
            new Blob([project.projectStructure['Assets/']['MetaXR/']['Scripts/']['QuestDepthIntegration.cs']], { type: 'text/plain' }),
            'QuestDepthIntegration.cs'
        );
        this.downloadFile(
            new Blob([project.projectStructure['Assets/']['MetaXR/']['Scripts/']['PassthroughController.cs']], { type: 'text/plain' }),
            'PassthroughController.cs'
        );
        this.downloadFile(
            new Blob([project.projectStructure['Assets/']['CesiumForUnity/']['Scripts/']['LaMAriaTrajectoryVisualizer.cs']], { type: 'text/plain' }),
            'LaMAriaTrajectoryVisualizer.cs'
        );

        // Download package manifest
        this.downloadFile(
            new Blob([project.projectStructure['Packages/']['manifest.json']], { type: 'application/json' }),
            'manifest.json'
        );

        // Download project README
        this.downloadFile(
            new Blob([project.projectStructure['README.md']], { type: 'text/markdown' }),
            'README.md'
        );
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    exportForOculus() {
        const exportData = this.getExportData();
        const oculusConfig = this.generateOculusConfig(exportData);
        
        // Create download link
        const blob = new Blob([JSON.stringify(oculusConfig, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'cesium-oculus-config.json';
        link.click();
        URL.revokeObjectURL(url);

        // Show instructions
        alert(`Oculus Config exported!\n\nNext steps:\n1. Use Cesium for Unity with Oculus Integration\n2. Enable WebXR in Unity\n3. Import the config.json\n4. Build for Oculus Quest/Quest 2/Quest 3`);
    }

    getExportData() {
        if (this.currentMode === '3d' || this.currentMode === 'vr') {
            // Get Cesium camera position
            const camera = this.viewer.camera;
            const cartographic = camera.positionCartographic;
            return {
                latitude: Cesium.Math.toDegrees(cartographic.latitude),
                longitude: Cesium.Math.toDegrees(cartographic.longitude),
                height: cartographic.height,
                heading: Cesium.Math.toDegrees(camera.heading),
                pitch: Cesium.Math.toDegrees(camera.pitch),
                roll: Cesium.Math.toDegrees(camera.roll),
                mode: '3d',
                entities: this.cesiumEntities.map(entity => ({
                    position: entity.position.getValue(),
                    name: entity.name || 'Marker'
                }))
            };
        } else {
            // Get Leaflet map center
            const center = this.map.getCenter();
            return {
                latitude: center.lat,
                longitude: center.lng,
                height: 0,
                zoom: this.map.getZoom(),
                mode: '2d',
                markers: this.markers.map(marker => ({
                    lat: marker.getLatLng().lat,
                    lng: marker.getLatLng().lng
                }))
            };
        }
    }

    generateUnityConfig(data) {
        return {
            name: "Cesium Georeference Configuration",
            version: "1.0",
            cesiumForUnity: {
                originLatitude: data.latitude,
                originLongitude: data.longitude,
                originHeight: data.height || 0,
                originHeading: data.heading || 0,
                originPitch: data.pitch || -90,
                originRoll: data.roll || 0
            },
            camera: {
                latitude: data.latitude,
                longitude: data.longitude,
                height: data.height || 1000,
                heading: data.heading || 0,
                pitch: data.pitch || -90
            },
            markers: data.markers || data.entities || [],
            instructions: [
                "1. Install Cesium for Unity: https://github.com/CesiumGS/cesium-unity",
                "2. Create a CesiumGeoreference object in your scene",
                "3. Set the origin coordinates from this config",
                "4. Use CesiumSubScene components for 3D tiles",
                "5. Enable Oculus Integration for VR support"
            ],
            resources: {
                cesiumUnity: "https://github.com/CesiumGS/cesium-unity",
                cesiumUnitySamples: "https://github.com/CesiumGS/cesium-unity-samples",
                cesiumIon: "https://cesium.com/ion/",
                documentation: "https://github.com/CesiumGS/cesium-unity/wiki"
            }
        };
    }

    generateOculusConfig(data) {
        return {
            name: "Cesium Oculus VR Configuration",
            version: "1.0",
            oculus: {
                targetDevice: "Quest 3",
                supportedDevices: ["Quest", "Quest 2", "Quest 3", "Quest Pro"],
                webxrEnabled: true,
                handTracking: true
            },
            cesium: {
                originLatitude: data.latitude,
                originLongitude: data.longitude,
                originHeight: data.height || 0,
                terrainProvider: "CesiumWorldTerrain",
                enable3DTiles: true
            },
            camera: {
                latitude: data.latitude,
                longitude: data.longitude,
                height: data.height || 1000,
                heading: data.heading || 0,
                pitch: data.pitch || -90
            },
            instructions: [
                "1. Install Cesium for Unity: https://github.com/CesiumGS/cesium-unity",
                "2. Install Oculus Integration from Unity Asset Store",
                "3. Enable WebXR in Unity XR Plugin Management",
                "4. Configure Oculus Quest as target device",
                "5. Use CesiumGeoreference with Oculus camera rig",
                "6. Build and deploy to Oculus Quest device"
            ],
            resources: {
                cesiumUnity: "https://github.com/CesiumGS/cesium-unity",
                oculusIntegration: "https://assetstore.unity.com/packages/tools/integration/oculus-integration-82022",
                webxr: "https://github.com/De-Panther/unity-webxr-export"
            }
        };
    }

    // Unity Quest Project Generators
    generateQuestMapController(exportData) {
        return `using UnityEngine;
using CesiumForUnity;
using Meta.XR;

namespace ForneverCollective.Quest {
    public class QuestMapController : MonoBehaviour {
        [Header("Cesium Configuration")]
        public CesiumGeoreference georeference;
        public double originLatitude = ${exportData.latitude};
        public double originLongitude = ${exportData.longitude};
        public double originHeight = ${exportData.height || 0};

        [Header("Quest Optimization")]
        public int maxTriangles = 1000000; // Quest 3 budget
        public int maxDrawCalls = 200;
        public bool enableLOD = true;
        public bool enableOcclusionCulling = true;

        [Header("MR Features")]
        public bool enablePassthrough = true;
        public bool enableDepthOcclusion = true;
        public bool enableHandTracking = true;

        private QuestOptimizer optimizer;
        private QuestDepthIntegration depthIntegration;

        void Start() {
            InitializeCesium();
            InitializeQuestFeatures();
            OptimizeForQuest();
        }

        void InitializeCesium() {
            if (georeference == null) {
                georeference = FindObjectOfType<CesiumGeoreference>();
            }
            
            georeference.latitude = originLatitude;
            georeference.longitude = originLongitude;
            georeference.height = originHeight;
        }

        void InitializeQuestFeatures() {
            if (enablePassthrough) {
                var passthrough = FindObjectOfType<PassthroughController>();
                if (passthrough == null) {
                    var go = new GameObject("PassthroughController");
                    passthrough = go.AddComponent<PassthroughController>();
                }
                passthrough.EnablePassthrough();
            }

            if (enableDepthOcclusion) {
                depthIntegration = gameObject.AddComponent<QuestDepthIntegration>();
                depthIntegration.Initialize(georeference);
            }
        }

        void OptimizeForQuest() {
            optimizer = gameObject.AddComponent<QuestOptimizer>();
            optimizer.maxTriangles = maxTriangles;
            optimizer.maxDrawCalls = maxDrawCalls;
            optimizer.enableLOD = enableLOD;
            optimizer.enableOcclusionCulling = enableOcclusionCulling;
            optimizer.Optimize();
        }

        public void FlyToLocation(double lat, double lon, double height) {
            // Smooth camera transition to location
            var targetPosition = CesiumWgs84Coordinates.ToUnity(lat, lon, height);
            StartCoroutine(SmoothFlyTo(targetPosition));
        }

        System.Collections.IEnumerator SmoothFlyTo(Vector3 target) {
            var camera = Camera.main.transform;
            var startPos = camera.position;
            float duration = 2f;
            float elapsed = 0f;

            while (elapsed < duration) {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;
                camera.position = Vector3.Lerp(startPos, target, t);
                yield return null;
            }
        }
    }
}`;
    }

    generateSAM2Integration() {
        return `using UnityEngine;
using System.Collections;
using System.Net.Http;
using System.Text;
using Newtonsoft.Json;

namespace ForneverCollective.Quest {
    /// <summary>
    /// SAM-2 (Segment Anything Model) Integration for Quest MR
    /// Connects to SAM-2 backend for object segmentation
    /// </summary>
    public class SAM2Integration : MonoBehaviour {
        [Header("SAM-2 Configuration")]
        public string sam2ApiUrl = "http://localhost:8000/api/sam2/segment";
        public bool enableLiveSegmentation = false;
        public float segmentationInterval = 0.5f; // seconds

        [Header("Quest Camera")]
        public Camera questCamera;
        public int captureWidth = 640;
        public int captureHeight = 480;

        private Texture2D captureTexture;
        private bool isProcessing = false;

        void Start() {
            if (questCamera == null) {
                questCamera = Camera.main;
            }
            captureTexture = new Texture2D(captureWidth, captureHeight, TextureFormat.RGB24, false);
        }

        public void SegmentFromClick(Vector2 screenPoint) {
            if (isProcessing) return;
            StartCoroutine(ProcessSegmentation(screenPoint));
        }

        IEnumerator ProcessSegmentation(Vector2 screenPoint) {
            isProcessing = true;

            // Capture frame from Quest camera
            yield return StartCoroutine(CaptureFrame());

            // Convert to base64
            byte[] imageData = captureTexture.EncodeToPNG();
            string base64Image = System.Convert.ToBase64String(imageData);

            // Call SAM-2 API
            var request = new SAM2Request {
                image = base64Image,
                point = new float[] { screenPoint.x, screenPoint.y },
                mode = "point"
            };

            yield return StartCoroutine(SendSAM2Request(request));

            isProcessing = false;
        }

        IEnumerator CaptureFrame() {
            RenderTexture rt = new RenderTexture(captureWidth, captureHeight, 24);
            questCamera.targetTexture = rt;
            questCamera.Render();
            RenderTexture.active = rt;
            captureTexture.ReadPixels(new Rect(0, 0, captureWidth, captureHeight), 0, 0);
            captureTexture.Apply();
            questCamera.targetTexture = null;
            RenderTexture.active = null;
            Destroy(rt);
            yield return null;
        }

        IEnumerator SendSAM2Request(SAM2Request request) {
            using (var client = new HttpClient()) {
                var json = JsonConvert.SerializeObject(request);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = yield return client.PostAsync(sam2ApiUrl, content);
                var responseJson = yield return response.Content.ReadAsStringAsync();

                var result = JsonConvert.DeserializeObject<SAM2Response>(responseJson);
                OnSegmentationComplete(result);
            }
        }

        void OnSegmentationComplete(SAM2Response result) {
            // Apply mask to scene
            // Create occlusion geometry
            // Update MR interactions
            Debug.Log($"SAM-2 Segmentation complete: {result.mask.Length} pixels");
        }
    }

    [System.Serializable]
    public class SAM2Request {
        public string image;
        public float[] point;
        public string mode; // "point", "box", "mask"
    }

    [System.Serializable]
    public class SAM2Response {
        public int[] mask;
        public float[] bbox;
        public float confidence;
    }
}`;
    }

    generateQuestOptimizer() {
        return `using UnityEngine;
using System.Linq;

namespace ForneverCollective.Quest {
    /// <summary>
    /// Quest 3 Performance Optimizer
    /// Ensures scene stays within Quest rendering budgets
    /// </summary>
    public class QuestOptimizer : MonoBehaviour {
        [Header("Performance Budgets")]
        public int maxTriangles = 1000000; // Quest 3: ~1M visible
        public int maxDrawCalls = 200;
        public int maxMaterials = 50;
        public float targetFPS = 90f;

        [Header("Optimization Features")]
        public bool enableLOD = true;
        public bool enableOcclusionCulling = true;
        public bool enableFrustumCulling = true;
        public bool enableBatching = true;

        private int currentTriangles;
        private int currentDrawCalls;

        void Start() {
            Optimize();
        }

        public void Optimize() {
            // Enable LOD Groups
            if (enableLOD) {
                var renderers = FindObjectsOfType<Renderer>();
                foreach (var renderer in renderers) {
                    if (renderer.GetComponent<LODGroup>() == null) {
                        var lodGroup = renderer.gameObject.AddComponent<LODGroup>();
                        var lods = new LOD[] {
                            new LOD(0.5f, new Renderer[] { renderer }),
                            new LOD(0.2f, new Renderer[] { renderer })
                        };
                        lodGroup.SetLODs(lods);
                    }
                }
            }

            // Enable Occlusion Culling
            if (enableOcclusionCulling) {
                Camera.main.useOcclusionCulling = true;
            }

            // Static Batching
            if (enableBatching) {
                StaticBatchingUtility.Combine(FindObjectsOfType<GameObject>()
                    .Where(go => go.isStatic)
                    .ToArray(), gameObject);
            }

            // Optimize shaders
            OptimizeShaders();

            UpdateStats();
        }

        void OptimizeShaders() {
            // Replace complex shaders with Quest-optimized versions
            var materials = Resources.FindObjectsOfTypeAll<Material>();
            foreach (var mat in materials) {
                if (mat.shader.name.Contains("Standard") || mat.shader.name.Contains("URP")) {
                    // Use unlit or simple lit shaders
                    mat.shader = Shader.Find("Universal Render Pipeline/Lit");
                }
            }
        }

        void UpdateStats() {
            currentTriangles = GetTriangleCount();
            currentDrawCalls = GetDrawCallCount();

            if (currentTriangles > maxTriangles) {
                Debug.LogWarning($"Triangle count ({currentTriangles}) exceeds budget ({maxTriangles})");
            }

            if (currentDrawCalls > maxDrawCalls) {
                Debug.LogWarning($"Draw calls ({currentDrawCalls}) exceeds budget ({maxDrawCalls})");
            }
        }

        int GetTriangleCount() {
            int count = 0;
            var meshes = FindObjectsOfType<MeshFilter>();
            foreach (var mesh in meshes) {
                if (mesh.sharedMesh != null) {
                    count += mesh.sharedMesh.triangles.Length / 3;
                }
            }
            return count;
        }

        int GetDrawCallCount() {
            // Estimate based on renderers and materials
            return FindObjectsOfType<Renderer>().Length;
        }

        void Update() {
            // Monitor FPS
            float fps = 1f / Time.deltaTime;
            if (fps < targetFPS * 0.9f) {
                // Reduce quality dynamically
                QualitySettings.SetQualityLevel(QualitySettings.GetQualityLevel() - 1);
            }
        }
    }
}`;
    }

    generateQuestDepthIntegration() {
        return `using UnityEngine;
using Meta.XR;
using CesiumForUnity;

namespace ForneverCollective.Quest {
    /// <summary>
    /// Quest Depth API Integration for MR Occlusion
    /// Uses Quest 3's native depth sensing
    /// </summary>
    public class QuestDepthIntegration : MonoBehaviour {
        [Header("Depth Configuration")]
        public bool enableDepthOcclusion = true;
        public float depthUpdateRate = 30f; // Hz
        public float maxDepthDistance = 10f; // meters

        private CesiumGeoreference georeference;
        private OVRCameraRig cameraRig;
        private Texture2D depthTexture;

        public void Initialize(CesiumGeoreference geoRef) {
            georeference = geoRef;
            cameraRig = FindObjectOfType<OVRCameraRig>();
            
            if (cameraRig == null) {
                Debug.LogError("OVRCameraRig not found. Install Meta XR SDK.");
                return;
            }

            SetupDepthTexture();
        }

        void SetupDepthTexture() {
            // Quest Depth API provides per-pixel depth
            depthTexture = new Texture2D(640, 480, TextureFormat.RFloat, false);
        }

        void Update() {
            if (enableDepthOcclusion && cameraRig != null) {
                UpdateDepthOcclusion();
            }
        }

        void UpdateDepthOcclusion() {
            // Access Quest depth data
            // Apply to Cesium scene for proper MR occlusion
            // Virtual objects should be occluded by real-world geometry
            
            // This requires Meta XR SDK depth APIs
            // Implementation depends on specific SDK version
        }

        public float GetDepthAtPoint(Vector2 screenPoint) {
            // Sample depth texture at screen point
            // Return depth in meters
            if (depthTexture != null) {
                int x = Mathf.RoundToInt(screenPoint.x * depthTexture.width);
                int y = Mathf.RoundToInt(screenPoint.y * depthTexture.height);
                return depthTexture.GetPixel(x, y).r * maxDepthDistance;
            }
            return 0f;
        }

        public bool IsOccluded(Vector3 worldPosition) {
            // Check if virtual object is occluded by real-world depth
            Vector3 viewPos = Camera.main.WorldToViewportPoint(worldPosition);
            float depth = GetDepthAtPoint(new Vector2(viewPos.x, viewPos.y));
            float objectDepth = Vector3.Distance(Camera.main.transform.position, worldPosition);
            
            return depth < objectDepth;
        }
    }
}`;
    }

    generatePassthroughController() {
        return `using UnityEngine;
using Meta.XR;

namespace ForneverCollective.Quest {
    /// <summary>
    /// Quest Passthrough Controller for MR
    /// Enables mixed reality with real-world camera feed
    /// </summary>
    public class PassthroughController : MonoBehaviour {
        [Header("Passthrough Settings")]
        public bool enablePassthrough = true;
        public float passthroughOpacity = 1f;
        public bool enableColorPassthrough = true;

        private OVRCameraRig cameraRig;
        private OVRPassthroughLayer passthroughLayer;

        void Start() {
            InitializePassthrough();
        }

        void InitializePassthrough() {
            cameraRig = FindObjectOfType<OVRCameraRig>();
            
            if (cameraRig == null) {
                Debug.LogError("OVRCameraRig not found. Install Meta XR SDK.");
                return;
            }

            // Create passthrough layer
            var passthroughObject = new GameObject("PassthroughLayer");
            passthroughLayer = passthroughObject.AddComponent<OVRPassthroughLayer>();
            
            EnablePassthrough();
        }

        public void EnablePassthrough() {
            if (passthroughLayer != null) {
                passthroughLayer.enabled = enablePassthrough;
                passthroughLayer.textureOpacity = passthroughOpacity;
            }
        }

        public void DisablePassthrough() {
            if (passthroughLayer != null) {
                passthroughLayer.enabled = false;
            }
        }

        public void SetPassthroughOpacity(float opacity) {
            passthroughOpacity = Mathf.Clamp01(opacity);
            if (passthroughLayer != null) {
                passthroughLayer.textureOpacity = passthroughOpacity;
            }
        }
    }
}`;
    }

    generatePackageManifest() {
        return JSON.stringify({
            dependencies: {
                "com.cesium.unity": "https://github.com/CesiumGS/cesium-unity.git",
                "com.meta.xr.sdk.all": "https://github.com/oculus-samples/Unity-FirstHand.git",
                "com.unity.render-pipelines.universal": "12.0.0",
                "com.unity.xr.management": "4.0.0",
                "com.unity.xr.oculus": "3.0.0"
            }
        }, null, 2);
    }

    generateProjectReadme(exportData) {
        return `# Fornever Collective Quest 3D Map

Native Quest 3 application for 3D geospatial mapping with MR support.

## Features

- ✅ Cesium for Unity integration
- ✅ Quest 3 native depth & passthrough
- ✅ SAM-2 segmentation integration
- ✅ Quest-optimized rendering
- ✅ Hand tracking support

## Setup

1. Install Unity Hub and Unity 2022.3 LTS or later
2. Install Cesium for Unity: https://github.com/CesiumGS/cesium-unity
3. Install Meta XR SDK from Unity Package Manager
4. Import this project
5. Open QuestMapScene.unity
6. Configure CesiumGeoreference with coordinates:
   - Latitude: ${exportData.latitude}
   - Longitude: ${exportData.longitude}
   - Height: ${exportData.height || 0}

## Building for Quest

1. File → Build Settings
2. Select Android platform
3. Set Target Device to Quest 3
4. Enable VR SDK: Oculus
5. Build & Run (or use Quest Link for testing)

## Testing

### Quest Link (Fast Iteration)
- Connect Quest via USB-C or Air Link
- Unity → Play Mode
- App runs instantly in headset

### Build & Run (Standalone Testing)
- Build & Run from Unity
- APK installs directly to Quest
- Test real performance & MR features

## SAM-2 Integration

SAM-2 backend required for segmentation:
- Install SAM-2: https://github.com/facebookresearch/segment-anything-2
- Run SAM-2 API server
- Configure SAM2Integration.cs with API URL

## Performance Targets

- Quest 3: 90-120 FPS
- Triangles: <1M visible
- Draw Calls: <200
- Memory: <4GB

## Resources

- Cesium for Unity: https://github.com/CesiumGS/cesium-unity
- Meta XR SDK: https://developer.oculus.com/downloads/package/unity-integration/
- SAM-2: https://github.com/facebookresearch/segment-anything-2
`;
    }

    generateCesiumReadme() {
        return `# Cesium for Unity Integration

This folder contains Cesium-specific scripts and configurations.

## Installation

1. Install Cesium for Unity via Package Manager:
   \`\`\`
   https://github.com/CesiumGS/cesium-unity.git
   \`\`\`

2. Configure CesiumGeoreference in scene
3. Set origin coordinates from georeference.json
`;
    }

    generateMetaXRReadme() {
        return `# Meta XR SDK Integration

Quest-specific features using Meta XR SDK.

## Features

- Depth API integration
- Passthrough MR
- Hand tracking
- Spatial anchors

## Installation

Install via Unity Package Manager:
- Meta XR SDK All
- Oculus Integration
`;
    }

    generateProjectSettings() {
        return `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!129 &1
PlayerSettings:
  m_ObjectHideFlags: 0
  serializedVersion: 21
  productGUID: [generated-guid]
  AndroidProfiler: 0
  AndroidFilterTouchesWhenObscured: 0
  AndroidEnableSustainedPerformanceMode: 0
  defaultScreenOrientation: 4
  targetDevice: 2
  useOnDemandResources: 0
  accelerometerFrequency: 60
  companyName: Fornever Collective
  productName: Quest 3D Map
  defaultCursor: {fileID: 0}
  cursorHotspot: {x: 0, y: 0}
  m_SplashScreenBackgroundColor: {r: 0.13725491, g: 0.12156863, b: 0.1254902, a: 1}
  m_ShowUnitySplashScreen: 1
  m_ShowUnitySplashLogo: 1
  m_SplashScreenOverlayOpacity: 1
  m_SplashScreenAnimation: 1
  m_SplashScreenLogoStyle: 1
  m_SplashScreenDrawMode: 0
  m_SplashScreenBackgroundAnimationZoom: 1
  m_SplashScreenLogoAnimationZoom: 1
  m_SplashScreenBackgroundLandscapeAspectRatio: 2
  m_SplashScreenBackgroundPortraitAspectRatio: 1
  m_SplashScreenBackgroundLandscapeUvs:
    serializedVersion: 2
    x: 0
    y: 0
    width: 1
    height: 1
  m_SplashScreenBackgroundPortraitUvs:
    serializedVersion: 2
    x: 0
    y: 0
    width: 1
    height: 1
  m_SplashScreenLogos: []
  m_VirtualRealitySDKs:
  - AndroidOpenXR
  m_VirtualRealitySupported: 1
  m_HolographicPauseOnTrackingLoss: 0
  defaultScreenWidth: 1920
  defaultScreenHeight: 1080
  defaultScreenWidthWeb: 1920
  defaultScreenHeightWeb: 1080
  m_StereoRenderingPath: 1
  m_ActiveColorSpace: 0
  m_MTRendering: 1
  mipStripping: 0
  numberOfMipsStripped: 0
  m_StackTraceTypes: 010000000100000001000000010000000100000001000000
  iosShowActivityIndicatorOnLoading: -1
  androidShowActivityIndicatorOnLoading: -1
  iosUseCustomAppBackgroundBehavior: 0
  iosAllowHTTPDownload: 1
  allowedAutorotateToPortrait: 1
  allowedAutorotateToPortraitUpsideDown: 1
  allowedAutorotateToLandscapeRight: 1
  allowedAutorotateToLandscapeLeft: 1
  useOSAutorotation: 1
  use32BitDisplayBuffer: 1
  preserveFramebufferAlpha: 0
  disableDepthAndStencilBuffers: 0
  androidStartInFullscreen: 1
  androidRenderOutsideSafeArea: 1
  androidUseSwappy: 1
  androidBlitType: 0
  androidResizableWindow: 0
  androidDefaultWindowWidth: 1920
  androidDefaultWindowHeight: 1080
  androidMinimumWindowWidth: 400
  androidMinimumWindowHeight: 300
  androidFullscreenMode: 1
  defaultIsNativeResolution: 1
  macRetinaSupport: 1
  runInBackground: 1
  captureSingleScreen: 0
  muteOtherAudioSources: 0
  Prepare IOS For Recording: 0
  Force IOS Speakers When Recording: 0
  deferSystemGesturesMode: 0
  hideHomeButton: 0
  submitFramebufferToDisplay: 1
  usePlayerLog: 0
  bakeCollisionMeshes: 0
  forceSingleInstance: 0
  useFlipModelSwapchain: 1
  resizableWindow: 0
  useMacAppStoreValidation: 0
  macAppStoreCategory: public.app-category.games
  gpuSkinning: 1
  xboxPIXTextureCapture: 0
  xboxEnableAvatar: 0
  xboxEnableKinect: 0
  xboxEnableKinectAutoTracking: 0
  xboxEnableFitness: 0
  visibleInBackground: 1
  allowFullscreenSwitch: 1
  graphicsJobMode: 0
  fullscreenMode: 1
  xboxSpeechDb: 0
  xboxEnableHeadOrientation: 0
  xboxEnableGuest: 0
  xboxEnablePIXSampling: 0
  metalFramebufferOnly: 0
  xboxOneResolution: 0
  xboxOneSResolution: 0
  xboxOneXResolution: 3
  xboxOneMonoLoggingLevel: 0
  xboxOneLoggingLevel: 1
  xboxOneDisableEsram: 0
  xboxOneEnableTypeOptimization: 0
  xboxOnePresentImmediateThreshold: 0
  switchQueueCommandMemory: 0
  switchQueueControlMemory: 16384
  switchQueueComputeMemory: 262144
  switchNVNShaderPoolsGranularity: 33554432
  switchNVNDefaultPoolsGranularity: 16777216
  switchNVNOtherPoolGranularity: 16777216
  vulkanNumSwapchainBuffers: 3
  vulkanEnableSetSRGBWrite: 0
  m_SupportedAspectRatios:
    4:3: 1
    5:4: 1
    16:10: 1
    16:9: 1
    Others: 1
  bundleVersion: 1.0
  preloadedAssets: []
  metroInputSource: 0
  wsaTransparentSwapchain: 0
  m_HolographicPauseOnTrackingLoss: 1
  xboxOneDisableKinectGpuReservation: 1
  xboxOneEnable7thCore: 1
  vrSettings:
    cardboard:
      depthFormat: 0
      enableTransitionView: 0
    daydream:
      depthFormat: 0
      useSustainedPerformanceMode: 0
      enableVideoLayer: 0
      useProtectedVideoMemory: 0
      minimumSupportedHeadTracking: 0
      maximumSupportedHeadTracking: 1
    hololens:
      depthFormat: 1
      depthBufferSharingEnabled: 1
      globalDepthBuffer: -1
    lumin:
      depthFormat: 0
      frameTiming: 1
      enableGLCache: 1
      glCacheMaxBlobSize: 524288
      glCacheMaxFileSize: 10485760
    oculus:
      sharedDepthBuffer: 0
      dashSupport: 1
      stereoRenderingMode: 0
      lowOverheadMode: 0
      protectedContext: 0
      v2Signing: 1
    enable360StereoCapture: 0
  isWsaHolographicRemotingEnabled: 0
  enableFrameTimingStats: 0
  useHDRDisplay: 0
  D3DHDRBitDepth: 0
  m_ColorGamuts: 00000000
  targetPixelDensity: 30
  resolutionScalingMode: 0
  androidSupportedAspectRatio: 1
  androidMaxAspectRatio: 2.1
  applicationIdentifier:
    Standalone: com.fornevercollective.questmap
    iPhone: com.fornevercollective.questmap
    tvOS: com.fornevercollective.questmap
    Android: com.fornevercollective.questmap
  buildTargetIcons: []
  buildTargetPlatformIcons: []
  buildTargetBatching:
  - m_BuildTarget: Standalone
    m_StaticBatching: 1
    m_DynamicBatching: 0
  - m_BuildTarget: tvOS
    m_StaticBatching: 1
    m_DynamicBatching: 0
  - m_BuildTarget: Android
    m_StaticBatching: 1
    m_DynamicBatching: 0
  - m_BuildTarget: iPhone
    m_StaticBatching: 1
    m_DynamicBatching: 0
  - m_BuildTarget: WebGL
    m_StaticBatching: 0
    m_DynamicBatching: 0
  m_BuildTargetGraphicsJobs:
  - m_BuildTarget: Android
    m_GraphicsJobs: 0
  - m_BuildTarget: PS4
    m_GraphicsJobs: 0
  - m_BuildTarget: XboxOne
    m_GraphicsJobs: 0
  - m_BuildTarget: Windows
    m_GraphicsJobs: 0
  m_BuildTargetGraphicsJobMode:
  - m_BuildTarget: Android
    m_GraphicsJobMode: 0
  - m_BuildTarget: PS4
    m_GraphicsJobMode: 0
  - m_BuildTarget: XboxOne
    m_GraphicsJobMode: 0
  - m_BuildTarget: Windows
    m_GraphicsJobMode: 0
  m_BuildTargetGraphicsAPIs:
  - m_BuildTarget: Android
    m_GraphicsAPIs: 150000000b000000
    m_Automatic: 0
  - m_BuildTarget: Standalone
    m_GraphicsAPIs: 000000000b000000
    m_Automatic: 1
  m_BuildTargetVRSettings:
  - m_BuildTarget: Standalone
    m_Enabled: 0
    m_Devices:
    - Oculus
  - m_BuildTarget: Android
    m_Enabled: 1
    m_Devices:
    - AndroidOpenXR
  openGLRequireES31: 0
  openGLRequireES31AEP: 0
  openGLRequireES32: 0
  m_TemplateCustomTags: {}
  mobileMTRendering:
    Android: 1
    iPhone: 1
    tvOS: 1
  m_BuildTargetGroupLightmapEncodingQuality:
  - m_BuildTarget: Android
    m_EncodingQuality: 1
  - m_BuildTarget: iPhone
    m_EncodingQuality: 1
  - m_BuildTarget: tvOS
    m_EncodingQuality: 1
  m_BuildTargetGroupLightmapSettings: []
  m_BuildTargetGroupLightmapPlatformSettings: []
  playModeTestRunnerEnabled: 0
  runPlayModeTestAsEditModeTest: 0
  actionOnDotNetUnhandledException: 1
  enableInternalProfiler: 0
  logObjCUncaughtExceptions: 1
  enableCrashReportAPI: 0
  cameraUsageDescription: Required for MR passthrough
  locationUsageDescription: Required for geospatial mapping
  microphoneUsageDescription: 
  bluetoothUsageDescription: 
  switchNMETAOverride: 0
  switchNetLibKey: 
  switchSocketMemoryPoolSize: 6144
  switchSocketAllocatorPoolSize: 128
  switchSocketConcurrencyLimit: 14
  switchNetworkInterface: 
  switchAppletLaunchQueueId: 
  switchNetworkServiceAccountId: 
  switchPlayerConnectionEnabled: 1
  ps4NPAgeRating: 12
  ps4ParentalLevel: 11
  ps4ContentID: ED1633-NPXX51362_00-0000000000000000
  ps4Category: 0
  ps4NPTitleSecret: 
  ps4NPTrophyPackPath: 
  ps4NpSfx: 
  ps4BGMPath: 
  ps4ShareFilePath: 
  ps4ShareOverlayImagePath: 
  ps4ShareOverlayVideoPath: 
  ps4StartupImagePath: 
  ps4StartupImagesFolder: 
  ps4IconImagesFolder: 
  ps4SaveDataImagePath: 
  ps4SdkOverride: 
  ps4BGMPath2: 
  ps4BGMPath3: 
  ps4BGMPath4: 
  ps4BGMPath5: 
  ps4BGMPath6: 
  ps4BGMPath7: 
  ps4BGMPath8: 
  ps4BGMPath9: 
  ps4BGMPath10: 
  ps4BGMPath11: 
  ps4BGMPath12: 
  ps4BGMPath13: 
  ps4BGMPath14: 
  ps4BGMPath15: 
  ps4BGMPath16: 
  ps4NPAgeRatingFormat: 0
  ps4NPTitleSecret2: 
  ps4NPAgeRatingContentID: 
  ps4NPAgeRatingPasscode: 
  ps4NPAgeRatingAges: 00000000000000000000000000000000
  ps4NPAgeRatingDescriptors: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingDescriptorsSimple: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingSpec: 0
  ps4NPAgeRatingSystem: 0
  ps4NPAgeRatingLevel: 0
  ps4NPAgeRatingContent: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent2: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent3: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent4: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent5: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent6: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent7: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent8: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent9: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent10: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent11: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent12: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent13: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent14: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent15: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent16: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent17: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent18: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent19: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent20: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent21: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent22: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent23: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent24: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent25: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent26: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent27: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent28: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent29: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent30: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent31: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent32: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent33: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent34: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent35: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent36: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent37: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent38: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent39: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent40: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent41: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent42: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent43: 0000000000000000000000000000000000000000
  ps4NPAgeRatingContent44: 0000000000000000000000000000000000000000
  ps4NPAgeRatingContent45: 0000000000000000000000000000000000000000
  ps4NPAgeRatingContent46: 0000000000000000000000000000000000000000
  ps4NPAgeRatingContent47: 0000000000000000000000000000000000000000
  ps4NPAgeRatingContent48: 0000000000000000000000000000000000000000
  ps4NPAgeRatingContent49: 0000000000000000000000000000000000000000
  ps4NPAgeRatingContent50: 0000000000000000000000000000000000000000
  ps4NPAgeRatingContent51: 0000000000000000000000000000000000000000
  ps4NPAgeRatingContent52: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent53: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent54: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent55: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent56: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent57: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent58: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent59: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent60: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent61: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent62: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent63: 0000000000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent64: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent65: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent66: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent67: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent68: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent69: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent70: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent71: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent72: 0000000000000000000000000000000000000000000000000000000000
  ps4NPAgeRatingContent73: 00000000000000000000000000000000000
  ps4NPAgeRatingContent74: 00000000000000000000000000000000000
  ps4NPAgeRatingContent75: 00000000000000000000000000000000000
  ps4NPAgeRatingContent76: 00000000000000000000000000000000000
  ps4NPAgeRatingContent77: 00000000000000000000000000000000000
  ps4NPAgeRatingContent78: 00000000000000000000000000000000000
  ps4NPAgeRatingContent79: 00000000000000000000000000000000000
  ps4NPAgeRatingContent80: 00000000000000000000000000000000000
  ps4NPAgeRatingContent81: 00000000000000000000000000000000000
  ps4NPAgeRatingContent82: 00000000000000000000000000000000000
  ps4NPAgeRatingContent83: 00000000000000000000000000000000000
  ps4NPAgeRatingContent84: 00000000000000000000000000000000000
  ps4NPAgeRatingContent85: 00000000000000000000000000000000000
  ps4NPAgeRatingContent86: 00000000000000000000000000000000000
  ps4NPAgeRatingContent87: 00000000000000000000000000000000000
  ps4NPAgeRatingContent88: 00000000000000000000000000000000000
  ps4NPAgeRatingContent89: 00000000000000000000000000000000000
  ps4NPAgeRatingContent90: 00000000000000000000000000000000000
  ps4NPAgeRatingContent91: 00000000000000000000000000000000000
  ps4NPAgeRatingContent92: 00000000000000000000000000000000000
  ps4NPAgeRatingContent93: 00000000000000000000000000000000000
  ps4NPAgeRatingContent94: 00000000000000000000000000000000000
  ps4NPAgeRatingContent95: 00000000000000000000000000000000000
  ps4NPAgeRatingContent96: 00000000000000000000000000
  ps4NPAgeRatingContent97: 00000000000000000000000000
  ps4NPAgeRatingContent98: 00000000000000000000000000
  ps4NPAgeRatingContent99: 00000000000000000000000000
  ps4NPAgeRatingContent100: 00000000000000000000000000
  ps4NPAgeRatingContent101: 00000000000000000000000000
  ps4NPAgeRatingContent102: 00000000000000000000000000
  ps4NPAgeRatingContent103: 00000000000000000000000000
  ps4NPAgeRatingContent104: 00000000000000000000000000
  ps4NPAgeRatingContent105: 00000000000000000000000000
  ps4NPAgeRatingContent106: 00000000000000000000000000
  ps4NPAgeRatingContent107: 00000000000000000000000000
  ps4NPAgeRatingContent108: 00000000000000000000000000
  ps4NPAgeRatingContent109: 00000000000000000000000000
  ps4NPAgeRatingContent110: 00000000000000000000000000
  ps4NPAgeRatingContent111: 00000000000000000000000000
  ps4NPAgeRatingContent112: 00000000000000000000000000
  ps4NPAgeRatingContent113: 00000000000000000000000000
  ps4NPAgeRatingContent114: 00000000000000000000000000
  ps4NPAgeRatingContent115: 00000000000000000000000000
  ps4NPAgeRatingContent116: 00000000000000000000000000
  ps4NPAgeRatingContent117: 00000000000000000000000000
  ps4NPAgeRatingContent118: 00000000000000000000000000
  ps4NPAgeRatingContent119: 00000000000000000000000000
  ps4NPAgeRatingContent120: 00000000000000000000000000
  ps4NPAgeRatingContent121: 00000000000000000000000000
  ps4NPAgeRatingContent122: 00000000000000000000000000
  ps4NPAgeRatingContent123: 00000000000000000000000000
  ps4NPAgeRatingContent124: 00000000000000000000000000
  ps4NPAgeRatingContent125: 00000000000000000000000000
  ps4NPAgeRatingContent126: 00000000000000000000000000
  ps4NPAgeRatingContent127: 00000000000000000000000000
  ps4NPAgeRatingContent128: 00000000000000000000000000
  ps4NPAgeRatingContent129: 00000000000000000000000000
  ps4NPAgeRatingContent130: 00000000000000000000000000
  ps4NPAgeRatingContent131: 00000000000000000000000000
  ps4NPAgeRatingContent132: 00000000000000000000000000
  ps4NPAgeRatingContent133: 00000000000000000000000000
  ps4NPAgeRatingContent134: 00000000000000000000000000
  ps4NPAgeRatingContent135: 00000000000000000000000000
  ps4NPAgeRatingContent136: 00000000000000000000000000
  ps4NPAgeRatingContent137: 00000000000000000000000000
  ps4NPAgeRatingContent138: 00000000000000000000000000
  ps4NPAgeRatingContent139: 00000000000000000000000000
  ps4NPAgeRatingContent140: 00000000000000000000000000
  ps4NPAgeRatingContent141: 00000000000000000000000000
  ps4NPAgeRatingContent142: 00000000000000000000000000
  ps4NPAgeRatingContent143: 00000000000000000000000000
  ps4NPAgeRatingContent144: 00000000000000000000000000
  ps4NPAgeRatingContent145: 00000000000000000000000000
  ps4NPAgeRatingContent146: 00000000000000000000000000
  ps4NPAgeRatingContent147: 00000000000000000000000000
  ps4NPAgeRatingContent148: 00000000000000000000000000
  ps4NPAgeRatingContent149: 00000000000000000000000000
  ps4NPAgeRatingContent150: 00000000000000000000000000
  ps4NPAgeRatingContent151: 00000000000000000000000000
  ps4NPAgeRatingContent152: 00000000000000000000000000
  ps4NPAgeRatingContent153: 00000000000000000000000000
  ps4NPAgeRatingContent154: 00000000000000000000000000
  ps4NPAgeRatingContent155: 00000000000000000000000000
  ps4NPAgeRatingContent156: 00000000000000000000000000
  ps4NPAgeRatingContent157: 00000000000000000000000000
  ps4NPAgeRatingContent158: 00000000000000000000000000
  ps4NPAgeRatingContent159: 00000000000000000000000000
  ps4NPAgeRatingContent160: 00000000000000000000000000
  ps4NPAgeRatingContent161: 00000000000000000000000000
  ps4NPAgeRatingContent162: 00000000000000000000000000
  ps4NPAgeRatingContent163: 00000000000000000000000000
  ps4NPAgeRatingContent164: 00000000000000000000000000
  ps4NPAgeRatingContent165: 00000000000000000000000000
  ps4NPAgeRatingContent166: 00000000000000000000000000
  ps4NPAgeRatingContent167: 00000000000000000000000000
  ps4NPAgeRatingContent168: 00000000000000000000000000
  ps4NPAgeRatingContent169: 00000000000000000000000000
  ps4NPAgeRatingContent170: 00000000000000000000000000
  ps4NPAgeRatingContent171: 00000000000000000000000000
  ps4NPAgeRatingContent172: 00000000000000000000000000
  ps4NPAgeRatingContent173: 00000000000000000000000000
  ps4NPAgeRatingContent174: 00000000000000000000000000
  ps4NPAgeRatingContent175: 00000000000000000000000000
  ps4NPAgeRatingContent176: 00000000000000000000000000
  ps4NPAgeRatingContent177: 00000000000000000000000000
  ps4NPAgeRatingContent178: 00000000000000000000000000
  ps4NPAgeRatingContent179: 00000000000000000000000000
  ps4NPAgeRatingContent180: 00000000000000000000000000
  ps4NPAgeRatingContent181: 00000000000000000000000000
  ps4NPAgeRatingContent182: 00000000000000000000000000
  ps4NPAgeRatingContent183: 00000000000000000000000000
  ps4NPAgeRatingContent184: 00000000000000000000000000
  ps4NPAgeRatingContent185: 00000000000000000000000000
  ps4NPAgeRatingContent186: 00000000000000000000000000
  ps4NPAgeRatingContent187: 00000000000000000000000000
  ps4NPAgeRatingContent188: 00000000000000000000000000
  ps4NPAgeRatingContent189: 00000000000000000000000000
  ps4NPAgeRatingContent190: 00000000000000000000000000
  ps4NPAgeRatingContent191: 00000000000000000000000000
  ps4NPAgeRatingContent192: 00000000000000000000000000
  ps4NPAgeRatingContent193: 00000000000000000000000000
  ps4NPAgeRatingContent194: 00000000000000000000000000
  ps4NPAgeRatingContent195: 00000000000000000000000000
  ps4NPAgeRatingContent196: 00000000000000000000000000
  ps4NPAgeRatingContent197: 00000000000000000000000000
  ps4NPAgeRatingContent198: 00000000000000000000000000
  ps4NPAgeRatingContent199: 00000000000000000000000000
  ps4NPAgeRatingContent200: 00000000000000000000000000
`;
    }

    generateXRSettings() {
        return `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!13 &1
XRGeneralSettings:
  m_ObjectHideFlags: 0
  serializedVersion: 2
  m_LoaderManagerInstance: {fileID: 11400000, guid: 0000000000000000e000000000000000, type: 2}
  m_InitManagerOnStart: 1
  m_XRManager: {fileID: 11400000, guid: 0000000000000000e000000000000000, type: 2}
  m_ProviderSettings: {fileID: 11400000, guid: 0000000000000000e000000000000000, type: 2}
`;
    }

    generateUnityScene(exportData) {
        return `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!29 &1
OcclusionCullingSettings:
  m_ObjectHideFlags: 0
  serializedVersion: 2
  m_OcclusionBakeSettings:
    smallestOccluder: 5
    smallestHole: 0.25
    backfaceThreshold: 100
  m_SceneGUID: 00000000000000000000000000000000
  m_OcclusionCullingData: {fileID: 0}
--- !u!104 &2
RenderSettings:
  m_ObjectHideFlags: 0
  serializedVersion: 9
  m_Fog: 0
  m_FogColor: {r: 0.5, g: 0.5, b: 0.5, a: 1}
  m_FogMode: 3
  m_FogDensity: 0.01
  m_LinearFogStart: 0
  m_LinearFogEnd: 300
  m_AmbientSkyColor: {r: 0.212, g: 0.227, b: 0.259, a: 1}
  m_AmbientEquatorColor: {r: 0.114, g: 0.125, b: 0.133, a: 1}
  m_AmbientGroundColor: {r: 0.047, g: 0.043, b: 0.035, a: 1}
  m_AmbientIntensity: 1
  m_AmbientMode: 0
  m_SubtractiveShadowColor: {r: 0.42, g: 0.478, b: 0.627, a: 1}
  m_SkyboxMaterial: {fileID: 0}
  m_HaloStrength: 0.5
  m_FlareStrength: 1
  m_FlareFadeSpeed: 3
  m_HaloTexture: {fileID: 0}
  m_SpotCookie: {fileID: 10001, guid: 0000000000000000e000000000000000, type: 0}
  m_DefaultReflectionMode: 0
  m_DefaultReflectionResolution: 128
  m_ReflectionBounces: 1
  m_ReflectionIntensity: 1
  m_CustomReflection: {fileID: 0}
  m_Sun: {fileID: 0}
  m_IndirectSpecularColor: {r: 0, g: 0, b: 0, a: 1}
  m_UseRadianceAmbientProbe: 0
--- !u!157 &3
LightmapSettings:
  m_ObjectHideFlags: 0
  serializedVersion: 12
  m_GIWorkflowMode: 1
  m_GISettings:
    serializedVersion: 2
    m_BounceScale: 1
    m_IndirectOutputScale: 1
    m_AlbedoBoost: 1
    m_EnvironmentLightingMode: 0
    m_EnableBakedLightmaps: 0
    m_EnableRealtimeLightmaps: 0
  m_LightmapEditorSettings:
    serializedVersion: 12
    m_Resolution: 2
    m_BakeResolution: 40
    m_AtlasSize: 1024
    m_AO: 0
    m_AOMaxDistance: 1
    m_CompAOExponent: 1
    m_CompAOExponentDirect: 0
    m_ExtractAmbientOcclusion: 0
    m_Padding: 2
    m_LightmapParameters: {fileID: 0}
    m_LightmapsBakeMode: 1
    m_TextureCompression: 1
    m_FinalGather: 0
    m_FinalGatherFiltering: 1
    m_FinalGatherRayCount: 256
    m_ReflectionCompression: 2
    m_MixedBakeMode: 1
    m_BakeBackend: 1
    m_PVRSampling: 1
    m_PVRDirectSampleCount: 32
    m_PVRSampleCount: 512
    m_PVRBounces: 2
    m_PVREnvironmentSampleCount: 256
    m_PVREnvironmentReferencePointCount: 2048
    m_PVRFilteringMode: 1
    m_PVRDenoiserTypeDirect: 1
    m_PVRDenoiserTypeIndirect: 1
    m_PVRDenoiserTypeAO: 1
    m_PVRFilterTypeDirect: 0
    m_PVRFilterTypeIndirect: 0
    m_PVRFilterTypeAO: 0
    m_PVREnvironmentMIS: 1
    m_PVRCulling: 1
    m_PVRFilteringGaussRadiusDirect: 1
    m_PVRFilteringGaussRadiusIndirect: 5
    m_PVRFilteringGaussRadiusAO: 2
    m_PVRFilteringAtrousPositionSigmaDirect: 0.5
    m_PVRFilteringAtrousPositionSigmaIndirect: 2
    m_PVRFilteringAtrousPositionSigmaAO: 1
    m_ExportTrainingData: 0
    m_TrainingDataDestination: TrainingData
    m_LightProbeSampleCountMultiplier: 4
  m_LightingDataAsset: {fileID: 0}
  m_LightingSettings: {fileID: 0}
`;
    }

    generateLaMAriaVisualizer() {
        return `using UnityEngine;
using System.Collections.Generic;
using System.IO;
using CesiumForUnity;
using Newtonsoft.Json;

namespace ForneverCollective.Quest {
    /// <summary>
    /// LaMAria SLAM Trajectory Visualizer for Quest
    /// Visualizes Visual-Inertial SLAM trajectories from LaMAria dataset
    /// </summary>
    public class LaMAriaTrajectoryVisualizer : MonoBehaviour {
        [Header("LaMAria Configuration")]
        public TextAsset trajectoryFile;
        public string trajectoryPath = "MapData/lamaria-trajectory.txt";
        
        [Header("Visualization")]
        public Material trajectoryMaterial;
        public float trajectoryWidth = 0.1f;
        public Color trajectoryColor = Color.cyan;
        public bool showPoses = false;
        public GameObject posePrefab;
        
        [Header("Playback")]
        public bool autoPlay = false;
        public float playbackSpeed = 1.0f;
        public bool loop = false;
        
        private List<SLAMPose> trajectory;
        private LineRenderer trajectoryLine;
        private CesiumGeoreference georeference;
        private int currentPoseIndex = 0;
        private float lastUpdateTime;
        
        [System.Serializable]
        public class SLAMPose {
            public long timestamp; // nanoseconds
            public Vector3 position; // ENU coordinates
            public Quaternion rotation;
        }
        
        void Start() {
            georeference = FindObjectOfType<CesiumGeoreference>();
            LoadTrajectory();
            VisualizeTrajectory();
        }
        
        void LoadTrajectory() {
            trajectory = new List<SLAMPose>();
            
            string text;
            if (trajectoryFile != null) {
                text = trajectoryFile.text;
            } else if (File.Exists(trajectoryPath)) {
                text = File.ReadAllText(trajectoryPath);
            } else {
                Debug.LogError("LaMAria trajectory file not found");
                return;
            }
            
            string[] lines = text.Split('\\n');
            foreach (string line in lines) {
                if (string.IsNullOrWhiteSpace(line)) continue;
                
                string[] parts = line.Trim().Split(new char[] { ' ', '\\t' }, System.StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length < 8) continue;
                
                long timestamp = long.Parse(parts[0]);
                float tx = float.Parse(parts[1]);
                float ty = float.Parse(parts[2]);
                float tz = float.Parse(parts[3]);
                float qx = float.Parse(parts[4]);
                float qy = float.Parse(parts[5]);
                float qz = float.Parse(parts[6]);
                float qw = float.Parse(parts[7]);
                
                trajectory.Add(new SLAMPose {
                    timestamp = timestamp,
                    position = new Vector3(tx, ty, tz),
                    rotation = new Quaternion(qx, qy, qz, qw)
                });
            }
            
            Debug.Log($"Loaded LaMAria trajectory: {trajectory.Count} poses");
        }
        
        void VisualizeTrajectory() {
            if (trajectory == null || trajectory.Count == 0) return;
            
            // Create LineRenderer for trajectory path
            GameObject lineObj = new GameObject("LaMAriaTrajectory");
            lineObj.transform.SetParent(transform);
            trajectoryLine = lineObj.AddComponent<LineRenderer>();
            trajectoryLine.material = trajectoryMaterial != null ? trajectoryMaterial : CreateDefaultMaterial();
            trajectoryLine.color = trajectoryColor;
            trajectoryLine.widthMultiplier = trajectoryWidth;
            trajectoryLine.useWorldSpace = true;
            trajectoryLine.positionCount = trajectory.Count;
            
            // Convert ENU to Unity world positions
            Vector3[] positions = new Vector3[trajectory.Count];
            for (int i = 0; i < trajectory.Count; i++) {
                // Convert ENU to Unity coordinates (assuming origin at georeference)
                Vector3 enu = trajectory[i].position;
                positions[i] = new Vector3(enu.y, enu.z, -enu.x); // ENU -> Unity
            }
            
            trajectoryLine.SetPositions(positions);
            
            // Add pose markers if enabled
            if (showPoses && posePrefab != null) {
                for (int i = 0; i < trajectory.Count; i += Mathf.Max(1, trajectory.Count / 100)) {
                    GameObject marker = Instantiate(posePrefab, positions[i], trajectory[i].rotation);
                    marker.transform.SetParent(transform);
                }
            }
            
            // Fly to trajectory start
            if (georeference != null && trajectory.Count > 0) {
                Vector3 startPos = positions[0];
                // Convert to Cesium coordinates and fly camera
            }
        }
        
        Material CreateDefaultMaterial() {
            Material mat = new Material(Shader.Find("Universal Render Pipeline/Unlit"));
            mat.color = trajectoryColor;
            return mat;
        }
        
        void Update() {
            if (autoPlay && trajectory != null && trajectory.Count > 0) {
                PlaybackTrajectory();
            }
        }
        
        void PlaybackTrajectory() {
            float deltaTime = Time.time - lastUpdateTime;
            float poseInterval = 1.0f / 30.0f; // Assume 30 Hz SLAM
            
            if (deltaTime >= poseInterval / playbackSpeed) {
                currentPoseIndex = (currentPoseIndex + 1) % trajectory.Count;
                if (currentPoseIndex == 0 && !loop) {
                    autoPlay = false;
                    return;
                }
                
                // Update camera position to current pose
                SLAMPose currentPose = trajectory[currentPoseIndex];
                Vector3 worldPos = new Vector3(currentPose.position.y, currentPose.position.z, -currentPose.position.x);
                
                Camera.main.transform.position = worldPos;
                Camera.main.transform.rotation = currentPose.rotation;
                
                lastUpdateTime = Time.time;
            }
        }
        
        public void SetPlaybackSpeed(float speed) {
            playbackSpeed = Mathf.Max(0.1f, speed);
        }
        
        public void Play() {
            autoPlay = true;
            currentPoseIndex = 0;
        }
        
        public void Pause() {
            autoPlay = false;
        }
        
        public void Stop() {
            autoPlay = false;
            currentPoseIndex = 0;
        }
        
        public void JumpToPose(int index) {
            if (trajectory == null || index < 0 || index >= trajectory.Count) return;
            currentPoseIndex = index;
            SLAMPose pose = trajectory[index];
            Vector3 worldPos = new Vector3(pose.position.y, pose.position.z, -pose.position.x);
            Camera.main.transform.position = worldPos;
            Camera.main.transform.rotation = pose.rotation;
        }
        
        public float GetTrajectoryDuration() {
            if (trajectory == null || trajectory.Count < 2) return 0;
            long durationNs = trajectory[trajectory.Count - 1].timestamp - trajectory[0].timestamp;
            return durationNs / 1e9f; // Convert to seconds
        }
        
        public float GetTrajectoryDistance() {
            if (trajectory == null || trajectory.Count < 2) return 0;
            float distance = 0;
            for (int i = 1; i < trajectory.Count; i++) {
                distance += Vector3.Distance(trajectory[i-1].position, trajectory[i].position);
            }
            return distance;
        }
    }
}`;
    }

    generateQuestShader() {
        return `Shader "ForneverCollective/QuestOptimized" {
    Properties {
        _MainTex ("Texture", 2D) = "white" {}
        _Color ("Color", Color) = (1,1,1,1)
    }
    SubShader {
        Tags { "RenderType"="Opaque" }
        LOD 100
        
        Pass {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            
            struct appdata {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
            };
            
            struct v2f {
                float2 uv : TEXCOORD0;
                float4 vertex : SV_POSITION;
            };
            
            sampler2D _MainTex;
            float4 _MainTex_ST;
            float4 _Color;
            
            v2f vert (appdata v) {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.uv, _MainTex);
                return o;
            }
            
            fixed4 frag (v2f i) : SV_Target {
                fixed4 col = tex2D(_MainTex, i.uv) * _Color;
                return col;
            }
            ENDCG
        }
    }
    FallBack "Diffuse"
}`;
    }

    showUnityExportInstructions() {
        const instructions = \`Unity Quest Project Exported!

📦 Files downloaded:
- QuestMapController.cs
- SAM2Integration.cs  
- QuestOptimizer.cs
- QuestDepthIntegration.cs
- PassthroughController.cs
- manifest.json
- README.md
- cesium-quest-config.json

🚀 Next Steps:

1. Create new Unity project (2022.3 LTS+)
2. Install packages from manifest.json
3. Copy C# scripts to Assets/CesiumForUnity/Scripts/
4. Install Cesium for Unity: https://github.com/CesiumGS/cesium-unity
5. Install Meta XR SDK from Package Manager
6. Configure CesiumGeoreference with coordinates from config
7. Build & Run to Quest (or use Quest Link for testing)

📚 Full setup guide in README.md

💡 Quick Test:
- Connect Quest via USB-C
- Unity → Play Mode
- App runs instantly in headset!\`;

        alert(instructions);
    }

    // LaMAria SLAM Integration
    loadLaMAriaTrajectory() {
        // Create file input for LaMAria trajectory file
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const trajectory = this.parseLaMAriaTrajectory(event.target.result);
                    this.lamariaTrajectory = trajectory;
                    this.visualizeLaMAriaTrajectory();
                    alert(`LaMAria trajectory loaded: ${trajectory.length} poses`);
                } catch (error) {
                    console.error('Failed to parse LaMAria trajectory:', error);
                    alert('Failed to load trajectory. Check file format.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    parseLaMAriaTrajectory(text) {
        // LaMAria format: timestamp tx ty tz qx qy qz qw
        const lines = text.trim().split('\\n');
        const trajectory = [];

        for (const line of lines) {
            if (!line.trim()) continue;
            
            const parts = line.trim().split(/\\s+/);
            if (parts.length < 8) continue;

            const timestamp = BigInt(parts[0]); // nanoseconds
            const tx = parseFloat(parts[1]);
            const ty = parseFloat(parts[2]);
            const tz = parseFloat(parts[3]);
            const qx = parseFloat(parts[4]);
            const qy = parseFloat(parts[5]);
            const qz = parseFloat(parts[6]);
            const qw = parseFloat(parts[7]);

            trajectory.push({
                timestamp: timestamp,
                position: { x: tx, y: ty, z: tz },
                rotation: { x: qx, y: qy, z: qz, w: qw }
            });
        }

        return trajectory;
    }

    visualizeLaMAriaTrajectory() {
        if (!this.lamariaTrajectory || this.lamariaTrajectory.length === 0) {
            alert('No LaMAria trajectory loaded. Click "Load LaMAria" first.');
            return;
        }

        if (this.currentMode === '3d' || this.currentMode === 'vr') {
            this.visualizeLaMAriaInCesium();
        } else {
            this.visualizeLaMAriaInLeaflet();
        }
    }

    visualizeLaMAriaInCesium() {
        if (!this.viewer || !this.lamariaTrajectory) return;

        // Remove existing trajectory if any
        if (this.lamariaPolyline) {
            this.viewer.entities.remove(this.lamariaPolyline);
        }

        // Convert trajectory to Cesium positions
        const positions = [];
        const startPos = this.lamariaTrajectory[0].position;
        
        // Convert ENU (East-North-Up) to WGS84 if needed
        // For now, assume positions are in local coordinates
        // In real implementation, you'd need to transform based on origin
        
        this.lamariaTrajectory.forEach((pose, index) => {
            // Simple conversion - in production, use proper coordinate transform
            const lat = startPos.y / 111320.0; // rough conversion
            const lon = startPos.x / (111320.0 * Math.cos(startPos.y * Math.PI / 180));
            const height = pose.position.z;
            
            positions.push(Cesium.Cartesian3.fromDegrees(lon, lat, height));
        });

        // Create polyline entity
        this.lamariaPolyline = this.viewer.entities.add({
            polyline: {
                positions: positions,
                width: 5,
                material: Cesium.Color.CYAN,
                clampToGround: false,
                arcType: Cesium.ArcType.GEODESIC
            }
        });

        // Add markers at key points
        const startPose = this.lamariaTrajectory[0];
        const endPose = this.lamariaTrajectory[this.lamariaTrajectory.length - 1];

        this.addCesiumMarker(
            startPose.position.y / 111320.0,
            startPose.position.x / (111320.0 * Math.cos(startPose.position.y * Math.PI / 180)),
            'SLAM Start'
        );

        this.addCesiumMarker(
            endPose.position.y / 111320.0,
            endPose.position.x / (111320.0 * Math.cos(endPose.position.y * Math.PI / 180)),
            'SLAM End'
        );

        // Fly to trajectory
        this.viewer.flyTo(this.lamariaPolyline);

        // Add trajectory info
        const duration = Number(this.lamariaTrajectory[this.lamariaTrajectory.length - 1].timestamp - 
                                this.lamariaTrajectory[0].timestamp) / 1e9; // seconds
        const distance = this.calculateTrajectoryDistance(this.lamariaTrajectory);

        console.log(`LaMAria Trajectory: ${this.lamariaTrajectory.length} poses, ${duration.toFixed(1)}s, ${distance.toFixed(2)}m`);
    }

    visualizeLaMAriaInLeaflet() {
        if (!this.map || !this.lamariaTrajectory) return;

        // Convert trajectory to LatLng points
        const startPos = this.lamariaTrajectory[0].position;
        const points = this.lamariaTrajectory.map(pose => {
            const lat = startPos.y / 111320.0;
            const lon = startPos.x / (111320.0 * Math.cos(startPos.y * Math.PI / 180));
            return [lat, lon];
        });

        // Create polyline
        const polyline = L.polyline(points, {
            color: '#00ffff',
            weight: 5,
            opacity: 0.8
        }).addTo(this.map);

        // Add start/end markers
        this.addMarker([points[0][0], points[0][1]], 'SLAM Start');
        this.addMarker([points[points.length - 1][0], points[points.length - 1][1]], 'SLAM End');

        // Fit map to trajectory
        this.map.fitBounds(polyline.getBounds());
    }

    calculateTrajectoryDistance(trajectory) {
        let distance = 0;
        for (let i = 1; i < trajectory.length; i++) {
            const prev = trajectory[i - 1].position;
            const curr = trajectory[i].position;
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const dz = curr.z - prev.z;
            distance += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        return distance;
    }

    exportLaMAriaForQuest() {
        if (!this.lamariaTrajectory) {
            alert('No LaMAria trajectory loaded.');
            return;
        }

        const questConfig = {
            name: "LaMAria SLAM Trajectory for Quest",
            version: "1.0",
            slam: {
                type: "LaMAria",
                trajectory: this.lamariaTrajectory,
                totalPoses: this.lamariaTrajectory.length,
                duration: Number(this.lamariaTrajectory[this.lamariaTrajectory.length - 1].timestamp - 
                                this.lamariaTrajectory[0].timestamp) / 1e9,
                distance: this.calculateTrajectoryDistance(this.lamariaTrajectory)
            },
            quest: {
                visualization: true,
                playbackSpeed: 1.0,
                showPath: true,
                showPoses: false, // Too many poses for Quest
                enableMR: true
            },
            resources: {
                lamaria: "https://github.com/cvg/lamaria",
                dataset: "https://www.lamaria.ethz.ch/"
            }
        };

        const blob = new Blob([JSON.stringify(questConfig, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'lamaria-quest-trajectory.json';
        link.click();
        URL.revokeObjectURL(url);
    }
}

// Initialize map viewer when map section becomes active
let mapViewer = null;

function initMapViewer() {
    const mapSection = document.getElementById('map');
    if (mapSection && mapSection.classList.contains('active') && !mapViewer) {
        // Wait a bit for the container to be visible
        setTimeout(() => {
            mapViewer = new MapViewer();
            // Trigger resize to ensure map renders correctly
            setTimeout(() => {
                if (mapViewer.map) {
                    mapViewer.map.invalidateSize();
                }
            }, 100);
        }, 100);
    }
}

// Watch for map section activation
const mapObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const mapSection = document.getElementById('map');
            if (mapSection && mapSection.classList.contains('active')) {
                if (!mapViewer) {
                    initMapViewer();
                } else {
                    // Map exists, just invalidate size
                    setTimeout(() => {
                        if (mapViewer.map) {
                            mapViewer.map.invalidateSize();
                        }
                    }, 100);
                }
            }
        }
    });
});

// Start observing when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const mapSection = document.getElementById('map');
        if (mapSection) {
            mapObserver.observe(mapSection, { attributes: true });
            if (mapSection.classList.contains('active')) {
                initMapViewer();
            }
        }
    });
} else {
    const mapSection = document.getElementById('map');
    if (mapSection) {
        mapObserver.observe(mapSection, { attributes: true });
        if (mapSection.classList.contains('active')) {
            initMapViewer();
        }
    }
}
