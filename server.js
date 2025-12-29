const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());

// Az eredeti IPTV linked
const ORIGINAL_M3U_URL = "http://moteltv.sooyya.xyz:8080/get.php?username=proba1&password=y85DbAqU&type=m3u_plus&output=ts";

// 1. Főoldal: Kiszolgálja a webes lejátszót
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. /list.m3u: Ezt kell beírni az IPTV Pro-ba!
app.get('/list.m3u', async (req, res) => {
    const myDomain = req.protocol + '://' + req.get('host');
    try {
        const response = await axios.get(ORIGINAL_M3U_URL);
        const lines = response.data.split('\n');
        
        // Átírjuk a linkeket a saját proxynkra
        const modifiedLines = lines.map(line => {
            if (line.trim().startsWith('http')) {
                return `${myDomain}/proxy?url=${encodeURIComponent(line.trim())}`;
            }
            return line;
        });

        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.send(modifiedLines.join('\n'));
    } catch (error) {
        res.status(500).send("Hiba a lista letöltésekor.");
    }
});

// 3. /proxy: Ez közvetíti a videót
app.get('/proxy', async (req, res) => {
    const streamUrl = req.query.url;
    if (!streamUrl) return res.status(400).send("Nincs URL megadva");

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
        res.status(500).send("Stream hiba: " + e.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Szerver fut a ${PORT} porton`));
