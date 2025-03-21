# CSV to Graph Converter & Visualizer

A web application that converts CSV files to graph format and provides interactive visualization.

## Features

- Upload CSV files with line/edge data
- Convert to nodes.csv and edges.csv format
- Interactive graph visualization
- CSV data preview
- Download generated files
- Hover tooltips with node information

## CSV Format

Your CSV file should have the following structure:

```
ID,StartX,StartY,StartZ,EndX,EndY,EndZ
0,4.573242,4.573246,6.823752,10.667999,4.574478,6.074254
1,99.971924,69.4944,6.255437,87.782402,69.4944,6.095602
...
```

Where:
- **ID**: Row identifier (numeric)
- **StartX, StartY, StartZ**: Coordinates of the start point
- **EndX, EndY, EndZ**: Coordinates of the end point

For visualization purposes, Z values are stored but not used in the 2D drawing.

## Setup on Glitch.com

1. Create a new project on [Glitch](https://glitch.com/)
2. Click "New Project" and select "Import from GitHub"
3. Enter this repository URL 
4. Wait for the project to initialize
5. Your app should automatically start running!

Alternatively, you can create a new project from scratch and upload these files:

1. `server.js` - The main Node.js server
2. `package.json` - Dependencies and metadata
3. `public/index.html` - Main HTML file
4. `public/css/styles.css` - CSS styles
5. `public/js/app.js` - Front-end JavaScript for UI
6. `public/js/graph.js` - Graph visualization code

## Manual Setup

If you're not using Glitch, follow these steps:

1. Make sure you have Node.js installed
2. Clone this repository
3. Run `npm install` to install dependencies
4. Run `node server.js` to start the server
5. Open `http://localhost:3000` in your browser

## Usage

1. Open the application in your browser
2. Upload your CSV file using the upload form
3. Wait for the file to be processed
4. View the generated graph and download the nodes.csv and edges.csv files
5. Use the controls to show/hide labels and edges

## Dependencies

- Express.js - Web server
- Multer - File upload handling
- csv-parser - CSV parsing 