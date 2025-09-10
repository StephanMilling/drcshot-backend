
const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');

const uri = process.env.MONGODB_URI; // set in Vercel environment variables
let cachedClient = null;

async function getClient() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  // parse form-data (Vercel provides raw body; for real file uploads use third-party storage)
  // For simplicity: expect JSON body with name,email,age. If using multipart/form-data, implement parsing.
  const data = req.body || {};
  const { name, email, age } = data;
  if (!name || !email || !age) return res.status(400).json({ error: 'Missing fields' });
  try {
    const client = await getClient();
    const col = client.db().collection('applications');
    const doc = { name, email, age: Number(age), status: 'Offen', createdAt: new Date() };
    const r = await col.insertOne(doc);
    // send confirmation mail if configured
    if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      await transporter.sendMail({
        from: `"DrCShot" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Bewerbung empfangen',
        html: `<p>Hallo ${name},<br>vielen Dank für deine Bewerbung.</p>`
      });
    }
    return res.status(201).json({ ok: true, id: r.insertedId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
