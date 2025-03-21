// Graph data structure
class Graph {
    constructor() {
        this.nodes = new Map(); // Map nodeID to node data
        this.edges = [];        // List of edges
        this.adjList = new Map(); // Adjacency list representation
    }

    // Add a node to the graph
    addNode(nodeId, x, y, z) {
        this.nodes.set(nodeId, { id: nodeId, x, y, z });
        // Initialize empty adjacency list for this node
        if (!this.adjList.has(nodeId)) {
            this.adjList.set(nodeId, []);
        }
    }

    // Add an edge between nodes
    addEdge(edgeId, sourceId, targetId) {
        // Get node objects
        const source = this.nodes.get(sourceId);
        const target = this.nodes.get(targetId);
        
        if (!source || !target) {
            console.error(`Cannot add edge: node ${sourceId} or ${targetId} not found`);
            return;
        }
        
        // Create edge object
        const edge = {
            id: edgeId,
            source: sourceId,
            target: targetId
        };
        
        this.edges.push(edge);
        
        // Update adjacency list (for both directions as undirected graph)
        this.adjList.get(sourceId).push(targetId);
        this.adjList.get(targetId).push(sourceId);
    }
    
    // Find all neighbors of a node
    getNeighbors(nodeId) {
        return this.adjList.get(nodeId) || [];
    }
    
    // Find the degree of a node (number of connected edges)
    getDegree(nodeId) {
        return this.getNeighbors(nodeId).length;
    }
    
    // Print basic graph statistics
    printStats() {
        console.log(`Graph has ${this.nodes.size} nodes and ${this.edges.length} edges`);
        
        // Find node with highest degree
        let maxDegree = 0;
        let maxDegreeNode = null;
        
        for (const nodeId of this.nodes.keys()) {
            const degree = this.getDegree(nodeId);
            if (degree > maxDegree) {
                maxDegree = degree;
                maxDegreeNode = nodeId;
            }
        }
        
        console.log(`Node with highest degree: ${maxDegreeNode} (degree ${maxDegree})`);
    }
}

// Parse CSV text into arrays of objects
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        
        for (let j = 0; j < headers.length; j++) {
            // Convert numeric values to numbers
            const value = values[j];
            row[headers[j]] = isNaN(value) ? value : parseFloat(value);
        }
        
        data.push(row);
    }
    
    return data;
}

// Load nodes and edges from CSV files and create graph
async function loadGraph() {
    try {
        // Fetch the CSV files
        const nodesResponse = await fetch('nodes.csv');
        const edgesResponse = await fetch('edges.csv');
        
        const nodesText = await nodesResponse.text();
        const edgesText = await edgesResponse.text();
        
        // Parse CSVs
        const nodesData = parseCSV(nodesText);
        const edgesData = parseCSV(edgesText);
        
        // Create graph
        const graph = new Graph();
        
        // Add nodes to graph
        for (const node of nodesData) {
            graph.addNode(node.NodeID, node.X, node.Y, node.Z);
        }
        
        // Add edges to graph
        for (const edge of edgesData) {
            graph.addEdge(edge.EdgeID, edge.SourceNodeID, edge.TargetNodeID);
        }
        
        console.log('Graph loaded successfully');
        graph.printStats();
        
        return graph;
    } catch (error) {
        console.error('Error loading graph:', error);
    }
}

// Example usage
// document.addEventListener('DOMContentLoaded', async () => {
//     const graph = await loadGraph();
//     console.log('Graph loaded:', graph);
// }); 