const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

function getEnvVar(key) {
  const match = envFile.match(new RegExp(`${key}=(.+)`));
  return match ? match[1].trim() : '';
}

const mongoUri = getEnvVar('MONGODB_URI');

const WithdrawRequestSchema = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  amount: Number,
  status: String,
  accountDetails: Object,
  adminComment: String,
  processedAt: Date,
}, { timestamps: true });

const WithdrawRequest = mongoose.models.WithdrawRequest || mongoose.model('WithdrawRequest', WithdrawRequestSchema);

async function checkResult() {
  await mongoose.connect(mongoUri);
  const reqs = await WithdrawRequest.find().sort({ updatedAt: -1 }).limit(5);
  console.log('--- DERNIÈRES DEMANDES DE RETRAIT ---');
  for (const r of reqs) {
    console.log(`ID: ${r._id}`);
    console.log(`Montant: ${r.amount} FCFA`);
    console.log(`Statut: ${r.status}`);
    console.log(`Tél: ${r.accountDetails?.phone}`);
    console.log(`Commentaire Admin / Message API: "${r.adminComment}"`);
    console.log(`Traité le: ${r.processedAt}`);
    console.log('------------------------------------');
  }
  await mongoose.disconnect();
}

checkResult();
