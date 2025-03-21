// Graph Visualization Module

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const canvas = document.getElementById('graph-canvas');
  const ctx = canvas.getContext('2d');
  const loadGraphBtn = document.getElementById('load-graph-btn');
  const toggleLabelsCheckbox = document.getElementById('toggle-labels');
  const toggleEdgesCheckbox = document.getElementById('toggle-edges');
  const tooltip = document.getElementById('tooltip');
  const graphStatsDiv = document.getElementById('graph-stats');
  
  // Graph data and visualization settings
  let graph = null;
  let showLabels = true;
  let showEdges = true;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let drawnPoints = [];
  
  // Animation state
  let isAnimating = false;
  let animationPath = [];
  let currentPathIndex = 0;
  let animationPoint = { x: 0, y: 0 };
  let animationStartTime = 0;
  let animationSpeed = 0.3; // seconds per edge segment
  let animationRequestId = null;
  
  // Initialize graph visualization
  function init() {
    // Event listeners
    loadGraphBtn.addEventListener('click', loadGraph);
    
    toggleLabelsCheckbox.addEventListener('change', () => {
      showLabels = toggleLabelsCheckbox.checked;
      if (graph) drawGraph();
    });
    
    toggleEdgesCheckbox.addEventListener('change', () => {
      showEdges = toggleEdgesCheckbox.checked;
      if (graph) drawGraph();
    });
    
    // Canvas mouse events for interactivity
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseClick);
    canvas.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });
    
    // Handle canvas resize
    window.addEventListener('resize', () => {
      resizeCanvas();
      if (graph) drawGraph();
    });
    
    // Initial canvas sizing
    resizeCanvas();
    
    // Try to load graph on startup (if files exist)
    loadGraph();
  }
  
  // Resize canvas to fit container
  function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }
  
  // Load graph data from CSV files
  async function loadGraph() {
    try {
      // Show loading message in stats div
      graphStatsDiv.innerHTML = '<p>Loading graph data...</p>';
      
      // Load nodes.csv
      const nodesResponse = await fetch('/nodes.csv');
      if (!nodesResponse.ok) {
        graphStatsDiv.innerHTML = '<p class="error">No nodes data found. Please upload a CSV file first.</p>';
        return;
      }
      const nodesText = await nodesResponse.text();
      
      // Load edges.csv
      const edgesResponse = await fetch('/edges.csv');
      if (!edgesResponse.ok) {
        graphStatsDiv.innerHTML = '<p class="error">No edges data found. Please upload a CSV file first.</p>';
        return;
      }
      const edgesText = await edgesResponse.text();
      
      // Parse CSV data
      graph = parseGraphData(nodesText, edgesText);
      
      // Calculate bounds for scaling
      calculateBounds();
      
      // Display stats and draw graph
      displayGraphStats();
      drawGraph();
      
      console.log('Graph loaded successfully');
    } catch (error) {
      console.error('Error loading graph:', error);
      graphStatsDiv.innerHTML = `<p class="error">Error loading graph: ${error.message}</p>`;
    }
  }
  
  // Parse CSV data into a graph object
  function parseGraphData(nodesText, edgesText) {
    // Parse nodes
    const nodeLines = nodesText.trim().split('\n');
    const nodes = new Map();
    
    // Skip header row (NodeID,X,Y,Z)
    for (let i = 1; i < nodeLines.length; i++) {
      const values = nodeLines[i].split(',');
      if (values.length >= 4) {
        const nodeId = values[0];
        const x = parseFloat(values[1]);
        const y = parseFloat(values[2]);
        const z = parseFloat(values[3]);
        
        if (!isNaN(nodeId) && !isNaN(x) && !isNaN(y) && !isNaN(z)) {
          nodes.set(nodeId, { id: nodeId, x, y, z });
        }
      }
    }
    
    // Parse edges
    const edgeLines = edgesText.trim().split('\n');
    const edges = [];
    const adjacencyList = new Map();
    
    // Initialize empty adjacency lists for all nodes
    for (const nodeId of nodes.keys()) {
      adjacencyList.set(nodeId, []);
    }
    
    // Skip header row (EdgeID,SourceNodeID,TargetNodeID)
    for (let i = 1; i < edgeLines.length; i++) {
      const values = edgeLines[i].split(',');
      if (values.length >= 3) {
        const edgeId = values[0];
        const sourceId = values[1];
        const targetId = values[2];
        
        if (nodes.has(sourceId) && nodes.has(targetId)) {
          edges.push({ id: edgeId, source: sourceId, target: targetId });
          
          // Update adjacency list (undirected graph)
          adjacencyList.get(sourceId).push(targetId);
          adjacencyList.get(targetId).push(sourceId);
        }
      }
    }
    
    return { nodes, edges, adjacencyList };
  }
  
  // Calculate min/max bounds for scaling
  function calculateBounds() {
    minX = Infinity;
    maxX = -Infinity;
    minY = Infinity;
    maxY = -Infinity;
    
    for (const node of graph.nodes.values()) {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    }
  }
  
  // Display graph statistics
  function displayGraphStats() {
    // Basic stats
    let statsHTML = `
      <p><strong>Nodes:</strong> ${graph.nodes.size}</p>
      <p><strong>Edges:</strong> ${graph.edges.length}</p>
    `;
    
    // Find node with highest degree
    let maxDegree = 0;
    let maxDegreeNode = null;
    
    for (const [nodeId, neighbors] of graph.adjacencyList.entries()) {
      const degree = neighbors.length;
      if (degree > maxDegree) {
        maxDegree = degree;
        maxDegreeNode = nodeId;
      }
    }
    
    if (maxDegreeNode !== null) {
      statsHTML += `<p><strong>Node with most connections:</strong> ${maxDegreeNode} (${maxDegree} connections)</p>`;
    }
    
    // Add coordinate range
    statsHTML += `
      <p><strong>X Range:</strong> ${minX.toFixed(2)} to ${maxX.toFixed(2)}</p>
      <p><strong>Y Range:</strong> ${minY.toFixed(2)} to ${maxY.toFixed(2)}</p>
    `;
    
    graphStatsDiv.innerHTML = statsHTML;
  }
  
  // Draw the graph visualization
  function drawGraph() {
    if (!graph || graph.nodes.size === 0) return;
    
    // Clear canvas and reset drawn points
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawnPoints = [];
    
    // Calculate scale to fit all nodes in canvas
    const padding = 40;
    const scaleX = (canvas.width - padding * 2) / (maxX - minX || 1);
    const scaleY = (canvas.height - padding * 2) / (maxY - minY || 1);
    
    // Use the smaller scale to maintain aspect ratio
    const scale = Math.min(scaleX, scaleY);
    
    // Center the drawing on canvas
    const offsetX = padding + (canvas.width - padding * 2 - (maxX - minX) * scale) / 2;
    const offsetY = padding + (canvas.height - padding * 2 - (maxY - minY) * scale) / 2;
    
    // Draw edges first (if enabled)
    if (showEdges) {
      ctx.lineWidth = 2;
      
      for (const edge of graph.edges) {
        const sourceNode = graph.nodes.get(edge.source);
        const targetNode = graph.nodes.get(edge.target);
        
        if (!sourceNode || !targetNode) continue;
        
        const sourceX = offsetX + (sourceNode.x - minX) * scale;
        const sourceY = offsetY + (sourceNode.y - minY) * scale;
        const targetX = offsetX + (targetNode.x - minX) * scale;
        const targetY = offsetY + (targetNode.y - minY) * scale;
        
        // Generate color based on edge index
        const hue = (parseInt(edge.id) * 137.5) % 360;
        ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
        
        // Draw edge
        ctx.beginPath();
        ctx.moveTo(sourceX, sourceY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
      }
    }
    
    // Get animation start and end node IDs for highlighting
    let animationStartNodeId = null;
    let animationEndNodeId = null;
    if (isAnimating && animationPath && animationPath.length >= 2) {
      animationStartNodeId = animationPath[0].nodeId;
      animationEndNodeId = animationPath[animationPath.length - 1].nodeId;
    }
    
    // Draw nodes
    for (const [nodeId, node] of graph.nodes.entries()) {
      const x = offsetX + (node.x - minX) * scale;
      const y = offsetY + (node.y - minY) * scale;
      
      // Calculate node radius based on degree (min 5, max 15)
      const degree = graph.adjacencyList.get(nodeId)?.length || 0;
      const radius = Math.max(5, Math.min(15, 5 + degree * 2));
      
      // Determine fill color based on animation status
      if (nodeId === animationStartNodeId) {
        // Start node: green
        ctx.fillStyle = '#2ecc71';
      } else if (nodeId === animationEndNodeId) {
        // End node: red
        ctx.fillStyle = '#e74c3c';
      } else {
        // Regular node: blue
        ctx.fillStyle = '#3498db';
      }
      
      // Draw node circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw outline with thicker line for animation start/end nodes
      if (nodeId === animationStartNodeId) {
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 3;
      } else if (nodeId === animationEndNodeId) {
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 1;
      }
      ctx.stroke();
      
      // Draw label if enabled
      if (showLabels) {
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nodeId, x, y);
      }
      
      // Store node info for hover detection
      drawnPoints.push({
        x, 
        y, 
        radius,
        nodeId,
        originalX: node.x,
        originalY: node.y,
        originalZ: node.z,
        degree
      });
    }
    
    // Draw border around the valid coordinate space
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      offsetX, 
      offsetY, 
      (maxX - minX) * scale, 
      (maxY - minY) * scale
    );
    
    // If animation is active, draw the animated point
    if (isAnimating) {
      // Draw the animated point
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(animationPoint.x, animationPoint.y, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  
  // Handle mouse movement for hover tooltip
  function handleMouseMove(event) {
    if (!graph) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Check if mouse is over any node
    let hoveredPoint = null;
    
    for (const point of drawnPoints) {
      const distance = Math.sqrt(
        Math.pow(mouseX - point.x, 2) + 
        Math.pow(mouseY - point.y, 2)
      );
      
      if (distance <= point.radius + 2) { // +2 for better hover detection
        hoveredPoint = point;
        break;
      }
    }
    
    if (hoveredPoint) {
      // Show tooltip with node info
      tooltip.style.display = 'block';
      tooltip.style.left = `${event.clientX + 10}px`;
      tooltip.style.top = `${event.clientY + 10}px`;
      
      const neighbors = graph.adjacencyList.get(hoveredPoint.nodeId) || [];
      
      tooltip.innerHTML = `
        <strong>Node ID:</strong> ${hoveredPoint.nodeId}<br>
        <strong>Coordinates:</strong> (${hoveredPoint.originalX.toFixed(2)}, 
                                      ${hoveredPoint.originalY.toFixed(2)}, 
                                      ${hoveredPoint.originalZ.toFixed(2)})<br>
        <strong>Connections:</strong> ${hoveredPoint.degree}<br>
        <strong>Connected to:</strong> ${neighbors.join(', ') || 'None'}
      `;
      
      canvas.style.cursor = 'pointer';
    } else {
      // Hide tooltip if not hovering over a node
      tooltip.style.display = 'none';
      canvas.style.cursor = 'default';
    }
  }
  
  // Handle mouse click on nodes
  function handleMouseClick(event) {
    if (!graph) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Check if we clicked on a node
    for (const point of drawnPoints) {
      const distance = Math.sqrt(
        Math.pow(mouseX - point.x, 2) + 
        Math.pow(mouseY - point.y, 2)
      );
      
      if (distance <= point.radius + 2) {
        startAnimation(point.nodeId);
        break;
      }
    }
  }
  
  // Animate the point moving along the path
  function animatePoint(timestamp) {
    if (!isAnimating || !animationPath || animationPath.length < 2) {
      isAnimating = false;
      tooltip.style.display = 'none';
      return;
    }
    
    // Just use a simple step-based animation instead of time-based
    // to avoid NaN errors with timestamp calculations
    if (!window.animationStep) {
      window.animationStep = 0;
      window.animationProgress = 0;
    }
    
    // Increment step counter
    window.animationStep++;
    
    // Calculate progress (0 to 1) based on step count
    // Using 100 steps for the entire animation
    window.animationProgress = Math.min(1, window.animationStep / 100);
    
    if (window.animationProgress >= 1) {
      // Animation complete
      animationPoint.x = animationPath[animationPath.length - 1].x;
      animationPoint.y = animationPath[animationPath.length - 1].y;
      
      // Update the display one last time
      drawGraph();
      
      // Wait a bit then stop the animation
      setTimeout(() => {
        isAnimating = false;
        tooltip.style.display = 'none';
        window.animationStep = 0;
        window.animationProgress = 0;
        drawGraph();
      }, 1000);
      
      return;
    }
    
    // Calculate segment index based on progress
    const totalSegments = animationPath.length - 1;
    const exactSegmentFloat = window.animationProgress * totalSegments;
    const segmentIndex = Math.min(
      Math.floor(exactSegmentFloat),
      totalSegments - 1
    );
    
    // Calculate progress within current segment (0 to 1)
    const segmentProgress = exactSegmentFloat - segmentIndex;
    
    // Get start and end points for current segment
    const startPoint = animationPath[segmentIndex];
    const endPoint = animationPath[segmentIndex + 1];
    
    // Verify points exist before interpolating
    if (!startPoint || !endPoint) {
      console.error("Invalid animation path points:", { 
        segmentIndex, 
        animationPathLength: animationPath.length 
      });
      isAnimating = false;
      tooltip.style.display = 'none';
      window.animationStep = 0;
      window.animationProgress = 0;
      drawGraph();
      return;
    }
    
    // Interpolate position
    animationPoint.x = startPoint.x + (endPoint.x - startPoint.x) * segmentProgress;
    animationPoint.y = startPoint.y + (endPoint.y - startPoint.y) * segmentProgress;
    
    // Update the tooltip to show current position
    tooltip.innerHTML = `
      <strong>Animation:</strong><br>
      <span style="color: #2ecc71; font-weight: bold;">Start: Node ${animationPath[0].nodeId}</span><br>
      <span style="color: #e74c3c; font-weight: bold;">End: Node ${animationPath[animationPath.length - 1].nodeId}</span><br>
      Current: ${startPoint.nodeId} → ${endPoint.nodeId}<br>
      Progress: ${Math.round(window.animationProgress * 100)}%
    `;
    
    // Redraw graph with updated animation point
    drawGraph();
    
    // Continue animation
    animationRequestId = requestAnimationFrame(animatePoint);
  }
  
  // Start animation from a specific node
  function startAnimation(startNodeId) {
    if (!graph || !graph.nodes.has(startNodeId)) return;
    
    // Stop any existing animation
    if (isAnimating) {
      cancelAnimationFrame(animationRequestId);
    }
    
    // Reset animation counters
    window.animationStep = 0;
    window.animationProgress = 0;
    
    // Find a random end node that is different from start node
    const allNodeIds = Array.from(graph.nodes.keys());
    if (allNodeIds.length <= 1) return; // Need at least 2 nodes
    
    let endNodeId;
    do {
      const randomIndex = Math.floor(Math.random() * allNodeIds.length);
      endNodeId = allNodeIds[randomIndex];
    } while (endNodeId === startNodeId);
    
    console.log(`Starting animation from Node ${startNodeId} to Node ${endNodeId}`);
    
    // Find a path between start and end nodes
    const path = findPath(startNodeId, endNodeId);
    
    if (path.length <= 1) {
      console.log('No valid path found between nodes');
      tooltip.style.display = 'block';
      tooltip.style.left = `${drawnPoints.find(p => p.nodeId === startNodeId)?.x + 20}px`;
      tooltip.style.top = `${drawnPoints.find(p => p.nodeId === startNodeId)?.y + 20}px`;
      tooltip.innerHTML = `
        <strong>Animation Error:</strong><br>
        No valid path found between Node ${startNodeId} and Node ${endNodeId}.
      `;
      setTimeout(() => {
        tooltip.style.display = 'none';
      }, 3000);
      return;
    }
    
    // Prepare animation
    animationPath = [];
    
    // Create pixel coordinates for each point in the path
    const padding = 40;
    const scaleX = (canvas.width - padding * 2) / (maxX - minX || 1);
    const scaleY = (canvas.height - padding * 2) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY);
    const offsetX = padding + (canvas.width - padding * 2 - (maxX - minX) * scale) / 2;
    const offsetY = padding + (canvas.height - padding * 2 - (maxY - minY) * scale) / 2;
    
    // Create animation points from the path
    let hasInvalidNode = false;
    for (const nodeId of path) {
      const node = graph.nodes.get(nodeId);
      if (!node) {
        console.error(`Node ${nodeId} not found in graph`);
        hasInvalidNode = true;
        break;
      }
      animationPath.push({
        x: offsetX + (node.x - minX) * scale,
        y: offsetY + (node.y - minY) * scale,
        nodeId
      });
    }
    
    if (hasInvalidNode || animationPath.length < 2) {
      console.error('Invalid animation path');
      tooltip.style.display = 'block';
      tooltip.style.left = `${drawnPoints.find(p => p.nodeId === startNodeId)?.x + 20}px`;
      tooltip.style.top = `${drawnPoints.find(p => p.nodeId === startNodeId)?.y + 20}px`;
      tooltip.innerHTML = `
        <strong>Animation Error:</strong><br>
        Unable to create a valid path for animation.
      `;
      setTimeout(() => {
        tooltip.style.display = 'none';
      }, 3000);
      return;
    }
    
    // Set initial position at the start node
    currentPathIndex = 0;
    animationPoint.x = animationPath[0].x;
    animationPoint.y = animationPath[0].y;
    
    // Start the animation
    isAnimating = true;
    
    // Display animation info in tooltip
    tooltip.style.display = 'block';
    tooltip.style.left = `${animationPath[0].x + 20}px`;
    tooltip.style.top = `${animationPath[0].y + 20}px`;
    tooltip.innerHTML = `
      <strong>Animation:</strong><br>
      <span style="color: #2ecc71; font-weight: bold;">Start: Node ${startNodeId}</span><br>
      <span style="color: #e74c3c; font-weight: bold;">End: Node ${endNodeId}</span><br>
      Path length: ${path.length - 1} segments
    `;
    
    // Start animation loop
    animatePoint();
  }
  
  // Find path between two nodes (BFS algorithm)
  function findPath(startNodeId, endNodeId) {
    if (!graph.nodes.has(startNodeId) || !graph.nodes.has(endNodeId)) {
      return [];
    }
    
    // Simple BFS to find shortest path
    const queue = [startNodeId];
    const visited = new Set([startNodeId]);
    const parent = new Map();
    
    while (queue.length > 0) {
      const current = queue.shift();
      
      if (current === endNodeId) {
        break; // Found the end node
      }
      
      // Check all neighbors
      for (const neighbor of graph.adjacencyList.get(current)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          parent.set(neighbor, current);
          queue.push(neighbor);
        }
      }
    }
    
    // Reconstruct path if end was found
    if (!parent.has(endNodeId)) {
      // No path found, find a connected node instead
      console.log('No direct path found, choosing a random connected path');
      // Try to find some path from start node to any other node
      const path = [startNodeId];
      let current = startNodeId;
      
      // Find some node that's connected
      for (let i = 0; i < 5; i++) { // Limit to 5 hops max
        const neighbors = graph.adjacencyList.get(current) || [];
        if (neighbors.length === 0) break;
        
        // Pick a random neighbor
        const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
        if (!randomNeighbor) break;
        
        path.push(randomNeighbor);
        current = randomNeighbor;
        
        if (current === endNodeId) break;
      }
      
      return path;
    }
    
    // Reconstruct the path from end to start
    const path = [endNodeId];
    let current = endNodeId;
    
    while (current !== startNodeId) {
      current = parent.get(current);
      path.unshift(current);
    }
    
    return path;
  }
  
  // Initialize the graph visualization
  init();
}); 