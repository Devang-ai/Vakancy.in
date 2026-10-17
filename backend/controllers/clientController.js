const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const getClients = async (req, res) => {
  try {
    const clients = await db.query('SELECT * FROM CLIENT ORDER BY name ASC');
    res.json({ success: true, count: clients.length, clients });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching clients.', error: error.message });
  }
};

const createClient = async (req, res) => {
  try {
    const { name, industry, contact_info } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Client name is required.' });

    const id = uuidv4();
    await db.query(
      'INSERT INTO CLIENT (id, name, industry, contact_info) VALUES (?, ?, ?, ?)',
      [id, name, industry || null, contact_info || null]
    );

    res.status(201).json({ success: true, message: 'Client created successfully.', client_id: id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating client.', error: error.message });
  }
};

const updateClient = async (req, res) => {
  try {
    const { name, industry, contact_info } = req.body;
    await db.query(
      'UPDATE CLIENT SET name = ?, industry = ?, contact_info = ? WHERE id = ?',
      [name, industry, contact_info, req.params.id]
    );
    res.json({ success: true, message: 'Client updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating client.', error: error.message });
  }
};

const deleteClient = async (req, res) => {
  try {
    await db.query('DELETE FROM CLIENT WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Client deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting client.', error: error.message });
  }
};

module.exports = {
  getClients,
  createClient,
  updateClient,
  deleteClient
};
