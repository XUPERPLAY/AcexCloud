const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Sirve archivos estáticos desde la raíz
app.use(express.static(__dirname));

// Ruta raíz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', mode: 'webtorrent' });
});

// Proxy para lista M3U con mejor manejo de errores
app.get('/api/m3u', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        
        // URL de la lista M3U
        const M3U_URL = 'https://ipfs.io/ipns/k51qzi5uqu5dh5qej4b9wlcr5i6vhc7rcfkekhrxqek5c9lk6gdaiik820fecs/hashes_acestream.m3u';
        
        const response = await fetch(M3U_URL, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        
        // Verificar que no esté vacío
        if (!text || text.trim().length === 0) {
            throw new Error('Lista M3U vacía');
        }
        
        res.type('text/plain').send(text);
        
    } catch (error) {
        console.error('Error cargando M3U:', error);
        res.status(500).json({ 
            error: 'No se pudo cargar la lista',
            details: error.message 
        });
    }
});

// Proxy genérico para cualquier M3U (opcional)
app.get('/api/proxy', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'URL requerida' });
    }
    
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(url, { timeout: 30000 });
        const text = await response.text();
        res.type('text/plain').send(text);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server on port ${PORT}`);
});
