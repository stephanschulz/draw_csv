document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const fileInput = document.getElementById('fileInput');
    const drawButton = document.getElementById('drawButton');
    const clearButton = document.getElementById('clearButton');
    const reloadDefaultButton = document.getElementById('reloadDefaultButton');
    const statusElement = document.querySelector('.status');
    
    let csvData = null;
    
    // Update status message
    function updateStatus(message) {
        if (statusElement) {
            statusElement.textContent = message;
        }
    }
    
    // Parse CSV data
    function parseCSV(text) {
        const lines = text.split('\n');
        const startPoints = [];
        const endPoints = [];
        const rowData = []; // Store original row data
        
        console.log(`Total lines in CSV: ${lines.length}`);
        let successfullyParsed = 0;
        
        // Check if this is the new CSV format with simple comma separation
        const firstLine = lines[0].trim();
        const isStandardFormat = firstLine.includes('Start x') && firstLine.includes('End x');
        
        console.log(`CSV format detected: ${isStandardFormat ? 'Standard' : 'Complex'}`);
        
        // Skip header row and start processing from line 1
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Log sample lines for debugging
            if (i < 5) {
                console.log(`Sample line ${i}: "${line}"`);
            }
            
            try {
                // Simple format: ID,StartX,StartY,StartZ,EndX,EndY,EndZ
                const values = line.split(',').map(val => val.trim());
                
                if (values.length >= 7) {
                    // ID is at index 0, which we can ignore for drawing
                    const id = values[0];
                    const startX = parseFloat(values[1]);
                    const startY = parseFloat(values[2]);
                    const startZ = parseFloat(values[3]); // We'll store Z but ignore for drawing
                    const endX = parseFloat(values[4]);
                    const endY = parseFloat(values[5]);
                    const endZ = parseFloat(values[6]);
                    
                    if (!isNaN(startX) && !isNaN(startY) && !isNaN(startZ) &&
                        !isNaN(endX) && !isNaN(endY) && !isNaN(endZ)) {
                        
                        startPoints.push({
                            id,
                            x: startX,
                            y: startY,
                            z: startZ,
                            type: 'start'
                        });
                        
                        endPoints.push({
                            id,
                            x: endX,
                            y: endY,
                            z: endZ,
                            type: 'end'
                        });
                        
                        // Store the original row data
                        rowData.push({
                            id,
                            startX,
                            startY,
                            startZ,
                            endX,
                            endY,
                            endZ,
                            originalLine: line
                        });
                        
                        successfullyParsed++;
                    } else {
                        console.warn(`Line ${i} has invalid numeric values: ${line}`);
                    }
                } else {
                    console.warn(`Line ${i} doesn't have enough values (expected 7, got ${values.length}): ${line}`);
                }
            } catch (e) {
                console.error(`Error parsing line ${i}: ${line}`, e);
            }
        }
        
        console.log(`Successfully parsed ${successfullyParsed} out of ${lines.length} lines`);
        return { startPoints, endPoints, rowData };
    }
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.padding = '10px';
    tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.borderRadius = '5px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.zIndex = '1000';
    tooltip.style.fontSize = '14px';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);
    
    // Variables to track drawn points for hover detection
    let drawnPoints = [];
    
    // Draw lines between start and end points
    function drawLines(startPoints, endPoints) {
        if (!startPoints.length || !endPoints.length) return;
        
        // Clear canvas and reset drawn points
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawnPoints = [];
        
        // Find min/max to scale points to canvas - ignore Z values as requested
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const point of [...startPoints, ...endPoints]) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }
        
        console.log(`Coordinate range: X(${minX} to ${maxX}), Y(${minY} to ${maxY})`);
        
        // Add padding
        const padding = 20;
        const scaleX = (canvas.width - padding * 2) / (maxX - minX || 1);
        const scaleY = (canvas.height - padding * 2) / (maxY - minY || 1);
        
        // Use the smaller scale to maintain aspect ratio
        const scale = Math.min(scaleX, scaleY);
        
        // Center the drawing on canvas
        const offsetX = (canvas.width - (maxX - minX) * scale) / 2;
        const offsetY = (canvas.height - (maxY - minY) * scale) / 2;
        
        console.log(`Drawing ${startPoints.length} lines with scale: ${scale.toFixed(4)}`);
        
        // Generate different colors for clearer visualization
        const getColor = (index) => {
            // Use HSL for evenly distributed colors
            const hue = (index * 137.5) % 360; // Use golden angle for better distribution
            return `hsl(${hue}, 80%, 50%)`;
        };
        
        ctx.lineWidth = 3; // Increased line width for even better visibility
        
        let zeroLengthLines = 0;
        
        for (let i = 0; i < startPoints.length; i++) {
            // Map the coordinates to canvas space, ignoring Z values
            const startX = offsetX + (startPoints[i].x - minX) * scale;
            const startY = offsetY + (startPoints[i].y - minY) * scale;
            const endX = offsetX + (endPoints[i].x - minX) * scale;
            const endY = offsetY + (endPoints[i].y - minY) * scale;
            
            // Calculate line length to detect very short lines
            const lineLength = Math.sqrt(
                Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
            );
            
            // Draw the line
            ctx.strokeStyle = getColor(i);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Draw circles with varying size based on the line number 
            // to help identify different points
            const pointRadius = Math.max(3, Math.min(6, 3 + (i % 4)));
            
            // Draw small circles for start points (blue)
            ctx.fillStyle = '#0000FF';
            ctx.beginPath();
            ctx.arc(startX, startY, pointRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Add to drawn points for hover detection
            drawnPoints.push({
                x: startX,
                y: startY,
                radius: pointRadius,
                type: 'start',
                id: startPoints[i].id,
                originalX: startPoints[i].x,
                originalY: startPoints[i].y,
                originalZ: startPoints[i].z,
                lineIndex: i
            });
            
            // Draw small circles for end points (red)
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(endX, endY, pointRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Add to drawn points for hover detection
            drawnPoints.push({
                x: endX,
                y: endY,
                radius: pointRadius,
                type: 'end',
                id: endPoints[i].id,
                originalX: endPoints[i].x,
                originalY: endPoints[i].y,
                originalZ: endPoints[i].z,
                lineIndex: i
            });
            
            // Count very short lines
            if (lineLength < 1.0) {
                zeroLengthLines++;
            }
            
            // For debugging the first few points and any points with very short lines
            if (i < 5 || lineLength < 1.0) {
                console.log(`Line ${i}: (${startPoints[i].x.toFixed(2)}, ${startPoints[i].y.toFixed(2)}) to (${endPoints[i].x.toFixed(2)}, ${endPoints[i].y.toFixed(2)}) - Length: ${lineLength.toFixed(2)}`);
            }
        }
        
        // Report any very short lines
        if (zeroLengthLines > 0) {
            console.warn(`Found ${zeroLengthLines} lines with length < 1 pixel`);
        }
        
        // Draw border around the valid coordinate space
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            offsetX, 
            offsetY, 
            (maxX - minX) * scale, 
            (maxY - minY) * scale
        );
    }
    
    // Add mouse event listeners
    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Check if mouse is over any point
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
            // Find the corresponding CSV row
            const rowIndex = parseInt(hoveredPoint.id);
            const rowInfo = csvData.rowData[rowIndex];
            
            if (rowInfo) {
                // Show tooltip with data
                tooltip.style.display = 'block';
                tooltip.style.left = `${event.clientX + 10}px`;
                tooltip.style.top = `${event.clientY + 10}px`;
                
                tooltip.innerHTML = `
                    <strong>ID:</strong> ${rowInfo.id}<br>
                    <strong>Start:</strong> (${rowInfo.startX.toFixed(2)}, ${rowInfo.startY.toFixed(2)}, ${rowInfo.startZ.toFixed(2)})<br>
                    <strong>End:</strong> (${rowInfo.endX.toFixed(2)}, ${rowInfo.endY.toFixed(2)}, ${rowInfo.endZ.toFixed(2)})<br>
                    <strong>Point Type:</strong> ${hoveredPoint.type}<br>
                    <strong>Line Index:</strong> ${hoveredPoint.lineIndex}
                `;
                
                // Highlight the point
                canvas.style.cursor = 'pointer';
            }
        } else {
            // Hide tooltip if not hovering over a point
            tooltip.style.display = 'none';
            canvas.style.cursor = 'default';
        }
    });
    
    // Hide tooltip when mouse leaves canvas
    canvas.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
    });
    
    // Auto-load the CSV file
    function loadDefaultCSV() {
        updateStatus('Loading csv_test.csv...');
        
        fetch('csv_test.csv')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.text();
            })
            .then(text => {
                // Log the first few lines to debug
                const firstFewLines = text.split('\n').slice(0, 5).join('\n');
                console.log("First few lines of CSV:", firstFewLines);
                
                csvData = parseCSV(text);
                console.log(`Loaded ${csvData.startPoints.length} points from default CSV`);
                updateStatus(`Loaded ${csvData.startPoints.length} points from csv_test.csv`);
                // Automatically draw the lines
                drawLines(csvData.startPoints, csvData.endPoints);
            })
            .catch(error => {
                console.error('Error loading the default CSV file:', error);
                updateStatus(`Error loading csv_test.csv: ${error.message}`);
            });
    }
    
    // Load the default CSV on page load
    loadDefaultCSV();
    
    // Handle file selection
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        updateStatus(`Loading ${file.name}...`);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            csvData = parseCSV(text);
            console.log(`Loaded ${csvData.startPoints.length} points from selected file`);
            updateStatus(`Loaded ${csvData.startPoints.length} points from ${file.name}`);
            // Automatically draw the lines from the newly selected file
            drawLines(csvData.startPoints, csvData.endPoints);
        };
        reader.readAsText(file);
    });
    
    // Draw button click handler
    drawButton.addEventListener('click', () => {
        if (csvData) {
            drawLines(csvData.startPoints, csvData.endPoints);
            updateStatus('Redrawing lines...');
        } else {
            alert('No CSV data available');
            updateStatus('No CSV data available to draw');
        }
    });
    
    // Clear button click handler
    clearButton.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateStatus('Canvas cleared');
    });
    
    // Reload default CSV button click handler
    reloadDefaultButton.addEventListener('click', () => {
        loadDefaultCSV();
    });
}); 