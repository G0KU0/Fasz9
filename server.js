const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());

// Az IPTV lista forrása
const M3U_URL = "http://moteltv.sooyya.xyz:8080/get.php?username=proba1&password=y85DbAqU&type=m3u_plus&output=ts";

// Főoldal kiszolgálása
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// A lista végpontja (Ezt keresi az IPTV Pro és a weboldal is)
app.get('/list.m3u', async (req, res) => {
    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const myDomain = `${protocol}://${host}`;

    try {
        const response = await axios.get(M3U_URL, { timeout: 10000 });
        const lines = response.data.split('\n');
        
        const modifiedLines = lines.map(line => {
            if (line.trim().startsWith('http')) {
                return `${myDomain}/proxy?url=${encodeURIComponent(line.trim())}`;
            }
            return line;
        });

        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.send(modifiedLines.join('\n'));
    } catch (error) {
        console.error("Lista hiba:", error.message);
        res.status(500).send("Nem sikerült letölteni az eredeti listát.");
    }
});

// A videó közvetítő (Proxy)
app.get('/proxy', async (req, res) => {
    const streamUrl = req.query.url;
    if (!streamUrl) return res.status(400).send("Nincs URL");

    try {
        const response = await axios({
            method: 'get',
            url: streamUrl,
            responseType: 'stream',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp2t');
        response.data.pipe(res);
    } catch (e) {
        res.status(500).send("Stream hiba");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Szerver elindult a ${PORT} porton`));
