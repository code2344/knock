# Knock Web Interface

A Node.js Express web application for the Knock ACSM to DRM-free EPUB converter.

## Features

- **Web-based Interface**: User-friendly web interface for ACSM conversion
- **File Upload**: Secure file upload with validation
- **Form Validation**: Client and server-side validation
- **Progress Tracking**: Real-time conversion progress indicators
- **Responsive Design**: Works on desktop and mobile devices
- **Educational Content**: CLI installation instructions and legal information

## Deployment

This application is designed to be deployed on [Render](https://render.com/) or similar Node.js hosting platforms.

### Environment Variables

- `PORT`: Server port (automatically set by Render)

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Visit `http://localhost:3000`

### Production Deployment

1. Push to your Git repository
2. Connect to Render
3. Deploy as a Web Service
4. Set build command: `npm install`
5. Set start command: `npm start`

## Technical Implementation

### Server (Express.js)
- File upload handling with Multer
- Form validation and sanitization
- API endpoints for conversion and status
- EJS templating engine
- Static file serving

### Client (JavaScript)
- Progressive enhancement
- Form validation
- File upload with progress
- AJAX form submission
- Responsive design

### Security Features
- File type validation (ACSM only)
- File size limits (1MB)
- Input sanitization
- Error handling

## Note

This web interface demonstrates the Knock conversion process. For actual ACSM conversion, the server would need to have the Knock CLI tools and their dependencies installed:

- `adept-register` - Adobe device registration
- `adept-download` - ACSM download from Adobe
- `inept-epub` - EPUB decryption

## Legal

This software is licensed under GPLv3. See the main repository for full legal disclaimers and terms of use.