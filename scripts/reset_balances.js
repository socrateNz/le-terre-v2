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

console.log('==================================================');
console.log('  RÉINITIALISATION DE TOUS LES SOLDES À 0 FCFA   ');
console.log('==================================================');

const WalletSchema = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  balance: Number,
}, { timestamps: true, strict: false });

const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);

async function resetBalances() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✓ Connecté avec succès à MongoDB.\n');

    const result = await Wallet.updateMany(
      {},
      {
        $set: { balance: 0 },
        $unset: { demoBalance: '' },
      }
    );

    console.log(`✅ ${result.modifiedCount} portefeuille(s) d'utilisateur(s) réinitialisé(s) à 0 FCFA !`);
    console.log('==================================================');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Erreur lors de la réinitialisation des soldes:', err);
    await mongoose.disconnect();
  }
}

resetBalances();
