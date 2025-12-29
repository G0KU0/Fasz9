const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());

// Ez a végpont tölti le és alakítja át az M3U listát
app.get('/playlist', async (req, res) => {
    const m3uUrl = "http://moteltv.sooyya.xyz:8080/get.php?username=proba1&password=y85DbAqU&type=m3u_plus&output=ts";
    try {
        const response = await axios.get(m3uUrl);
        // Itt nem módosítjuk a linkeket, a frontend fogja a proxy-n keresztül hívni őket
        res.send(response.data);
    } catch (error) {
        res.status(500).send("Hiba a lista letöltésekor");
    }
});

// Ez a végpont közvetíti a konkrét videó adást (Proxy)
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
        res.status(500).send("Stream hiba");
    }
});

app.listen(3000, () => console.log("Szerver fut: http://localhost:3000"));
