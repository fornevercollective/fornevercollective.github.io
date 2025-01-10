import { Component, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import OpenSeadragon from 'openseadragon';

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.css']
})
export class ViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('osdContainer', { static: false }) osdContainer!: ElementRef;
  private viewer!: OpenSeadragon.Viewer;
  private resizeHandler: (() => void) | null = null;

  private viewerConfig = {
    prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
    tileSources: {
      type: 'image',
      url: 'https://openseadragon.github.io/example-images/highsmith/highsmith.dzi',
    },
    gestureSettingsMouse: {
      scrollToZoom: true,
      clickToZoom: true,
      dblClickToZoom: true,
    },
  };

  private drawingConfig = {
    strokeStyle: 'black',
    lineWidth: 2,
    fillStyle: 'rgba(0, 0, 0, 0.1)', // New option for fill style
  };

  private showGrid = false; // New option to toggle grid overlay
  private showCoordinates = false; // New option to toggle coordinates display

  ngAfterViewInit() {
    this.initializeViewer();
    this.addDrawingLayer();
    this.addGridToggleButton(); // Add grid toggle button
    this.addCoordinatesToggleButton(); // Add coordinates toggle button
  }

  ngOnDestroy(): void {
    if (this.viewer && this.resizeHandler) {
      this.viewer.removeHandler('resize', this.resizeHandler); // Ensure the resizeHandler is consistently detached to prevent potential memory leaks or unexpected behavior during component destruction.
    }
    this.viewer.destroy(); // Ensure viewer is fully cleaned up to avoid memory leaks.
  }

  private initializeViewer(): void {
    this.viewer = OpenSeadragon({
      element: this.osdContainer.nativeElement,
      ...this.viewerConfig,
    });
  }

  private addDrawingLayer(): void {
    const existingCanvas = this.viewer.canvas.querySelector('canvas');
    if (existingCanvas) { // Consider adding a more robust check or logging in case multiple canvases are inadvertently added, which could lead to rendering or performance issues.
      console.warn('A canvas already exists in the viewer. Skipping creation.');
      return;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Failed to get 2D context for the canvas. Drawing layer cannot be added.');
      return;
    }
    const container = this.viewer.canvas;

    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    if (!container.contains(canvas)) {
      container.appendChild(canvas);
    }

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    canvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      lastX = e.offsetX;
      lastY = e.offsetY;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      context.strokeStyle = this.drawingConfig.strokeStyle;
      context.lineWidth = this.drawingConfig.lineWidth;
      context.beginPath();
      context.moveTo(lastX, lastY);
      context.lineTo(e.offsetX, e.offsetY);
      context.stroke();
      [lastX, lastY] = [e.offsetX, e.offsetY];
    });

    canvas.addEventListener('mouseup', () => (isDrawing = false));
    canvas.addEventListener('mouseout', () => (isDrawing = false));

    this.resizeHandler = () => {
      const tempCanvas = document.createElement('canvas');
      const tempContext = tempCanvas.getContext('2d');
      if (tempContext) {
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempContext.drawImage(canvas, 0, 0);
        const previousContent = tempContext.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        context.putImageData(previousContent, 0, 0); // This approach assumes the entire canvas fits in memory, which might not scale well for very large canvas sizes. Consider adding checks or optimizations for large datasets.
      }
    };
    this.viewer.addHandler('resize', this.resizeHandler);
  }

  private addGridToggleButton(): void {
    const gridButton = document.createElement('button');
    gridButton.textContent = 'Toggle Grid';
    gridButton.style.position = 'absolute';
    gridButton.style.top = '10px';
    gridButton.style.right = '10px';
    gridButton.style.zIndex = '1000'; // Using hardcoded z-index values can lead to conflicts with other elements. Consider centralizing z-index management in a theme or configuration file.
    gridButton.addEventListener('click', () => {
      this.showGrid = !this.showGrid;
      this.toggleGrid();
    });
    this.osdContainer.nativeElement.appendChild(gridButton);
  }

  private addCoordinatesToggleButton(): void {
    const coordinatesButton = document.createElement('button');
    coordinatesButton.textContent = 'Toggle Coordinates';
    coordinatesButton.style.position = 'absolute';
    coordinatesButton.style.top = '50px';
    coordinatesButton.style.right = '10px';
    coordinatesButton.style.zIndex = '1000';
    coordinatesButton.addEventListener('click', () => {
      this.showCoordinates = !this.showCoordinates;
      this.toggleCoordinates();
    });
    this.osdContainer.nativeElement.appendChild(coordinatesButton);
  }

  private toggleGrid(): void {
    const canvas = this.viewer.canvas.querySelector('canvas');
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    if (this.showGrid) {
      const gridSize = 50; // Example grid size
      context.beginPath();
      for (let x = 0; x < canvas.width; x += gridSize) {
        context.moveTo(x, 0);
        context.lineTo(x, canvas.height);
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
      }
      context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      context.lineWidth = 1;
      context.stroke();
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height); // Clearing the canvas removes all content, including the grid and drawings. Ensure you have a strategy to preserve and redraw elements if needed.
    }
  }

  private toggleCoordinates(): void {
    const canvas = this.viewer.canvas.querySelector('canvas');
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    if (this.showCoordinates) {
      canvas.addEventListener('mousemove', this.displayCoordinates);
    } else {
      canvas.removeEventListener('mousemove', this.displayCoordinates);
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  private displayCoordinates = (e: MouseEvent): void => {
    const canvas = this.viewer.canvas.querySelector('canvas');
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = this.drawingConfig.fillStyle;
    context.fillRect(e.offsetX, e.offsetY, 100, 50);
    context.fillStyle = 'black';
    context.fillText(`X: ${e.offsetX}, Y: ${e.offsetY}`, e.offsetX + 10, e.offsetY + 25);
  }
}
