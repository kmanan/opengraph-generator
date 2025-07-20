document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const imageInput = document.getElementById('imageInput');
    const uploadForm = document.getElementById('uploadForm');
    const generateBtn = document.getElementById('generateBtn');
    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');
    const previewSection = document.getElementById('previewSection');
    const previewImage = document.getElementById('previewImage');

    // Drag and drop functionality
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            imageInput.files = files;
            handleFileSelect(files[0]);
        }
    });

    // File input change
    imageInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // Handle file selection
    function handleFileSelect(file) {
        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
            alert('File size must be less than 10MB');
            return;
        }

        // Enable generate button
        generateBtn.disabled = false;

        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewSection.style.display = 'block';
        };
        reader.readAsDataURL(file);

        // Update drop zone text
        const dropContent = dropZone.querySelector('.drop-content h3');
        dropContent.textContent = `Selected: ${file.name}`;
    }

    // Form submission
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();

        if (!imageInput.files[0]) {
            alert('Please select an image file');
            return;
        }

        // Show loading state
        generateBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-flex';

        // Create form data
        const formData = new FormData();
        formData.append('image', imageInput.files[0]);
        formData.append('svgColor', document.getElementById('svgColor').value);

        // Submit to server
        fetch('/generate', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.blob();
        })
        .then(blob => {
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'opengraph-favicons.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Reset form
            resetForm();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error generating files. Please try again.');
            resetForm();
        });
    });

    // Reset form function
    function resetForm() {
        generateBtn.disabled = true;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        
        // Reset drop zone text
        const dropContent = dropZone.querySelector('.drop-content h3');
        dropContent.textContent = 'Drop your image here';
        
        // Hide preview
        previewSection.style.display = 'none';
        
        // Clear file input
        imageInput.value = '';
    }

    // Click to browse functionality
    dropZone.addEventListener('click', function(e) {
        // Prevent double-triggering by stopping if the click came from the file input
        if (e.target === imageInput) {
            return;
        }
        e.preventDefault();
        imageInput.click();
    });
}); 