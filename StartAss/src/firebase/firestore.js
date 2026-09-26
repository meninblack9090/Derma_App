import firebase from 'firebase/compat/app';
import { db } from './config';

const TS = firebase.firestore.FieldValue.serverTimestamp;
const INC = firebase.firestore.FieldValue.increment;
const DAILY_SCAN_LIMIT = 2;

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayScanUsageId = (uid, date = new Date()) => `${uid}_${getLocalDateKey(date)}`;

export const getDailyScanUsage = async (uid, date = new Date()) => {
  const usageId = getTodayScanUsageId(uid, date);
  const snap = await db.collection('dailyScanUsage').doc(usageId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
};

export const reserveDailyScanSlot = async (uid, limit = DAILY_SCAN_LIMIT) => {
  const usageId = getTodayScanUsageId(uid);
  const usageRef = db.collection('dailyScanUsage').doc(usageId);

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(usageRef);
    const existingCount = snap.exists ? Number(snap.data()?.dailyScanCount ?? 0) : 0;

    if (existingCount >= limit) {
      return {
        allowed: false,
        dailyScanCount: existingCount,
        limit,
        usageId,
      };
    }

    const nextCount = existingCount + 1;
    const payload = {
      userId: uid,
      scanDateKey: getLocalDateKey(),
      dailyScanCount: nextCount,
      lastScanAt: TS(),
      updatedAt: TS(),
    };

    if (snap.exists) {
      transaction.update(usageRef, payload);
    } else {
      transaction.set(usageRef, {
        ...payload,
        createdAt: TS(),
      });
    }

    return {
      allowed: true,
      dailyScanCount: nextCount,
      limit,
      usageId,
    };
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  USERS
// ═══════════════════════════════════════════════════════════════════════════════

export const createUserProfile = async (uid, data) => {
  await db.collection('users').doc(uid).set({ uid, ...data, createdAt: TS() });
};

export const getUserProfile = async (uid) => {
  const snap = await db.collection('users').doc(uid).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
};

export const updateUserProfile = async (uid, data) => {
  await db.collection('users').doc(uid).update(data);
};

export const subscribeToUserProfile = (uid, callback, onError) => {
  if (!uid) {
    callback(null);
    return () => {};
  }
  return db.collection('users').doc(uid).onSnapshot(
    (snap) => callback(snap.exists ? { id: snap.id, ...snap.data() } : null),
    (err) => {
      console.warn('subscribeToUserProfile error:', err.message);
      if (onError) onError(err);
    }
  );
};

export const getDermatologists = async () => {
  const snap = await db.collection('users').where('role', '==', 'derma').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SKIN REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const saveSkinReport = async (patientId, patientName, reportData) => {
  const ref = await db.collection('skinReports').add({
    patientId, patientName, ...reportData,
    status: 'Pending', isValidated: false, validationRequested: false,
    validatedBy: null, validatedAt: null, dermaNote: '', createdAt: TS(),
  });
  return ref.id;
};

export const subscribeToSkinReports = (patientId, callback) => {
  if (!patientId) {
    callback([]);
    return () => {};
  }
  return db.collection('skinReports').where('patientId', '==', patientId)
    .onSnapshot((snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      callback(docs);
    }, (err) => { console.warn('subscribeToSkinReports:', err.message); callback([]); });
};

export const getSkinReport = async (reportId) => {
  const snap = await db.collection('skinReports').doc(reportId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
};

export const getLatestReport = async (patientId) => {
  const snap = await db.collection('skinReports')
    .where('patientId', '==', patientId).get();
  if (snap.empty) return null;
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  return docs[0];
};

export const requestValidation = async (reportId, dermaId) => {
  await db.collection('skinReports').doc(reportId).update({ 
    validationRequested: true,
    assignedDermaId: dermaId 
  });
};

export const sendReportToDerma = async (reportId, dermaId, patientId, patientName, reportData) => {
  // Create a notification/message for the dermatologist
  await db.collection('dermaNotifications').add({
    reportId,
    dermaId,
    patientId,
    patientName,
    reportData,
    status: 'pending', // pending, viewed, responded
    createdAt: TS(),
    viewedAt: null,
    respondedAt: null,
  });
  
  // Also update the report to track which dermas have been notified
  const currentNotifications = (await db.collection('skinReports').doc(reportId).get()).data()?.dermaNotifications || [];
  await db.collection('skinReports').doc(reportId).update({
    dermaNotifications: [...currentNotifications, dermaId],
    sentToDermaAt: TS(),
  });
};

export const validateReport = async (reportId, dermaId, dermaNote) => {
  await db.collection('skinReports').doc(reportId).update({
    isValidated: true, status: 'Validated', validatedBy: dermaId,
    validatedAt: TS(), dermaNote, validationRequested: false,
  });
};

export const rejectReport = async (reportId, dermaId, reason) => {
  await db.collection('skinReports').doc(reportId).update({
    isValidated: false, status: 'Rejected', validatedBy: dermaId,
    validatedAt: TS(), rejectionReason: reason, validationRequested: false,
  });
};

export const modifyAndValidateReport = async (reportId, dermaId, modifications, dermaNote) => {
  // modifications: { acneType, igaScore, skinScore, recommendation }
  // First read original AI values so we can preserve them
  const snap = await db.collection('skinReports').doc(reportId).get();
  const original = snap.exists ? snap.data() : {};
  await db.collection('skinReports').doc(reportId).update({
    isValidated: true,
    status: 'Validated',
    validatedBy: dermaId,
    validatedAt: TS(),
    validationRequested: false,
    dermaNote: dermaNote ?? '',
    modifiedByDerma: true,
    // Apply derma overrides
    ...(modifications.acneType !== undefined && { acneType: modifications.acneType }),
    ...(modifications.igaScore !== undefined && { igaScore: modifications.igaScore }),
    ...(modifications.skinScore !== undefined && { skinScore: modifications.skinScore }),
    ...(modifications.recommendation !== undefined && { recommendation: modifications.recommendation }),
    // Preserve originals
    originalAiFindings: {
      acneType: original.acneType ?? null,
      igaScore: original.igaScore ?? null,
      skinScore: original.skinScore ?? null,
      recommendation: original.recommendation ?? null,
    },
  });
};

export const subscribeToDermaNotifications = (dermaId, callback) => {
  if (!dermaId) {
    callback([]);
    return () => {};
  }
  return db.collection('dermaNotifications').where('dermaId', '==', dermaId)
    .onSnapshot((snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      callback(docs);
    }, (err) => { console.warn('subscribeToDermaNotifications:', err.message); callback([]); });
};

export const markNotificationAsViewed = async (notificationId) => {
  await db.collection('dermaNotifications').doc(notificationId).update({
    status: 'viewed',
    viewedAt: TS(),
  });
};

export const respondToNotification = async (notificationId, dermaId, response, notes) => {
  await db.collection('dermaNotifications').doc(notificationId).update({
    status: 'responded',
    respondedAt: TS(),
    dermaResponse: response, // 'approved', 'rejected', 'needs_more_info'
    dermaNote: notes,
  });
};

export const getReportsForDerma = async (dermaId) => {
  const snap = await db.collection('dermaNotifications')
    .where('dermaId', '==', dermaId).get();
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  return docs;
};

export const subscribeToPendingValidations = (dermaId, callback) => {
  if (!dermaId) {
    callback([]);
    return () => {};
  }
  return db.collection('skinReports')
    .where('validationRequested', '==', true)
    .where('assignedDermaId', '==', dermaId)
    .onSnapshot((snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .filter((d) => !d.isValidated && d.status !== 'Rejected');
      callback(docs);
    }, (err) => { console.warn('subscribeToPendingValidations:', err.message); callback([]); });
};

export const subscribeToDermaValidationLogs = (dermaId, callback) => {
  if (!dermaId) {
    callback([]);
    return () => {};
  }
  return db.collection('skinReports').where('validatedBy', '==', dermaId)
    .onSnapshot((snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.validatedAt?.seconds ?? 0) - (a.validatedAt?.seconds ?? 0));
      callback(docs);
    }, (err) => { console.warn('subscribeToDermaValidationLogs:', err.message); callback([]); });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CONSULTATIONS / APPOINTMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const bookConsultation = async (data) => {
  const ref = await db.collection('consultations').add({
    ...data, status: 'upcoming', notes: '', createdAt: TS(),
  });
  return ref.id;
};

export const subscribeToConsultations = (patientId, callback) => {
  if (!patientId) {
    callback([]);
    return () => {};
  }
  return db.collection('consultations').where('patientId', '==', patientId)
    .onSnapshot((snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      callback(docs);
    }, (err) => { console.warn('subscribeToConsultations:', err.message); callback([]); });
};

export const subscribeToAppointments = (dermaId, callback) => {
  if (!dermaId) {
    callback([]);
    return () => {};
  }
  return db.collection('consultations').where('dermaId', '==', dermaId)
    .onSnapshot((snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      callback(docs);
    }, (err) => { console.warn('subscribeToAppointments:', err.message); callback([]); });
};

export const updateConsultationStatus = async (id, status) =>
  db.collection('consultations').doc(id).update({ status });

export const cancelConsultation = async (id) =>
  db.collection('consultations').doc(id).delete();

export const rejectConsultation = async (id, reason) =>
  db.collection('consultations').doc(id).update({ status: 'rejected', rejectionReason: reason });

// ═══════════════════════════════════════════════════════════════════════════════
//  RATINGS
// ═══════════════════════════════════════════════════════════════════════════════

export const submitRating = async (consultationId, patientId, patientName, dermaId, rating, comment) => {
  await db.collection('ratings').add({
    consultationId, patientId, patientName, dermaId,
    rating, comment: comment ?? '', createdAt: TS(),
  });
  await db.collection('consultations').doc(consultationId).update({ rated: true, rating });
  // Update derma aggregate
  const snap = await db.collection('ratings').where('dermaId', '==', dermaId).get();
  const all = snap.docs.map((d) => d.data().rating);
  const avg = all.reduce((s, v) => s + v, 0) / all.length;
  await db.collection('users').doc(dermaId).update({
    averageRating: Math.round(avg * 10) / 10,
    totalReviews: all.length,
  });
};

export const subscribeToDermaRatings = (dermaId, callback) => {
  if (!dermaId) {
    callback([]);
    return () => {};
  }
  return db.collection('ratings').where('dermaId', '==', dermaId)
    .onSnapshot((snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      callback(docs);
    }, (err) => { console.warn('subscribeToDermaRatings:', err.message); callback([]); });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CONVERSATIONS & MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════

export const getOrCreateConversation = async (patientId, dermaId, patientName, dermaName) => {
  const snap = await db.collection('conversations')
    .where('patientId', '==', patientId).where('dermaId', '==', dermaId).get();
  if (!snap.empty) return snap.docs[0].id;
  const ref = await db.collection('conversations').add({
    patientId, dermaId, patientName, dermaName,
    lastMessage: '', lastTime: TS(), unreadByPatient: 0, unreadByDerma: 0, createdAt: TS(),
  });
  return ref.id;
};

export const subscribeToPatientConversations = (patientId, callback) => {
  if (!patientId) {
    callback([]);
    return () => {};
  }
  return db.collection('conversations').where('patientId', '==', patientId)
    .onSnapshot((snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.lastTime?.seconds ?? 0) - (a.lastTime?.seconds ?? 0));
      callback(docs);
    }, (err) => { console.warn('subscribeToPatientConversations:', err.message); callback([]); });
};

export const subscribeToDermaConversations = (dermaId, callback) => {
  if (!dermaId) {
    callback([]);
    return () => {};
  }
  return db.collection('conversations').where('dermaId', '==', dermaId)
    .onSnapshot((snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.lastTime?.seconds ?? 0) - (a.lastTime?.seconds ?? 0));
      callback(docs);
    }, (err) => { console.warn('subscribeToDermaConversations:', err.message); callback([]); });
};

export const subscribeToMessages = (conversationId, callback) => {
  if (!conversationId) {
    callback([]);
    return () => {};
  }
  return db.collection('conversations').doc(conversationId).collection('messages')
    .onSnapshot((snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.timestamp?.seconds ?? 0) - (b.timestamp?.seconds ?? 0));
      callback(docs);
    }, (err) => { console.warn('subscribeToMessages:', err.message); callback([]); });
};

export const sendChatMessage = async (conversationId, senderId, senderRole, text) => {
  await db.collection('conversations').doc(conversationId).collection('messages').add({
    senderId, senderRole, text, timestamp: TS(), read: false,
  });
  const unreadField = senderRole === 'patient' ? 'unreadByDerma' : 'unreadByPatient';
  await db.collection('conversations').doc(conversationId).update({
    lastMessage: text, lastTime: TS(), [unreadField]: INC(1),
  });
};

export const markConversationRead = async (conversationId, readerRole) => {
  const field = readerRole === 'patient' ? 'unreadByPatient' : 'unreadByDerma';
  await db.collection('conversations').doc(conversationId).update({ [field]: 0 });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  DERMA — PATIENTS LIST
// ═══════════════════════════════════════════════════════════════════════════════

export const subscribeToDermaPatients = (dermaId, callback) => {
  if (!dermaId) {
    callback([]);
    return () => {};
  }
  return db.collection('consultations').where('dermaId', '==', dermaId)
    .onSnapshot((snap) => {
      const seen = new Set();
      const patients = [];
      snap.docs.forEach((d) => {
        const data = d.data();
        if (!seen.has(data.patientId)) {
          seen.add(data.patientId);
          patients.push({
            id: data.patientId, name: data.patientName,
            igaGrade: data.igaGrade ?? 2, lastVisit: data.date ?? '',
            issue: data.issue ?? '', avatar: data.avatar ?? '👤',
          });
        }
      });
      callback(patients);
    }, (err) => { console.warn('subscribeToDermaPatients:', err.message); callback([]); });
};
