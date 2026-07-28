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
const notchPublicKey = getEnvVar('NOTCHPAY_PUBLIC_KEY');
const baseUrl = getEnvVar('NOTCHPAY_BASE_URL') || 'https://api.notchpay.co';

console.log('==================================================');
console.log('  SYNCHRONISATION EN DIRECT TRANSACTION NOTCHPAY ');
console.log('==================================================');

const TransactionSchema = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  amount: Number,
  type: String,
  provider: String,
  paymentMethod: String,
  paymentReference: String,
  providerReference: String,
  status: String,
  reason: String,
}, { timestamps: true });

const WalletSchema = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  balance: Number,
}, { timestamps: true });

const LedgerSchema = new mongoose.Schema({
  wallet: mongoose.Schema.Types.ObjectId,
  user: mongoose.Schema.Types.ObjectId,
  type: String,
  amount: Number,
  balanceBefore: Number,
  balanceAfter: Number,
  reference: String,
  reason: String,
  transaction: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);
const Ledger = mongoose.models.Ledger || mongoose.model('Ledger', LedgerSchema);

async function runSync() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✓ Connecté avec succès à la base MongoDB.\n');

    // 1. Récupérer toutes les transactions NotchPay en attente dans MongoDB
    const pendingTxs = await Transaction.find({
      status: 'pending',
      provider: 'NOTCHPAY',
    });

    console.log(`📋 ${pendingTxs.length} transaction(s) NotchPay en attente ('pending') dans MongoDB.\n`);

    if (pendingTxs.length === 0) {
      console.log('Toutes les transactions sont déjà synchronisées.');
      await mongoose.disconnect();
      return;
    }

    // 2. Charger les paiements de NotchPay (Derniers 100 paiements)
    console.log('📡 Récupération de la liste des paiements depuis l\'API NotchPay...');
    const listRes = await fetch(`${baseUrl}/payments?per_page=100`, {
      headers: { Authorization: notchPublicKey, Accept: 'application/json' },
    });

    const notchMap = new Map();

    if (listRes.ok) {
      const listData = await listRes.json();
      const items = listData.items || [];
      console.log(`✓ ${items.length} paiement(s) récupérés depuis NotchPay.\n`);

      for (const item of items) {
        if (item.reference) {
          // Détails de chaque transaction pour mapper merchant_reference (DEP-...)
          try {
            const detailRes = await fetch(`${baseUrl}/payments/${item.reference}`, {
              headers: { Authorization: notchPublicKey, Accept: 'application/json' },
            });
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              const trx = detailData.transaction;
              if (trx) {
                if (trx.merchant_reference) notchMap.set(trx.merchant_reference, trx);
                if (trx.reference) notchMap.set(trx.reference, trx);
                if (trx.trxref) notchMap.set(trx.trxref, trx);
              }
            }
          } catch {}
        }
      }
    }

    let updatedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    for (const tx of pendingTxs) {
      console.log(`🔍 [${tx.paymentReference}] Montant: ${tx.amount} FCFA...`);

      const notchTrx = notchMap.get(tx.paymentReference) || notchMap.get(tx.providerReference);

      if (!notchTrx) {
        console.log(`   ➜ Non trouvé sur NotchPay ou expiré. Marqué comme 'failed'.`);
        tx.status = 'failed';
        await tx.save();
        updatedCount++;
        failedCount++;
        console.log('');
        continue;
      }

      const notchStatus = notchTrx.status;
      console.log(`   ➜ Statut NotchPay: "${notchStatus}" (Ref: ${notchTrx.reference})`);

      if (notchStatus === 'complete' || notchStatus === 'successful') {
        tx.status = 'completed';
        tx.providerReference = notchTrx.reference;
        await tx.save();

        const wallet = await Wallet.findOne({ user: tx.user });
        if (wallet) {
          const balanceBefore = wallet.balance;
          wallet.balance += tx.amount;
          await wallet.save();

          await Ledger.create({
            wallet: wallet._id,
            user: tx.user,
            type: 'CREDIT',
            amount: tx.amount,
            balanceBefore,
            balanceAfter: wallet.balance,
            reference: tx.paymentReference,
            reason: 'DEPOSIT',
            transaction: tx._id,
          });

          console.log(`   🎉 PAIEMENT CONFIRMÉ ! Solde crédité +${tx.amount} FCFA (Nouveau solde: ${wallet.balance} FCFA)`);
        }
        updatedCount++;
        successCount++;
      } else if (
        notchStatus === 'canceled' ||
        notchStatus === 'failed' ||
        notchStatus === 'expired' ||
        notchStatus === 'abandoned'
      ) {
        tx.status = 'failed';
        tx.providerReference = notchTrx.reference;
        await tx.save();
        console.log(`   ❌ TRANSACTION ANNULÉE/ÉCHOUÉE ➜ Statut mis à jour vers 'failed'.`);
        updatedCount++;
        failedCount++;
      } else {
        console.log(`   ⏳ Toujours en attente ('${notchStatus}').`);
      }
      console.log('');
    }

    console.log('==================================================');
    console.log(`  SYNCHRONISATION TERMINÉE AVEC SUCCÈS`);
    console.log(`  • Total transactions traitées : ${pendingTxs.length}`);
    console.log(`  • Dépôts validés (Solde crédité) : ${successCount}`);
    console.log(`  • Dépôts annulés/échoués : ${failedCount}`);
    console.log('==================================================');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Erreur durant la synchronisation:', err);
    await mongoose.disconnect();
  }
}

runSync();
