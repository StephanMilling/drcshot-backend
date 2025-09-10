
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const uri = process.env.MONGODB_URI;
const SECRET = process.env.JWT_SECRET || 'change_this';
let cachedClient = null;
async function getClient(){ if(cachedClient) return cachedClient; const client=new MongoClient(uri); await client.connect(); cachedClient=client; return client; }

function authorize(req){
  const auth = req.headers.authorization;
  if(!auth) return false;
  const token = auth.split(' ')[1];
  try{ jwt.verify(token, SECRET); return true }catch(e){ return false }
}

module.exports = async (req,res) => {
  const client = await getClient();
  const col = client.db().collection('applications');
  if(req.method === 'GET'){
    if(!authorize(req)) return res.status(403).json({error:'unauthorized'});
    const docs = await col.find().sort({createdAt:-1}).toArray();
    return res.json(docs);
  }
  if(req.method === 'PATCH'){
    if(!authorize(req)) return res.status(403).json({error:'unauthorized'});
    const { id } = req.query;
    const { status } = req.body || {};
    if(!id || !status) return res.status(400).json({error:'missing'});
    await col.updateOne({_id: new ObjectId(id)}, {$set:{status}});
    return res.json({ok:true});
  }
  res.status(405).end();
};
