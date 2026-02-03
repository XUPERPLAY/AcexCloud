const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        mode: 'webtorrent',
        message: 'Servidor listo - WebTorrent corre en el cliente'
    });
});

// Proxy para lista M3U (evita CORS)
app.get('/api/m3u', async (req, res) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('https://ipfs.io/ipns/k2k4r8oqlcjxsritt5mczkcn4mmvcmymbqw7113fz2flkrerfwfps004/data/listas/lista_iptv.m3u');
        const text = await response.text();
        res.type('text/plain').send(text);
    } catch (e) {
        res.status(500).json({ error: 'No se pudo cargar la lista' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor WebTorrent listo en puerto ${PORT}`);
});
