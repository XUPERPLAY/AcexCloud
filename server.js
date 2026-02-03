const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Sirve archivos estáticos desde la RAÍZ (donde está index.html)
app.use(express.static(__dirname));

// Ruta raíz explícita
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', mode: 'webtorrent' });
});

// Proxy para lista M3U
app.get('/api/m3u', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('https://ipfs.io/ipns/k2k4r8oqlcjxsritt5mczkcn4mmvcmymbqw7113fz2flkrerfwfps004/data/listas/lista_iptv.m3u');
        const text = await response.text();
        res.type('text/plain').send(text);
    } catch (e) {
        res.status(500).json({ error: 'No se pudo cargar' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server on port ${PORT}`);
});
