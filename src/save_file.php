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
    echo json_encode(['success' => true, 'message' => 'File saved successfully', 'bytes' => $result]);
}
?> 