document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const form = document.getElementById('conversion-form');
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
    const errorArea = document.getElementById('error-area');
    const resultMessage = document.getElementById('result-message');
    const errorMessage = document.getElementById('error-message');
    const downloadBtn = document.getElementById('download-btn');
    const systemStatus = document.getElementById('system-status');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    let selectedFile = null;

    // Load system status
    loadSystemStatus();

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
            }
        }
    });

    // Input validation
    emailInput.addEventListener('input', function() {
        validateEmail();
    });

    passwordInput.addEventListener('input', function() {
        validatePassword();
    });

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        await submitConversion();
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
            showError('Please enter a valid Adobe email address.');
            emailInput.focus();
            return false;
        }
        
        if (!passwordValid) {
            showError('Please enter your Adobe password (minimum 6 characters).');
            passwordInput.focus();
            return false;
        }
        
        if (!fileValid) {
            showError('Please select an ACSM file to convert.');
            return false;
        }
        
        return true;
    }

    async function submitConversion() {
        // Hide previous results/errors
        resultArea.style.display = 'none';
        errorArea.style.display = 'none';
        
        // Show progress
        progressArea.style.display = 'block';
        processBtn.disabled = true;
        
        // Simulate progress steps
        const steps = [
            { text: 'Uploading ACSM file...', progress: 20 },
            { text: 'Validating Adobe credentials...', progress: 40 },
            { text: 'Registering device with Adobe...', progress: 60 },
            { text: 'Downloading encrypted EPUB...', progress: 80 },
            { text: 'Decrypting EPUB file...', progress: 100 }
        ];
        
        // Animate progress
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            statusText.textContent = step.text;
            progressFill.style.width = step.progress + '%';
            await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 600));
        }

        // Create form data
        const formData = new FormData();
        formData.append('adobeEmail', emailInput.value.trim());
        formData.append('adobePassword', passwordInput.value.trim());
        formData.append('acsmFile', selectedFile);

        try {
            const response = await fetch('/convert', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showSuccess(result.message, result.filename, result.downloadUrl);
            } else {
                showError(result.error);
            }
        } catch (error) {
            console.error('Conversion error:', error);
            showError('Network error occurred. Please try again.');
        } finally {
            progressArea.style.display = 'none';
            processBtn.disabled = false;
        }
    }

    function showSuccess(message, filename, downloadUrl) {
        resultMessage.innerHTML = `Your DRM-free EPUB file "<strong>${filename}</strong>" is ready for download.`;
        downloadBtn.href = downloadUrl;
        downloadBtn.download = filename;
        resultArea.style.display = 'block';
        updateStepStatus(3, true);
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorArea.style.display = 'block';
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

    async function loadSystemStatus() {
        try {
            const response = await fetch('/api/status');
            const status = await response.json();
            
            let statusHtml = `
                <div class="status-info">
                    <div class="status-item">
                        <strong>Server Status:</strong>
                        <span style="color: ${status.status === 'ok' ? 'var(--success-color)' : 'var(--accent-color)'}">
                            ${status.status === 'ok' ? '✓ Online' : '❌ Offline'}
                        </span>
                    </div>
                    <div class="status-item">
                        <strong>Version:</strong>
                        <span>${status.version}</span>
                    </div>
            `;

            if (status.dependencies) {
                statusHtml += '<h4>Dependencies:</h4>';
                for (const [dep, statusInfo] of Object.entries(status.dependencies)) {
                    const isAvailable = !statusInfo.includes('Not available');
                    statusHtml += `
                        <div class="status-item">
                            <code>${dep}</code>
                            <span style="color: ${isAvailable ? 'var(--success-color)' : 'var(--accent-color)'}">
                                ${isAvailable ? '✓ Available' : '❌ Not Available'}
                            </span>
                        </div>
                    `;
                }
            }

            if (status.note) {
                statusHtml += `<p><em>${status.note}</em></p>`;
            }

            statusHtml += '</div>';
            systemStatus.innerHTML = statusHtml;
        } catch (error) {
            console.error('Failed to load system status:', error);
            systemStatus.innerHTML = `
                <div class="status-info">
                    <p style="color: var(--accent-color);">❌ Failed to load system status</p>
                </div>
            `;
        }
    }
});