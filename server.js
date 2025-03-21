// Server for CSV to Graph conversion and visualization
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const app = express();
const port = process.env.PORT || 3000;

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, 'source_' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Serve static files from 'public' directory
app.use(express.static('public'));
app.use(express.json());

// Route for uploading CSV file
app.post('/upload', upload.single('csvFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Read and process the uploaded CSV file
    processCSV(req.file.path, (result) => {
      if (result.error) {
        return res.status(500).json({ error: result.error });
      }
      res.json(result);
    });
  } catch (error) {
    console.error('Error processing CSV:', error);
    res.status(500).json({ error: 'Error processing CSV file' });
  }
});

// Generate nodes.csv file and return its content
app.get('/nodes.csv', (req, res) => {
  if (fs.existsSync('public/nodes.csv')) {
    res.header('Content-Type', 'text/csv');
    res.sendFile(path.join(__dirname, 'public/nodes.csv'));
  } else {
    res.status(404).send('Nodes file not found. Please upload a CSV file first.');
  }
});

// Generate edges.csv file and return its content
app.get('/edges.csv', (req, res) => {
  if (fs.existsSync('public/edges.csv')) {
    res.header('Content-Type', 'text/csv');
    res.sendFile(path.join(__dirname, 'public/edges.csv'));
  } else {
    res.status(404).send('Edges file not found. Please upload a CSV file first.');
  }
});

// Process the CSV file to extract nodes and edges
function processCSV(filePath, callback) {
  try {
    const rows = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', () => {
        // Convert to graph format
        const result = convertToGraphFormat(rows);
        
        // Save nodes and edges to CSV files
        fs.writeFileSync('public/nodes.csv', result.nodesCSV);
        fs.writeFileSync('public/edges.csv', result.edgesCSV);
        
        callback({
          success: true,
          stats: {
            nodeCount: result.stats.nodeCount,
            edgeCount: result.stats.edgeCount
          }
        });
      })
      .on('error', (error) => {
        console.error('Error processing CSV:', error);
        callback({ error: 'Error processing CSV file' });
      });
  } catch (error) {
    console.error('Error:', error);
    callback({ error: 'Error processing file' });
  }
}

// Convert data to graph format
function convertToGraphFormat(data) {
  // Track unique nodes by coordinates
  const nodesMap = new Map();
  const edges = [];
  let nextNodeId = 0;
  
  console.log(`Converting ${data.length} rows of CSV data...`);
  
  data.forEach((row, index) => {
    try {
      // Handle different CSV formats - we need to identify the columns
      let startX, startY, startZ, endX, endY, endZ, lineId;
      
      // If the row has numeric properties like 0, 1, 2 (from csv-parser with numeric headers)
      if (row['0'] !== undefined) {
        lineId = row['0'];
        startX = parseFloat(row['1']);
        startY = parseFloat(row['2']);
        startZ = parseFloat(row['3']);
        endX = parseFloat(row['4']);
        endY = parseFloat(row['5']);
        endZ = parseFloat(row['6']);
      }
      // If the row has named columns (standard CSV with headers)
      else if (row['id'] !== undefined || row['ID'] !== undefined) {
        lineId = row['id'] || row['ID'];
        
        if (row['StartX'] !== undefined) {
          // Format with explicit Start/End prefixes
          startX = parseFloat(row['StartX']);
          startY = parseFloat(row['StartY']);
          startZ = parseFloat(row['StartZ']);
          endX = parseFloat(row['EndX']);
          endY = parseFloat(row['EndY']);
          endZ = parseFloat(row['EndZ']);
        } else if (row['start_x'] !== undefined) {
          // Alternative naming convention
          startX = parseFloat(row['start_x']);
          startY = parseFloat(row['start_y']);
          startZ = parseFloat(row['start_z']);
          endX = parseFloat(row['end_x']);
          endY = parseFloat(row['end_y']);
          endZ = parseFloat(row['end_z']);
        } else if (row['Start x'] !== undefined) {
          // Format with spaces in column names
          startX = parseFloat(row['Start x']);
          startY = parseFloat(row['Start y']);
          startZ = parseFloat(row['Start z']);
          endX = parseFloat(row['End x']);
          endY = parseFloat(row['End y']);
          endZ = parseFloat(row['End z']);
        }
      }
      
      // Check if all required values are available and valid
      if (!isNaN(startX) && !isNaN(startY) && !isNaN(endX) && !isNaN(endY)) {
        // Start point may be NaN if Z is not provided, default to 0
        startZ = isNaN(startZ) ? 0 : startZ;
        endZ = isNaN(endZ) ? 0 : endZ;
        
        // Create unique keys for nodes
        const startKey = `${startX},${startY},${startZ}`;
        const endKey = `${endX},${endY},${endZ}`;
        
        // Add start node if it doesn't exist
        let startNodeId;
        if (!nodesMap.has(startKey)) {
          startNodeId = nextNodeId++;
          nodesMap.set(startKey, {
            id: startNodeId,
            x: startX,
            y: startY,
            z: startZ
          });
        } else {
          startNodeId = nodesMap.get(startKey).id;
        }
        
        // Add end node if it doesn't exist
        let endNodeId;
        if (!nodesMap.has(endKey)) {
          endNodeId = nextNodeId++;
          nodesMap.set(endKey, {
            id: endNodeId,
            x: endX,
            y: endY,
            z: endZ
          });
        } else {
          endNodeId = nodesMap.get(endKey).id;
        }
        
        // Add edge
        edges.push({
          id: edges.length,
          source: startNodeId,
          target: endNodeId,
          originalLineId: lineId || index
        });
      }
    } catch (error) {
      console.error(`Error processing row ${index}:`, error);
    }
  });
  
  // Convert to arrays
  const nodes = Array.from(nodesMap.values());
  
  console.log(`Conversion complete: ${nodes.length} unique nodes and ${edges.length} edges created.`);
  
  // Generate CSV content
  const nodesCSV = generateNodesCSV(nodes);
  const edgesCSV = generateEdgesCSV(edges);
  
  return {
    nodesCSV,
    edgesCSV,
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length
    }
  };
}

// Generate nodes.csv content
function generateNodesCSV(nodes) {
  let csv = 'NodeID,X,Y,Z\n';
  
  for (const node of nodes) {
    csv += `${node.id},${node.x},${node.y},${node.z}\n`;
  }
  
  return csv;
}

// Generate edges.csv content
function generateEdgesCSV(edges) {
  let csv = 'EdgeID,SourceNodeID,TargetNodeID\n';
  
  for (const edge of edges) {
    csv += `${edge.id},${edge.source},${edge.target}\n`;
  }
  
  return csv;
}

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 