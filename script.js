// --- Global State and Utility Functions ---
let uploadedImages = []; // For Image to PDF
let compressorImage = null; // For Image Compressor
let currentConverterImage = null; // For Image Converters
let targetFormat = 'jpg'; 
let reorderingMode = false; // Controls the click-to-order functionality
let newOrderList = []; // Holds the list of files in the new desired order

const STATUS_MSG = document.getElementById('status-message');

function displayStatus(message, type) {
    STATUS_MSG.textContent = message;
    
    let alertClass = '';
    if (type === 'success') {
        alertClass = 'alert-success';
    } else if (type === 'error') {
        alertClass = 'alert-danger';
    } else {
        alertClass = 'alert-info';
    }

    STATUS_MSG.className = `status-message alert ${alertClass}`;
    STATUS_MSG.classList.remove('d-none');
    
    // Auto-hides the message after 5 seconds
    setTimeout(() => {
        STATUS_MSG.classList.add('d-none');
    }, 5000);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


// --- 1. Tool Switching Logic ---

document.addEventListener('DOMContentLoaded', () => {
    const selectors = {
        pdf: document.getElementById('pdf-selector'),
        compressor: document.getElementById('compressor-selector'),
        toJpg: document.getElementById('to-jpg-selector'),
        toPng: document.getElementById('to-png-selector'),
        toJpeg: document.getElementById('to-jpeg-selector'),
    };
    const interfaces = {
        pdf: document.getElementById('pdf-tool-interface'),
        compressor: document.getElementById('compressor-tool-interface'),
        converter: document.getElementById('converter-tool-interface'),
    };

    function switchTool(activeTool) {
        // When switching tool, turn off reordering mode
        if (reorderingMode) {
            toggleReorderingMode(false);
        }
        
        for (const key in selectors) { selectors[key].classList.remove('active'); }
        for (const key in interfaces) { interfaces[key].classList.add('hidden'); }

        if (selectors[activeTool]) { selectors[activeTool].classList.add('active'); }

        if (activeTool === 'pdf') {
            interfaces.pdf.classList.remove('hidden');
        } else if (activeTool === 'compressor') {
            interfaces.compressor.classList.remove('hidden');
        } else {
            // Converters share one interface
            interfaces.converter.classList.remove('hidden');
            
            if (activeTool === 'toJpg' || activeTool === 'toJpeg') targetFormat = 'jpg';
            if (activeTool === 'toPng') targetFormat = 'png';
            
            const displayFormat = targetFormat === 'jpg' && activeTool === 'toJpeg' ? 'JPEG' : targetFormat.toUpperCase();
            document.getElementById('converter-title').textContent = `Convert Image to ${displayFormat}`;
            document.getElementById('convert-image-btn').textContent = `Convert to ${displayFormat} & Download`;
            document.getElementById('converter-file-name').placeholder = `Name your ${displayFormat.toLowerCase()} file (optional)`;
            renderConverterImage();
        }
        STATUS_MSG.classList.add('d-none');
    }

    selectors.pdf.addEventListener('click', () => switchTool('pdf'));
    selectors.compressor.addEventListener('click', () => switchTool('compressor'));
    selectors.toJpg.addEventListener('click', () => switchTool('toJpg'));
    selectors.toPng.addEventListener('click', () => switchTool('toPng'));
    selectors.toJpeg.addEventListener('click', () => switchTool('toJpeg'));

    // Initial button setup and rendering
    
    // NEW ELEMENT: Reorder button setup
    const reorderBtn = document.createElement('button');
    reorderBtn.className = 'btn btn-info';
    reorderBtn.id = 'reorder-pdf-btn';
    reorderBtn.textContent = 'Set Page Order';
    reorderBtn.style.marginLeft = '10px';

    // Append the reorder button dynamically
    const clearPdfBtn = document.getElementById('clear-pdf-btn');
    const toolActionsDiv = document.querySelector('#pdf-tool-interface .tool-actions');
    if (toolActionsDiv) {
        toolActionsDiv.insertBefore(reorderBtn, clearPdfBtn.nextSibling); 
    }
    
    // Setup event listener for the reorder button
    reorderBtn.addEventListener('click', () => {
        // If the mode is currently active, clicking again cancels it
        if (reorderingMode) {
            toggleReorderingMode(false);
        } else if (uploadedImages.length > 0) {
            // If mode is inactive, start reordering
            toggleReorderingMode(true);
        } else {
            displayStatus('Please add images first before setting the page order.', 'error');
        }
    });

    renderPdfPreviews();
    renderCompressorImage();
});


// --- 2. Image to PDF Converter Functionality ---

const pdfFileInput = document.getElementById('pdf-file-input');
const pdfPreviewList = document.getElementById('pdf-preview-list');
const convertPdfBtn = document.getElementById('convert-pdf-btn');
const clearPdfBtn = document.getElementById('clear-pdf-btn');
const pdfFileNameInput = document.getElementById('pdf-file-name');

// Note: reorderBtn is now accessed via document.getElementById in functions below since it's created in DOMContentLoaded

function updatePdfButtons() {
    const reorderBtn = document.getElementById('reorder-pdf-btn');
    const hasImages = uploadedImages.length > 0;
    convertPdfBtn.disabled = !hasImages || reorderingMode;
    clearPdfBtn.disabled = !hasImages || reorderingMode;
    
    if (reorderBtn) {
        reorderBtn.disabled = !hasImages;
        // Update reorder button appearance if active
        if (reorderingMode) {
            reorderBtn.textContent = `Next: ${newOrderList.length + 1}`;
        } else {
            reorderBtn.textContent = 'Set Page Order';
        }
    }

    const placeholder = pdfPreviewList.querySelector('.placeholder-preview');
    if (placeholder) placeholder.classList.toggle('d-none', hasImages);
}

function removeImage(index) {
    if (reorderingMode) { 
        displayStatus("Please finish setting the page order first.", 'error');
        return; 
    } 
    uploadedImages.splice(index, 1);
    renderPdfPreviews();
    displayStatus(`Image removed successfully. Total images: ${uploadedImages.length}`, 'success');
}

function renderPdfPreviews() {
    pdfPreviewList.innerHTML = '';
    // Apply styling based on reordering mode
    pdfPreviewList.classList.toggle('ordering-mode', reorderingMode);

    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder-preview mx-auto text-muted';
    placeholder.textContent = 'No images added yet.';
    if (uploadedImages.length === 0) {
        pdfPreviewList.appendChild(placeholder);
    }

    uploadedImages.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const item = document.createElement('div');
            item.className = 'image-preview-item';
            item.dataset.fileIndex = index; 
            item.dataset.uniqueId = file.name + file.size + file.lastModified; 

            // Check if file is already in the new order list
            const isOrdered = newOrderList.includes(file);

            const orderNumber = document.createElement('span');
            orderNumber.className = 'image-order-number';
            
            if (!reorderingMode) {
                orderNumber.textContent = index + 1; 
            } else {
                const assignedIndex = newOrderList.findIndex(f => f === file);
                orderNumber.textContent = assignedIndex !== -1 ? assignedIndex + 1 : '';
                orderNumber.style.backgroundColor = assignedIndex !== -1 ? 'var(--success-color)' : 'var(--primary-color)';
                orderNumber.style.opacity = assignedIndex !== -1 ? 1 : 0.4; // Dim for non-ordered images
            }


            const img = document.createElement('img');
            img.src = e.target.result;
            
            const name = document.createElement('span');
            name.className = 'image-name';
            name.textContent = file.name;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = 'X';
            removeBtn.title = 'Remove image';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                removeImage(index);
            }; 

            // NEW: Click-to-order badge (visible only in reordering mode)
            const orderSetterBadge = document.createElement('div');
            orderSetterBadge.className = 'order-setter-badge';
            orderSetterBadge.textContent = newOrderList.length + 1; 

            // Add click handler for reordering
            item.addEventListener('click', () => handleImageOrderClick(file, item, orderSetterBadge));

            item.appendChild(orderNumber);
            item.appendChild(img);
            item.appendChild(name);
            item.appendChild(removeBtn);
            item.appendChild(orderSetterBadge);
            pdfPreviewList.appendChild(item);
            
            // Set initial state for ordered images
            if (isOrdered && reorderingMode) {
                item.style.borderColor = 'var(--success-color)';
                orderSetterBadge.style.opacity = 0; // Hide badge once ordered
            }
        };
        reader.readAsDataURL(file);
    });
    updatePdfButtons();
}

function toggleReorderingMode(active) {
    reorderingMode = active;
    
    if (active) {
        newOrderList = []; // Start fresh
        // The button text/class update is handled in updatePdfButtons
        convertPdfBtn.disabled = true;
        clearPdfBtn.disabled = true;
        pdfFileInput.disabled = true;
        displayStatus(`Reordering Mode ON. Click images in the desired PDF page order (1 to ${uploadedImages.length}).`, 'info');
    } else {
        // The button text/class update is handled in updatePdfButtons
        pdfFileInput.disabled = false;
        
        // Finalize order if the list is complete
        if (newOrderList.length === uploadedImages.length) {
            // Replaces the original list with the new, ordered list
            uploadedImages = newOrderList; 
            newOrderList = []; // Clear temp list
            displayStatus(`Page order successfully set for ${uploadedImages.length} images!`, 'success');
        } else {
             // If user cancels mid-way or didn't complete, revert temp list and notify
             newOrderList = [];
             if (uploadedImages.length > 0) {
                 displayStatus(`Reordering cancelled. Keeping previous page order.`, 'info');
             }
        }
    }
    renderPdfPreviews();
    updatePdfButtons();
}

function handleImageOrderClick(file, item, badge) {
    if (!reorderingMode) { return; }
    
    // Check if this image has already been ordered
    if (newOrderList.includes(file)) {
        displayStatus('This image has already been assigned a page number.', 'error');
        return;
    }

    // 1. Set the page number
    const pageNumber = newOrderList.length + 1;
    newOrderList.push(file);

    // 2. Visually update the item
    item.style.borderColor = 'var(--success-color)';
    
    // Update the visual order number on the item itself
    const orderNumberSpan = item.querySelector('.image-order-number');
    if (orderNumberSpan) {
        orderNumberSpan.textContent = pageNumber;
        orderNumberSpan.style.backgroundColor = 'var(--success-color)';
        orderNumberSpan.style.opacity = 1;
    }
    
    // Hide the interactive badge
    badge.style.opacity = 0; 
    item.style.cursor = 'default'; // Disable further clicking on this item

    // 3. Update all other badges to show the *next* number
    document.querySelectorAll('.image-preview-item').forEach(previewItem => {
        const uniqueId = previewItem.dataset.uniqueId;
        const currentFile = uploadedImages.find(f => (f.name + f.size + f.lastModified) === uniqueId);

        if (currentFile && !newOrderList.includes(currentFile)) {
            const nextBadge = previewItem.querySelector('.order-setter-badge');
            if(nextBadge) nextBadge.textContent = newOrderList.length + 1;
        }
    });

    // 4. Update the Reorder button status
    updatePdfButtons();

    // 5. Check if order is complete
    if (newOrderList.length === uploadedImages.length) {
        // Use a slight delay to allow the last visual update to render
        setTimeout(() => toggleReorderingMode(false), 200); 
    }
}


pdfFileInput.addEventListener('change', (e) => {
    if (reorderingMode) return;
    const newFiles = Array.from(e.target.files);
    
    if (uploadedImages.length + newFiles.length > 100) {
        displayStatus(`Error: Max 100 images allowed.`, 'error');
        e.target.value = null;
        return;
    }
    
    newFiles.forEach(file => {
        uploadedImages.push(file); 
    });

    renderPdfPreviews();
    displayStatus(`${newFiles.length} image(s) added. Total images: ${uploadedImages.length}`, 'success');
    e.target.value = null;
});

clearPdfBtn.addEventListener('click', () => {
    if (reorderingMode) { toggleReorderingMode(false); }
    uploadedImages = [];
    renderPdfPreviews();
    pdfFileNameInput.value = '';
    displayStatus('All images cleared.', 'success');
});

convertPdfBtn.addEventListener('click', async () => {
    if (uploadedImages.length === 0) { displayStatus('Please add images before converting.', 'error'); return; }
    convertPdfBtn.textContent = 'Converting...';
    convertPdfBtn.disabled = true;

    try {
        const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
        const a4Width = 210, a4Height = 297;
        let firstImage = true;

        // Uses the order of the uploadedImages array (which holds the user's reordering)
        for (const file of uploadedImages) { 
            const dataUrl = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });

            const img = await new Promise(resolve => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.src = dataUrl;
            });

            const margin = 10;
            const contentWidth = a4Width - 2 * margin;
            const contentHeight = a4Height - 2 * margin;
            const imgWidth = img.width, imgHeight = img.height;
            let scaleFactor = Math.min(contentWidth / imgWidth, contentHeight / imgHeight);
            let finalWidth = imgWidth * scaleFactor;
            let finalHeight = imgHeight * scaleFactor;
            const x = (a4Width - finalWidth) / 2;
            const y = (a4Height - finalHeight) / 2;

            if (!firstImage) { pdf.addPage(); } else { firstImage = false; }
            pdf.addImage(dataUrl, file.type.split('/')[1].toUpperCase(), x, y, finalWidth, finalHeight);
        }

        const fileName = (pdfFileNameInput.value.trim() || 'converted_images') + '.pdf';
        pdf.save(fileName);
        displayStatus('PDF converted and download initiated!', 'success');
    } catch (error) {
        console.error("PDF Conversion Error:", error);
        displayStatus('An error occurred during PDF conversion.', 'error');
    } finally {
        convertPdfBtn.textContent = 'Convert to PDF';
        updatePdfButtons();
    }
});


// --- 3. Image Compressor Functionality ---
// (Code omitted for brevity, logic remains the same as previous step)

const compressorFileInput = document.getElementById('compressor-file-input');
const compressDownloadBtn = document.getElementById('compress-download-btn');
const qualitySlider = document.getElementById('quality-slider');
const qualityValueSpan = document.getElementById('quality-value');
const originalSizeSpan = document.getElementById('original-size');
const newSizeSpan = document.getElementById('new-size');
const compressorImageDisplay = document.getElementById('compressor-image-display');
const compressorFileNameInput = document.getElementById('compressor-file-name');
const compressorRemoveBtn = document.getElementById('compressor-remove-btn'); 

function renderCompressorImage() {
    compressorImageDisplay.innerHTML = '';

    if (!compressorImage) {
        compressorImageDisplay.innerHTML = '<div class="placeholder-preview mx-auto text-muted">Image selected will appear here.</div>';
        compressDownloadBtn.disabled = true;
        compressorRemoveBtn.disabled = true;
        originalSizeSpan.textContent = '-- KB';
        newSizeSpan.textContent = '-- KB';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.classList.add('img-fluid');
        img.style.maxHeight = '200px'; 
        img.style.objectFit = 'contain';

        const item = document.createElement('div');
        item.classList.add('w-100', 'text-center');
        item.appendChild(img);
        
        compressorImageDisplay.appendChild(item);
    };
    reader.readAsDataURL(compressorImage);

    originalSizeSpan.textContent = formatBytes(compressorImage.size);
    newSizeSpan.textContent = 'N/A';
    compressDownloadBtn.disabled = false;
    compressorRemoveBtn.disabled = false;
}

function clearCompressorImage() {
    compressorImage = null;
    compressorFileInput.value = '';
    compressorFileNameInput.value = '';
    renderCompressorImage();
    displayStatus('Image removed.', 'success');
}

compressorFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        compressorImage = file;
        renderCompressorImage();
        displayStatus(`Image loaded for compression: ${file.name}`, 'success');
    } else {
        clearCompressorImage();
    }
    e.target.value = null;
});

compressorRemoveBtn.addEventListener('click', clearCompressorImage);

qualitySlider.addEventListener('input', () => {
    qualityValueSpan.textContent = `${qualitySlider.value}%`;
    newSizeSpan.textContent = 'N/A';
});


compressDownloadBtn.addEventListener('click', async () => {
    if (!compressorImage) { displayStatus('Please select an image to compress.', 'error'); return; }

    compressDownloadBtn.textContent = 'Compressing...';
    compressDownloadBtn.disabled = true;
    
    const quality = parseInt(qualitySlider.value) / 100;

    const options = { maxSizeMB: 100, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/jpeg', initialQuality: quality, };

    try {
        const compressedFile = await imageCompression(compressorImage, options);
        newSizeSpan.textContent = formatBytes(compressedFile.size);

        const originalName = compressorImage.name.split('.').slice(0, -1).join('.');
        const finalFileName = (compressorFileNameInput.value.trim() || originalName + '_compressed') + '.jpg';

        const url = URL.createObjectURL(compressedFile);
        const link = document.createElement('a');
        link.href = url;
        link.download = finalFileName;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        displayStatus('Image compressed and download initiated!', 'success');

    } catch (error) {
        console.error('Image compression failed:', error);
        displayStatus('An error occurred during compression.', 'error');
    } finally {
        compressDownloadBtn.textContent = 'Compress & Download';
        compressDownloadBtn.disabled = false;
    }
});


// --- 4. Image Converter Functionality ---
// (Code omitted for brevity, logic remains the same as previous step)

const converterFileInput = document.getElementById('converter-file-input');
const convertImageBtn = document.getElementById('convert-image-btn');
const converterImageDisplay = document.getElementById('converter-image-display');
const converterFileNameInput = document.getElementById('converter-file-name');
const converterRemoveBtn = document.getElementById('converter-remove-btn'); 

function renderConverterImage() {
    converterImageDisplay.innerHTML = '';
    
    if (!currentConverterImage) {
        converterImageDisplay.innerHTML = '<div class="placeholder-preview mx-auto text-muted">Image selected will appear here.</div>';
        convertImageBtn.disabled = true;
        converterRemoveBtn.disabled = true;
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = function() {
            if (img.naturalWidth === 0) {
                 displayStatus('Error: Selected file is not a valid image.', 'error');
                 clearConverterImage();
                 return;
            }

            const imgElement = document.createElement('img');
            imgElement.src = e.target.result;
            imgElement.classList.add('img-fluid');
            imgElement.style.maxHeight = '200px'; 
            imgElement.style.objectFit = 'contain';

            const item = document.createElement('div');
            item.classList.add('w-100', 'text-center');
            item.appendChild(imgElement);
            
            converterImageDisplay.appendChild(item);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(currentConverterImage);

    convertImageBtn.disabled = false;
    converterRemoveBtn.disabled = false;
}

function clearConverterImage() {
    currentConverterImage = null;
    converterFileInput.value = '';
    converterFileNameInput.value = '';
    renderConverterImage();
    displayStatus('Image removed.', 'success');
}

converterFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        currentConverterImage = file;
        renderConverterImage();
        displayStatus(`Image loaded for conversion: ${file.name}`, 'success');
    } else {
        clearConverterImage();
    }
    e.target.value = null;
});

converterRemoveBtn.addEventListener('click', clearConverterImage);


convertImageBtn.addEventListener('click', () => {
    if (!currentConverterImage) return;

    convertImageBtn.disabled = true;
    convertImageBtn.textContent = 'Converting...';

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext('2d').drawImage(img, 0, 0);

            let mimeType;
            let fileExtension;
            let quality = 0.9;

            if (targetFormat === 'png') {
                mimeType = 'image/png';
                fileExtension = '.png';
            } else { // 'jpg' or 'jpeg'
                mimeType = 'image/jpeg';
                fileExtension = '.jpg';
            }

            canvas.toBlob((blob) => {
                if (!blob) { displayStatus('Conversion failed.', 'error'); return; }
                
                const originalName = currentConverterImage.name.split('.').slice(0, -1).join('');
                const finalFileName = (converterFileNameInput.value.trim() || originalName + '_converted') + fileExtension;
                
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = finalFileName;

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                displayStatus(`Image successfully converted to ${targetFormat.toUpperCase()}!`, 'success');

            }, mimeType, quality);
            
            const displayFormat = targetFormat === 'jpg' && document.querySelector('.tool-selector.active')?.id === 'to-jpeg-selector' ? 'JPEG' : targetFormat.toUpperCase();
            convertImageBtn.textContent = `Convert to ${displayFormat} & Download`;
            convertImageBtn.disabled = false;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(currentConverterImage);
});
