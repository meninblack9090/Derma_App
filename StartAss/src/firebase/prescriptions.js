import firebase from 'firebase/compat/app';
import { db } from './config';

const TS = firebase.firestore.FieldValue.serverTimestamp;

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Generates a discount code like DL-PREM-<shortId>
 * Uses first 6 chars of the Firestore doc ID (alphanumeric, unique enough)
 */
export const generateDiscountCode = (prescriptionId) => {
  return `DL-PREM-${prescriptionId.slice(0, 6).toUpperCase()}`;
};

/**
 * Returns true if the user's subscription has not yet expired
 */
export const checkIsPremium = (subscriptionExpiresAt) => {
  if (!subscriptionExpiresAt) return false;
  const expiryDate = subscriptionExpiresAt?.toDate
    ? subscriptionExpiresAt.toDate()   // Firestore Timestamp
    : new Date(subscriptionExpiresAt); // ISO string
  return expiryDate > new Date();
};

/**
 * Returns original, discount amount, and final price
 */
export const applyDiscount = (originalPrice, discountPercent) => {
  const discount = (originalPrice * discountPercent) / 100;
  return {
    original_price: originalPrice,
    discount_amount: discount,
    final_price: originalPrice - discount,
  };
};


// ─────────────────────────────────────────────
// SEND PRESCRIPTION (called by dermatologist)
// ─────────────────────────────────────────────

/**
 * Creates a prescription in Firestore, applies premium discount if eligible,
 * and returns the prescription document with its ID and discount code.
 *
 * @param {string} doctorId
 * @param {string} doctorName
 * @param {string} patientId
 * @param {string} patientName
 * @param {Array}  medications  - array of { name, dosage, instructions }
 * @param {number} originalPrice
 * @returns {Promise<Object>} prescription data with id and discount_code
 */
export const sendPrescription = async (
  doctorId,
  doctorName,
  patientId,
  patientName,
  medications,
  originalPrice,
) => {
  // Step 1: Get the patient's profile to check premium status
  const patientSnap = await db.collection('users').doc(patientId).get();
  if (!patientSnap.exists) throw new Error('Patient not found');
  const patientData = patientSnap.data();

  // Step 2: Check if patient is premium
  const isPremium = checkIsPremium(patientData.subscriptionExpiresAt);
  const discountPercent = isPremium ? 50 : 0;

  // Step 3: Calculate pricing
  const pricing = applyDiscount(originalPrice, discountPercent);

  // Step 4: Save prescription to Firestore (get auto-generated ID first)
  const ref = await db.collection('prescriptions').add({
    patient_id: patientId,
    patient_name: patientName,
    doctor_id: doctorId,
    doctor_name: doctorName,
    medications,
    issued_at: TS(),

    // Pricing
    original_price: pricing.original_price,
    discount_amount: pricing.discount_amount,
    final_price: pricing.final_price,

    // Discount fields
    has_discount: isPremium,
    discount_percent: discountPercent,
    discount_label: isPremium ? '💎 Derma Link Premium — 50% OFF' : null,
    discount_code: null,  // updated after we have the ID
    discount_expires_at: isPremium
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)   // 24 hours from now
      : null,
    discount_used: false,

    status: 'sent',   // sent → verified → used / expired
    createdAt: TS(),
  });

  // Step 5: Now that we have the Firestore ID, set the discount code
  const discountCode = isPremium ? generateDiscountCode(ref.id) : null;
  if (isPremium) {
    await db.collection('prescriptions').doc(ref.id).update({
      discount_code: discountCode,
    });
  }

  return {
    id: ref.id,
    patient_id: patientId,
    patient_name: patientName,
    doctor_id: doctorId,
    doctor_name: doctorName,
    medications,
    ...pricing,
    has_discount: isPremium,
    discount_percent: discountPercent,
    discount_label: isPremium ? '💎 Derma Link Premium — 50% OFF' : null,
    discount_code: discountCode,
    discount_used: false,
    status: 'sent',
  };
};


// ─────────────────────────────────────────────
// VERIFY DISCOUNT CODE (used by pharmacy)
// ─────────────────────────────────────────────

/**
 * Verifies a discount code by looking it up in Firestore.
 * If valid, marks it as used so it cannot be reused.
 *
 * @param {string} code  e.g. "DL-PREM-AB12CD"
 * @returns {Promise<Object>} { valid, reason?, patient_name, medications, ... }
 */
export const verifyDiscountCode = async (code) => {
  // Step 1: Find prescription by code
  const snap = await db.collection('prescriptions')
    .where('discount_code', '==', code)
    .limit(1)
    .get();

  if (snap.empty) {
    return { valid: false, reason: 'Code not found' };
  }

  const doc = snap.docs[0];
  const rx = { id: doc.id, ...doc.data() };

  // Step 2: Already used?
  if (rx.discount_used) {
    return { valid: false, reason: 'Discount already used' };
  }

  // Step 3: Expired?
  const expires = rx.discount_expires_at?.toDate
    ? rx.discount_expires_at.toDate()
    : new Date(rx.discount_expires_at);

  if (expires < new Date()) {
    await db.collection('prescriptions').doc(rx.id).update({ status: 'expired' });
    return { valid: false, reason: 'Discount has expired' };
  }

  // Step 4: Mark as used
  await db.collection('prescriptions').doc(rx.id).update({
    discount_used: true,
    status: 'used',
    used_at: TS(),
  });

  // Step 5: Return info for pharmacy display
  return {
    valid: true,
    patient_name: rx.patient_name,
    doctor_name: rx.doctor_name,
    medications: rx.medications,
    discount_percent: rx.discount_percent,
    discount_label: rx.discount_label,
    original_price: rx.original_price,
    discount_amount: rx.discount_amount,
    final_price: rx.final_price,
  };
};


// ─────────────────────────────────────────────
// SUBSCRIBE — PATIENT'S PRESCRIPTIONS (realtime)
// ─────────────────────────────────────────────

export const subscribeToPrescriptions = (patientId, callback) =>
  db.collection('prescriptions')
    .where('patient_id', '==', patientId)
    .onSnapshot(
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        callback(docs);
      },
      (err) => { console.warn('subscribeToPrescriptions:', err.message); callback([]); }
    );


// ─────────────────────────────────────────────
// SUBSCRIBE — DERMA'S SENT PRESCRIPTIONS (realtime)
// ─────────────────────────────────────────────

export const subscribeToDermaPrescriptions = (doctorId, callback) =>
  db.collection('prescriptions')
    .where('doctor_id', '==', doctorId)
    .onSnapshot(
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        callback(docs);
      },
      (err) => { console.warn('subscribeToDermaPrescriptions:', err.message); callback([]); }
    );


// ─────────────────────────────────────────────
// GET SINGLE PRESCRIPTION
// ─────────────────────────────────────────────

export const getPrescription = async (prescriptionId) => {
  const snap = await db.collection('prescriptions').doc(prescriptionId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
};
