const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());

// Ez a rész generálja az IPTV Pro számára a "módosított" listát
app.get('/list.m3u', async (req, res) => {
    const m3uUrl = "http://moteltv.sooyya.xyz:8080/get.php?username=proba1&password=y85DbAqU&type=m3u_plus&output=ts";
    const myDomain = req.protocol + '://' + req.get('host'); // Megtudja a saját Render-es címedet

    try {
        const response = await axios.get(m3uUrl);
        let m3uContent = response.data;

        // Minden http linket kicserélünk a mi proxy-s linkünkre
        // Eredeti: http://szerver.com/valami.ts
        // Új: https://fasz9.onrender.com/proxy?url=http://szerver.com/valami.ts
        const lines = m3uContent.split('\n');
        const modifiedLines = lines.map(line => {
            if (line.startsWith('http')) {
                return `${myDomain}/proxy?url=${encodeURIComponent(line.trim())}`;
            }
            return line;
        });

        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.send(modifiedLines.join('\n'));
    } catch (error) {
        res.status(500).send("Hiba a lista generálásakor.");
    }
});

// A videó közvetítő (Proxy) változatlan marad
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
        res.setHeader('Content-Type', 'video/mp2t');
        response.data.pipe(res);
    } catch (e) {
        res.status(500).send("Stream hiba");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Szerver fut a ${PORT} porton`));
