const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());

// Az IPTV lista forrása
const TARGET_URL = "http://moteltv.sooyya.xyz:8080/get.php?username=proba1&password=y85DbAqU&type=m3u_plus&output=ts";

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// LISTA LEKÉRÉSE EXTRA PROXY-VAL
app.get('/list.m3u', async (req, res) => {
    console.log("Stealth lista kérés indítása...");
    
    // Egy külső API-t használunk, hogy ne a Render IP-je látszódjon
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(TARGET_URL)}`;

    try {
        const response = await axios.get(proxyUrl, { timeout: 20000 });
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const myDomain = `${protocol}://${req.get('host')}`;
        
        const lines = response.data.split('\n');
        const modifiedLines = lines.map(line => {
            if (line.trim().startsWith('http')) {
                // A videó streamet is ezen a szerveren keresztül küldjük
                return `${myDomain}/proxy?url=${encodeURIComponent(line.trim())}`;
            }
            return line;
        });

        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.send(modifiedLines.join('\n'));
        console.log("Siker! A lista átment.");
    } catch (error) {
        console.error("MÉG MINDIG BLOKKOLVA:", error.message);
        res.status(500).send("A szolgáltató minden kaput bezárt a Render előtt.");
    }
});

// VIDEÓ PROXY
app.get('/proxy', async (req, res) => {
    const streamUrl = req.query.url;
    try {
        const response = await axios({
            method: 'get',
            url: streamUrl,
            responseType: 'stream',
            headers: { 
                'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18', // VLC-nek álcázzuk magunkat
                'Icy-MetaData': '1'
            }
        });
        res.setHeader('Content-Type', 'video/mp2t');
        response.data.pipe(res);
    } catch (e) {
        res.status(500).send("Stream hiba");
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Stealth szerver fut a ${PORT} porton`));
