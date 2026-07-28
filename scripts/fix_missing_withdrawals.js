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
console.log('  RÉCUPÉRATION DES DEMANDES DE RETRAIT EN ATTENTE ');
console.log('==================================================');

const TransactionSchema = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  amount: Number,
  type: String,
  provider: String,
  paymentMethod: String,
  paymentReference: String,
  status: String,
  reason: String,
}, { timestamps: true });

const WithdrawRequestSchema = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  amount: Number,
  fee: Number,
  netAmount: Number,
  provider: String,
  accountDetails: Object,
  status: String,
  adminComment: String,
  processedAt: Date,
}, { timestamps: true });

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
const WithdrawRequest = mongoose.models.WithdrawRequest || mongoose.model('WithdrawRequest', WithdrawRequestSchema);

async function fixMissingWithdrawals() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✓ Connecté à MongoDB.\n');

    // Trouver les transactions de type WITHDRAWAL
    const withTxs = await Transaction.find({
      type: 'WITHDRAWAL',
      status: 'pending',
    });

    console.log(`Trouvé ${withTxs.length} transaction(s) de retrait 'pending'...\n`);

    let createdCount = 0;

    for (const tx of withTxs) {
      // Extraire le numéro si présent dans tx.reason
      const phoneMatch = tx.reason ? tx.reason.match(/\d+/) : null;
      const phone = phoneMatch ? phoneMatch[0] : 'Non renseigné';

      // Vérifier si un WithdrawRequest existe déjà pour cet utilisateur et montant
      const existingReq = await WithdrawRequest.findOne({
        user: tx.user,
        amount: tx.amount,
        status: 'pending',
      });

      if (!existingReq) {
        await WithdrawRequest.create({
          user: tx.user,
          amount: tx.amount,
          fee: 0,
          netAmount: tx.amount,
          provider: 'NOTCHPAY',
          accountDetails: {
            phone,
          },
          status: 'pending',
        });

        console.log(`✅ Demande de retrait recréée pour ${tx.amount} FCFA (Utilisateur: ${tx.user}, Tél: ${phone})`);
        createdCount++;
      } else {
        console.log(`ℹ️ La demande de retrait pour ${tx.amount} FCFA existe déjà.`);
      }
    }

    console.log('\n==================================================');
    console.log(`✅ Opération terminée. ${createdCount} demande(s) de retrait restaurée(s) pour le panneau admin !`);
    console.log('==================================================');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Erreur:', err);
    await mongoose.disconnect();
  }
}

fixMissingWithdrawals();
