const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const ACESTREAM_HOST = '127.0.0.1';
const ACESTREAM_PORT = 6878;

// Health check
app.get('/health', async (req, res) => {
    try {
        await axios.get(`http://${ACESTREAM_HOST}:${ACESTREAM_PORT}/webui/api/service?method=get_version`, { timeout: 5000 });
        res.json({ status: 'healthy', acestream: 'running' });
    } catch (e) {
        res.json({ status: 'degraded', acestream: 'stopped' });
    }
});

// Endpoint principal - obtiene stream de AceStream
app.get('/ace/getstream', async (req, res) => {
    const { id, format = 'hls' } = req.query;
    
    if (!id) return res.status(400).json({ error: 'ID requerido' });
    
    try {
        // Llamar a AceStream local
        const response = await axios.get(
            `http://${ACESTREAM_HOST}:${ACESTREAM_PORT}/ace/getstream?id=${id}&format=${format}`,
            { timeout: 60000 }
        );
        
        if (response.data && response.data.response) {
            res.json({
                success: true,
                stream_url: response.data.response,
                id: id,
                format: format
            });
        } else {
            throw new Error('Respuesta inválida de AceStream');
        }
    } catch (error) {
        console.error('Error AceStream:', error.message);
        res.status(500).json({ 
            error: 'Error al iniciar stream',
            details: error.message
        });
    }
});

// Proxy HLS
app.get('/ace/manifest.m3u8', async (req, res) => {
    try {
        const response = await axios.get(
            `http://${ACESTREAM_HOST}:${ACESTREAM_PORT}/ace/manifest.m3u8?id=${req.query.id}&format=hls`,
            { responseType: 'stream', timeout: 10000 }
        );
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        response.data.pipe(res);
    } catch (error) {
        res.status(500).send('#EXTM3U\n#EXT-X-ERROR');
    }
});

// Info
app.get('/api/info', (req, res) => {
    res.json({ name: 'AceStream Cloud', version: '1.0.0' });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server on port ${PORT}`);
});
