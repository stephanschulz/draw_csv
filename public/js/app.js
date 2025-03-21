// Main application JavaScript

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const uploadForm = document.getElementById('upload-form');
  const csvFileInput = document.getElementById('csv-file');
  const uploadBtn = document.getElementById('upload-btn');
  const uploadStatus = document.getElementById('upload-status');
  const downloadSection = document.getElementById('download-section');
  const conversionStats = document.getElementById('conversion-stats');
  const nodesPreview = document.getElementById('nodes-preview');
  const edgesPreview = document.getElementById('edges-preview');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Handle file upload
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const file = csvFileInput.files[0];
    if (!file) {
      showStatus('Please select a CSV file', 'error');
      return;
    }
    
    // Show loading status
    showStatus('Uploading and converting...', 'loading');
    uploadBtn.disabled = true;
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('csvFile', file);
      
      // Send file to server
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.error) {
        showStatus(`Error: ${data.error}`, 'error');
      } else {
        showStatus('CSV successfully converted!', 'success');
        displayConversionStats(data.stats);
        loadCsvPreviews();
        downloadSection.style.display = 'block';
      }
    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
    } finally {
      uploadBtn.disabled = false;
    }
  });
  
  // Show status message
  function showStatus(message, type = 'info') {
    uploadStatus.textContent = message;
    uploadStatus.className = 'status';
    if (type) {
      uploadStatus.classList.add(type);
    }
  }
  
  // Display conversion statistics
  function displayConversionStats(stats) {
    conversionStats.innerHTML = `
      <p>Successfully converted CSV file:</p>
      <ul>
        <li><strong>Nodes Created:</strong> ${stats.nodeCount}</li>
        <li><strong>Edges Created:</strong> ${stats.edgeCount}</li>
      </ul>
      <p>You can now download the files or view the visualization.</p>
    `;
  }
  
  // Load CSV previews
  async function loadCsvPreviews() {
    try {
      // Load nodes.csv preview
      const nodesResponse = await fetch('/nodes.csv');
      const nodesText = await nodesResponse.text();
      displayCsvPreview(nodesText, nodesPreview);
      
      // Load edges.csv preview
      const edgesResponse = await fetch('/edges.csv');
      const edgesText = await edgesResponse.text();
      displayCsvPreview(edgesText, edgesPreview);
    } catch (error) {
      console.error('Error loading CSV previews:', error);
    }
  }
  
  // Display CSV preview as a table
  function displayCsvPreview(csvText, container) {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return;
    
    const headers = lines[0].split(',');
    
    // Create table
    let tableHtml = '<table><thead><tr>';
    
    // Add headers
    for (const header of headers) {
      tableHtml += `<th>${header}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';
    
    // Add rows (limit to 10 for performance)
    const displayRows = lines.slice(1, Math.min(lines.length, 11));
    for (const line of displayRows) {
      const cells = line.split(',');
      tableHtml += '<tr>';
      for (const cell of cells) {
        tableHtml += `<td>${cell}</td>`;
      }
      tableHtml += '</tr>';
    }
    
    tableHtml += '</tbody></table>';
    
    // Add message if there are more rows
    if (lines.length > 11) {
      tableHtml += `<p class="more-rows">... and ${lines.length - 11} more rows</p>`;
    }
    
    container.innerHTML = tableHtml;
  }
  
  // Tab switching functionality
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and tabs
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked button and corresponding tab
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Update file input label with filename
  csvFileInput.addEventListener('change', () => {
    const label = csvFileInput.nextElementSibling;
    label.textContent = csvFileInput.files.length ? 
      csvFileInput.files[0].name : 
      'Choose a CSV file';
  });
}); 