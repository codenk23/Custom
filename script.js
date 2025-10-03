// --- Tool Switching Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('#tool-nav .nav-link');
    const toolContents = document.querySelectorAll('.tool-content');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetToolId = link.getAttribute('data-tool');

            // 1. Update active nav link
            navLinks.forEach(n => n.classList.remove('active'));
            link.classList.add('active');

            // 2. Show the target tool section
            toolContents.forEach(content => {
                if (content.id === targetToolId) {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            });
        });
    });
});


// --- PDF Converter Logic (Placeholder for file handling) ---

const fileInput = document.getElementById('pdf-file-input');
const uploadArea = document.getElementById('pdf-upload-area');
const imageList = document.getElementById('pdf-image-list');
const convertBtn = document.getElementById('convert-to-pdf-btn');
let uploadedFiles = [];

// Helper to update the convert button state
function updateConvertButton() {
    convertBtn.disabled = uploadedFiles.length === 0;
}

// Function to render the image list
function renderImageList() {
    imageList.innerHTML = ''; // Clear current list

    uploadedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'image-item';
        item.draggable = true;
        item.setAttribute('data-index', index);

        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = () => removeFile(index);

        item.appendChild(img);
        item.appendChild(removeBtn);
        imageList.appendChild(item);
    });

    updateConvertButton();
}

// Function to handle file input change
function handleFiles(files) {
    // Convert FileList to Array and filter for images
    const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    uploadedFiles.push(...newFiles);
    
    // In a real application, you would load a proper drag-and-drop library 
    // to handle the sorting of these elements.
    renderImageList();
}

// Function to remove a file
function removeFile(index) {
    uploadedFiles.splice(index, 1);
    renderImageList();
}

// Event Listeners for File Handling
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// Drag and Drop Events
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.backgroundColor = '#e9f5ff'; // Highlight on drag
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.backgroundColor = 'transparent';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.backgroundColor = 'transparent';
    handleFiles(e.dataTransfer.files);
});

// Placeholder for Conversion Logic
convertBtn.addEventListener('click', () => {
    if (uploadedFiles.length === 0) return;
    
    // 1. Get the current order of files from the DOM (you'll need to implement drag sorting)
    const finalOrder = uploadedFiles.map(file => file.name); 

    console.log("--- Starting PDF Conversion ---");
    console.log("Files to convert in order:", finalOrder);
    
    // 2. Here, you would use a library like 'jsPDF' or send the images to a server
    //    to perform the actual conversion.
    alert(`Starting conversion of ${uploadedFiles.length} images! (Logic to be implemented)`);
});
