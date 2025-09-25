const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.memoryStorage();
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

// Routes
app.get('/', (req, res) => {
    res.render('index', { 
        title: 'Knock - ACSM to DRM-free EPUB Converter',
        message: null 
    });
});

app.post('/convert', upload.single('acsmFile'), (req, res) => {
    try {
        const { adobeEmail, adobePassword } = req.body;
        const acsmFile = req.file;

        // Validate input
        if (!adobeEmail || !adobePassword || !acsmFile) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: Adobe email, password, or ACSM file'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(adobeEmail)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email address format'
            });
        }

        // Simulate the conversion process
        // In a real implementation, this would call the actual knock CLI tools
        setTimeout(() => {
            // This is where you would integrate with the actual knock CLI
            // For now, we'll simulate the process
            res.json({
                success: true,
                message: 'Conversion completed successfully!',
                filename: acsmFile.originalname.replace('.acsm', '.epub'),
                downloadUrl: '/download/' + Date.now() + '.epub'
            });
        }, 100);

    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred during conversion: ' + error.message
        });
    }
});

// Simulated download endpoint
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    
    // In a real implementation, this would serve the actual converted EPUB file
    // For now, we'll create a demo response
    const demoContent = `This is a demonstration EPUB file created by the Knock web interface.

In a real implementation, this would be your DRM-free EPUB file converted from the ACSM file.

To use Knock properly, you need to:
1. Install the CLI tool on a Linux system with the required dependencies
2. Run: knock your-file.acsm
3. Follow the prompts for Adobe credentials

Visit: https://github.com/BentonEdmondson/knock for more information.
`;
    
    res.setHeader('Content-Type', 'application/epub+zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(demoContent);
});

// API endpoint for checking system status
app.get('/api/status', (req, res) => {
    res.json({
        status: 'ok',
        version: '1.0.0',
        dependencies: {
            'adept-register': 'Not available (simulation mode)',
            'adept-download': 'Not available (simulation mode)',
            'inept-epub': 'Not available (simulation mode)'
        },
        note: 'This is a demonstration web interface. Real conversion requires CLI installation.'
    });
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