const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());

// A te konkrét forrásod
const TARGET_URL = "http://moteltv.sooyya.xyz:8080/get.php?username=proba1&password=y85DbAqU&type=m3u_plus&output=ts";

// 1. Főoldal (Webes lejátszó marad, ha böngészőben nyitod meg a főcímet)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. A LISTA LETÖLTÉSE (https://fasz9.onrender.com/list.m3u)
app.get('/list.m3u', async (req, res) => {
    console.log("Indítás: Lista letöltése a szolgáltatótól...");
    
    try {
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const myDomain = `${protocol}://${req.get('host')}`;
        
        const response = await axios.get(TARGET_URL, { 
            timeout: 15000,
            headers: {
                // Ezzel próbáljuk kikerülni a 459-es blokkolást
                'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
                'Accept': '*/*'
            }
        });

        // Átalakítjuk a linkeket a saját proxynkra
        const lines = response.data.split('\n');
        const modifiedLines = lines.map(line => {
            if (line.trim().startsWith('http')) {
                return `${myDomain}/proxy?url=${encodeURIComponent(line.trim())}`;
            }
            return line;
        });

        const finalM3U = modifiedLines.join('\n');

        // FEJLÉCEK A LETÖLTÉSHEZ
        res.setHeader('Content-Type', 'audio/x-mpegurl'); // Jelzi, hogy ez egy M3U lista
        res.setHeader('Content-Disposition', 'attachment; filename="playlist.m3u"'); // Kényszeríti a letöltést
        
        res.send(finalM3U);
        console.log("Siker! A lista elkészült és letölthető.");

    } catch (error) {
        console.error("HIBA A LETÖLTÉSNÉL:", error.message);
        res.status(500).send("A szolgáltató blokkolja a szervert (459-es hiba). Próbáld meg később.");
    }
});

// 3. VIDEÓ KÖZVETÍTŐ (PROXY)
app.get('/proxy', async (req, res) => {
    const streamUrl = req.query.url;
    if (!streamUrl) return res.status(400).send("Nincs URL");

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
app.listen(PORT, () => console.log(`Szerver fut: ${PORT}`));
