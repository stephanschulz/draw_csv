// Auto-converter for CSV files to Graph format

// Send data back to the server (using fetch)
async function saveFileToServer(filename, content) {
    try {
        const response = await fetch('save_file.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: filename,
                content: content
            }),
        });
        
        if (response.ok) {
            console.log(`Successfully saved ${filename} to server`);
            return true;
        } else {
            console.error(`Failed to save ${filename} to server: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.error(`Error saving ${filename} to server:`, error);
        return false;
    }
}

// Convert the CSV file and save nodes.csv and edges.csv
async function autoConvertAndSave() {
    try {
        // Check for the CSV files in a specific order
        const csvFiles = ['csv_test.csv', 'simple_points.csv'];
        let sourceFile = null;
        
        for (const file of csvFiles) {
            try {
                const response = await fetch(file, { method: 'HEAD' });
                if (response.ok) {
                    sourceFile = file;
                    break;
                }
            } catch (e) {
                console.log(`File ${file} not found, trying next option`);
            }
        }
        
        if (!sourceFile) {
            console.warn('No source CSV files found!');
            return false;
        }
        
        console.log(`Found source CSV: ${sourceFile}`);
        
        // Fetch and convert the file
        const response = await fetch(sourceFile);
        const csvText = await response.text();
        
        // Convert to graph format
        const { nodes, edges } = convertToGraphFormat(csvText);
        
        console.log(`Conversion results: ${nodes.length} nodes and ${edges.length} edges`);
        
        // Generate CSV content
        const nodesCSV = generateNodesCSV(nodes);
        const edgesCSV = generateEdgesCSV(edges);
        
        // Save the files
        // First try server-side save if possible
        let nodesSaved = await saveFileToServer('nodes.csv', nodesCSV);
        let edgesSaved = await saveFileToServer('edges.csv', edgesCSV);
        
        // If server-side save fails, download the files
        if (!nodesSaved) {
            downloadFile(nodesCSV, 'nodes.csv');
        }
        
        if (!edgesSaved) {
            downloadFile(edgesCSV, 'edges.csv');
        }
        
        return {
            success: true,
            stats: {
                sourceFile,
                nodeCount: nodes.length,
                edgeCount: edges.length
            }
        };
    } catch (error) {
        console.error('Auto conversion failed:', error);
        return { success: false, error: error.message };
    }
}

// Save file on server using PHP script
// This PHP script must be created separately to handle the file saving
// save_file.php example:
/*
<?php
header('Content-Type: application/json');

// Get the JSON data
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data || !isset($data['filename']) || !isset($data['content'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid data']);
    exit;
}

$filename = $data['filename'];
$content = $data['content'];

// Validate filename (only allow specific files to be written)
$allowedFiles = ['nodes.csv', 'edges.csv'];
if (!in_array($filename, $allowedFiles)) {
    echo json_encode(['success' => false, 'message' => 'Invalid filename']);
    exit;
}

// Write the file
$result = file_put_contents($filename, $content);

if ($result === false) {
    echo json_encode(['success' => false, 'message' => 'Failed to write file']);
} else {
    echo json_encode(['success' => true, 'message' => 'File saved successfully']);
}
*/

// Run the auto-conversion when this script loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Auto-converter initialized');
    const result = await autoConvertAndSave();
    
    if (result.success) {
        console.log(`Auto-conversion complete: ${result.stats.nodeCount} nodes and ${result.stats.edgeCount} edges from ${result.stats.sourceFile}`);
    } else {
        console.error('Auto-conversion failed');
    }
}); 