document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const imageInput = document.getElementById('imageInput');
    const uploadForm = document.getElementById('uploadForm');
    const generateBtn = document.getElementById('generateBtn');
    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');
    const previewSection = document.getElementById('previewSection');
    const previewImage = document.getElementById('previewImage');

    document.querySelectorAll("[data-copy-snippet]").forEach(button => {
        button.dataset.copyLabel = button.getAttribute("aria-label") || "Copy command";
        button.addEventListener("click", async function() {
            const snippet = this.parentElement.querySelector("code");
            if (!snippet) {
                return;
            }

            try {
                await copyText(snippet.textContent.trim());
                this.classList.add("copied");
                this.setAttribute("aria-label", "Copied command");

                window.setTimeout(() => {
                    this.classList.remove("copied");
                    this.setAttribute("aria-label", this.dataset.copyLabel || "Copy command");
                }, 1600);
            } catch (error) {
                console.error("Copy failed:", error);
                this.classList.add("copy-failed");
                this.setAttribute("aria-label", "Copy failed");
                window.setTimeout(() => {
                    this.classList.remove("copy-failed");
                    this.setAttribute("aria-label", this.dataset.copyLabel || "Copy command");
                }, 1600);
            }
        });
    });

    async function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return;
        }

        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();

        try {
            if (!document.execCommand("copy")) {
                throw new Error("Copy command was rejected");
            }
        } finally {
            document.body.removeChild(textarea);
        }
    }

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

    // ==========================================
    // OpenGraph Checker Functionality
    // ==========================================
    
    const urlInput = document.getElementById('urlInput');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analyzeText = document.querySelector('.analyze-text');
    const analyzeLoading = document.querySelector('.analyze-loading');
    const ogResults = document.getElementById('ogResults');
    const ogError = document.getElementById('ogError');
    const platformTabs = document.querySelectorAll('.platform-tab');
    const platformPreviews = document.querySelectorAll('.platform-preview');
    const toggleRawBtn = document.getElementById('toggleRawData');
    const rawDataDisplay = document.getElementById('rawDataDisplay');

    // Platform tab switching
    platformTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const platform = this.dataset.platform;
            
            // Update active tab
            platformTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding preview
            platformPreviews.forEach(p => p.classList.remove('active'));
            document.getElementById(`preview-${platform}`).classList.add('active');
        });
    });

    // Toggle raw data
    if (toggleRawBtn) {
        toggleRawBtn.addEventListener('click', function() {
            if (rawDataDisplay.style.display === 'none') {
                rawDataDisplay.style.display = 'block';
                this.textContent = 'Hide Raw Data';
            } else {
                rawDataDisplay.style.display = 'none';
                this.textContent = 'Show Raw Data';
            }
        });
    }

    // Analyze URL
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', analyzeUrl);
        urlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                analyzeUrl();
            }
        });
    }

    async function analyzeUrl() {
        let url = urlInput.value.trim();
        
        if (!url) {
            showError('Please enter a URL');
            return;
        }

        // Add https:// if no protocol specified
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
            urlInput.value = url;
        }

        // Show loading state
        analyzeBtn.disabled = true;
        analyzeText.style.display = 'none';
        analyzeLoading.style.display = 'inline-flex';
        ogResults.style.display = 'none';
        ogError.style.display = 'none';

        try {
            const response = await fetch(`/api/analyze?url=${encodeURIComponent(url)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyze URL');
            }

            displayResults(data);

        } catch (error) {
            showError(error.message);
        } finally {
            // Reset button state
            analyzeBtn.disabled = false;
            analyzeText.style.display = 'inline';
            analyzeLoading.style.display = 'none';
        }
    }

    function showError(message) {
        ogError.textContent = '❌ ' + message;
        ogError.style.display = 'block';
        ogResults.style.display = 'none';
    }

    function displayResults(data) {
        ogResults.style.display = 'grid';
        ogError.style.display = 'none';

        // Extract domain from URL
        let domain = '';
        try {
            domain = new URL(data.url).hostname;
        } catch (e) {
            domain = data.url;
        }

        // Title
        const title = data.title || data.og.title || 'No title found';
        document.getElementById('ogTitle').textContent = title;
        document.getElementById('titleCount').textContent = title.length;

        // Description
        const description = data.description || data.og.description || 'No description found';
        document.getElementById('ogDescription').textContent = description;
        document.getElementById('descCount').textContent = description.length;

        // Image
        const imageUrl = data.resolved.image;
        const imagePreview = document.getElementById('ogImagePreview');
        const imagePlaceholder = document.getElementById('ogImagePlaceholder');
        
        if (imageUrl) {
            imagePreview.src = imageUrl;
            imagePreview.style.display = 'block';
            imagePlaceholder.style.display = 'none';
            document.getElementById('ogImageUrl').textContent = imageUrl;
        } else {
            imagePreview.style.display = 'none';
            imagePlaceholder.style.display = 'block';
            document.getElementById('ogImageUrl').textContent = 'No image found';
        }

        // Site name & Type
        document.getElementById('ogSiteName').textContent = data.og.siteName || domain;
        document.getElementById('ogType').textContent = data.og.type || 'website';

        // Update all platform previews
        updatePlatformPreviews(data, domain, title, description, imageUrl);

        // Raw data
        rawDataDisplay.textContent = JSON.stringify(data, null, 2);
    }

    function updatePlatformPreviews(data, domain, title, description, imageUrl) {
        // Facebook
        updatePreviewImage('fb-image', imageUrl);
        document.getElementById('fb-domain').textContent = domain.toUpperCase();
        document.getElementById('fb-title').textContent = title;
        document.getElementById('fb-description').textContent = description;

        // Twitter
        updatePreviewImage('twitter-image', imageUrl);
        document.getElementById('twitter-title').textContent = title;
        document.getElementById('twitter-description').textContent = description;
        document.getElementById('twitter-domain').textContent = domain;

        // LinkedIn
        updatePreviewImage('linkedin-image', imageUrl);
        document.getElementById('linkedin-title').textContent = title;
        document.getElementById('linkedin-domain').textContent = domain;

        // WhatsApp
        updatePreviewImage('wa-image', imageUrl);
        document.getElementById('wa-domain').textContent = domain;
        document.getElementById('wa-title').textContent = title;
        document.getElementById('wa-description').textContent = description;

        // Discord
        updatePreviewImage('discord-image', imageUrl);
        document.getElementById('discord-site').textContent = data.og.siteName || domain;
        document.getElementById('discord-title').textContent = title;
        document.getElementById('discord-description').textContent = description;
    }

    function updatePreviewImage(imgId, imageUrl) {
        const img = document.getElementById(imgId);
        const container = img.parentElement;
        const placeholder = container.querySelector('[class$="-image-placeholder"]');
        
        if (imageUrl) {
            img.src = imageUrl;
            img.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
        } else {
            img.style.display = 'none';
            if (placeholder) placeholder.style.display = 'block';
        }
    }
}); 