import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from './config';
import firebase from 'firebase/compat/app';

// ─── Gemini setup ────────────────────────────────────────────────────────────

const GEMINI_API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  process.env.REACT_APP_GEMINI_API_KEY ||
  '';

if (!GEMINI_API_KEY) {
  console.warn('Gemini API key is missing. Set EXPO_PUBLIC_GEMINI_API_KEY in .env.local.');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const isMissingOrPlaceholderKey = !GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE';

const TS = firebase.firestore.FieldValue.serverTimestamp;

// ─── Generation config — near-deterministic output ───────────────────────────

const GENERATION_CONFIG = {
  temperature: 0.1,
  topK: 1,
  topP: 0.9,
};

// ─── Strict structured prompt ─────────────────────────────────────────────────

const SKIN_ANALYSIS_PROMPT = `You are a dermatology AI assistant. Analyze the face image and return findings ONLY in this exact JSON format with no extra text or commentary outside the JSON:
{
  "acneType": "Type of acne (e.g., Comedonal Acne, Inflammatory Acne, Cystic Acne, Nodular Acne, Hormonal Acne, Papulopustular Acne, Mixed Acne) or 'Clear' if no acne",
  "severity": "Mild | Moderate | Severe | Clear",
  "igaScore": 0,
  "lesionCount": 0,
  "confidence": 0,
  "skinConditions": ["array of standard dermatology condition names"],
  "affectedArea": "description of affected area",
  "recommendation": "Practical lifestyle and skincare habit advice only. Never suggest medication, drugs, or prescriptions — treatment is for the dermatologist.",
  "skinScore": 0,
  "inflammatory": 0,
  "nonInflammatory": 0,
  "aiAnalysis": "2-3 sentence clinical summary explaining why this acne formed, the most probable causes (hormonal, sebum, bacteria, diet, stress, hygiene, environment), and non-medication advice."
}
Rules:
- igaScore must be an integer 0–4 (0=Clear, 1=Almost Clear, 2=Mild, 3=Moderate, 4=Severe)
- confidence must be 0–100 integer
- skinScore must be 0–100 integer (higher = healthier)
- inflammatory + nonInflammatory must sum to 100
- Only include conditions above 40% confidence
- Use standard dermatology condition names only
- Be clinical and never vary tone or style
- Return ONLY valid JSON, no markdown, no extra text`;

// ─── SHA-256 image hash ───────────────────────────────────────────────────────

/**
 * Generates a SHA-256 hex hash of a base64 image string.
 * Used as a stable cache key — same image → same hash → same result.
 */
export const getImageHash = async (base64Image) => {
  try {
    const msgBuffer = new TextEncoder().encode(base64Image);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // crypto.subtle not available (old RN bridge) — use a fast djb2 fallback
    let hash = 5381;
    for (let i = 0; i < Math.min(base64Image.length, 4096); i++) {
      hash = ((hash << 5) + hash) ^ base64Image.charCodeAt(i);
      hash = hash >>> 0; // keep unsigned 32-bit
    }
    return hash.toString(16).padStart(8, '0') + '_djb2';
  }
};

// ─── Cache helpers (Firestore collection: scanResultCache) ───────────────────

/**
 * Returns cached Gemini result for the given imageHash, or null if not found.
 */
const getCachedResult = async (imageHash) => {
  try {
    const snap = await db.collection('scanResultCache').doc(imageHash).get();
    return snap.exists ? snap.data().result : null;
  } catch {
    return null;
  }
};

/**
 * Saves a Gemini result to the cache keyed by imageHash.
 */
const cacheResult = async (imageHash, result) => {
  try {
    await db.collection('scanResultCache').doc(imageHash).set({
      result,
      cachedAt: TS(),
    });
  } catch (e) {
    console.warn('Cache write failed:', e.message);
  }
};

// ─── Scan-lock check ─────────────────────────────────────────────────────────

/**
 * Returns true if this patient has a report currently under derma review.
 * Blocks rescanning until the dermatologist closes the submission.
 */
export const isPatientScanLocked = async (patientId) => {
  if (!patientId) return false;
  try {
    const snap = await db.collection('skinReports')
      .where('patientId', '==', patientId)
      .where('validationRequested', '==', true)
      .where('isValidated', '==', false)
      .get();
    return !snap.empty;
  } catch {
    return false;
  }
};

// ─── Save analysis to patient scan history ────────────────────────────────────

/**
 * Appends a scan result entry to the patient's scanHistory sub-document.
 */
export const saveAnalysisToProfile = async (userId, imageHash, geminiResult) => {
  try {
    const entry = {
      scanId: `${userId}_${imageHash.slice(0, 8)}_${Date.now()}`,
      imageHash,
      timestamp: new Date().toISOString(),
      geminiResult,
      status: 'pending',
    };
    await db.collection('users').doc(userId).collection('scanHistory').add(entry);
  } catch (e) {
    console.warn('saveAnalysisToProfile failed:', e.message);
  }
};

// ─── Main: analyzeSkinWithGemini ─────────────────────────────────────────────

/**
 * Analyze skin from a base64 image using Gemini.
 *
 * Flow:
 *  1. Hash the image
 *  2. Check Firestore cache — return cached result if found (no API call)
 *  3. Call Gemini with temperature=0.1 for deterministic output
 *  4. Cache the result and return
 *
 * @param {string} base64Image  Base64 encoded image (already read from file)
 * @param {string} mimeType     Default 'image/jpeg'
 * @param {string} [userId]     Optional — used to save result to patient profile
 */
export const analyzeSkinWithGemini = async (base64Image, mimeType = 'image/jpeg', userId = null) => {
  try {
    if (isMissingOrPlaceholderKey) {
      return {
        success: false,
        error: 'Gemini API key is missing or not configured for the Expo client.',
        source: 'gemini-ai',
      };
    }

    // Step 1: Hash the image
    const imageHash = await getImageHash(base64Image);

    // Step 2: Cache lookup — same face returns same result instantly
    const cached = await getCachedResult(imageHash);
    if (cached) {
      console.log('[Gemini] Cache hit — returning stored result for hash:', imageHash.slice(0, 12));
      if (userId) await saveAnalysisToProfile(userId, imageHash, cached);
      return {
        success: true,
        data: cached,
        source: 'gemini-cache',
        imageHash,
      };
    }

    // Step 3: Call Gemini with low-temperature, structured prompt
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: GENERATION_CONFIG,
    });

    const imageParts = [
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
    ];

    const result = await model.generateContent([SKIN_ANALYSIS_PROMPT, ...imageParts]);
    let responseText = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps the JSON
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    let analysis = JSON.parse(responseText);

    // Step 4: Normalize / clamp fields
    analysis = {
      acneType: analysis.acneType || 'Unknown',
      severity: analysis.severity || 'Mild',
      igaScore: Math.min(4, Math.max(0, Math.round(Number(analysis.igaScore) || 1))),
      lesionCount: Math.max(0, Number(analysis.lesionCount) || 0),
      confidence: Math.min(100, Math.max(0, Math.round(Number(analysis.confidence) || 75))),
      skinConditions: Array.isArray(analysis.skinConditions) ? analysis.skinConditions : [],
      affectedArea: analysis.affectedArea || 'Face',
      recommendation: analysis.recommendation || 'Consult your dermatologist for personalized advice.',
      skinScore: Math.min(100, Math.max(0, Math.round(Number(analysis.skinScore) || 50))),
      inflammatory: Math.min(100, Math.max(0, Number(analysis.inflammatory) || 50)),
      nonInflammatory: Math.min(100, Math.max(0, Number(analysis.nonInflammatory) || 50)),
      aiAnalysis: analysis.aiAnalysis || '',
    };

    // Step 5: Cache the result and optionally save to patient history
    await cacheResult(imageHash, analysis);
    if (userId) await saveAnalysisToProfile(userId, imageHash, analysis);

    return {
      success: true,
      data: analysis,
      source: 'gemini-ai',
      imageHash,
    };
  } catch (error) {
    console.warn('Gemini analysis warning:', error?.message ?? error);
    return {
      success: false,
      error: error.message,
      source: 'gemini-ai',
    };
  }
};

// ─── Compare multiple images ──────────────────────────────────────────────────

export const compareSkinImages = async (base64Images) => {
  try {
    if (isMissingOrPlaceholderKey) {
      return { success: false, error: 'Gemini API key is missing or not configured for the Expo client.' };
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: GENERATION_CONFIG,
    });

    const prompt = `Compare these skin images and provide a progression analysis focused on causes and lifestyle advice.
Return a JSON object with:
{
  "progression": "Improving | Worsening | Stable",
  "changes": "Describe visible changes and possible reasons (stress, diet, hormonal shifts, seasonal factors, skincare habits).",
  "recommendation": "Practical lifestyle and skincare habit advice only. Do NOT recommend medications.",
  "comparisonScore": 0
}`;

    const imageParts = base64Images.map((b64) => ({
      inlineData: { data: b64, mimeType: 'image/jpeg' },
    }));

    const result = await model.generateContent([prompt, ...imageParts]);
    let text = result.response.text().trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    return { success: true, data: JSON.parse(text) };
  } catch (error) {
    console.warn('Image comparison warning:', error?.message ?? error);
    return { success: false, error: error.message };
  }
};

// ─── Detailed recommendations ─────────────────────────────────────────────────

export const getDetailedRecommendations = async (analysisData) => {
  try {
    if (isMissingOrPlaceholderKey) {
      return { success: false, error: 'Gemini API key is missing or not configured for the Expo client.' };
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: GENERATION_CONFIG,
    });

    const prompt = `Based on this skin analysis data:
${JSON.stringify(analysisData, null, 2)}

Provide a detailed explanation focused on causes and non-medication advice. Include:
1. Why this acne likely formed — biological and lifestyle reasons
2. Possible contributing factors specific to the acne type and severity
3. A practical daily skincare routine (cleansing, moisturizing, sun protection) — no medicated products
4. Lifestyle and habit changes (diet, hydration, sleep, stress, hygiene)
5. When and why to visit a dermatologist

IMPORTANT: Do NOT recommend, mention, or name any medication, prescription drug, antibiotic, retinoid, or topical treatment by name. Format as clear, friendly, numbered sections.`;

    const result = await model.generateContent(prompt);
    return { success: true, recommendations: result.response.text() };
  } catch (error) {
    console.warn('Recommendations warning:', error?.message ?? error);
    return { success: false, error: error.message };
  }
};

export default {
  analyzeSkinWithGemini,
  compareSkinImages,
  getDetailedRecommendations,
  getImageHash,
  isPatientScanLocked,
  saveAnalysisToProfile,
};
