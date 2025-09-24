document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const emailInput = document.getElementById('adobe-email');
    const passwordInput = document.getElementById('adobe-password');
    const fileInput = document.getElementById('acsm-file');
    const fileLabel = document.querySelector('.file-label');
    const fileInfo = document.getElementById('file-info');
    const processBtn = document.getElementById('process-btn');
    const progressArea = document.getElementById('progress-area');
    const progressFill = document.getElementById('progress-fill');
    const statusText = document.getElementById('status-text');
    const resultArea = document.getElementById('result-area');
    const downloadBtn = document.getElementById('download-btn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    let selectedFile = null;
    let processedEpubFile = null;

    // Tab switching functionality
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            btn.classList.add('active');
            document.querySelector(`[data-tab="${target}"].tab-content`).classList.add('active');
        });
    });

    // File input handling
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.name.toLowerCase().endsWith('.acsm')) {
                selectedFile = file;
                fileLabel.innerHTML = `<span class="file-text">✓ ${file.name}</span>`;
                fileLabel.style.background = '#27ae60';
                
                fileInfo.innerHTML = `
                    <div class="success-message">
                        ✓ File selected: ${file.name} (${formatFileSize(file.size)})
                    </div>
                `;
                fileInfo.classList.add('show');
                
                updateStepStatus(2, true);
                checkFormValidity();
            } else {
                fileLabel.innerHTML = '<span class="file-text">❌ Please select an ACSM file</span>';
                fileLabel.style.background = '#e74c3c';
                fileInfo.innerHTML = `
                    <div class="error-message">
                        ❌ Invalid file type. Please select an ACSM file.
                    </div>
                `;
                fileInfo.classList.add('show');
                selectedFile = null;
                updateStepStatus(2, false);
                checkFormValidity();
            }
        }
    });

    // Input validation
    emailInput.addEventListener('input', function() {
        validateEmail();
        checkFormValidity();
    });

    passwordInput.addEventListener('input', function() {
        validatePassword();
        checkFormValidity();
    });

    // Process button click handler
    processBtn.addEventListener('click', function() {
        if (!validateForm()) return;
        
        startConversion();
    });

    // Download button click handler
    downloadBtn.addEventListener('click', function() {
        if (processedEpubFile) {
            downloadFile(processedEpubFile);
        }
    });

    function validateEmail() {
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email && emailRegex.test(email)) {
            emailInput.classList.remove('input-error');
            updateStepStatus(1, true);
            return true;
        } else if (email) {
            emailInput.classList.add('input-error');
            updateStepStatus(1, false);
            return false;
        }
        return false;
    }

    function validatePassword() {
        const password = passwordInput.value.trim();
        
        if (password.length >= 6) {
            passwordInput.classList.remove('input-error');
            return true;
        } else if (password) {
            passwordInput.classList.add('input-error');
            return false;
        }
        return false;
    }

    function validateForm() {
        const emailValid = validateEmail();
        const passwordValid = validatePassword();
        const fileValid = selectedFile !== null;
        
        if (!emailValid) {
            alert('Please enter a valid Adobe email address.');
            emailInput.focus();
            return false;
        }
        
        if (!passwordValid) {
            alert('Please enter your Adobe password (minimum 6 characters).');
            passwordInput.focus();
            return false;
        }
        
        if (!fileValid) {
            alert('Please select an ACSM file to convert.');
            return false;
        }
        
        return true;
    }

    function checkFormValidity() {
        const emailValid = emailInput.value.trim() && validateEmail();
        const passwordValid = passwordInput.value.trim() && validatePassword();
        const fileValid = selectedFile !== null;
        
        processBtn.disabled = !(emailValid && passwordValid && fileValid);
        
        if (emailValid && passwordValid && fileValid) {
            updateStepStatus(3, true);
        }
    }

    function updateStepStatus(stepNumber, isCompleted) {
        const steps = document.querySelectorAll('.step');
        const step = steps[stepNumber - 1];
        
        if (isCompleted) {
            step.classList.add('completed');
        } else {
            step.classList.remove('completed');
        }
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function startConversion() {
        // Show progress area
        progressArea.style.display = 'block';
        resultArea.style.display = 'none';
        processBtn.disabled = true;
        
        // Simulate the conversion process
        simulateConversion();
    }

    function simulateConversion() {
        const steps = [
            { text: 'Validating Adobe credentials...', progress: 20 },
            { text: 'Registering device with Adobe...', progress: 40 },
            { text: 'Downloading encrypted EPUB from Adobe...', progress: 60 },
            { text: 'Decrypting EPUB file...', progress: 80 },
            { text: 'Creating DRM-free EPUB...', progress: 100 }
        ];
        
        let currentStep = 0;
        
        function nextStep() {
            if (currentStep < steps.length) {
                const step = steps[currentStep];
                statusText.textContent = step.text;
                progressFill.style.width = step.progress + '%';
                currentStep++;
                
                setTimeout(nextStep, 1500 + Math.random() * 1000);
            } else {
                // Conversion complete
                setTimeout(() => {
                    showResults();
                }, 500);
            }
        }
        
        nextStep();
    }

    function showResults() {
        // Create a mock EPUB file
        const originalName = selectedFile.name.replace('.acsm', '');
        const epubFileName = originalName + '.epub';
        
        // Create a blob representing the converted EPUB (in a real implementation, this would be the actual converted file)
        processedEpubFile = new Blob(['Mock EPUB content'], { type: 'application/epub+zip' });
        processedEpubFile.name = epubFileName;
        
        progressArea.style.display = 'none';
        resultArea.style.display = 'block';
        
        resultArea.querySelector('p').innerHTML = `Your DRM-free EPUB file "<strong>${epubFileName}</strong>" is ready for download.`;
        
        // Re-enable process button for another conversion
        setTimeout(() => {
            processBtn.disabled = false;
        }, 2000);
    }

    function downloadFile(file) {
        // In a real implementation, this would download the actual converted EPUB file
        // For this demo, we'll show a message explaining the limitation
        alert(`In a full implementation, this would download your converted EPUB file: "${file.name}"\n\n` +
              `Note: This web interface is a demonstration. The actual conversion requires:\n` +
              `• A backend server with the Knock CLI and its dependencies\n` +
              `• OR local installation of the Knock CLI tool\n\n` +
              `Visit the GitHub repository for installation instructions.`);
        
        // Optional: Create a download link for demonstration
        const demoContent = createDemoEpub();
        const url = URL.createObjectURL(demoContent);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'demo-converted.epub';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function createDemoEpub() {
        // Create a very basic EPUB structure for demonstration
        const epubContent = `
This is a demonstration EPUB file created by the Knock web interface.

In a real implementation, this would be your DRM-free EPUB file converted from the ACSM file.

To use Knock properly, you need to:
1. Install the CLI tool on a Linux system
2. Run: knock your-file.acsm
3. Follow the prompts for Adobe credentials

Visit: https://github.com/BentonEdmondson/knock for more information.
        `.trim();
        
        return new Blob([epubContent], { type: 'application/epub+zip' });
    }

    // Initialize form state
    checkFormValidity();
    
    // Add some visual feedback for demonstration
    setTimeout(() => {
        if (window.location.hash === '#demo') {
            // Auto-fill demo data for testing
            emailInput.value = 'demo@example.com';
            passwordInput.value = 'demopassword';
            validateEmail();
            validatePassword();
            checkFormValidity();
        }
    }, 500);
});