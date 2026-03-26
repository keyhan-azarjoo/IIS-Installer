// SAM3 Professional Dashboard JavaScript - Interactive Layer System

// Global Variables
let currentImageFile = null;
let detectionData = null;
let layerStates = {};  // Track visibility and opacity of each object
let selectedObjectId = null;
let globalOpacity = 0.6;
let hoveredObjectId = null;  // Track which object is being hovered over

// DOM Elements
const dropArea = document.getElementById('dropArea');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const detectionForm = document.getElementById('detectionForm');
const submitBtn = document.getElementById('submitBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const noResults = document.getElementById('noResults');
const resultsContainer = document.getElementById('resultsContainer');
const confidenceSlider = document.getElementById('confidenceSlider');
const confidenceValue = document.getElementById('confidenceValue');
const globalOpacitySlider = document.getElementById('globalOpacity');
const globalOpacityValue = document.getElementById('globalOpacityValue');

// Canvas elements
const maskCanvas = document.getElementById('maskCanvas');
const ctx = maskCanvas.getContext('2d');
const detectedImage = document.getElementById('detectedImage');

// ========================================
// Drag and Drop Functionality
// ========================================

dropArea.addEventListener('click', () => {
    imageInput.click();
});

dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('drag-over');
});

dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('drag-over');
});

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleImageFile(files[0]);
    }
});

imageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleImageFile(e.target.files[0]);
    }
});

// ========================================
// Image Handling Functions
// ========================================

function handleImageFile(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
        showToast('Please upload a valid image file (JPG or PNG)', 'danger');
        return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast('File size exceeds 10MB. Please choose a smaller image.', 'danger');
        return;
    }

    currentImageFile = file;

    // Update the file input
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    imageInput.files = dataTransfer.files;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        imagePreview.classList.remove('d-none');
        dropArea.classList.add('d-none');
    };
    reader.readAsDataURL(file);
}

function clearImage() {
    currentImageFile = null;
    imageInput.value = '';
    imagePreview.classList.add('d-none');
    dropArea.classList.remove('d-none');
    previewImg.src = '';

    // Clear detection results
    detectionData = null;
    layerStates = {};
    selectedObjectId = null;
}

// ========================================
// Advanced Settings
// ========================================

confidenceSlider.addEventListener('input', (e) => {
    confidenceValue.textContent = e.target.value;
});

function resetSettings() {
    confidenceSlider.value = 0.25;
    confidenceValue.textContent = '0.25';
}

// ========================================
// Global Opacity Control
// ========================================

globalOpacitySlider.addEventListener('input', (e) => {
    globalOpacity = parseFloat(e.target.value);
    globalOpacityValue.textContent = globalOpacity.toFixed(1);

    // Update all layers (both visible and hidden)
    if (detectionData && detectionData.objects) {
        detectionData.objects.forEach(obj => {
            if (layerStates[obj.id]) {
                layerStates[obj.id].opacity = globalOpacity;

                // Update the individual opacity slider and value display
                const opacitySlider = document.getElementById(`opacity-${obj.id}`);
                const opacityValueSpan = document.getElementById(`opacity-value-${obj.id}`);
                if (opacitySlider) opacitySlider.value = globalOpacity;
                if (opacityValueSpan) opacityValueSpan.textContent = globalOpacity.toFixed(1);
            }
        });
        renderMasks();
    }
});

// ========================================
// Form Submission with AJAX
// ========================================

detectionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate form
    const textPrompt = document.getElementById('textPrompt').value.trim();
    if (!currentImageFile) {
        showToast('Please upload an image first', 'danger');
        return;
    }
    if (!textPrompt) {
        showToast('Please enter an object detection prompt', 'danger');
        return;
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('image', currentImageFile);
    formData.append('text_prompt', textPrompt);
    formData.append('confidence', confidenceSlider.value);

    // Show loading state
    showLoading(true);

    try {
        // Send AJAX request with extended timeout for CPU inference
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 min timeout
        const response = await fetch('/detect', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            showToast(data.error, 'danger');
        } else {
            // Store detection data
            detectionData = data;

            // Initialize layer states (all visible by default)
            layerStates = {};
            data.objects.forEach(obj => {
                layerStates[obj.id] = {
                    visible: true,
                    opacity: globalOpacity,
                    selected: false
                };
            });

            // Display results
            displayResults(data);

            // Show success message
            showToast(`Detection completed! Found ${data.objects.length} objects`, 'success');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('An error occurred during detection. Please try again.', 'danger');
    } finally {
        showLoading(false);
    }
});

// ========================================
// Display Results with Interactive Layers
// ========================================

function displayResults(data) {
    // Hide no results message
    noResults.classList.add('d-none');

    // Show results container
    resultsContainer.classList.remove('d-none');

    // Display original image
    document.getElementById('originalImage').src = 'data:image/png;base64,' + data.original;

    // Setup canvas for interactive masks
    setupCanvas(data);

    // Populate objects list
    populateObjectsList(data.objects);

    // Update detection metadata
    document.getElementById('objectCount').textContent = data.stats.objects_detected;
    document.getElementById('objectCountInfo').textContent = data.stats.objects_detected;
    document.getElementById('processTime').textContent = data.stats.processing_time;
    document.getElementById('avgConfidence').textContent = data.stats.avg_confidence;

    // Update statistics panel
    updateStatistics(data.stats);

    // Auto-switch to detected tab
    const detectedTab = new bootstrap.Tab(document.getElementById('detected-tab'));
    detectedTab.show();

    // Update export module with latest results
    if (typeof ExportModule !== 'undefined') {
        ExportModule.loadFromDetection(data, data.original);
    }
}

// ========================================
// Canvas Setup and Rendering
// ========================================

function setupCanvas(data) {
    // Set image first
    detectedImage.src = 'data:image/png;base64,' + data.original;

    // Wait for image to load before setting up canvas
    detectedImage.onload = () => {
        // Match canvas size to image
        const rect = detectedImage.getBoundingClientRect();
        maskCanvas.width = detectedImage.naturalWidth;
        maskCanvas.height = detectedImage.naturalHeight;
        maskCanvas.style.width = rect.width + 'px';
        maskCanvas.style.height = rect.height + 'px';

        // Initial render
        renderMasks();
    };
}

function renderMasks() {
    if (!detectionData || !detectionData.objects) return;

    // Clear canvas
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Create a single image data buffer for ALL layers
    const imageData = ctx.createImageData(maskCanvas.width, maskCanvas.height);

    // First, render all non-hovered objects
    detectionData.objects.forEach(obj => {
        const state = layerStates[obj.id];
        if (!state || !state.visible) return;
        if (obj.id === hoveredObjectId) return; // Skip hovered object for now

        // Add this mask to the image data
        addMaskToImageData(imageData, obj, state.opacity);
    });

    // Then render the hovered object on top with full opacity
    if (hoveredObjectId !== null) {
        const hoveredObj = detectionData.objects.find(obj => obj.id === hoveredObjectId);
        if (hoveredObj) {
            const state = layerStates[hoveredObj.id];
            if (state && state.visible) {
                addMaskToImageData(imageData, hoveredObj, 1.0);
            }
        }
    }

    // Put the combined image data to canvas
    ctx.putImageData(imageData, 0, 0);

    // Draw hover outline if hovering
    if (hoveredObjectId !== null) {
        const hoveredObj = detectionData.objects.find(obj => obj.id === hoveredObjectId);
        if (hoveredObj) {
            drawHoverOutline(hoveredObj);
        }
    }

    // Draw bounding boxes on top (after all masks)
    detectionData.objects.forEach(obj => {
        const state = layerStates[obj.id];
        if (state && state.selected) {
            drawBoundingBox(obj);
        }
    });
}

function addMaskToImageData(imageData, obj, opacity) {
    const mask = obj.mask;
    const color = obj.color;

    for (let y = 0; y < mask.length; y++) {
        for (let x = 0; x < mask[y].length; x++) {
            if (mask[y][x]) {
                const idx = (y * maskCanvas.width + x) * 4;

                // Get current pixel values
                const currentR = imageData.data[idx];
                const currentG = imageData.data[idx + 1];
                const currentB = imageData.data[idx + 2];
                const currentA = imageData.data[idx + 3] / 255.0;

                // New color with opacity
                const newR = color[0];
                const newG = color[1];
                const newB = color[2];
                const newA = opacity;

                // Alpha blending formula
                const outA = newA + currentA * (1 - newA);

                if (outA > 0) {
                    imageData.data[idx] = (newR * newA + currentR * currentA * (1 - newA)) / outA;
                    imageData.data[idx + 1] = (newG * newA + currentG * currentA * (1 - newA)) / outA;
                    imageData.data[idx + 2] = (newB * newA + currentB * currentA * (1 - newA)) / outA;
                    imageData.data[idx + 3] = outA * 255;
                } else {
                    // If output alpha is 0, just set the new color
                    imageData.data[idx] = newR;
                    imageData.data[idx + 1] = newG;
                    imageData.data[idx + 2] = newB;
                    imageData.data[idx + 3] = newA * 255;
                }
            }
        }
    }
}

function drawBoundingBox(obj) {
    if (!obj.bbox) return;

    const bbox = obj.bbox;
    const color = obj.color;

    ctx.strokeStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);

    ctx.strokeRect(bbox.x_min, bbox.y_min, bbox.width, bbox.height);

    // Draw label background
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.8)`;
    const labelText = obj.label;
    ctx.font = 'bold 14px Arial';
    const textMetrics = ctx.measureText(labelText);
    const labelHeight = 20;
    const labelWidth = textMetrics.width + 10;

    ctx.fillRect(bbox.x_min, bbox.y_min - labelHeight, labelWidth, labelHeight);

    // Draw label text
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'top';
    ctx.fillText(labelText, bbox.x_min + 5, bbox.y_min - labelHeight + 3);

    ctx.setLineDash([]);
}

function drawHoverOutline(obj) {
    if (!obj.bbox) return;

    const bbox = obj.bbox;
    const color = obj.color;

    // Draw a thick glowing outline
    ctx.strokeStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([]);

    // Draw multiple strokes for glow effect
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 8;
    ctx.strokeRect(bbox.x_min - 2, bbox.y_min - 2, bbox.width + 4, bbox.height + 4);

    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 4;
    ctx.strokeRect(bbox.x_min - 1, bbox.y_min - 1, bbox.width + 2, bbox.height + 2);

    ctx.globalAlpha = 1.0;
    ctx.lineWidth = 2;
    ctx.strokeRect(bbox.x_min, bbox.y_min, bbox.width, bbox.height);

    // Draw label
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.9)`;
    const labelText = '🎯 ' + obj.label;
    ctx.font = 'bold 16px Arial';
    const textMetrics = ctx.measureText(labelText);
    const labelHeight = 24;
    const labelWidth = textMetrics.width + 12;

    ctx.fillRect(bbox.x_min, bbox.y_min - labelHeight - 2, labelWidth, labelHeight);

    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'top';
    ctx.fillText(labelText, bbox.x_min + 6, bbox.y_min - labelHeight + 2);

    // Reset global alpha
    ctx.globalAlpha = 1.0;
}

// ========================================
// Populate Objects List
// ========================================

function populateObjectsList(objects) {
    const objectsList = document.getElementById('objectsList');
    objectsList.innerHTML = '';

    objects.forEach(obj => {
        const item = createObjectListItem(obj);
        objectsList.appendChild(item);
    });
}

function createObjectListItem(obj) {
    const div = document.createElement('div');
    div.className = 'list-group-item list-group-item-action';
    div.id = `object-item-${obj.id}`;

    const color = obj.color;
    const rgbColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

    // Extract mask boundary points (not all pixels, just the outline)
    const boundaryPoints = extractBoundaryPoints(obj.mask);

    div.innerHTML = `
        <!-- Compact Header (Always Visible) -->
        <div class="object-header" onclick="toggleObjectDetails(${obj.id})">
            <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center flex-grow-1">
                    <div class="form-check me-2" onclick="event.stopPropagation()">
                        <input class="form-check-input" type="checkbox" id="visible-${obj.id}" checked>
                    </div>
                    <div class="color-indicator me-2" style="background-color: ${rgbColor};"></div>
                    <div class="flex-grow-1">
                        <strong>${obj.label}</strong>
                        <span class="small text-muted ms-2">${obj.confidence ? `${(obj.confidence * 100).toFixed(1)}%` : 'N/A'}</span>
                    </div>
                    <button class="btn btn-sm btn-outline-primary me-2" onclick="event.stopPropagation(); toggleObjectSelection(${obj.id})">
                        <i class="fas fa-crosshairs"></i>
                    </button>
                    <i class="fas fa-chevron-down expand-icon" id="expand-icon-${obj.id}"></i>
                </div>
            </div>
        </div>

        <!-- Expandable Details Section (Hidden by Default) -->
        <div class="object-details d-none" id="details-${obj.id}">
            <!-- Bounding Box Info -->
            ${obj.bbox ? `
            <div class="detail-section">
                <div class="detail-title">📍 Bounding Box</div>
                <div class="detail-content">
                    Position: (${obj.bbox.x_min}, ${obj.bbox.y_min}) → (${obj.bbox.x_max}, ${obj.bbox.y_max})<br>
                    Size: ${obj.bbox.width} × ${obj.bbox.height} px<br>
                    Area: ${obj.area.toLocaleString()} px²
                </div>
            </div>
            ` : ''}

            <!-- Boundary Points -->
            <div class="detail-section">
                <div class="detail-title">🔷 Boundary Points (${boundaryPoints.length} points)</div>
                <div class="detail-content">
                    ${JSON.stringify(boundaryPoints)}
                </div>
            </div>

            <!-- Mask Dimensions -->
            <div class="detail-section">
                <div class="detail-title">📐 Mask Info</div>
                <div class="detail-content">
                    Dimensions: ${obj.mask[0].length} × ${obj.mask.length} px<br>
                    Filled pixels: ${obj.area.toLocaleString()}<br>
                    Coverage: ${((obj.area / (obj.mask[0].length * obj.mask.length)) * 100).toFixed(2)}%
                </div>
            </div>

            <!-- Opacity Control -->
            <div class="compact-controls">
                <label class="form-label small mb-1">Opacity: <span id="opacity-value-${obj.id}">${globalOpacity.toFixed(1)}</span></label>
                <input type="range" class="form-range form-range-sm" id="opacity-${obj.id}"
                       min="0" max="1" step="0.1" value="${globalOpacity}">
            </div>
        </div>
    `;

    // Add event listeners
    const checkbox = div.querySelector(`#visible-${obj.id}`);
    checkbox.addEventListener('change', (e) => {
        layerStates[obj.id].visible = e.target.checked;
        renderMasks();
    });

    const opacitySlider = div.querySelector(`#opacity-${obj.id}`);
    const opacityValueSpan = div.querySelector(`#opacity-value-${obj.id}`);
    if (opacitySlider) {
        opacitySlider.addEventListener('input', (e) => {
            const opacity = parseFloat(e.target.value);
            layerStates[obj.id].opacity = opacity;
            opacityValueSpan.textContent = opacity.toFixed(1);
            renderMasks();
        });
    }

    return div;
}

// Extract boundary points from mask (edge pixels only)
function extractBoundaryPoints(mask) {
    const points = [];
    const height = mask.length;
    const width = mask[0].length;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (mask[y][x]) {
                // Check if this is an edge pixel (has at least one non-mask neighbor)
                const isEdge = (
                    (y === 0 || !mask[y-1][x]) ||
                    (y === height-1 || !mask[y+1][x]) ||
                    (x === 0 || !mask[y][x-1]) ||
                    (x === width-1 || !mask[y][x+1])
                );

                if (isEdge) {
                    points.push([x, y]);
                }
            }
        }
    }

    return points;
}

// Toggle object details visibility
window.toggleObjectDetails = function(objectId) {
    const detailsDiv = document.getElementById(`details-${objectId}`);
    const expandIcon = document.getElementById(`expand-icon-${objectId}`);
    const listItem = document.getElementById(`object-item-${objectId}`);

    if (detailsDiv.classList.contains('d-none')) {
        // Expand
        detailsDiv.classList.remove('d-none');
        expandIcon.classList.remove('fa-chevron-down');
        expandIcon.classList.add('fa-chevron-up');
        listItem.classList.add('expanded');
    } else {
        // Collapse
        detailsDiv.classList.add('d-none');
        expandIcon.classList.remove('fa-chevron-up');
        expandIcon.classList.add('fa-chevron-down');
        listItem.classList.remove('expanded');
    }
};

// ========================================
// Object Selection and Bounding Box
// ========================================

window.toggleObjectSelection = function(objectId) {
    // Deselect all objects
    Object.keys(layerStates).forEach(id => {
        layerStates[id].selected = false;
        const item = document.getElementById(`object-item-${id}`);
        if (item) item.classList.remove('active');
    });

    // Select this object
    if (selectedObjectId === objectId) {
        // Deselect if clicking the same object
        selectedObjectId = null;
    } else {
        selectedObjectId = objectId;
        layerStates[objectId].selected = true;
        const item = document.getElementById(`object-item-${objectId}`);
        if (item) item.classList.add('active');
    }

    renderMasks();
};

// ========================================
// Canvas Hover and Click Interactions
// ========================================

// Get the object at a specific canvas position
function getObjectAtPosition(canvasX, canvasY) {
    if (!detectionData || !detectionData.objects) return null;

    // Check each object's mask (in reverse order to prioritize top layers)
    for (let i = detectionData.objects.length - 1; i >= 0; i--) {
        const obj = detectionData.objects[i];
        const state = layerStates[obj.id];

        // Only check visible objects
        if (!state || !state.visible) continue;

        // Check if this position is inside the mask
        const mask = obj.mask;
        if (canvasY >= 0 && canvasY < mask.length &&
            canvasX >= 0 && canvasX < mask[0].length) {
            if (mask[canvasY][canvasX]) {
                return obj;
            }
        }
    }

    return null;
}

// Handle mouse move on canvas - for hover effect
maskCanvas.addEventListener('mousemove', (e) => {
    if (!detectionData) return;

    const rect = maskCanvas.getBoundingClientRect();
    const scaleX = maskCanvas.width / rect.width;
    const scaleY = maskCanvas.height / rect.height;

    const canvasX = Math.floor((e.clientX - rect.left) * scaleX);
    const canvasY = Math.floor((e.clientY - rect.top) * scaleY);

    const hoveredObj = getObjectAtPosition(canvasX, canvasY);
    const newHoveredId = hoveredObj ? hoveredObj.id : null;

    // Debug: log when hover changes
    if (newHoveredId !== hoveredObjectId) {
        console.log('Hover changed:', {
            from: hoveredObjectId,
            to: newHoveredId,
            object: hoveredObj ? hoveredObj.label : 'none',
            position: { x: canvasX, y: canvasY }
        });
    }

    // Only re-render if hover state changed
    if (newHoveredId !== hoveredObjectId) {
        hoveredObjectId = newHoveredId;
        renderMasks();

        // Change cursor style
        maskCanvas.style.cursor = hoveredObjectId !== null ? 'pointer' : 'default';
    }
});

// Handle mouse leave canvas - clear hover effect
maskCanvas.addEventListener('mouseleave', () => {
    if (hoveredObjectId !== null) {
        hoveredObjectId = null;
        renderMasks();
        maskCanvas.style.cursor = 'default';
    }
});

// Handle click on canvas - select object in list
maskCanvas.addEventListener('click', (e) => {
    if (!detectionData) return;

    const rect = maskCanvas.getBoundingClientRect();
    const scaleX = maskCanvas.width / rect.width;
    const scaleY = maskCanvas.height / rect.height;

    const canvasX = Math.floor((e.clientX - rect.left) * scaleX);
    const canvasY = Math.floor((e.clientY - rect.top) * scaleY);

    const clickedObj = getObjectAtPosition(canvasX, canvasY);

    if (clickedObj) {
        highlightObjectInList(clickedObj.id);
    }
});

// Highlight and scroll to object in the list
function highlightObjectInList(objectId) {
    const listItem = document.getElementById(`object-item-${objectId}`);
    if (!listItem) return;

    // Remove previous highlights
    document.querySelectorAll('.list-group-item').forEach(item => {
        item.classList.remove('list-highlight');
    });

    // Add highlight to clicked object
    listItem.classList.add('list-highlight');

    // Scroll the item into view
    listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Expand the details if not already expanded
    const detailsDiv = document.getElementById(`details-${objectId}`);
    if (detailsDiv && detailsDiv.classList.contains('d-none')) {
        toggleObjectDetails(objectId);
    }

    // Remove highlight after 2 seconds
    setTimeout(() => {
        listItem.classList.remove('list-highlight');
    }, 2000);
}

// ========================================
// Update Statistics Panel
// ========================================

function updateStatistics(stats) {
    const statElements = [
        document.getElementById('stat-proc-time'),
        document.getElementById('stat-obj-count'),
        document.getElementById('stat-avg-conf')
    ];

    statElements.forEach(el => {
        if (el) {
            el.classList.add('stat-update');
            setTimeout(() => el.classList.remove('stat-update'), 500);
        }
    });

    // Update values
    const statProcTime = document.getElementById('stat-proc-time');
    const statObjCount = document.getElementById('stat-obj-count');
    const statAvgConf = document.getElementById('stat-avg-conf');

    if (statProcTime) statProcTime.textContent = stats.processing_time;
    if (statObjCount) statObjCount.textContent = stats.objects_detected;
    if (statAvgConf) statAvgConf.textContent = stats.avg_confidence;
}

// ========================================
// Loading State
// ========================================

function showLoading(isLoading) {
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
        loadingSpinner.classList.remove('d-none');
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-search me-2"></i>Detect Objects';
        loadingSpinner.classList.add('d-none');
    }
}

// ========================================
// Toast Notifications
// ========================================

function showToast(message, type = 'danger') {
    const toastElement = document.getElementById('errorToast');
    const toastMessage = document.getElementById('toastMessage');

    toastMessage.textContent = message;

    toastElement.className = 'toast align-items-center border-0';
    if (type === 'success') {
        toastElement.classList.add('text-bg-success');
    } else if (type === 'warning') {
        toastElement.classList.add('text-bg-warning');
    } else {
        toastElement.classList.add('text-bg-danger');
    }

    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 4000
    });
    toast.show();
}

// ========================================
// Keyboard Shortcuts
// ========================================

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!submitBtn.disabled) {
            detectionForm.dispatchEvent(new Event('submit'));
        }
    }

    if (e.key === 'Escape') {
        if (!imagePreview.classList.contains('d-none')) {
            clearImage();
        }
        if (selectedObjectId !== null) {
            toggleObjectSelection(selectedObjectId);
        }
    }
});

// ========================================
// Mode Manager
// ========================================

const ModeManager = {
    currentMode: 'text-search',

    switchMode(mode) {
        console.log(`Switching mode from ${this.currentMode} to ${mode}`);

        // Hide all mode sections
        document.querySelectorAll('.mode-section').forEach(section => {
            section.classList.add('d-none');
        });

        // Show selected mode section
        const targetSection = document.getElementById(`${mode}-section`);
        if (targetSection) {
            targetSection.classList.remove('d-none');
        }

        // Update sidebar active state
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`[data-section="${mode}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        this.currentMode = mode;

        // Stop live camera if switching away
        if (typeof LiveCameraModule !== 'undefined' && LiveCameraModule.isRunning) {
            LiveCameraModule.stop();
        }

        // Clear previous results
        this.clearResults();
    },

    clearResults() {
        detectionData = null;
        layerStates = {};
        selectedObjectId = null;
        hoveredObjectId = null;

        // Clear results UI
        const resultsContainer = document.getElementById('resultsContainer');
        if (resultsContainer) {
            resultsContainer.classList.add('d-none');
        }
        const noResults = document.getElementById('noResults');
        if (noResults) {
            noResults.classList.remove('d-none');
        }
    }
};

// ========================================
// Point & Click Module
// ========================================

const PointClickModule = {
    canvas: null,
    ctx: null,
    image: null,
    imageFile: null,
    points: [],  // [{x, y, label}, ...]

    init() {
        this.canvas = document.getElementById('pointCanvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');

        // Event listeners for point selection
        this.canvas.addEventListener('click', (e) => this.addPoint(e, 1));
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.addPoint(e, 0);
        });

        // File input
        const fileInput = document.getElementById('pointImageInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.loadImage(e.target.files[0]));
        }

        // Buttons
        const detectBtn = document.getElementById('detectPointBtn');
        if (detectBtn) {
            detectBtn.addEventListener('click', () => this.detect());
        }

        const clearBtn = document.getElementById('clearPointsBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearPoints());
        }

        const confSlider = document.getElementById('pointConfidenceSlider');
        if (confSlider) {
            confSlider.addEventListener('input', () => {
                document.getElementById('pointConfidenceValue').textContent = parseFloat(confSlider.value).toFixed(2);
            });
        }
    },

    loadImage(file) {
        if (!file) return;

        this.imageFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                this.points = [];
                this.render();

                // Enable detect button
                const detectBtn = document.getElementById('detectPointBtn');
                if (detectBtn) detectBtn.disabled = false;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    addPoint(event, label) {
        if (!this.image) {
            showToast('Please upload an image first', 'warning');
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = Math.floor((event.clientX - rect.left) * scaleX);
        const y = Math.floor((event.clientY - rect.top) * scaleY);

        this.points.push({x, y, label});
        this.render();
        this.updatePointsList();
    },

    render() {
        if (!this.image) return;

        // Clear and draw image
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.image, 0, 0);

        // Draw points
        this.points.forEach((point, idx) => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
            this.ctx.fillStyle = point.label === 1 ? 'rgba(0, 255, 0, 0.7)' : 'rgba(255, 0, 0, 0.7)';
            this.ctx.fill();
            this.ctx.strokeStyle = point.label === 1 ? '#00ff00' : '#ff0000';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            // Draw point number
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(idx + 1, point.x, point.y);
        });
    },

    updatePointsList() {
        const pointsList = document.getElementById('pointsList');
        if (!pointsList) return;

        if (this.points.length === 0) {
            pointsList.innerHTML = '<p class="text-muted small">No points added yet</p>';
            return;
        }

        pointsList.innerHTML = '<div class="list-group">' +
            this.points.map((p, idx) => `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                        <strong>Point ${idx + 1}:</strong>
                        (${p.x}, ${p.y})
                        <span class="badge ${p.label === 1 ? 'bg-success' : 'bg-danger'} ms-2">
                            ${p.label === 1 ? 'Positive' : 'Negative'}
                        </span>
                    </span>
                    <button class="btn btn-sm btn-outline-danger" onclick="PointClickModule.removePoint(${idx})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('') +
            '</div>';
    },

    removePoint(index) {
        this.points.splice(index, 1);
        this.render();
        this.updatePointsList();
    },

    clearPoints() {
        this.points = [];
        this.render();
        this.updatePointsList();
    },

    async detect() {
        if (this.points.length === 0) {
            showToast('Please add at least one point', 'warning');
            return;
        }

        if (!this.imageFile) {
            showToast('Please upload an image first', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('image', this.imageFile);
        formData.append('points', JSON.stringify(this.points.map(p => [p.x, p.y])));
        formData.append('labels', JSON.stringify(this.points.map(p => p.label)));
        formData.append('confidence', document.getElementById('pointConfidenceSlider').value);

        try {
            const detectBtn = document.getElementById('detectPointBtn');
            if (detectBtn) {
                detectBtn.disabled = true;
                detectBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Detecting...';
            }

            const _ctrl1 = new AbortController();
            setTimeout(() => _ctrl1.abort(), 600000);
            const response = await fetch('/detect-point', {
                method: 'POST',
                body: formData,
                signal: _ctrl1.signal
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Detection failed');
            }

            const data = await response.json();

            // Display results in Point & Click section
            this.displayResults(data);
            updateStatistics(data.stats);

            showToast('Point detection completed successfully!', 'success');
        } catch (error) {
            console.error('Detection error:', error);
            showToast(error.message || 'Detection failed', 'danger');
        } finally {
            const detectBtn = document.getElementById('detectPointBtn');
            if (detectBtn) {
                detectBtn.disabled = false;
                detectBtn.innerHTML = '<i class="fas fa-search me-1"></i>Detect Object';
            }
        }
    },

    displayResults(data) {
        // Show results container
        const resultsContainer = document.getElementById('pointResultsContainer');
        if (resultsContainer) {
            resultsContainer.classList.remove('d-none');
        }

        // Set detected image
        const detectedImage = document.getElementById('pointDetectedImage');
        if (detectedImage && data.original) {
            detectedImage.src = 'data:image/png;base64,' + data.original;
        }

        // Update stats
        document.getElementById('pointObjectCount').textContent = data.stats.objects_detected;
        document.getElementById('pointObjectCountInfo').textContent = data.stats.objects_detected;
        document.getElementById('pointProcessTime').textContent = data.stats.processing_time;
        document.getElementById('pointAvgConfidence').textContent = data.stats.avg_confidence;

        // Store detection data for rendering
        this.detectionData = data;

        // Setup canvas
        detectedImage.onload = () => {
            const canvas = document.getElementById('pointMaskCanvas');
            canvas.width = detectedImage.naturalWidth;
            canvas.height = detectedImage.naturalHeight;
            canvas.style.width = detectedImage.width + 'px';
            canvas.style.height = detectedImage.height + 'px';

            // Setup interactive features
            this.setupInteractiveCanvas();
            this.renderMasks();
            this.populateObjectsList();
        };

        // Update export module
        if (typeof ExportModule !== 'undefined') {
            ExportModule.loadFromDetection(data, data.original);
        }
    },

    setupInteractiveCanvas() {
        const canvas = document.getElementById('pointMaskCanvas');
        const globalOpacitySlider = document.getElementById('pointGlobalOpacity');

        if (globalOpacitySlider) {
            globalOpacitySlider.addEventListener('input', () => {
                const opacity = parseFloat(globalOpacitySlider.value);
                document.getElementById('pointGlobalOpacityValue').textContent = opacity.toFixed(1);
                // Update all individual opacities
                if (this.detectionData && this.detectionData.objects) {
                    this.detectionData.objects.forEach((obj, idx) => {
                        const slider = document.getElementById(`point-opacity-${idx}`);
                        if (slider) slider.value = opacity;
                        const valueSpan = document.getElementById(`point-opacity-value-${idx}`);
                        if (valueSpan) valueSpan.textContent = opacity.toFixed(1);
                    });
                }
                this.renderMasks();
            });
        }
    },

    renderMasks() {
        if (!this.detectionData || !this.detectionData.objects) return;

        const canvas = document.getElementById('pointMaskCanvas');
        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Create image data for efficient rendering
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;

        // Render each visible object
        this.detectionData.objects.forEach((obj, idx) => {
            const checkbox = document.getElementById(`point-layer-${idx}`);
            const opacitySlider = document.getElementById(`point-opacity-${idx}`);

            const visible = checkbox ? checkbox.checked : true;
            const opacity = opacitySlider ? parseFloat(opacitySlider.value) : 0.6;

            if (visible && obj.mask) {
                const [r, g, b] = obj.color;
                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        if (obj.mask[y] && obj.mask[y][x]) {
                            const idx = (y * canvas.width + x) * 4;
                            data[idx] = r;
                            data[idx + 1] = g;
                            data[idx + 2] = b;
                            data[idx + 3] = Math.floor(opacity * 255);
                        }
                    }
                }
            }
        });

        ctx.putImageData(imageData, 0, 0);
    },

    populateObjectsList() {
        if (!this.detectionData || !this.detectionData.objects) return;

        const objectsList = document.getElementById('pointObjectsList');
        if (!objectsList) return;

        objectsList.innerHTML = '';

        this.detectionData.objects.forEach((obj, idx) => {
            const item = document.createElement('div');
            item.className = 'list-group-item';
            item.id = `point-object-item-${idx}`;

            const colorSquare = `<span class="color-indicator" style="display: inline-block; width: 20px; height: 20px; background: rgb(${obj.color.join(',')}); border-radius: 4px; margin-right: 8px;"></span>`;

            const bpts = extractBoundaryPoints(obj.mask);
            item.innerHTML = `
                <div class="object-header" style="cursor:pointer" onclick="this.nextElementSibling.classList.toggle('d-none')">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <input type="checkbox" id="point-layer-${idx}" checked class="form-check-input me-2" onclick="event.stopPropagation()">
                            ${colorSquare}
                            <strong>${obj.label}</strong>
                        </div>
                        <div onclick="event.stopPropagation()">
                            <label class="small me-2">
                                Opacity: <span id="point-opacity-value-${idx}">0.6</span>
                                <input type="range" id="point-opacity-${idx}" min="0" max="1" step="0.1" value="0.6" class="form-range" style="width: 80px; display: inline-block;">
                            </label>
                        </div>
                    </div>
                    <div class="small text-muted mt-1">
                        Area: ${obj.area} px
                        ${obj.confidence ? ` | Conf: ${(obj.confidence * 100).toFixed(1)}%` : ''}
                        ${obj.bbox ? ` | BBox: ${obj.bbox.width}×${obj.bbox.height}` : ''}
                        <small class="text-primary ms-1">▼ details</small>
                    </div>
                </div>
                <div class="object-details d-none" style="padding:8px;background:#f8f9fa;border-top:1px solid #dee2e6;font-size:0.8rem;">
                    ${obj.bbox ? `<div><strong>BBox:</strong> x:${obj.bbox.x_min} y:${obj.bbox.y_min} &nbsp; ${obj.bbox.width}×${obj.bbox.height}</div>` : ''}
                    <div class="mt-1"><strong>🔷 Boundary Points (${bpts.length}):</strong>
                        <div style="font-family:monospace;word-break:break-all;max-height:80px;overflow-y:auto;background:#fff;padding:4px;border-radius:4px;margin-top:2px;">${JSON.stringify(bpts)}</div>
                    </div>
                </div>
            `;

            objectsList.appendChild(item);

            // Add event listeners
            const checkbox = document.getElementById(`point-layer-${idx}`);
            checkbox.addEventListener('change', () => this.renderMasks());

            const opacitySlider = document.getElementById(`point-opacity-${idx}`);
            opacitySlider.addEventListener('input', (e) => {
                document.getElementById(`point-opacity-value-${idx}`).textContent = e.target.value;
                this.renderMasks();
            });
        });
    }
};

// ========================================
// Video Module
// ========================================

const VideoModule = {
    videoId: null,
    frameResults: [],
    currentFrame: 0,
    isPlaying: false,
    eventSource: null,
    videoLayerStates: {},  // Track visibility and opacity for each object
    videoGlobalOpacity: 0.6,
    videoElement: null,
    overlayCanvas: null,
    overlayCtx: null,

    init() {
        const videoInput = document.getElementById('videoInput');
        if (videoInput) {
            videoInput.addEventListener('change', (e) => this.uploadVideo(e.target.files[0]));
        }

        const processBtn = document.getElementById('processVideoBtn');
        if (processBtn) {
            processBtn.addEventListener('click', () => this.processVideo());
        }

        const cancelBtn = document.getElementById('cancelVideoBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancel());
        }

        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.play());
        }

        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pause());
        }

        const seekSlider = document.getElementById('videoSeekSlider');
        if (seekSlider) {
            seekSlider.addEventListener('input', (e) => this.seek(parseFloat(e.target.value)));
        }

        // Global opacity control for video
        const globalOpacitySlider = document.getElementById('videoGlobalOpacity');
        if (globalOpacitySlider) {
            globalOpacitySlider.addEventListener('input', (e) => {
                this.videoGlobalOpacity = parseFloat(e.target.value);
                document.getElementById('videoGlobalOpacityValue').textContent = this.videoGlobalOpacity.toFixed(1);

                // Update all video layer opacities
                Object.keys(this.videoLayerStates).forEach(label => {
                    const layerState = this.videoLayerStates[label];
                    layerState.opacity = this.videoGlobalOpacity;
                    const slider = document.getElementById(`video-opacity-${layerState.objectId}`);
                    const valueSpan = document.getElementById(`video-opacity-value-${layerState.objectId}`);
                    if (slider) slider.value = this.videoGlobalOpacity;
                    if (valueSpan) valueSpan.textContent = this.videoGlobalOpacity.toFixed(1);
                });

                // Re-render overlay
                if (this.videoElement) {
                    this.renderOverlay(this.videoElement.currentTime);
                }
            });
        }
    },

    async uploadVideo(file) {
        if (!file) return;

        // Validate file size (100MB max)
        if (file.size > 100 * 1024 * 1024) {
            showToast('Video file too large (max 100MB)', 'danger');
            return;
        }

        const formData = new FormData();
        formData.append('video', file);

        try {
            const response = await fetch('/upload-video', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Video upload failed');
            }

            const data = await response.json();
            this.videoId = data.video_id;

            // Display video info
            document.getElementById('videoDuration').textContent = `${data.duration.toFixed(2)}s`;
            document.getElementById('videoFps').textContent = data.fps.toFixed(2);
            document.getElementById('videoResolution').textContent = `${data.resolution.width}x${data.resolution.height}`;
            document.getElementById('videoFrames').textContent = data.frame_count;
            document.getElementById('videoInfo').classList.remove('d-none');

            // Enable process button
            document.getElementById('processVideoBtn').disabled = false;

            showToast('Video uploaded successfully!', 'success');
        } catch (error) {
            console.error('Upload error:', error);
            showToast(error.message || 'Video upload failed', 'danger');
        }
    },

    processVideo() {
        if (!this.videoId) {
            showToast('Please upload a video first', 'warning');
            return;
        }

        const textPrompt = document.getElementById('videoTextPrompt').value.trim();
        if (!textPrompt) {
            showToast('Please enter objects to track', 'warning');
            return;
        }

        // Show progress UI
        document.getElementById('videoProgress').classList.remove('d-none');
        document.getElementById('processVideoBtn').classList.add('d-none');
        document.getElementById('cancelVideoBtn').classList.remove('d-none');

        // Get processing options
        const processFps = document.getElementById('videoFpsOption').value;
        const qualityScale = document.getElementById('videoQualityOption').value;

        // Reset results
        this.frameResults = [];
        this.videoLayerStates = {};

        // Connect to SSE endpoint
        const url = `/process-video/${this.videoId}?text_prompt=${encodeURIComponent(textPrompt)}&confidence=0.25&process_fps=${processFps}&quality_scale=${qualityScale}`;
        this.eventSource = new EventSource(url);

        // Handle progress updates
        this.eventSource.addEventListener('progress', (e) => {
            const data = JSON.parse(e.data);
            const percent = (data.progress * 100).toFixed(0);
            document.getElementById('videoProgressBar').style.width = `${percent}%`;
            document.getElementById('videoProgressBar').textContent = `${percent}%`;
            document.getElementById('currentFrame').textContent = data.frame;
            document.getElementById('totalFrames').textContent = data.total;
        });

        // Handle frame results
        this.eventSource.addEventListener('frame', (e) => {
            const frameData = JSON.parse(e.data);
            this.frameResults.push(frameData);

            // Debug: Log first 5 and last 5 frames received
            if (this.frameResults.length <= 5 || this.frameResults.length % 10 === 0) {
                console.log(`📥 Received frame #${frameData.frame_number} (timestamp: ${frameData.timestamp.toFixed(3)}s, objects: ${frameData.objects_detected})`);
            }
        });

        // Handle completion
        this.eventSource.addEventListener('complete', (e) => {
            const data = JSON.parse(e.data);
            this.eventSource.close();

            document.getElementById('videoProgress').classList.add('d-none');
            document.getElementById('processVideoBtn').classList.remove('d-none');
            document.getElementById('cancelVideoBtn').classList.add('d-none');
            document.getElementById('videoResultsContainer').classList.remove('d-none');

            // Setup video player
            this.setupPlayer();

            showToast(`Video processing complete! ${data.total_frames} frames in ${data.processing_time.toFixed(2)}s`, 'success');
        });

        // Handle errors
        this.eventSource.addEventListener('error', (e) => {
            this.eventSource.close();
            showToast('Video processing error', 'danger');
            document.getElementById('videoProgress').classList.add('d-none');
            document.getElementById('processVideoBtn').classList.remove('d-none');
            document.getElementById('cancelVideoBtn').classList.add('d-none');
        });
    },

    cancel() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        document.getElementById('videoProgress').classList.add('d-none');
        document.getElementById('processVideoBtn').classList.remove('d-none');
        document.getElementById('cancelVideoBtn').classList.add('d-none');
        showToast('Video processing cancelled', 'info');
    },

    setupPlayer() {
        // Get video element and canvas
        this.videoElement = document.getElementById('videoElement');
        this.overlayCanvas = document.getElementById('videoResultCanvas');
        const seekSlider = document.getElementById('videoSeekSlider');

        if (!this.videoElement || !this.overlayCanvas || !seekSlider) return;

        this.overlayCtx = this.overlayCanvas.getContext('2d');

        // Load original video from server
        this.videoElement.src = `/get-video/${this.videoId}`;

        // When video metadata loads, set up the canvas overlay
        this.videoElement.addEventListener('loadedmetadata', () => {
            // Match canvas size to video
            this.overlayCanvas.width = this.videoElement.videoWidth;
            this.overlayCanvas.height = this.videoElement.videoHeight;

            // Set up seek slider
            seekSlider.max = this.videoElement.duration;
            seekSlider.value = 0;

            // Start continuous rendering loop
            this.startRenderLoop();
        });

        // Update time display on timeupdate (4x per second is fine for UI updates)
        this.videoElement.addEventListener('timeupdate', () => {
            this.updateTimeDisplay();
            if (!seekSlider.matches(':active')) {
                seekSlider.value = this.videoElement.currentTime;
            }
        });

        // Debug: Log frame count and check for gaps
        console.log(`📊 Video Player Setup:`);
        console.log(`   Total frames received: ${this.frameResults.length}`);

        // Check for missing frames
        const frameNumbers = this.frameResults.map(f => f.frame_number).sort((a, b) => a - b);
        const gaps = [];
        for (let i = 1; i < frameNumbers.length; i++) {
            const gap = frameNumbers[i] - frameNumbers[i - 1];
            if (gap > 1) {
                gaps.push(`${frameNumbers[i - 1]} → ${frameNumbers[i]} (${gap - 1} missing)`);
            }
        }
        if (gaps.length > 0) {
            console.warn(`⚠️ Frame gaps detected: ${gaps.join(', ')}`);
        } else {
            console.log(`   ✅ No frame gaps - all sequential frames received`);
        }

        // Collect all unique objects from all frames
        const allObjects = new Map();
        this.frameResults.forEach(frameData => {
            if (frameData.objects) {
                frameData.objects.forEach(obj => {
                    const key = obj.label; // Use label as unique key
                    if (!allObjects.has(key)) {
                        allObjects.set(key, obj);
                        // Initialize layer state using label as key
                        this.videoLayerStates[obj.label] = {
                            visible: true,
                            opacity: this.videoGlobalOpacity,
                            selected: false,
                            objectId: obj.id  // Store ID for DOM element lookups
                        };
                    }
                });
            }
        });

        console.log(`   Unique object types: ${allObjects.size}`);
        console.log(`   Render loop starting...`);

        // Populate object list
        this.populateVideoObjectsList(Array.from(allObjects.values()));
    },

    renderOverlay(currentTime) {
        if (!this.overlayCtx || !this.overlayCanvas) return;

        // Clear the overlay canvas
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        // Find the closest detection frame to current time
        const frameData = this.findClosestFrame(currentTime);
        if (!frameData || !frameData.objects || frameData.objects.length === 0) {
            return; // No detection at this time
        }

        // Render masks on overlay
        const imageData = this.overlayCtx.createImageData(this.overlayCanvas.width, this.overlayCanvas.height);

        let renderedCount = 0;
        frameData.objects.forEach(obj => {
            const state = this.videoLayerStates[obj.label];
            // Only render if layer is visible
            if (state && state.visible) {
                this.addMaskToImageData(imageData, obj, state.opacity);
                renderedCount++;
            }
        });

        this.overlayCtx.putImageData(imageData, 0, 0);

        // Debug: Log rendering info (throttled to avoid console spam)
        if (!this.lastLogTime || Date.now() - this.lastLogTime > 1000) {
            console.log(`🎨 Rendering: Frame #${frameData.frame_number}, Time: ${currentTime.toFixed(2)}s, Objects: ${renderedCount}/${frameData.objects.length}`);
            this.lastLogTime = Date.now();
        }
    },

    findClosestFrame(currentTime) {
        // Find the detection frame with timestamp closest to currentTime
        if (this.frameResults.length === 0) return null;

        // Sort results by timestamp if not already sorted (should be from SSE order)
        if (!this.frameResultsSorted) {
            this.frameResults.sort((a, b) => a.timestamp - b.timestamp);
            this.frameResultsSorted = true;
            console.log(`✅ Sorted ${this.frameResults.length} frames by timestamp`);
        }

        // Binary search for better performance and accuracy
        let left = 0;
        let right = this.frameResults.length - 1;
        let closest = this.frameResults[0];
        let minDiff = Math.abs(currentTime - closest.timestamp);

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const frame = this.frameResults[mid];
            const diff = Math.abs(currentTime - frame.timestamp);

            if (diff < minDiff) {
                minDiff = diff;
                closest = frame;
            }

            if (frame.timestamp < currentTime) {
                left = mid + 1;
            } else if (frame.timestamp > currentTime) {
                right = mid - 1;
            } else {
                // Exact match
                return frame;
            }
        }

        // Track frame display to detect skips
        if (!this.lastRenderedFrame || closest.frame_number !== this.lastRenderedFrame.frame_number) {
            if (this.lastRenderedFrame && closest.frame_number > this.lastRenderedFrame.frame_number + 1) {
                const skipped = closest.frame_number - this.lastRenderedFrame.frame_number - 1;
                console.warn(`⚠️ Skipped ${skipped} frame(s): #${this.lastRenderedFrame.frame_number} → #${closest.frame_number}`);
            }
            this.lastRenderedFrame = closest;
        }

        return closest;
    },

    updateTimeDisplay() {
        if (!this.videoElement) return;

        const current = this.formatTime(this.videoElement.currentTime);
        const duration = this.formatTime(this.videoElement.duration);
        document.getElementById('videoTimeInfo').textContent = `${current} / ${duration}`;
    },

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    addMaskToImageData(imageData, obj, opacity) {
        const mask = obj.mask;
        const color = obj.color;

        for (let y = 0; y < mask.length; y++) {
            for (let x = 0; x < mask[y].length; x++) {
                if (mask[y][x]) {
                    const idx = (y * imageData.width + x) * 4;
                    const alpha = opacity;

                    imageData.data[idx] = color[0];
                    imageData.data[idx + 1] = color[1];
                    imageData.data[idx + 2] = color[2];
                    imageData.data[idx + 3] = alpha * 255;
                }
            }
        }
    },

    populateVideoObjectsList(objects) {
        const objectsList = document.getElementById('videoObjectsList');
        objectsList.innerHTML = '';

        if (objects.length === 0) {
            objectsList.innerHTML = `
                <div class="text-center p-4 text-muted">
                    <i class="fas fa-info-circle fa-2x mb-2"></i>
                    <p>No objects detected</p>
                </div>
            `;
            return;
        }

        // Update object count
        document.getElementById('videoObjectCount').textContent = objects.length;

        // Create list items for each object
        objects.forEach(obj => {
            const listItem = this.createVideoObjectListItem(obj);
            objectsList.appendChild(listItem);
        });
    },

    createVideoObjectListItem(obj) {
        const div = document.createElement('div');
        div.className = 'list-group-item list-group-item-action';
        div.id = `video-object-item-${obj.id}`;

        const color = obj.color;
        const rgbColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

        div.innerHTML = `
            <!-- Compact Header -->
            <div class="object-header">
                <div class="d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center flex-grow-1">
                        <div class="form-check me-2">
                            <input class="form-check-input" type="checkbox" id="video-visible-${obj.id}" checked>
                        </div>
                        <div class="color-indicator me-2" style="background-color: ${rgbColor}; width: 20px; height: 20px; border-radius: 4px;"></div>
                        <div class="flex-grow-1">
                            <strong>${obj.label}</strong>
                            <span class="small text-muted ms-2">${obj.confidence ? `${(obj.confidence * 100).toFixed(1)}%` : 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Opacity Control -->
            <div class="compact-controls mt-2">
                <label class="form-label small mb-1">Opacity: <span id="video-opacity-value-${obj.id}">${this.videoGlobalOpacity.toFixed(1)}</span></label>
                <input type="range" class="form-range form-range-sm" id="video-opacity-${obj.id}"
                       min="0" max="1" step="0.1" value="${this.videoGlobalOpacity}">
            </div>
        `;

        // Add event listeners
        const checkbox = div.querySelector(`#video-visible-${obj.id}`);
        checkbox.addEventListener('change', (e) => {
            this.videoLayerStates[obj.label].visible = e.target.checked;
            // Re-render overlay
            if (this.videoElement) {
                this.renderOverlay(this.videoElement.currentTime);
            }
        });

        const opacitySlider = div.querySelector(`#video-opacity-${obj.id}`);
        const opacityValueSpan = div.querySelector(`#video-opacity-value-${obj.id}`);
        if (opacitySlider) {
            opacitySlider.addEventListener('input', (e) => {
                const opacity = parseFloat(e.target.value);
                this.videoLayerStates[obj.label].opacity = opacity;
                opacityValueSpan.textContent = opacity.toFixed(1);
                // Re-render overlay
                if (this.videoElement) {
                    this.renderOverlay(this.videoElement.currentTime);
                }
            });
        }

        return div;
    },

    startRenderLoop() {
        // Continuous rendering loop using requestAnimationFrame for smooth 60 FPS
        const renderLoop = () => {
            if (this.videoElement) {
                // Render overlay continuously (even when paused for seeking)
                this.renderOverlay(this.videoElement.currentTime);
            }
            // Always request next frame to keep loop running
            this.renderLoopId = requestAnimationFrame(renderLoop);
        };

        // Start the loop
        renderLoop();
    },

    stopRenderLoop() {
        if (this.renderLoopId) {
            cancelAnimationFrame(this.renderLoopId);
            this.renderLoopId = null;
        }
    },

    play() {
        if (this.videoElement) {
            this.videoElement.play();
            this.isPlaying = true;
        }
    },

    pause() {
        if (this.videoElement) {
            this.videoElement.pause();
            this.isPlaying = false;
        }
    },

    seek(time) {
        if (this.videoElement) {
            this.videoElement.currentTime = time;
        }
    }
};

// ========================================
// Bounding Box Module
// ========================================

const BoundingBoxModule = {
    canvas: null,
    ctx: null,
    image: null,
    imageFile: null,
    boxes: [],       // [{x, y, w, h}, ...]  in image coords
    isDrawing: false,
    startX: 0,
    startY: 0,
    detectionData: null,

    init() {
        this.canvas = document.getElementById('boxCanvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.canvas.addEventListener('mousedown', (e) => this.startDraw(e));
        this.canvas.addEventListener('mousemove', (e) => this.duringDraw(e));
        this.canvas.addEventListener('mouseup', (e) => this.endDraw(e));
        this.canvas.addEventListener('mouseleave', (e) => { if (this.isDrawing) this.endDraw(e); });

        const fileInput = document.getElementById('boxImageInput');
        if (fileInput) fileInput.addEventListener('change', (e) => this.loadImage(e.target.files[0]));

        const detectBtn = document.getElementById('detectBoxBtn');
        if (detectBtn) detectBtn.addEventListener('click', () => this.detect());

        const clearBtn = document.getElementById('clearBoxesBtn');
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearBoxes());

        const confSlider = document.getElementById('boxConfidenceSlider');
        if (confSlider) {
            confSlider.addEventListener('input', () => {
                document.getElementById('boxConfidenceValue').textContent = parseFloat(confSlider.value).toFixed(2);
            });
        }
    },

    loadImage(file) {
        if (!file) return;
        this.imageFile = file;
        this.boxes = [];
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new window.Image();
            img.onload = () => {
                this.image = img;
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                this.canvas.style.width = Math.min(img.width, 800) + 'px';
                this.canvas.style.height = 'auto';
                this.render();
                document.getElementById('detectBoxBtn').disabled = false;
                document.getElementById('boxesList').innerHTML = '<p class="text-muted small">No boxes drawn yet</p>';
                document.getElementById('boxResultsContainer').classList.add('d-none');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    },

    startDraw(e) {
        if (!this.image) return;
        const {x, y} = this.getCanvasCoords(e);
        this.isDrawing = true;
        this.startX = x;
        this.startY = y;
    },

    duringDraw(e) {
        if (!this.isDrawing) return;
        const {x, y} = this.getCanvasCoords(e);
        this.render();
        // Draw current box
        this.ctx.strokeStyle = '#00aaff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.startX, this.startY, x - this.startX, y - this.startY);
        this.ctx.fillStyle = 'rgba(0,170,255,0.1)';
        this.ctx.fillRect(this.startX, this.startY, x - this.startX, y - this.startY);
    },

    endDraw(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        const {x, y} = this.getCanvasCoords(e);
        const w = x - this.startX;
        const h = y - this.startY;
        if (Math.abs(w) > 5 && Math.abs(h) > 5) {
            this.boxes.push({
                x: Math.min(this.startX, x),
                y: Math.min(this.startY, y),
                w: Math.abs(w),
                h: Math.abs(h)
            });
            this.updateBoxesList();
        }
        this.render();
    },

    render() {
        if (!this.image) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.image, 0, 0);
        this.boxes.forEach((box, i) => {
            this.ctx.strokeStyle = '#ff6600';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(box.x, box.y, box.w, box.h);
            this.ctx.fillStyle = 'rgba(255,102,0,0.15)';
            this.ctx.fillRect(box.x, box.y, box.w, box.h);
            this.ctx.fillStyle = '#ff6600';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillText(`Box ${i+1}`, box.x + 4, box.y + 16);
        });
    },

    updateBoxesList() {
        const list = document.getElementById('boxesList');
        if (this.boxes.length === 0) {
            list.innerHTML = '<p class="text-muted small">No boxes drawn yet</p>';
            return;
        }
        list.innerHTML = this.boxes.map((box, i) => `
            <div class="d-flex align-items-center gap-2 mb-1">
                <span class="badge bg-warning text-dark">Box ${i+1}</span>
                <small class="text-muted">${Math.round(box.x)},${Math.round(box.y)} → ${Math.round(box.x+box.w)},${Math.round(box.y+box.h)}</small>
                <button class="btn btn-xs btn-outline-danger btn-sm py-0 ms-auto" onclick="BoundingBoxModule.removeBox(${i})">
                    <i class="fas fa-times"></i>
                </button>
            </div>`).join('');
    },

    removeBox(idx) {
        this.boxes.splice(idx, 1);
        this.updateBoxesList();
        this.render();
    },

    clearBoxes() {
        this.boxes = [];
        this.updateBoxesList();
        this.render();
    },

    async detect() {
        if (!this.imageFile || this.boxes.length === 0) {
            showToast('Please upload an image and draw at least one box', 'warning');
            return;
        }

        const btn = document.getElementById('detectBoxBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Detecting...';

        try {
            const bboxes = this.boxes.map(b => [
                Math.round(b.x), Math.round(b.y),
                Math.round(b.x + b.w), Math.round(b.y + b.h)
            ]);

            const formData = new FormData();
            formData.append('image', this.imageFile);
            formData.append('bboxes', JSON.stringify(bboxes));
            formData.append('confidence', document.getElementById('boxConfidenceSlider').value);

            const _ctrl2 = new AbortController();
            setTimeout(() => _ctrl2.abort(), 600000);
            const response = await fetch('/detect-box', {method: 'POST', body: formData, signal: _ctrl2.signal});
            const data = await response.json();

            if (data.error) {
                showToast('Detection failed: ' + data.error, 'danger');
                return;
            }

            this.detectionData = data;
            this.displayResults(data);
            updateStatistics(data.stats);

        } catch (err) {
            showToast('Error: ' + err.message, 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-search me-1"></i>Detect Objects';
        }
    },

    displayResults(data) {
        document.getElementById('boxResultsContainer').classList.remove('d-none');
        document.getElementById('boxObjectCount').textContent = data.stats.objects_detected;
        document.getElementById('boxObjectCountInfo').textContent = data.stats.objects_detected;
        document.getElementById('boxProcessTime').textContent = data.stats.processing_time;
        document.getElementById('boxAvgConfidence').textContent = data.stats.avg_confidence;

        const detImg = document.getElementById('boxDetectedImage');
        detImg.src = 'data:image/png;base64,' + data.original;
        detImg.onload = () => {
            const canvas = document.getElementById('boxMaskCanvas');
            canvas.width = detImg.naturalWidth;
            canvas.height = detImg.naturalHeight;
            canvas.style.width = detImg.offsetWidth + 'px';
            canvas.style.height = detImg.offsetHeight + 'px';
            this.renderMasks();
            this.populateObjectsList();
        };

        const opSlider = document.getElementById('boxGlobalOpacity');
        if (opSlider) {
            opSlider.oninput = () => {
                const opacity = parseFloat(opSlider.value);
                document.getElementById('boxGlobalOpacityValue').textContent = opacity.toFixed(1);
                if (this.detectionData) {
                    this.detectionData.objects.forEach((obj, idx) => {
                        const s = document.getElementById(`box-opacity-${idx}`);
                        const v = document.getElementById(`box-opacity-value-${idx}`);
                        if (s) s.value = opacity;
                        if (v) v.textContent = opacity.toFixed(1);
                    });
                }
                this.renderMasks();
            };
        }

        // Update export module
        if (typeof ExportModule !== 'undefined') {
            ExportModule.loadFromDetection(data, data.original);
        }
    },

    renderMasks() {
        if (!this.detectionData) return;
        const canvas = document.getElementById('boxMaskCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const d = imageData.data;
        this.detectionData.objects.forEach((obj, idx) => {
            const cb = document.getElementById(`box-layer-${idx}`);
            const os = document.getElementById(`box-opacity-${idx}`);
            if (cb && !cb.checked) return;
            const opacity = os ? parseFloat(os.value) : 0.6;
            const [r, g, b] = obj.color;
            if (obj.mask) {
                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        if (obj.mask[y] && obj.mask[y][x]) {
                            const i = (y * canvas.width + x) * 4;
                            d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = Math.floor(opacity * 255);
                        }
                    }
                }
            }
        });
        ctx.putImageData(imageData, 0, 0);
    },

    populateObjectsList() {
        const list = document.getElementById('boxObjectsList');
        if (!list) return;
        list.innerHTML = '';
        this.detectionData.objects.forEach((obj, idx) => {
            const item = document.createElement('div');
            item.className = 'list-group-item';
            const rgb = obj.color.join(',');
            const bpts = extractBoundaryPoints(obj.mask);
            item.innerHTML = `
                <div class="object-header" style="cursor:pointer" onclick="this.nextElementSibling.classList.toggle('d-none')">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <input type="checkbox" id="box-layer-${idx}" checked class="form-check-input me-2" onclick="event.stopPropagation()">
                            <span style="display:inline-block;width:20px;height:20px;background:rgb(${rgb});border-radius:4px;margin-right:8px;"></span>
                            <strong>${obj.label}</strong>
                        </div>
                        <label class="small" onclick="event.stopPropagation()">Opacity: <span id="box-opacity-value-${idx}">0.6</span>
                            <input type="range" id="box-opacity-${idx}" min="0" max="1" step="0.1" value="0.6" class="form-range" style="width:80px;display:inline-block;">
                        </label>
                    </div>
                    <div class="small text-muted mt-1">Area: ${obj.area} px${obj.confidence ? ` | Conf: ${(obj.confidence*100).toFixed(1)}%` : ''}${obj.bbox ? ` | BBox: ${obj.bbox.width}×${obj.bbox.height}` : ''} <small class="text-primary ms-1">▼ details</small></div>
                </div>
                <div class="object-details d-none" style="padding:8px;background:#f8f9fa;border-top:1px solid #dee2e6;font-size:0.8rem;">
                    ${obj.bbox ? `<div><strong>BBox:</strong> x:${obj.bbox.x_min} y:${obj.bbox.y_min} &nbsp; ${obj.bbox.width}×${obj.bbox.height}</div>` : ''}
                    <div class="mt-1"><strong>🔷 Boundary Points (${bpts.length}):</strong>
                        <div style="font-family:monospace;word-break:break-all;max-height:80px;overflow-y:auto;background:#fff;padding:4px;border-radius:4px;margin-top:2px;">${JSON.stringify(bpts)}</div>
                    </div>
                </div>`;
            list.appendChild(item);
            document.getElementById(`box-layer-${idx}`).addEventListener('change', () => this.renderMasks());
            document.getElementById(`box-opacity-${idx}`).addEventListener('input', (e) => {
                document.getElementById(`box-opacity-value-${idx}`).textContent = e.target.value;
                this.renderMasks();
            });
        });
    }
};

// ========================================
// Exemplar Module
// ========================================

const ExemplarModule = {
    canvas: null,
    ctx: null,
    image: null,
    imageFile: null,
    refBox: null,       // {x, y, w, h}
    isDrawing: false,
    startX: 0,
    startY: 0,
    detectionData: null,

    init() {
        this.canvas = document.getElementById('exemplarCanvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.canvas.addEventListener('mousedown', (e) => this.startDraw(e));
        this.canvas.addEventListener('mousemove', (e) => this.duringDraw(e));
        this.canvas.addEventListener('mouseup', (e) => this.endDraw(e));
        this.canvas.addEventListener('mouseleave', (e) => { if (this.isDrawing) this.endDraw(e); });

        const fileInput = document.getElementById('exemplarImageInput');
        if (fileInput) fileInput.addEventListener('change', (e) => this.loadImage(e.target.files[0]));

        const detectBtn = document.getElementById('detectExemplarBtn');
        if (detectBtn) detectBtn.addEventListener('click', () => this.detect());

        const clearBtn = document.getElementById('clearExemplarBtn');
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearSelection());

        const confSlider = document.getElementById('exemplarConfidenceSlider');
        if (confSlider) {
            confSlider.addEventListener('input', () => {
                document.getElementById('exemplarConfidenceValue').textContent = parseFloat(confSlider.value).toFixed(2);
            });
        }
    },

    loadImage(file) {
        if (!file) return;
        this.imageFile = file;
        this.refBox = null;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new window.Image();
            img.onload = () => {
                this.image = img;
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                this.canvas.style.width = Math.min(img.width, 800) + 'px';
                this.canvas.style.height = 'auto';
                this.render();
                document.getElementById('detectExemplarBtn').disabled = false;
                document.getElementById('exemplarRefPreview').classList.add('d-none');
                document.getElementById('exemplarResultsContainer').classList.add('d-none');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY};
    },

    startDraw(e) {
        if (!this.image) return;
        const {x, y} = this.getCanvasCoords(e);
        this.isDrawing = true;
        this.startX = x;
        this.startY = y;
        this.refBox = null;
    },

    duringDraw(e) {
        if (!this.isDrawing) return;
        const {x, y} = this.getCanvasCoords(e);
        this.render();
        this.ctx.strokeStyle = '#9900ff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([6, 3]);
        this.ctx.strokeRect(this.startX, this.startY, x - this.startX, y - this.startY);
        this.ctx.fillStyle = 'rgba(153,0,255,0.1)';
        this.ctx.fillRect(this.startX, this.startY, x - this.startX, y - this.startY);
        this.ctx.setLineDash([]);
    },

    endDraw(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        const {x, y} = this.getCanvasCoords(e);
        const w = x - this.startX;
        const h = y - this.startY;
        if (Math.abs(w) > 5 && Math.abs(h) > 5) {
            this.refBox = {
                x: Math.min(this.startX, x), y: Math.min(this.startY, y),
                w: Math.abs(w), h: Math.abs(h)
            };
            this.showRefPreview();
        }
        this.render();
    },

    render() {
        if (!this.image) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.image, 0, 0);
        if (this.refBox) {
            const {x, y, w, h} = this.refBox;
            this.ctx.strokeStyle = '#9900ff';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([6, 3]);
            this.ctx.strokeRect(x, y, w, h);
            this.ctx.setLineDash([]);
            this.ctx.fillStyle = 'rgba(153,0,255,0.15)';
            this.ctx.fillRect(x, y, w, h);
            this.ctx.fillStyle = '#9900ff';
            this.ctx.font = 'bold 13px Arial';
            this.ctx.fillText('Reference', x + 4, y + 15);
        }
    },

    showRefPreview() {
        if (!this.refBox || !this.image) return;
        const preview = document.getElementById('exemplarRefPreview');
        const refCanvas = document.getElementById('exemplarRefCanvas');
        const {x, y, w, h} = this.refBox;
        refCanvas.width = w;
        refCanvas.height = h;
        refCanvas.style.maxHeight = '120px';
        refCanvas.style.width = 'auto';
        const rCtx = refCanvas.getContext('2d');
        rCtx.drawImage(this.image, x, y, w, h, 0, 0, w, h);
        document.getElementById('exemplarRefInfo').textContent =
            `Region: ${Math.round(x)},${Math.round(y)} → ${Math.round(x+w)},${Math.round(y+h)} (${Math.round(w)}×${Math.round(h)}px)`;
        preview.classList.remove('d-none');
    },

    clearSelection() {
        this.refBox = null;
        document.getElementById('exemplarRefPreview').classList.add('d-none');
        this.render();
    },

    async detect() {
        if (!this.imageFile) {
            showToast('Please upload an image first', 'warning');
            return;
        }
        if (!this.refBox) {
            showToast('Please draw a reference box first', 'warning');
            return;
        }

        const btn = document.getElementById('detectExemplarBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Processing...';

        try {
            const bbox = [
                Math.round(this.refBox.x), Math.round(this.refBox.y),
                Math.round(this.refBox.x + this.refBox.w), Math.round(this.refBox.y + this.refBox.h)
            ];

            const formData = new FormData();
            formData.append('image', this.imageFile);
            formData.append('reference_bbox', JSON.stringify(bbox));
            formData.append('confidence', document.getElementById('exemplarConfidenceSlider').value);

            const _ctrl3 = new AbortController();
            setTimeout(() => _ctrl3.abort(), 600000);
            const response = await fetch('/detect-exemplar', {method: 'POST', body: formData, signal: _ctrl3.signal});
            const data = await response.json();

            if (data.error) {
                showToast('Detection failed: ' + data.error, 'danger');
                return;
            }

            this.detectionData = data;
            this.displayResults(data);
            updateStatistics(data.stats);

        } catch (err) {
            showToast('Error: ' + err.message, 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-clone me-1"></i>Find & Segment';
        }
    },

    displayResults(data) {
        document.getElementById('exemplarResultsContainer').classList.remove('d-none');
        document.getElementById('exemplarObjectCount').textContent = data.stats.objects_detected;
        document.getElementById('exemplarObjectCountInfo').textContent = data.stats.objects_detected;
        document.getElementById('exemplarProcessTime').textContent = data.stats.processing_time;
        document.getElementById('exemplarAvgConfidence').textContent = data.stats.avg_confidence;

        // Show image size
        if (data.image_size) {
            document.getElementById('exemplarImageSize').textContent =
                `${data.image_size.width} × ${data.image_size.height}`;
        }

        // Show CLIP identification banner
        if (data.clip_label) {
            const clipInfo = document.getElementById('exemplarClipInfo');
            clipInfo.classList.remove('d-none');
            document.getElementById('exemplarClipLabel').textContent = data.clip_label;
            document.getElementById('exemplarClipLabelRepeat').textContent = data.clip_label;
            document.getElementById('exemplarClipScore').textContent = data.stats.clip_score || '-';
        }

        const detImg = document.getElementById('exemplarDetectedImage');
        detImg.src = 'data:image/png;base64,' + data.original;
        detImg.onload = () => {
            const canvas = document.getElementById('exemplarMaskCanvas');
            canvas.width = detImg.naturalWidth;
            canvas.height = detImg.naturalHeight;
            canvas.style.width = detImg.offsetWidth + 'px';
            canvas.style.height = detImg.offsetHeight + 'px';
            this.renderMasks();
            this.populateObjectsList();
        };

        const opSlider = document.getElementById('exemplarGlobalOpacity');
        if (opSlider) {
            opSlider.oninput = () => {
                const opacity = parseFloat(opSlider.value);
                document.getElementById('exemplarGlobalOpacityValue').textContent = opacity.toFixed(1);
                if (this.detectionData) {
                    this.detectionData.objects.forEach((obj, idx) => {
                        const s = document.getElementById(`exemplar-opacity-${idx}`);
                        const v = document.getElementById(`exemplar-opacity-value-${idx}`);
                        if (s) s.value = opacity;
                        if (v) v.textContent = opacity.toFixed(1);
                    });
                }
                this.renderMasks();
            };
        }

        // Update export module
        if (typeof ExportModule !== 'undefined') {
            ExportModule.loadFromDetection(data, data.original);
        }
    },

    renderMasks() {
        if (!this.detectionData) return;
        const canvas = document.getElementById('exemplarMaskCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const d = imageData.data;
        this.detectionData.objects.forEach((obj, idx) => {
            const cb = document.getElementById(`exemplar-layer-${idx}`);
            const os = document.getElementById(`exemplar-opacity-${idx}`);
            if (cb && !cb.checked) return;
            const opacity = os ? parseFloat(os.value) : 0.6;
            const [r, g, b] = obj.color;
            if (obj.mask) {
                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        if (obj.mask[y] && obj.mask[y][x]) {
                            const i = (y * canvas.width + x) * 4;
                            d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = Math.floor(opacity * 255);
                        }
                    }
                }
            }
        });
        ctx.putImageData(imageData, 0, 0);
    },

    populateObjectsList() {
        const list = document.getElementById('exemplarObjectsList');
        if (!list) return;
        list.innerHTML = '';
        this.detectionData.objects.forEach((obj, idx) => {
            const item = document.createElement('div');
            item.className = 'list-group-item';
            const rgb = obj.color.join(',');
            const bpts = extractBoundaryPoints(obj.mask);
            item.innerHTML = `
                <div class="object-header" style="cursor:pointer" onclick="this.nextElementSibling.classList.toggle('d-none')">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <input type="checkbox" id="exemplar-layer-${idx}" checked class="form-check-input me-2" onclick="event.stopPropagation()">
                            <span style="display:inline-block;width:20px;height:20px;background:rgb(${rgb});border-radius:4px;margin-right:8px;"></span>
                            <strong>${obj.label}</strong>
                        </div>
                        <label class="small" onclick="event.stopPropagation()">Opacity: <span id="exemplar-opacity-value-${idx}">0.6</span>
                            <input type="range" id="exemplar-opacity-${idx}" min="0" max="1" step="0.1" value="0.6" class="form-range" style="width:80px;display:inline-block;">
                        </label>
                    </div>
                    <div class="small text-muted mt-1">Area: ${obj.area} px${obj.confidence ? ` | Conf: ${(obj.confidence*100).toFixed(1)}%` : ''}${obj.bbox ? ` | BBox: ${obj.bbox.width}×${obj.bbox.height}` : ''} <small class="text-primary ms-1">▼ details</small></div>
                </div>
                <div class="object-details d-none" style="padding:8px;background:#f8f9fa;border-top:1px solid #dee2e6;font-size:0.8rem;">
                    ${obj.bbox ? `<div><strong>BBox:</strong> x:${obj.bbox.x_min} y:${obj.bbox.y_min} &nbsp; ${obj.bbox.width}×${obj.bbox.height}</div>` : ''}
                    <div class="mt-1"><strong>🔷 Boundary Points (${bpts.length}):</strong>
                        <div style="font-family:monospace;word-break:break-all;max-height:80px;overflow-y:auto;background:#fff;padding:4px;border-radius:4px;margin-top:2px;">${JSON.stringify(bpts)}</div>
                    </div>
                </div>`;
            list.appendChild(item);
            document.getElementById(`exemplar-layer-${idx}`).addEventListener('change', () => this.renderMasks());
            document.getElementById(`exemplar-opacity-${idx}`).addEventListener('input', (e) => {
                document.getElementById(`exemplar-opacity-value-${idx}`).textContent = e.target.value;
                this.renderMasks();
            });
        });
    }
};

// ========================================
// Export Module
// ========================================

const ExportModule = {
    selectedFormat: null,
    currentData: null,   // {image_base64, objects, image_size, processing_time, objects_detected}
    selectedObjectIdx: 0,

    init() {
        // Format card click handlers
        document.querySelectorAll('.export-format-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.export-format-card').forEach(c => c.classList.remove('border-primary'));
                card.classList.add('border-primary');
                this.selectedFormat = card.dataset.format;
                document.getElementById('exportBtn').disabled = false;

                // Show object selector only for single PNG
                const sel = document.getElementById('exportObjectSelection');
                if (this.selectedFormat === 'png') {
                    sel.classList.remove('d-none');
                    this.populateObjectSelection();
                } else {
                    sel.classList.add('d-none');
                }
            });
        });

        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) exportBtn.addEventListener('click', () => this.doExport());
    },

    loadFromDetection(data, imageBase64) {
        this.currentData = {
            image_base64: imageBase64,
            objects: data.objects,
            image_size: data.image_size,
            objects_detected: data.stats ? data.stats.objects_detected : data.objects.length,
            processing_time: data.stats ? parseFloat(data.stats.processing_time) : 0
        };
        const countEl = document.getElementById('exportObjectCount');
        if (countEl) countEl.textContent = this.currentData.objects.length;
        document.getElementById('exportNoData').classList.add('d-none');
        document.getElementById('exportDataAvailable').classList.remove('d-none');
    },

    populateObjectSelection() {
        const list = document.getElementById('exportObjectsList');
        if (!list || !this.currentData) return;
        list.innerHTML = '';
        this.currentData.objects.forEach((obj, idx) => {
            const rgb = obj.color.join(',');
            const item = document.createElement('div');
            item.className = 'list-group-item list-group-item-action d-flex align-items-center gap-2';
            item.style.cursor = 'pointer';
            item.innerHTML = `
                <input type="radio" name="exportObjRadio" id="export-obj-${idx}" value="${idx}" ${idx===0?'checked':''} class="form-check-input">
                <span style="display:inline-block;width:18px;height:18px;background:rgb(${rgb});border-radius:3px;"></span>
                <label for="export-obj-${idx}" style="cursor:pointer;">${obj.label}</label>
                <small class="text-muted ms-auto">${obj.area} px</small>`;
            list.appendChild(item);
        });
    },

    async doExport() {
        if (!this.currentData || !this.selectedFormat) return;

        const btn = document.getElementById('exportBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Exporting...';

        try {
            let response;

            if (this.selectedFormat === 'png') {
                const radio = document.querySelector('input[name="exportObjRadio"]:checked');
                const idx = radio ? parseInt(radio.value) : 0;
                const obj = this.currentData.objects[idx];
                response = await fetch('/export/mask', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({image_base64: this.currentData.image_base64, object: obj})
                });
            } else if (this.selectedFormat === 'zip') {
                response = await fetch('/export/masks-zip', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({image_base64: this.currentData.image_base64, objects: this.currentData.objects})
                });
            } else if (this.selectedFormat === 'json') {
                response = await fetch('/export/json', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        image_size: this.currentData.image_size,
                        objects: this.currentData.objects,
                        objects_detected: this.currentData.objects_detected,
                        processing_time: this.currentData.processing_time
                    })
                });
            } else if (this.selectedFormat === 'coco') {
                response = await fetch('/export/coco', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        image_size: this.currentData.image_size,
                        objects: this.currentData.objects,
                        objects_detected: this.currentData.objects_detected,
                        processing_time: this.currentData.processing_time,
                        image_filename: 'image.jpg'
                    })
                });
            }

            if (!response.ok) {
                const err = await response.json();
                showToast('Export failed: ' + err.error, 'danger');
                return;
            }

            // Trigger download
            const blob = await response.blob();
            const disposition = response.headers.get('Content-Disposition') || '';
            const match = disposition.match(/filename="?([^"]+)"?/);
            const filename = match ? match[1] : 'export';
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Export downloaded: ' + filename, 'success');

        } catch (err) {
            showToast('Error: ' + err.message, 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-download me-2"></i>Export';
        }
    }
};

// ========================================
// Object Tracker Module
// ========================================

const ObjectTrackerModule = {
    videoId: null,
    videoFps: 30,
    totalFrames: 0,
    currentSelectFrame: 0,
    drawnBox: null,          // {x, y, w, h} in canvas coords
    trackResults: [],        // array of per-frame tracking data (indexed 0 = start_frame)
    startFrame: 0,
    playbackFrame: 0,
    isPlaying: false,
    playInterval: null,
    maskOpacity: 0.6,
    selectCanvas: null,
    selectCtx: null,
    selectImage: null,       // Image loaded from /get-frame
    resultCanvas: null,
    resultCtx: null,
    isDrawing: false,
    drawStart: {x: 0, y: 0},

    init() {
        const videoInput = document.getElementById('trackerVideoInput');
        if (videoInput) videoInput.addEventListener('change', e => {
            if (e.target.files[0]) this.uploadVideo(e.target.files[0]);
        });

        const scrubber = document.getElementById('trackerFrameScrubber');
        if (scrubber) scrubber.addEventListener('input', () => {
            const frame = parseInt(scrubber.value);
            this.currentSelectFrame = frame;
            document.getElementById('trackerCurrentFrameNum').textContent = frame;
            document.getElementById('trackerCurrentTime').textContent =
                (frame / (this.videoFps || 30)).toFixed(2);
            this.loadFrameForSelection(frame);
        });

        const confSlider = document.getElementById('trackerConfidence');
        if (confSlider) confSlider.addEventListener('input', () => {
            document.getElementById('trackerConfidenceValue').textContent =
                parseFloat(confSlider.value).toFixed(2);
        });

        const trackBtn = document.getElementById('trackObjectBtn');
        if (trackBtn) trackBtn.addEventListener('click', () => this.startTracking());

        const playBtn = document.getElementById('trackerPlayBtn');
        const pauseBtn = document.getElementById('trackerPauseBtn');
        if (playBtn) playBtn.addEventListener('click', () => this.play());
        if (pauseBtn) pauseBtn.addEventListener('click', () => this.pause());

        const pbSlider = document.getElementById('trackerPlaybackSlider');
        if (pbSlider) pbSlider.addEventListener('input', () => {
            this.pause();
            this.playbackFrame = parseInt(pbSlider.value);
            this.renderTrackFrame(this.playbackFrame);
        });

        const opSlider = document.getElementById('trackerMaskOpacity');
        if (opSlider) opSlider.addEventListener('input', () => {
            this.maskOpacity = parseFloat(opSlider.value);
            document.getElementById('trackerMaskOpacityVal').textContent =
                this.maskOpacity.toFixed(1);
            this.renderTrackFrame(this.playbackFrame);
        });
    },

    async uploadVideo(file) {
        const formData = new FormData();
        formData.append('video', file);

        document.getElementById('trackerVideoInfo').classList.add('d-none');
        document.getElementById('trackerScrubPanel').classList.add('d-none');
        document.getElementById('trackerDrawPanel').classList.add('d-none');
        document.getElementById('trackerConfPanel').classList.add('d-none');
        document.getElementById('trackerQualPanel').classList.add('d-none');
        document.getElementById('trackObjectBtn').classList.add('d-none');
        document.getElementById('trackerFramePreview').classList.add('d-none');
        document.getElementById('trackerPlayback').classList.add('d-none');
        document.getElementById('trackerEmpty').classList.remove('d-none');
        document.getElementById('trackerStats').classList.add('d-none');

        try {
            const resp = await fetch('/upload-video', { method: 'POST', body: formData });
            const data = await resp.json();
            if (data.error) { showToast(data.error, 'danger'); return; }

            this.videoId = data.video_id;
            this.videoFps = data.fps || 30;
            this.totalFrames = data.frame_count || 0;

            document.getElementById('trackerDuration').textContent =
                (data.duration || 0).toFixed(1);
            document.getElementById('trackerFps').textContent =
                (data.fps || 0).toFixed(1);
            document.getElementById('trackerFrameCount').textContent =
                data.frame_count || 0;
            document.getElementById('trackerResolution').textContent =
                `${data.resolution.width}×${data.resolution.height}`;

            document.getElementById('trackerVideoInfo').classList.remove('d-none');

            const scrubber = document.getElementById('trackerFrameScrubber');
            scrubber.max = Math.max(0, this.totalFrames - 1);
            scrubber.value = 0;
            this.currentSelectFrame = 0;
            document.getElementById('trackerCurrentFrameNum').textContent = '0';
            document.getElementById('trackerCurrentTime').textContent = '0.00';

            document.getElementById('trackerScrubPanel').classList.remove('d-none');
            document.getElementById('trackerDrawPanel').classList.remove('d-none');
            document.getElementById('trackerConfPanel').classList.remove('d-none');
            document.getElementById('trackerQualPanel').classList.remove('d-none');
            document.getElementById('trackObjectBtn').classList.remove('d-none');
            document.getElementById('trackerEmpty').classList.add('d-none');
            document.getElementById('trackerFramePreview').classList.remove('d-none');

            this.drawnBox = null;
            document.getElementById('trackerBoxInfo').classList.add('d-none');
            document.getElementById('trackObjectBtn').disabled = true;

            // Load first frame
            await this.loadFrameForSelection(0);

        } catch(err) {
            showToast('Video upload failed: ' + err.message, 'danger');
        }
    },

    async loadFrameForSelection(frameNumber) {
        if (!this.videoId) return;
        try {
            const img = new Image();
            const url = `/get-frame/${this.videoId}/${frameNumber}`;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = url;
            });
            this.selectImage = img;
            this.drawnBox = null;
            document.getElementById('trackerBoxInfo').classList.add('d-none');
            document.getElementById('trackObjectBtn').disabled = true;
            this.setupSelectCanvas(img);
        } catch(err) {
            console.warn('Failed to load frame:', err);
        }
    },

    setupSelectCanvas(img) {
        const canvas = document.getElementById('trackerSelectCanvas');
        if (!canvas) return;

        // Set canvas size to match image aspect ratio
        const maxW = canvas.parentElement.clientWidth || 600;
        const scale = Math.min(1, maxW / img.naturalWidth);
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.style.width = Math.round(img.naturalWidth * scale) + 'px';
        canvas.style.height = Math.round(img.naturalHeight * scale) + 'px';

        this.selectCanvas = canvas;
        this.selectCtx = canvas.getContext('2d');
        this.drawSelectFrame();

        // Remove old listeners by replacing canvas clone
        const newCanvas = canvas.cloneNode(true);
        canvas.parentNode.replaceChild(newCanvas, canvas);
        this.selectCanvas = newCanvas;
        this.selectCtx = newCanvas.getContext('2d');
        this.drawSelectFrame();

        newCanvas.addEventListener('mousedown', e => this.onSelectMouseDown(e));
        newCanvas.addEventListener('mousemove', e => this.onSelectMouseMove(e));
        newCanvas.addEventListener('mouseup', e => this.onSelectMouseUp(e));
        newCanvas.addEventListener('mouseleave', e => { if (this.isDrawing) this.onSelectMouseUp(e); });
    },

    drawSelectFrame() {
        if (!this.selectCtx || !this.selectImage) return;
        this.selectCtx.drawImage(this.selectImage, 0, 0);
        if (this.drawnBox) {
            const {x, y, w, h} = this.drawnBox;
            this.selectCtx.strokeStyle = '#ff6600';
            this.selectCtx.lineWidth = 3;
            this.selectCtx.setLineDash([6, 3]);
            this.selectCtx.strokeRect(x, y, w, h);
            this.selectCtx.setLineDash([]);
            // Fill with semi-transparent orange
            this.selectCtx.fillStyle = 'rgba(255,102,0,0.15)';
            this.selectCtx.fillRect(x, y, w, h);
        }
    },

    getCanvasCoords(canvas, e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    },

    onSelectMouseDown(e) {
        e.preventDefault();
        const {x, y} = this.getCanvasCoords(this.selectCanvas, e);
        this.isDrawing = true;
        this.drawStart = {x, y};
        this.drawnBox = {x, y, w: 0, h: 0};
    },

    onSelectMouseMove(e) {
        if (!this.isDrawing) return;
        const {x, y} = this.getCanvasCoords(this.selectCanvas, e);
        this.drawnBox = {
            x: Math.min(this.drawStart.x, x),
            y: Math.min(this.drawStart.y, y),
            w: Math.abs(x - this.drawStart.x),
            h: Math.abs(y - this.drawStart.y)
        };
        this.drawSelectFrame();
    },

    onSelectMouseUp(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        const {x, y} = this.getCanvasCoords(this.selectCanvas, e);
        this.drawnBox = {
            x: Math.min(this.drawStart.x, x),
            y: Math.min(this.drawStart.y, y),
            w: Math.abs(x - this.drawStart.x),
            h: Math.abs(y - this.drawStart.y)
        };
        this.drawSelectFrame();

        if (this.drawnBox.w > 5 && this.drawnBox.h > 5) {
            const bx = Math.round(this.drawnBox.x);
            const by = Math.round(this.drawnBox.y);
            const bw = Math.round(this.drawnBox.w);
            const bh = Math.round(this.drawnBox.h);
            document.getElementById('trackerBoxCoords').textContent =
                `x:${bx} y:${by} ${bw}×${bh}`;
            document.getElementById('trackerBoxInfo').classList.remove('d-none');
            document.getElementById('trackObjectBtn').disabled = false;
        }
    },

    startTracking() {
        if (!this.videoId || !this.drawnBox) return;

        const box = this.drawnBox;
        const bbox = [
            Math.round(box.x), Math.round(box.y),
            Math.round(box.x + box.w), Math.round(box.y + box.h)
        ];
        const confidence = parseFloat(document.getElementById('trackerConfidence').value);
        const quality = parseInt(document.getElementById('trackerQuality').value);

        this.startFrame = this.currentSelectFrame;
        this.trackResults = [];

        document.getElementById('trackObjectBtn').disabled = true;
        document.getElementById('trackerProgress').classList.remove('d-none');
        document.getElementById('trackerStats').classList.add('d-none');
        document.getElementById('trackerPlayback').classList.add('d-none');

        const totalToProcess = this.totalFrames - this.startFrame;
        document.getElementById('trackerProgTotal').textContent = totalToProcess;
        document.getElementById('trackerProgFrame').textContent = '0';
        document.getElementById('trackerProgressBar').style.width = '0%';
        document.getElementById('trackerProgressBar').textContent = '0%';

        const url = `/track-object/${this.videoId}?` +
            `frame_number=${this.startFrame}&` +
            `bbox=${JSON.stringify(bbox)}&` +
            `confidence=${confidence}&` +
            `quality_scale=${quality}`;

        const es = new EventSource(url);

        es.addEventListener('frame', e => {
            const frameData = JSON.parse(e.data);
            this.trackResults.push(frameData);

            const progress = Math.round(frameData.progress * 100);
            document.getElementById('trackerProgFrame').textContent = this.trackResults.length;
            document.getElementById('trackerProgressBar').style.width = progress + '%';
            document.getElementById('trackerProgressBar').textContent = progress + '%';
        });

        es.addEventListener('complete', e => {
            es.close();
            const info = JSON.parse(e.data);

            document.getElementById('trackerProgress').classList.add('d-none');
            document.getElementById('trackObjectBtn').disabled = false;

            const foundCount = this.trackResults.filter(r => r.found).length;
            document.getElementById('trackerStatFrames').textContent = info.total_frames;
            document.getElementById('trackerStatTime').textContent =
                info.processing_time.toFixed(1) + 's';
            document.getElementById('trackerStatFound').textContent =
                foundCount + ' / ' + info.total_frames;
            document.getElementById('trackerStats').classList.remove('d-none');

            this.setupPlayback();
        });

        es.addEventListener('error', e => {
            es.close();
            document.getElementById('trackerProgress').classList.add('d-none');
            document.getElementById('trackObjectBtn').disabled = false;
            try {
                const err = JSON.parse(e.data);
                showToast('Tracking error: ' + err.error, 'danger');
            } catch(_) {
                showToast('Tracking connection error', 'danger');
            }
        });
    },

    setupPlayback() {
        if (!this.trackResults.length) return;

        // Set up result canvas using first frame's image
        const canvas = document.getElementById('trackerResultCanvas');
        if (!canvas) return;

        const maxW = canvas.parentElement.clientWidth || 600;
        const img = this.selectImage;
        if (!img) return;

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.style.width = Math.min(maxW, img.naturalWidth) + 'px';
        canvas.style.height = Math.round(
            img.naturalHeight * (Math.min(maxW, img.naturalWidth) / img.naturalWidth)
        ) + 'px';

        this.resultCanvas = canvas;
        this.resultCtx = canvas.getContext('2d');

        const slider = document.getElementById('trackerPlaybackSlider');
        slider.max = this.trackResults.length - 1;
        slider.value = 0;
        document.getElementById('trackerPlayTotal').textContent = this.trackResults.length - 1;
        document.getElementById('trackerPlayFrame').textContent = '0';

        document.getElementById('trackerPlayback').classList.remove('d-none');
        document.getElementById('trackerFramePreview').classList.add('d-none');

        this.playbackFrame = 0;
        this.renderTrackFrame(0);
    },

    async renderTrackFrame(frameIdx) {
        if (!this.trackResults.length || !this.resultCtx) return;
        const frameData = this.trackResults[frameIdx];
        if (!frameData) return;

        // Load the actual video frame from backend
        const actualFrame = frameData.frame_number;
        const img = new Image();
        try {
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = `/get-frame/${this.videoId}/${actualFrame}`;
            });
        } catch(_) {
            // If frame load fails, use selectImage as fallback
            img.src = this.selectImage ? this.selectImage.src : '';
        }

        const ctx = this.resultCtx;
        ctx.drawImage(img, 0, 0, this.resultCanvas.width, this.resultCanvas.height);

        if (frameData.found && frameData.object && frameData.object.mask) {
            const obj = frameData.object;
            const mask = obj.mask;
            const color = obj.color || [255, 165, 0];
            const opacity = this.maskOpacity;

            const imgData = ctx.getImageData(0, 0, this.resultCanvas.width, this.resultCanvas.height);
            const w = this.resultCanvas.width;
            const h = this.resultCanvas.height;
            const maskH = mask.length;
            const maskW = mask[0] ? mask[0].length : 0;

            for (let row = 0; row < h; row++) {
                const maskRow = Math.floor(row * maskH / h);
                for (let col = 0; col < w; col++) {
                    const maskCol = Math.floor(col * maskW / w);
                    if (mask[maskRow] && mask[maskRow][maskCol]) {
                        const px = (row * w + col) * 4;
                        imgData.data[px]     = Math.round(imgData.data[px]     * (1 - opacity) + color[0] * opacity);
                        imgData.data[px + 1] = Math.round(imgData.data[px + 1] * (1 - opacity) + color[1] * opacity);
                        imgData.data[px + 2] = Math.round(imgData.data[px + 2] * (1 - opacity) + color[2] * opacity);
                    }
                }
            }
            ctx.putImageData(imgData, 0, 0);

            // Draw bbox outline
            if (obj.bbox) {
                const bx = obj.bbox.x_min;
                const by = obj.bbox.y_min;
                const bw = obj.bbox.width;
                const bh = obj.bbox.height;
                const sx = this.resultCanvas.width / maskW;
                const sy = this.resultCanvas.height / maskH;
                ctx.strokeStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
                ctx.lineWidth = 2;
                ctx.strokeRect(bx * sx, by * sy, bw * sx, bh * sy);

                // Label
                ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
                ctx.font = 'bold 14px Arial';
                ctx.fillText(
                    obj.label + (obj.confidence ? ` ${(obj.confidence*100).toFixed(0)}%` : ''),
                    bx * sx + 2, by * sy - 4
                );
            }
        } else {
            // Show "lost" indicator
            ctx.fillStyle = 'rgba(255,0,0,0.6)';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('Object not found in this frame', 10, 24);
        }

        // Update frame info
        const infoEl = document.getElementById('trackerFrameInfo');
        if (infoEl) {
            const ts = frameData.timestamp ? frameData.timestamp.toFixed(2) : '?';
            infoEl.textContent = `Frame ${frameData.frame_number} | Time: ${ts}s | ` +
                (frameData.found ? `Object found | Area: ${frameData.object?.area ?? '?'} px` : 'Object not found');
        }

        document.getElementById('trackerPlayFrame').textContent = frameIdx;
        const slider = document.getElementById('trackerPlaybackSlider');
        if (slider) slider.value = frameIdx;
    },

    play() {
        if (this.isPlaying || !this.trackResults.length) return;
        this.isPlaying = true;
        this.playInterval = setInterval(async () => {
            if (this.playbackFrame >= this.trackResults.length - 1) {
                this.pause();
                return;
            }
            this.playbackFrame++;
            await this.renderTrackFrame(this.playbackFrame);
        }, 200);  // ~5 FPS playback
    },

    pause() {
        this.isPlaying = false;
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    },

    reset() {
        this.pause();
        this.videoId = null;
        this.trackResults = [];
        this.drawnBox = null;
    }
};

// ========================================
// Live Camera Detection Module
// ========================================

const LiveCameraModule = {
    // State
    stream: null,
    video: null,
    overlayCanvas: null,
    overlayCtx: null,
    captureCanvas: null,
    captureCtx: null,
    isRunning: false,
    abortController: null,

    // Click-to-track state
    trackedTarget: null,   // { x, y } — bbox center from previous frame
    lastObjects: [],       // latest detection results (for click hit-test)

    // Stats
    frameCount: 0,
    fpsHistory: [],

    init() {
        this.video = document.getElementById('liveVideo');
        this.overlayCanvas = document.getElementById('liveOverlayCanvas');
        if (this.overlayCanvas) {
            this.overlayCtx = this.overlayCanvas.getContext('2d');
        }

        // Confidence slider
        const confSlider = document.getElementById('liveConfidenceSlider');
        if (confSlider) {
            confSlider.addEventListener('input', () => {
                document.getElementById('liveConfidenceValue').textContent =
                    parseFloat(confSlider.value).toFixed(2);
            });
        }

        // Start / Stop buttons
        const startBtn = document.getElementById('liveStartBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.start());
        }
        const stopBtn = document.getElementById('liveStopBtn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stop());
        }

        // Click-to-track: click a detected object to lock onto it
        if (this.overlayCanvas) {
            this.overlayCanvas.addEventListener('click', (e) => this.onOverlayClick(e));
        }

        // Enumerate cameras
        this.enumerateCameras();
    },

    onOverlayClick(e) {
        try {
            if (!this.isRunning || !this.overlayCanvas) return;

            // Convert click to canvas coordinates
            const rect = this.overlayCanvas.getBoundingClientRect();
            const scaleFactorX = this.overlayCanvas.width / rect.width;
            const scaleFactorY = this.overlayCanvas.height / rect.height;
            const canvasX = (e.clientX - rect.left) * scaleFactorX;
            const canvasY = (e.clientY - rect.top) * scaleFactorY;

            // Quality scale: canvas coords → detection coords
            const quality = parseInt(document.getElementById('liveQualitySelect').value) / 100;
            const detX = canvasX * quality;
            const detY = canvasY * quality;

            // Hit-test against last known detections
            let hit = null;
            for (const obj of this.lastObjects) {
                if (!obj.bbox) continue;
                const b = obj.bbox;
                if (detX >= b.x_min && detX <= b.x_max &&
                    detY >= b.y_min && detY <= b.y_max) {
                    hit = obj;
                    break;
                }
            }

            if (hit) {
                const cx = (hit.bbox.x_min + hit.bbox.x_max) / 2;
                const cy = (hit.bbox.y_min + hit.bbox.y_max) / 2;

                // Toggle off if clicking the same tracked object
                if (this.trackedTarget && this.trackedTarget.id === hit.id) {
                    this.trackedTarget = null;
                } else {
                    this.trackedTarget = { x: cx, y: cy, id: hit.id };
                }
            } else {
                // Clicked empty space — deselect
                this.trackedTarget = null;
            }
        } catch (err) {
            console.error('[Click-to-Track Error]', err.message, err.stack);
            this.showLiveError(err.message);
        }
    },

    async enumerateCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            const select = document.getElementById('liveCameraSelect');
            if (!select) return;

            select.innerHTML = '';
            if (videoDevices.length === 0) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = 'No cameras found';
                select.appendChild(opt);
                return;
            }
            videoDevices.forEach((device, idx) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Camera ${idx + 1}`;
                select.appendChild(option);
            });
        } catch (e) {
            console.warn('Could not enumerate cameras:', e);
        }
    },

    async start() {
        try {
            // Build camera constraints
            const cameraSelect = document.getElementById('liveCameraSelect');
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'environment'
                }
            };
            if (cameraSelect && cameraSelect.value) {
                constraints.video.deviceId = { exact: cameraSelect.value };
            }

            // Open camera
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;

            // Wait for video to be ready
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.overlayCanvas.width = this.video.videoWidth;
                    this.overlayCanvas.height = this.video.videoHeight;

                    // Create offscreen capture canvas (reused across frames)
                    this.captureCanvas = document.createElement('canvas');
                    this.captureCtx = this.captureCanvas.getContext('2d');
                    resolve();
                };
            });

            // Re-enumerate cameras (labels become available after permission grant)
            this.enumerateCameras();

            // Update UI
            this.isRunning = true;
            this.frameCount = 0;
            this.fpsHistory = [];
            document.getElementById('liveStartBtn').classList.add('d-none');
            document.getElementById('liveStopBtn').classList.remove('d-none');
            document.getElementById('livePlaceholder').classList.add('d-none');
            document.getElementById('liveStats').classList.remove('d-none');
            document.getElementById('liveFpsOverlay').classList.remove('d-none');
            document.getElementById('liveTrackHint').classList.remove('d-none');
            document.getElementById('liveObjectsList').classList.remove('d-none');
            document.getElementById('liveStatusBadge').className = 'badge bg-success';
            document.getElementById('liveStatusBadge').innerHTML =
                '<i class="fas fa-circle me-1"></i>Live';

            // Enable click-to-track on overlay
            this.overlayCanvas.style.pointerEvents = 'auto';
            this.overlayCanvas.style.cursor = 'crosshair';
            this.trackedTarget = null;
            this.lastObjects = [];

            // Start detection loop
            this.detectionLoop();

        } catch (e) {
            console.error('Camera access error:', e);
            if (e.name === 'NotAllowedError') {
                showToast('Camera access denied. Please allow camera permissions.', 'danger');
            } else if (e.name === 'NotFoundError') {
                showToast('No camera found on this device.', 'danger');
            } else {
                showToast(`Camera error: ${e.message}`, 'danger');
            }
        }
    },

    stop() {
        this.isRunning = false;

        // Cancel any in-flight request
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        // Stop camera stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // Clear video
        if (this.video) {
            this.video.srcObject = null;
        }

        // Clear overlay and tracking state
        if (this.overlayCtx) {
            this.overlayCtx.clearRect(0, 0,
                this.overlayCanvas.width, this.overlayCanvas.height);
        }
        if (this.overlayCanvas) {
            this.overlayCanvas.style.pointerEvents = 'none';
            this.overlayCanvas.style.cursor = '';
        }
        this.trackedTarget = null;
        this.lastObjects = [];

        // Update UI
        document.getElementById('liveStartBtn').classList.remove('d-none');
        document.getElementById('liveStopBtn').classList.add('d-none');
        document.getElementById('livePlaceholder').classList.remove('d-none');
        document.getElementById('liveStats').classList.add('d-none');
        document.getElementById('liveFpsOverlay').classList.add('d-none');
        document.getElementById('liveTrackHint').classList.add('d-none');
        document.getElementById('liveObjectsList').classList.add('d-none');
        document.getElementById('liveObjectsListContent').innerHTML = '';
        document.getElementById('livePositionPanel').classList.add('d-none');
        document.getElementById('liveStatusBadge').className = 'badge bg-secondary';
        document.getElementById('liveStatusBadge').innerHTML =
            '<i class="fas fa-circle me-1"></i>Inactive';
    },

    async detectionLoop() {
        while (this.isRunning) {
            const loopStart = performance.now();

            try {
                // 1. Capture current (latest) frame
                const blob = this.captureFrame();
                if (!blob) {
                    await this.sleep(100);
                    continue;
                }

                // 2. Read current prompt (dynamic — changes take effect immediately)
                const currentPrompt = document.getElementById('liveTextPrompt').value.trim();
                if (!currentPrompt) {
                    // No prompt yet — clear overlay and wait
                    this.renderDetections([]);
                    await this.sleep(200);
                    continue;
                }

                // 3. Build request
                const gridMode = document.getElementById('liveGridMode').value;
                const qualityVal = document.getElementById('liveQualitySelect').value;
                const formData = new FormData();
                formData.append('image', blob, 'frame.jpg');
                formData.append('text_prompt', currentPrompt);
                formData.append('confidence',
                    document.getElementById('liveConfidenceSlider').value);
                formData.append('quality', qualityVal);
                formData.append('grid_mode', gridMode);

                // Send tracked target center (if any)
                const sentTracking = !!this.trackedTarget;
                if (sentTracking) {
                    formData.append('track_x', this.trackedTarget.x);
                    formData.append('track_y', this.trackedTarget.y);
                }

                // 4. Send to server (abort-able)
                this.abortController = new AbortController();
                const response = await fetch('/detect-live', {
                    method: 'POST',
                    body: formData,
                    signal: this.abortController.signal
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    const errMsg = errData.error || response.statusText;
                    console.error(`[detect-live ${response.status}]`, errMsg);
                    this.showLiveError(errMsg);
                    await this.sleep(1000);
                    continue;
                }

                const data = await response.json();

                // Store latest objects for click hit-testing
                this.lastObjects = data.objects || [];

                // Update tracked target from server match — only when
                // this request actually included tracking params.
                // Without this guard a click mid-flight gets cleared by
                // the response to the pre-click request.
                if (sentTracking && this.trackedTarget) {
                    if (data.tracked && data.tracked.center) {
                        this.trackedTarget.x = data.tracked.center.x;
                        this.trackedTarget.y = data.tracked.center.y;
                        this.trackedTarget.id = data.tracked.id;
                    } else {
                        // Object genuinely lost
                        this.trackedTarget = null;
                    }
                }

                // 5. Render bounding boxes on overlay (pass tracked for shape drawing)
                this.renderDetections(data.objects, gridMode, data.tracked);

                // 6. Update position tracker
                this.updatePositionDisplay(data.objects, gridMode, data.tracked);

                // 7. Update stats
                const elapsed = performance.now() - loopStart;
                this.updateStats(elapsed, data);

            } catch (e) {
                if (e.name === 'AbortError') {
                    break; // stop() was called
                }
                console.error('[Live Camera Error]', e.message, e.stack);
                this.showLiveError(e.message);
                await this.sleep(2000);
            }
        }
    },

    captureFrame() {
        if (!this.video || this.video.readyState < 2) return null;

        const quality = parseInt(document.getElementById('liveQualitySelect').value) / 100;
        const w = Math.round(this.video.videoWidth * quality);
        const h = Math.round(this.video.videoHeight * quality);

        this.captureCanvas.width = w;
        this.captureCanvas.height = h;
        this.captureCtx.drawImage(this.video, 0, 0, w, h);

        // Convert to JPEG blob synchronously
        const dataUrl = this.captureCanvas.toDataURL('image/jpeg', 0.7);
        const binary = atob(dataUrl.split(',')[1]);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
        }
        return new Blob([array], { type: 'image/jpeg' });
    },

    renderDetections(objects, gridMode, tracked) {
        if (!this.overlayCtx) return;

        const ctx = this.overlayCtx;
        const cw = this.overlayCanvas.width;
        const ch = this.overlayCanvas.height;
        ctx.clearRect(0, 0, cw, ch);

        // Draw grid lines when tracker is enabled
        if (gridMode && gridMode !== 'off') {
            const n = parseInt(gridMode); // 3, 10, or 20
            ctx.strokeStyle = n <= 3
                ? 'rgba(255, 255, 255, 0.3)'
                : 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.setLineDash(n <= 3 ? [8, 6] : [4, 4]);
            ctx.beginPath();
            for (let i = 1; i < n; i++) {
                ctx.moveTo(cw * i / n, 0); ctx.lineTo(cw * i / n, ch);
                ctx.moveTo(0, ch * i / n); ctx.lineTo(cw, ch * i / n);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        if (!objects || objects.length === 0) {
            this.updateObjectsList([]);
            return;
        }

        // Scale factor: detections are in quality-scaled coords, overlay is full res
        const quality = parseInt(document.getElementById('liveQualitySelect').value) / 100;
        const scaleX = 1 / quality;
        const scaleY = 1 / quality;

        const trackedId = this.trackedTarget ? this.trackedTarget.id : null;
        // Contour points for the tracked object (from server)
        const trackedContour = (tracked && tracked.contour && tracked.contour.length > 2)
            ? tracked.contour : null;

        objects.forEach(obj => {
            if (!obj.bbox) return;

            const isTracked = trackedId != null && obj.id === trackedId;
            const color = obj.color;
            const x = obj.bbox.x_min * scaleX;
            const y = obj.bbox.y_min * scaleY;
            const w = obj.bbox.width * scaleX;
            const h = obj.bbox.height * scaleY;

            if (isTracked && trackedContour) {
                // ---- Draw object shape (polygon) ----
                ctx.beginPath();
                ctx.moveTo(trackedContour[0][0] * scaleX, trackedContour[0][1] * scaleY);
                for (let i = 1; i < trackedContour.length; i++) {
                    ctx.lineTo(trackedContour[i][0] * scaleX, trackedContour[i][1] * scaleY);
                }
                ctx.closePath();

                ctx.fillStyle = 'rgba(255, 215, 0, 0.30)';
                ctx.fill();

                ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
                ctx.shadowBlur = 14;
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            } else if (isTracked) {
                // ---- Tracked object, no contour yet (fallback yellow box) ----
                ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
                ctx.fillRect(x, y, w, h);

                ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
                ctx.shadowBlur = 12;
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 4;
                ctx.strokeRect(x, y, w, h);
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            } else {
                // ---- Normal bounding box ----
                ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.15)`;
                ctx.fillRect(x, y, w, h);

                ctx.strokeStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
                ctx.lineWidth = 3;
                ctx.strokeRect(x, y, w, h);
            }

            // Label background
            const prefix = isTracked ? 'TRACKING: ' : '';
            const label = `${prefix}${obj.label} ${obj.confidence ?
                (obj.confidence * 100).toFixed(0) + '%' : ''}`;
            ctx.font = 'bold 14px Arial';
            const textWidth = ctx.measureText(label).width;
            const labelH = 22;
            const labelW = textWidth + 10;

            ctx.fillStyle = isTracked
                ? 'rgba(255, 215, 0, 0.9)'
                : `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.85)`;
            ctx.fillRect(x, y - labelH, labelW, labelH);

            // Label text
            ctx.fillStyle = isTracked ? '#000' : '#ffffff';
            ctx.textBaseline = 'top';
            ctx.fillText(label, x + 5, y - labelH + 4);
        });

        // Update objects list
        this.updateObjectsList(objects);
    },

    updateObjectsList(objects) {
        const container = document.getElementById('liveObjectsListContent');
        if (!container) return;

        container.innerHTML = '';
        objects.forEach(obj => {
            const badge = document.createElement('span');
            const color = obj.color;
            badge.className = 'badge';
            badge.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
            badge.style.color = '#fff';
            badge.textContent = `${obj.label} ${obj.confidence ?
                (obj.confidence * 100).toFixed(0) + '%' : ''}`;
            container.appendChild(badge);
        });

        document.getElementById('liveObjectCount').textContent = objects.length;
    },

    updatePositionDisplay(objects, gridMode, tracked) {
        const panel = document.getElementById('livePositionPanel');
        if (!panel) return;

        if ((!gridMode || gridMode === 'off') && !tracked) {
            panel.classList.add('d-none');
            return;
        }

        panel.classList.remove('d-none');
        const n = parseInt(gridMode);
        const gridCol = document.getElementById('livePositionGridCol');
        const textCol = document.getElementById('livePositionTextCol');
        const gridEl = document.getElementById('livePositionGrid');
        const textarea = document.getElementById('livePositionText');

        // Build grid cells dynamically if size changed
        if (n === 3) {
            // 3x3 visual grid
            gridCol.classList.remove('d-none');
            textCol.className = 'col-7';
            if (gridEl.dataset.size !== '3') {
                gridEl.style.gridTemplateColumns = 'repeat(3, 1fr)';
                gridEl.style.gridTemplateRows = 'repeat(3, 1fr)';
                const labels3 = [
                    'Up-Left','Up','Up-Right',
                    'Left','Center','Right',
                    'Down-Left','Down','Down-Right'
                ];
                gridEl.innerHTML = labels3.map(
                    p => `<div class="live-position-cell" data-pos="${p}"></div>`
                ).join('');
                gridEl.dataset.size = '3';
            }
        } else {
            // 10x10 / 20x20 — hide the mini grid, show full-width text
            gridCol.classList.add('d-none');
            textCol.className = 'col-12';
        }

        // Update text
        if (textarea) {
            // Build tracked-object header line (if tracking)
            let trackedLine = '';
            if (tracked) {
                const close = tracked.closeness != null ? `  Close: ${tracked.closeness}%` : '';
                if (typeof tracked.position === 'string') {
                    trackedLine = `TRACKING ${tracked.label}: ${tracked.position}${close}`;
                } else if (tracked.position && typeof tracked.position === 'object') {
                    const p = tracked.position;
                    trackedLine = `TRACKING ${tracked.label}:  L:${p.left}% R:${p.right}% U:${p.up}% D:${p.down}%${close}`;
                }
            }

            // Build body lines from all-objects position data (grid modes)
            let bodyLines = [];
            if (objects && objects.length > 0 && n === 3) {
                bodyLines = objects
                    .filter(obj => obj.position)
                    .map(obj => {
                        const close = obj.closeness != null ? `  Close: ${obj.closeness}%` : '';
                        return `${obj.label}: ${obj.position}${close}`;
                    });
            } else if (objects && objects.length > 0 && (n === 10 || n === 20)) {
                bodyLines = objects
                    .filter(obj => obj.position && typeof obj.position === 'object')
                    .map(obj => {
                        const p = obj.position;
                        const close = obj.closeness != null ? `  Close: ${obj.closeness}%` : '';
                        return `${obj.label}:  Left: ${p.left}%  Right: ${p.right}%  Up: ${p.up}%  Down: ${p.down}%${close}`;
                    });
            }

            const body = bodyLines.join('\n');
            if (trackedLine && body) {
                textarea.value = trackedLine + '\n---\n' + body;
            } else if (trackedLine) {
                textarea.value = trackedLine;
            } else if (body) {
                textarea.value = body;
            } else {
                textarea.value = 'No objects detected';
            }
        }

        // Update 3x3 grid visual (only for 3x3 mode)
        if (n === 3) {
            const cells = gridEl.querySelectorAll('.live-position-cell');
            cells.forEach(cell => {
                cell.classList.remove('active');
                cell.textContent = '';
            });

            if (objects && objects.length > 0) {
                const positionCounts = {};
                objects.forEach(obj => {
                    if (obj.position && typeof obj.position === 'string') {
                        if (!positionCounts[obj.position]) positionCounts[obj.position] = 0;
                        positionCounts[obj.position]++;
                    }
                });
                cells.forEach(cell => {
                    const pos = cell.getAttribute('data-pos');
                    if (positionCounts[pos]) {
                        cell.classList.add('active');
                        cell.textContent = positionCounts[pos];
                    }
                });
            }
        }
    },

    updateStats(elapsedMs, data) {
        this.frameCount++;

        // Rolling FPS (last 10 frames)
        this.fpsHistory.push(elapsedMs);
        if (this.fpsHistory.length > 10) this.fpsHistory.shift();

        const avgMs = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
        const fps = (1000 / avgMs).toFixed(1);

        document.getElementById('liveFpsDisplay').textContent = fps;
        document.getElementById('liveFpsOverlayText').textContent = `${fps} FPS`;
        document.getElementById('liveLatency').textContent =
            `${data.processing_time.toFixed(2)}s`;
    },

    showLiveError(msg) {
        // Always log to browser console with clear prefix
        console.error(`%c[SAM3 ERROR]%c ${msg}`, 'color:#ff4444;font-weight:bold', 'color:inherit');

        // Show error visually in the status badge for 5 seconds
        const badge = document.getElementById('liveStatusBadge');
        if (badge) {
            const prev = badge.innerHTML;
            const prevClass = badge.className;
            badge.className = 'badge bg-danger';
            badge.innerHTML = `<i class="fas fa-exclamation-triangle me-1"></i>Error: ${msg}`;
            clearTimeout(this._errorBadgeTimer);
            this._errorBadgeTimer = setTimeout(() => {
                if (this.isRunning) {
                    badge.className = 'badge bg-success';
                    badge.innerHTML = '<i class="fas fa-circle me-1"></i>Running';
                } else {
                    badge.className = prevClass;
                    badge.innerHTML = prev;
                }
            }, 5000);
        }
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('SAM3 Interactive Dashboard initialized successfully');

    // Initialize Point & Click module
    PointClickModule.init();

    // Initialize Video module
    VideoModule.init();

    // Initialize Bounding Box module
    BoundingBoxModule.init();

    // Initialize Exemplar module
    ExemplarModule.init();

    // Initialize Export module
    ExportModule.init();

    // Initialize Object Tracker module
    ObjectTrackerModule.init();

    // Initialize Live Camera module
    LiveCameraModule.init();

    // Setup sidebar navigation for mode switching
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (!link.classList.contains('disabled')) {
                const section = link.dataset.section;
                if (section) {
                    ModeManager.switchMode(section);
                }
            }
        });
    });
});
