const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

const ACESTREAM_HOST = '127.0.0.1';
const ACESTREAM_PORT = 6878;
const STREAM_TIMEOUT = 30000;

// Cache de streams activos
const activeStreams = new Map();

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Verificar si AceStream engine está corriendo
async function checkAceStreamStatus() {
    try {
        const response = await axios.get(
            `http://${ACESTREAM_HOST}:${ACESTREAM_PORT}/webui/api/service?method=get_version`,
            { timeout: 5000 }
        );
        return response.data && response.data.result;
    } catch (error) {
        return false;
    }
}

// Iniciar stream en AceStream
async function startStream(id, format, quality) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axios.get(
                `http://${ACESTREAM_HOST}:${ACESTREAM_PORT}/ace/getstream?id=${id}&format=${format}&quality=${quality}`,
                { timeout: STREAM_TIMEOUT }
            );

            if (response.data && response.data.response) {
                const streamUrl = response.data.response;
                
                // Construir URL pública
                const publicUrl = process.env.RENDER_EXTERNAL_URL || 
                                process.env.RAILWAY_STATIC_URL || 
                                `http://localhost:${process.env.PORT || 3000}`;
                
                resolve({
                    url: streamUrl,
                    playbackUrl: `${publicUrl}/ace/hls/${id}/playlist.m3u8`,
                    rawUrl: streamUrl
                });
            } else {
                reject(new Error('Respuesta inválida de AceStream'));
            }
        } catch (error) {
            reject(error);
        }
    });
}

// Endpoint principal para obtener stream
app.get('/ace/getstream', async (req, res) => {
    const { id, format = 'hls', quality = 'auto' } = req.query;
    
    if (!id) {
        return res.status(400).json({ error: 'ID de AceStream requerido' });
    }

    if (!/^[a-f0-9]{40}$/i.test(id)) {
        return res.status(400).json({ error: 'ID de AceStream inválido' });
    }

    try {
        console.log(`Solicitando stream para ID: ${id}`);
        
        const engineStatus = await checkAceStreamStatus();
        if (!engineStatus) {
            throw new Error('AceStream engine no está disponible');
        }

        const streamInfo = await startStream(id, format, quality);
        
        res.json({
            success: true,
            stream_url: streamInfo.url,
            playback_url: streamInfo.playbackUrl,
            raw_url: streamInfo.rawUrl,
            id: id,
            format: format,
            quality: quality,
            status: 'active',
            expires_in: 3600
        });

    } catch (error) {
        console.error('Error al iniciar stream:', error.message);
        res.status(500).json({ 
            error: 'Error al iniciar el stream',
            details: error.message,
            id: id
        });
    }
});

// Proxy HLS para CORS
app.get('/ace/hls/:id/playlist.m3u8', async (req, res) => {
    const { id } = req.params;
    
    try {
        const hlsUrl = `http://${ACESTREAM_HOST}:${ACESTREAM_PORT}/ace/manifest.m3u8?id=${id}&format=hls`;
        
        const response = await axios.get(hlsUrl, {
            responseType: 'stream',
            timeout: 10000,
            headers: {
                'User-Agent': 'AceStream Client'
            }
        });
        
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-cache');
        response.data.pipe(res);
        
    } catch (error) {
        res.status(500).send('#EXTM3U\n#EXT-X-ERROR: Stream no disponible');
    }
});

// Proxy para segmentos HLS (TS)
app.get('/ace/hls/:id/:segment', async (req, res) => {
    const { id, segment } = req.params;
    
    try {
        const segmentUrl = `http://${ACESTREAM_HOST}:${ACESTREAM_PORT}/ace/${segment}?id=${id}`;
        
        const response = await axios.get(segmentUrl, {
            responseType: 'stream',
            timeout: 10000
        });
        
        res.setHeader('Content-Type', 'video/MP2T');
        res.setHeader('Access-Control-Allow-Origin', '*');
        response.data.pipe(res);
        
    } catch (error) {
        res.status(500).end();
    }
});

// Health check
app.get('/health', async (req, res) => {
    const engineStatus = await checkAceStreamStatus();
    res.json({
        status: engineStatus ? 'healthy' : 'degraded',
        acestream_engine: engineStatus ? 'running' : 'stopped',
        active_streams: activeStreams.size,
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

// API Info
app.get('/api/info', (req, res) => {
    res.json({
        name: 'AceStream Cloud Proxy',
        version: '1.0.0',
        endpoints: {
            stream: '/ace/getstream?id=ID&format=hls',
            health: '/health',
            player: '/'
        }
    });
});

// Redirigir raíz al player
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Limpiar streams inactivos
setInterval(() => {
    const now = Date.now();
    for (const [id, stream] of activeStreams.entries()) {
        if (now - stream.lastAccess > 3600000) {
            console.log(`Limpiando stream inactivo: ${id}`);
            activeStreams.delete(id);
        }
    }
}, 60000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AceStream Proxy corriendo en puerto ${PORT}`);
    console.log(`📺 AceStream Engine: ${ACESTREAM_HOST}:${ACESTREAM_PORT}`);
    console.log(`🌐 URL: ${process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + PORT}`);
});
