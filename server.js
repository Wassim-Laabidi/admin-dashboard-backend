const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise'); // Use promise-based API
const app = express();
const port = process.env.PORT || 3005;

const corsOptions = {
    credentials: true,
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-Trigger', 'content-type', 'origin', 'accept'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json()); // No need for body-parser if using Express 4.16.0+

const pool = mysql.createPool({
    host: 'mariadb',
    user: 'pyxisiot',
    password: 'PyxisIot-07',
    database: 'HOMEASSISTANT',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.get('/api/devices', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT d.device_id, d.name, d.type, u.username 
            FROM device_ownership do
            JOIN devices d ON do.device_id = d.device_id
            JOIN users u ON do.user_id = u.user_id;
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

app.get('/api/devices/no-owner', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT d.device_id, d.name, d.type 
            FROM devices d 
            LEFT JOIN device_ownership do ON d.device_id = do.device_id
            WHERE do.user_id IS NULL;
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

app.post('/api/devices', async (req, res) => {
    const { device_id, name, type, state_topic, command_topic, payload_on, payload_off, qos, retain } = req.body;
    try {
        await pool.query(`
            INSERT INTO devices (device_id, name, type, state_topic, command_topic, payload_on, payload_off, qos, retain) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [device_id, name, type, state_topic, command_topic, payload_on, payload_off, qos, retain]);
        res.status(201).send('Device created');
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

app.put('/api/device-ownership', async (req, res) => {
    const { device_id, user_id } = req.body;
    try {
        await pool.query(`
            INSERT INTO device_ownership (device_id, user_id) 
            VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)
        `, [device_id, user_id]);
        res.status(200).send('Device ownership updated');
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

app.delete('/api/devices/:device_id', async (req, res) => {
    const { device_id } = req.params;
    try {
        await pool.query('DELETE FROM devices WHERE device_id = ?', [device_id]);
        res.status(200).send('Device deleted');
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});