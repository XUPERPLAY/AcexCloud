const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ACESTREAM_AVAILABLE = process.env.ACESTREAM_AVAILABLE === 'true';
const ACESTREAM_HOST = '127.0.0.1';
const ACESTREAM_PORT = 6878;

// Middleware logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Health check
app.get('/health', async (req, res) => {
    let aceStatus = false;
    
    if (ACESTREAM_AVAILABLE) {
        try {
            await axios.get(`http://${ACESTREAM_HOST}:${ACESTREAM_PORT}/webui/api/service?method=get_version`, { timeout: 2000 });
            aceStatus = true;
        } catch (e) {
            aceStatus = false;
        }
    }
    
    res.json({
        status: 'healthy',
        acestream_available: ACESTREAM_AVAILABLE,
        acestream_running: aceStatus,
        mode: aceStatus ? 'full' : 'proxy-only',
        uptime: process.uptime()
    });
});

// Endpoint principal - si AceStream no está disponible, redirige a servicio externo
app.get('/ace/getstream', async (req, res) => {
    const { id, format = 'hls' } = req.query;
    
    if (!id) {
        return res.status(400).json({ error: 'ID requerido' });
    }

    // Si AceStream local está disponible, usarlo
    if (ACESTREAM_AVAILABLE) {
        try {
            const response = await axios.get(
                `http://${ACESTREAM_HOST}:${ACESTREAM_PORT}/ace/getstream?id=${id}&format=${format}`,
                { timeout: 30000 }
            );
            
            if (response.data && response.data.response) {
                return res.json({
                    success: true,
                    stream_url: response.data.response,
                    playback_url: response.data.response,
                    id: id,
                    source: 'local'
                });
            }
        } catch (error) {
            console.log('AceStream local falló, intentando alternativas...');
        }
    }

    // Alternativa: Usar proxy público (si existe)
    // Opción 1: Intentar con acestream.me o similar
    const publicProxies = [
        `https://acestream.me/proxy?id=${id}&format=${format}`,
        `https://api.allorigins.win/raw?url=http://127.0.0.1:6878/ace/getstream?id=${id}`
    ];

    // Por ahora, devolver error informativo
    res.status(503).json({
        error: 'AceStream Engine no disponible en este servidor',
        message: 'El servidor no tiene capacidad P2P activa. Opciones:',
        options: [
            '1. Usa tu propio AceStream local (instala acestream-engine)',
            '2. Usa un VPS propio donde sí funcione AceStream',
            '3. Espera a que reiniciemos el servicio'
        ],
        id: id
    });
});

// Proxy HLS (solo si AceStream está disponible)
app.get('/ace/hls/:id/playlist.m3u8', async (req, res) => {
    if (!ACESTREAM_AVAILABLE) {
        return res.status(503).send('#EXTM3U\n#EXT-X-ERROR: AceStream no disponible');
    }
    
    try {
        const response = await axios.get(
            `http://${ACESTREAM_HOST}:${ACESTREAM_PORT}/ace/manifest.m3u8?id=${req.params.id}&format=hls`,
            { responseType: 'stream', timeout: 10000 }
        );
        
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        response.data.pipe(res);
    } catch (error) {
        res.status(500).send('#EXTM3U\n#EXT-X-ERROR: Stream no disponible');
    }
});

// Info
app.get('/api/info', (req, res) => {
    res.json({
        name: 'AceStream Cloud Proxy',
        version: '1.0.0',
        acestream_available: ACESTREAM_AVAILABLE,
        endpoints: {
            health: '/health',
            stream: '/ace/getstream?id=ID'
        }
    });
});

// Página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📺 AceStream disponible: ${ACESTREAM_AVAILABLE}`);
});
