const express = require('express');
const path = require('path');
const cors = require('cors');
const net = require('net');
const fs = require('fs');
const PlaybookParser = require('./lib/playbook-parser');

const app = express();
const PORT = process.env.PORT || 8080;
const isDev = process.env.NODE_ENV !== 'production';
const liveReloadPort = Number(process.env.LIVERELOAD_PORT) || 35730;

// Playbook parsing
const playbookPath = path.join(__dirname, 'Orchards Program Execution Playbook.txt');
let playbookCache = null;
let playbookLastModified = null;

// In-memory store for comments (for prototype)
let commentsStore = [];

// Helper function to check if a port is available
function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, () => {
            server.once('close', () => resolve(true));
            server.close();
        });
        server.on('error', () => resolve(false));
    });
}

// Helper function to find an available port starting from a given port
async function findAvailablePort(startPort, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
        const port = startPort + i;
        const available = await isPortAvailable(port);
        if (available) {
            return port;
        }
    }
    return null;
}

// Enable CORS for all routes
app.use(cors());
app.use(express.json()); // Ensure JSON parsing for POST requests

// Parse playbook function
function parsePlaybook() {
  try {
    const stats = fs.statSync(playbookPath);
    const currentModified = stats.mtime.getTime();
    
    // Only re-parse if file has changed
    if (playbookCache && currentModified === playbookLastModified) {
      return playbookCache;
    }

    console.log('📖 Parsing playbook text file...');
    const parser = new PlaybookParser(playbookPath);
    const parsed = parser.parse();
    const html = parser.toHTML(parsed);
    
    playbookCache = {
      parsed: parsed,
      html: html,
      timestamp: new Date().toISOString()
    };
    playbookLastModified = currentModified;
    
    console.log(`✅ Playbook parsed successfully (${parsed.sections.length} sections, ${parsed.toc.length} TOC items)`);
    return playbookCache;
  } catch (error) {
    console.error('❌ Error parsing playbook:', error);
    return null;
  }
}

// Initial parse
parsePlaybook();

// Watch for file changes in development
if (isDev) {
  try {
    fs.watchFile(playbookPath, { interval: 1000 }, (curr, prev) => {
      if (curr.mtime.getTime() !== prev.mtime.getTime()) {
        console.log('🔄 Playbook file changed, re-parsing...');
        parsePlaybook();
      }
    });
    console.log('👀 Watching playbook file for changes...');
  } catch (error) {
    console.warn('⚠️  Could not set up file watching:', error.message);
  }
}

// API endpoint for playbook content
app.get('/api/playbook', (req, res) => {
  const cached = parsePlaybook();
  if (!cached) {
    return res.status(500).json({ error: 'Failed to parse playbook' });
  }
  res.json({
    html: cached.html,
    sections: cached.parsed.sections.length,
    timestamp: cached.timestamp
  });
});

// API endpoint to save comments/edits
app.post('/api/comments', (req, res) => {
  const { text, prompt, type } = req.body;
  const comment = {
    id: Date.now().toString(),
    text,
    prompt,
    type: type || 'edit_request',
    status: 'pending',
    timestamp: new Date().toISOString()
  };
  
  commentsStore.push(comment);
  console.log('📝 New comment received:', comment);
  
  res.json({ status: 'saved', comment });
});

// API endpoint to get comments
app.get('/api/comments', (req, res) => {
  res.json(commentsStore);
});

// Inject live-reload script and watcher in development
if (isDev) {
    (async () => {
        const livereload = require('livereload');
        const connectLivereload = require('connect-livereload');

        // Check if port is available before creating server
        const portAvailable = await isPortAvailable(liveReloadPort);
        
        if (!portAvailable) {
            console.warn(`🔥 LiveReload port ${liveReloadPort} already in use. Skipping livereload.`);
            console.warn(`   You can kill the existing process or set LIVERELOAD_PORT to use a different port.`);
            return;
        }

        try {
            const liveReloadServer = livereload.createServer({
                exts: ['html', 'css', 'js', 'png', 'jpg', 'jpeg', 'svg'],
                port: liveReloadPort,
                delay: 100,
                debug: false
            });

            // Attach error handler to catch any unexpected errors
            liveReloadServer.server.on('error', (err) => {
                if (err && err.code === 'EADDRINUSE') {
                    console.warn(`🔥 LiveReload port ${liveReloadPort} became unavailable. Disabling livereload.`);
                } else {
                    console.error('LiveReload error:', err);
                }
            });

            liveReloadServer.server.on('listening', () => {
                // Watch the Document Preview directory and root for any changes
                liveReloadServer.watch([
                    path.join(__dirname, 'Document Preview'),
                    path.join(__dirname, 'server.js')
                ]);
                console.log(`🔄 LiveReload enabled on port ${liveReloadPort}`);
                console.log(`   Watching: Document Preview/ and server.js`);
                console.log(`   Open http://localhost:${PORT} in your browser to see changes automatically`);
            });

            // Log when files change
            liveReloadServer.server.on('reload', (files) => {
                console.log(`🔄 Reloading browser for: ${files.join(', ')}`);
            });

            // Inject live reload script into HTML responses
            app.use(connectLivereload({ 
                port: liveReloadPort,
                ignore: ['.js', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico']
            }));
        } catch (err) {
            console.error('Failed to start LiveReload:', err);
        }
    })();
}

// Serve static files from Document Preview directory
app.use(express.static(path.join(__dirname, 'Document Preview')));

// Serve the main HTML file with dynamic content
app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, 'Document Preview', 'playbook-preview.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    
    // In development, inject playbook content directly for faster initial load
    if (isDev && playbookCache) {
      // Find the content container and replace marker with parsed content
      const contentMarker = '<!-- DYNAMIC_CONTENT -->';
      if (htmlContent.includes(contentMarker)) {
        // Replace marker and everything after it (until closing container div) with content
        htmlContent = htmlContent.replace(
          /<!-- DYNAMIC_CONTENT -->[\s\S]*?<\/div>\s*<script>/,
          contentMarker + '\n' + playbookCache.html + '\n    </div>\n\n    <script>'
        );
      }
    }
    
    res.send(htmlContent);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error logging endpoint
app.post('/api/log-error', express.json(), (req, res) => {
    console.error('Client Error:', req.body);
    res.json({ status: 'logged' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server with port availability check
(async () => {
    let actualPort = PORT;
    
    // Check if the requested port is available
    const portAvailable = await isPortAvailable(PORT);
    
    if (!portAvailable) {
        // In development, try to find an available port automatically
        if (isDev) {
            console.warn(`⚠️  Port ${PORT} is already in use. Looking for an available port...`);
            const availablePort = await findAvailablePort(PORT);
            if (availablePort) {
                actualPort = availablePort;
                console.log(`✅ Found available port: ${actualPort}`);
            } else {
                console.error(`❌ Could not find an available port starting from ${PORT}`);
                console.error(`   Please kill the process using port ${PORT} or set PORT environment variable.`);
                process.exit(1);
            }
        } else {
            // In production, fail fast
            console.error(`❌ Port ${PORT} is already in use.`);
            console.error(`   Please either:`);
            console.error(`   1. Kill the process using port ${PORT}`);
            console.error(`   2. Set PORT environment variable to use a different port`);
            process.exit(1);
        }
    }
    
    const server = app.listen(actualPort, () => {
        console.log(`🚀 Orchards Program Playbook Server running on http://localhost:${actualPort}`);
        console.log(`📄 Preview: http://localhost:${actualPort}`);
        console.log(`💚 Health check: http://localhost:${actualPort}/health`);
    });
    
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${actualPort} became unavailable.`);
            process.exit(1);
        } else {
            console.error('Server error:', err);
            process.exit(1);
        }
    });
})();
