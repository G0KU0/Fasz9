const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());

const M3U_URL = "http://moteltv.sooyya.xyz:8080/get.php?username=proba1&password=y85DbAqU&type=m3u_plus&output=ts";

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/list.m3u', async (req, res) => {
    console.log("Lista kérés érkezett, álcázás indítása...");
    try {
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const myDomain = protocol + '://' + req.get('host');
        
        const response = await axios.get(M3U_URL, { 
            timeout: 15000,
            headers: {
                // Álcázzuk magunkat egy népszerű IPTV lejátszónak
                'User-Agent': 'IPTVSmartersPlayer',
                'Accept': '*/*',
                'Connection': 'keep-alive'
            }
        });

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
        // Ha továbbra is 459-et kapunk, kiírjuk a részleteket
        console.error("LISTA HIBA (459 továbbra is fennállhat):", error.message);
        res.status(500).send("A szolgáltató blokkolja a szervert (Error 459).");
    }
});

app.get('/proxy', async (req, res) => {
    const streamUrl = req.query.url;
    if (!streamUrl) return res.status(400).send("Nincs URL");
    try {
        const response = await axios({
            method: 'get',
            url: streamUrl,
            responseType: 'stream',
            headers: { 
                'User-Agent': 'IPTVSmartersPlayer' 
            }
        });
        res.setHeader('Content-Type', 'video/mp2t');
        response.data.pipe(res);
    } catch (e) {
        res.status(500).send("Stream hiba");
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Szerver aktiválva a ${PORT} porton`));
