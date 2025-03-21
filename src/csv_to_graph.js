// Utility to convert from the original CSV format to graph-friendly format

// Function to convert CSV data to nodes and edges
function convertToGraphFormat(csvText) {
    const lines = csvText.trim().split('\n');
    const nodesMap = new Map(); // Map to track unique nodes
    const edges = [];
    
    console.log(`Converting ${lines.length} lines of CSV data...`);
    
    // Skip header row (if present)
    const startLine = lines[0].includes('Start x') ? 1 : 0;
    
    let nextNodeId = 0;
    
    for (let i = startLine; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        try {
            // Format: ID,StartX,StartY,StartZ,EndX,EndY,EndZ
            const values = line.split(',').map(val => val.trim());
            
            if (values.length >= 7) {
                const lineId = values[0];
                const startX = parseFloat(values[1]);
                const startY = parseFloat(values[2]);
                const startZ = parseFloat(values[3]);
                const endX = parseFloat(values[4]);
                const endY = parseFloat(values[5]);
                const endZ = parseFloat(values[6]);
                
                // Check if all values are valid numbers
                if (!isNaN(startX) && !isNaN(startY) && !isNaN(startZ) &&
                    !isNaN(endX) && !isNaN(endY) && !isNaN(endZ)) {
                    
                    // Generate unique keys for start and end points
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
                        originalLineId: lineId
                    });
                }
            }
        } catch (e) {
            console.error(`Error processing line ${i}: ${line}`, e);
        }
    }
    
    // Convert to arrays
    const nodes = Array.from(nodesMap.values());
    
    console.log(`Conversion complete: ${nodes.length} unique nodes and ${edges.length} edges created.`);
    
    return { nodes, edges };
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

// Main conversion function
async function convertCSVToGraphFiles(inputPath) {
    try {
        // Fetch the original CSV
        const response = await fetch(inputPath);
        const csvText = await response.text();
        
        // Convert to graph format
        const { nodes, edges } = convertToGraphFormat(csvText);
        
        // Generate CSV content
        const nodesCSV = generateNodesCSV(nodes);
        const edgesCSV = generateEdgesCSV(edges);
        
        // Return the generated CSV content
        return {
            nodesCSV,
            edgesCSV,
            stats: {
                nodeCount: nodes.length,
                edgeCount: edges.length
            }
        };
    } catch (error) {
        console.error('Error converting CSV to graph files:', error);
        throw error;
    }
}

// Function to download content as a file
function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// Usage example (can be commented out)
// document.addEventListener('DOMContentLoaded', () => {
//     const convertButton = document.getElementById('convert-button');
//     if (convertButton) {
//         convertButton.addEventListener('click', async () => {
//             try {
//                 const result = await convertCSVToGraphFiles('simple_points.csv');
//                 
//                 // Download the generated files
//                 downloadFile(result.nodesCSV, 'nodes.csv');
//                 downloadFile(result.edgesCSV, 'edges.csv');
//                 
//                 console.log(`Conversion complete: ${result.stats.nodeCount} nodes and ${result.stats.edgeCount} edges`);
//             } catch (error) {
//                 console.error('Conversion failed:', error);
//             }
//         });
//     }
// }); 