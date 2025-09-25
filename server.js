const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Create necessary directories
const uploadsDir = path.join(__dirname, 'uploads');
const tempDir = path.join(__dirname, 'temp');
const adobeDir = path.join(process.env.HOME || '/tmp', '.config', 'knock');

// Ensure directories exist
[uploadsDir, tempDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for file uploads to disk
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.originalname.toLowerCase().endsWith('.acsm')) {
            cb(null, true);
        } else {
            cb(new Error('Only ACSM files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 1024 * 1024 // 1MB limit
    }
});

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Utility functions for CLI operations
function checkCommandExists(command) {
    return new Promise((resolve) => {
        exec(`which ${command}`, (error) => {
            resolve(!error);
        });
    });
}

function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        console.log(`Running: ${command} ${args.join(' ')}`);
        
        const process = spawn(command, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            ...options
        });
        
        let stdout = '';
        let stderr = '';
        
        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        process.on('close', (code) => {
            console.log(`Command exited with code ${code}`);
            console.log(`STDOUT: ${stdout}`);
            console.log(`STDERR: ${stderr}`);
            
            resolve({
                code,
                stdout,
                stderr
            });
        });
        
        process.on('error', (error) => {
            console.error(`Command error: ${error.message}`);
            reject(error);
        });
        
        // Handle input if provided
        if (options.input) {
            process.stdin.write(options.input);
            process.stdin.end();
        }
    });
}

async function registerDevice(email, password, adobeDir) {
    // Ensure adobe directory exists
    if (!fs.existsSync(adobeDir)) {
        fs.mkdirSync(adobeDir, { recursive: true });
    }
    
    try {
        const result = await runCommand('adept-register', [
            '-u', email,
            '-O', adobeDir
        ], { input: password });
        
        if (result.stdout.includes('Exception code : 0x1003')) {
            // Clean up on incorrect password
            if (fs.existsSync(adobeDir)) {
                fs.rmSync(adobeDir, { recursive: true, force: true });
            }
            throw new Error('Incorrect Adobe password');
        }
        
        if (result.stdout.includes('Exception code : 0x500a')) {
            // Clean up on network error
            if (fs.existsSync(adobeDir)) {
                fs.rmSync(adobeDir, { recursive: true, force: true });
            }
            throw new Error('No internet access');
        }
        
        if (result.code !== 0 || result.stdout.includes('Exception code :')) {
            if (fs.existsSync(adobeDir)) {
                fs.rmSync(adobeDir, { recursive: true, force: true });
            }
            throw new Error(`Device registration failed: ${result.stderr || result.stdout}`);
        }
        
        return result;
    } catch (error) {
        if (fs.existsSync(adobeDir)) {
            fs.rmSync(adobeDir, { recursive: true, force: true });
        }
        throw error;
    }
}

async function downloadEpub(acsmFilePath, drmFilePath, adobeDir) {
    const result = await runCommand('adept-download', [
        '-d', path.join(adobeDir, 'device.xml'),
        '-a', path.join(adobeDir, 'activation.xml'),
        '-k', path.join(adobeDir, 'devicesalt'),
        '-o', drmFilePath,
        '-f', acsmFilePath
    ]);
    
    if (result.stdout.includes('Exception code : 0x500a')) {
        throw new Error('No internet access');
    }
    
    if (result.code !== 0 || !fs.existsSync(drmFilePath)) {
        throw new Error(`EPUB download failed: ${result.stderr || result.stdout}`);
    }
    
    return result;
}

async function decryptEpub(drmFilePath, epubFilePath, adobeDir) {
    const result = await runCommand('inept-epub', [
        path.join(adobeDir, 'activation.xml'),
        drmFilePath,
        epubFilePath
    ]);
    
    if (result.code !== 0 || !fs.existsSync(epubFilePath)) {
        throw new Error(`EPUB decryption failed: ${result.stderr || result.stdout}`);
    }
    
    return result;
}

async function convertAcsmToEpub(acsmFilePath, adobeEmail, adobePassword, sessionId) {
    const baseName = path.basename(acsmFilePath, '.acsm');
    const drmFilePath = path.join(tempDir, `${sessionId}-${baseName}.drm`);
    const epubFilePath = path.join(tempDir, `${sessionId}-${baseName}.epub`);
    const sessionAdobeDir = path.join(tempDir, `adobe-${sessionId}`);
    
    try {
        // Step 1: Register device (if not already registered)
        console.log('Registering device with Adobe...');
        await registerDevice(adobeEmail, adobePassword, sessionAdobeDir);
        
        // Step 2: Download encrypted EPUB
        console.log('Downloading encrypted EPUB from Adobe...');
        await downloadEpub(acsmFilePath, drmFilePath, sessionAdobeDir);
        
        // Step 3: Decrypt EPUB
        console.log('Decrypting EPUB file...');
        await decryptEpub(drmFilePath, epubFilePath, sessionAdobeDir);
        
        // Clean up intermediate files
        if (fs.existsSync(drmFilePath)) {
            fs.unlinkSync(drmFilePath);
        }
        if (fs.existsSync(sessionAdobeDir)) {
            fs.rmSync(sessionAdobeDir, { recursive: true, force: true });
        }
        
        return epubFilePath;
    } catch (error) {
        // Clean up on error
        [drmFilePath, epubFilePath].forEach(file => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        });
        if (fs.existsSync(sessionAdobeDir)) {
            fs.rmSync(sessionAdobeDir, { recursive: true, force: true });
        }
        throw error;
    }
}

// Routes
app.get('/', (req, res) => {
    res.render('index', { 
        title: 'Knock - ACSM to DRM-free EPUB Converter',
        message: null 
    });
});

app.post('/convert', upload.single('acsmFile'), async (req, res) => {
    try {
        const { adobeEmail, adobePassword } = req.body;
        const acsmFile = req.file;

        // Validate input
        if (!adobeEmail || !adobePassword || !acsmFile) {
            // Clean up uploaded file
            if (acsmFile && acsmFile.path) {
                fs.unlinkSync(acsmFile.path);
            }
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: Adobe email, password, or ACSM file'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(adobeEmail)) {
            // Clean up uploaded file
            if (acsmFile.path) {
                fs.unlinkSync(acsmFile.path);
            }
            return res.status(400).json({
                success: false,
                error: 'Invalid email address format'
            });
        }

        // Generate session ID for this conversion
        const sessionId = crypto.randomBytes(8).toString('hex');
        
        try {
            // Perform actual conversion
            console.log(`Starting conversion for session ${sessionId}`);
            const epubFilePath = await convertAcsmToEpub(acsmFile.path, adobeEmail, adobePassword, sessionId);
            
            // Generate download filename
            const originalName = path.basename(acsmFile.originalname, '.acsm');
            const downloadFilename = `${originalName}.epub`;
            
            // Clean up original ACSM file
            if (fs.existsSync(acsmFile.path)) {
                fs.unlinkSync(acsmFile.path);
            }
            
            res.json({
                success: true,
                message: 'Conversion completed successfully!',
                filename: downloadFilename,
                downloadUrl: `/download/${path.basename(epubFilePath)}`
            });
            
        } catch (conversionError) {
            // Clean up uploaded file on conversion error
            if (fs.existsSync(acsmFile.path)) {
                fs.unlinkSync(acsmFile.path);
            }
            
            console.error('Conversion failed:', conversionError.message);
            res.status(500).json({
                success: false,
                error: conversionError.message
            });
        }

    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred during conversion: ' + error.message
        });
    }
});

// Download endpoint for converted EPUB files
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(tempDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            success: false,
            error: 'File not found or has expired'
        });
    }
    
    // Set appropriate headers for EPUB download
    res.setHeader('Content-Type', 'application/epub+zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream the file to the client
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Clean up the file after sending (optional - you might want to keep files for some time)
    fileStream.on('end', () => {
        // Optionally delete file after 1 hour to save disk space
        setTimeout(() => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Cleaned up temporary file: ${filename}`);
            }
        }, 60 * 60 * 1000); // 1 hour
    });
    
    fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        res.status(500).json({
            success: false,
            error: 'Error reading file'
        });
    });
});

// API endpoint for checking system status
app.get('/api/status', async (req, res) => {
    try {
        const dependencies = {};
        const commands = ['adept-register', 'adept-download', 'inept-epub'];
        
        for (const cmd of commands) {
            const exists = await checkCommandExists(cmd);
            dependencies[cmd] = exists ? 'Available' : 'Not available';
        }
        
        const allAvailable = Object.values(dependencies).every(status => status === 'Available');
        
        res.json({
            status: 'ok',
            version: '1.0.0',
            dependencies,
            functional: allAvailable,
            note: allAvailable 
                ? 'All dependencies available. Full conversion functionality enabled.' 
                : 'Some dependencies missing. Install libgourou-utils and inept-epub for full functionality.'
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.json({
            status: 'error',
            version: '1.0.0',
            dependencies: {
                'adept-register': 'Check failed',
                'adept-download': 'Check failed',
                'inept-epub': 'Check failed'
            },
            functional: false,
            note: 'Unable to check system dependencies.'
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 1MB.'
            });
        }
    }
    
    console.error(error);
    res.status(500).json({
        success: false,
        error: 'An unexpected error occurred.'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('404', { title: '404 - Page Not Found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Knock web interface running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});

module.exports = app;