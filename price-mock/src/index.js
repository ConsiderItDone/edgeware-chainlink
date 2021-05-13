require('dotenv').config();
const express = require('express')
const bodyParser = require('body-parser')

const PORT = process.env.PORT || 3000
const app = express()

const jsonParser = bodyParser.json()

const memory = {
    BTC: Number(process.env.BTC || 50000),
    ETH: Number(process.env.ETH || 1000),
    USDT: 1,
}

app.route('/price:name')
    .get((req, res) => {
        const name = (req.params.name || '').toUpperCase();
        if (!memory[name]) {
            return res.status(404).send(`Not found: ${name}.`)
        }

        res.send({
            value: memory[name],
            ticker: name,
            time: (new Date()).toLocaleString('en-US'),
        })
    })
    .post(jsonParser, (req, res) => {
        const name = (req.params.name || '').toUpperCase();
        if (!name || name.length === 0 || !req.body || !req.body.value) {
            return res.status(400).send(`Can not save price for: ${name}.`)
        }

        memory[name] = Number(req.body.value);

        res.send('OK')
    })

app.listen(PORT, () =>
    console.info(`Server running on port ${PORT}`)
);
