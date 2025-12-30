const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());

const TARGET_URL = "http://moteltv.sooyya.xyz:8080/get.php?username=proba1&password=y85DbAqU&type=m3u_plus&output=ts";

// A FŐOLDAL marad a webes lejátszó (https://fasz9.onrender.com)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// A LISTA (https://fasz9.onrender.com/list.m3u)
app.get('/list.m3u', async (req, res) => {
    console.log("M3U fájl generálása indítása...");
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(TARGET_URL)}`;

    try {
        const response = await axios.get(proxyUrl, { timeout: 20000 });
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const myDomain = `${protocol}://${req.get('host')}`;
        
        const lines = response.data.split('\n');
        const modifiedLines = lines.map(line => {
            if (line.trim().startsWith('http')) {
                return `${myDomain}/proxy?url=${encodeURIComponent(line.trim())}`;
            }
            return line;
        });

        const finalM3U = modifiedLines.join('\n');

        // KÉNYSZERÍTETT LETÖLTÉS BEÁLLÍTÁSAI
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.setHeader('Content-Disposition', 'attachment; filename="playlist.m3u"'); // Ettől lesz letölthető fájl
        res.send(finalM3U);
        
        console.log("Siker: A fájl kiküldve letöltésre.");
    } catch (error) {
        console.error("HIBA:", error.message);
        res.status(500).send("A szerver nem tudta elkészíteni a fájlt (459-es tiltás miatt).");
    }
});

app.get('/proxy', async (req, res) => {
    const streamUrl = req.query.url;
    try {
        const response = await axios({
            method: 'get',
            url: streamUrl,
            responseType: 'stream',
            headers: { 'User-Agent': 'VLC/3.0.18' }
        });
        res.setHeader('Content-Type', 'video/mp2t');
        response.data.pipe(res);
    } catch (e) {
        res.status(500).send("Stream hiba");
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Szerver fut a ${PORT} porton`));
