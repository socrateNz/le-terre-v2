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
}, { timestamps: true });

const WithdrawRequest = mongoose.models.WithdrawRequest || mongoose.model('WithdrawRequest', WithdrawRequestSchema);

async function resetWithdrawalToPending() {
  try {
    await mongoose.connect(mongoUri);
    const res = await WithdrawRequest.updateMany(
      { status: 'approved' },
      {
        $set: {
          status: 'pending',
          adminComment: '',
        },
      }
    );
    console.log(`✅ ${res.modifiedCount} demande(s) de retrait remise(s) au statut 'pending'.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Erreur:', err);
    await mongoose.disconnect();
  }
}

resetWithdrawalToPending();
