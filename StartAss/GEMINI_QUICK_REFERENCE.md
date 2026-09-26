# Gemini AI Integration - Quick Reference

## Quick Start

1. **Get API Key:** https://aistudio.google.com/app/apikey
2. **Add to `.env.local`:**
   ```
   REACT_APP_GEMINI_API_KEY=your_key_here
   ```
3. **Restart app:** `npm start`
4. **Test:** Upload photo in ScanScreen → AI analyzes → Automatically sent to dermas

## Key Files

| File | Purpose |
|------|---------|
| `src/firebase/gemini.js` | Gemini API integration |
| `src/screens/patient/ScanScreen.js` | Patient scan interface (updated) |
| `src/firebase/firestore.js` | Database functions (updated) |
| `.env.local` | API key configuration |

## Core Functions

### Patient Side (ScanScreen.js)

```javascript
// Triggers on "Start AI Scan" button
handleScan() {
  1. Read image as base64
  2. Call analyzeSkinWithGemini()
  3. Upload image to cloud
  4. Save report to Firestore
  5. Auto-send to dermatologists via sendReportToDerma()
  6. Navigate to ResultScreen
}
```

### Derma Side (New Workflow)

```javascript
// Subscribe to new reports
subscribeToDermaNotifications(dermaId, (notifications) => {
  // Display list of new patient scans
})

// Derma reviews and responds
respondToNotification(notificationId, dermaId, response, notes) {
  // response: 'approved' | 'rejected' | 'needs_more_info'
}
```

## Database Schema

### New Collection: `dermaNotifications`

```
dermaNotifications/
  {
    reportId: "...",
    dermaId: "...",
    patientId: "...",
    patientName: "Patient Name",
    reportData: { ...gemini analysis results... },
    status: "pending" | "viewed" | "responded",
    createdAt: timestamp,
    viewedAt: timestamp,
    respondedAt: timestamp,
    dermaResponse: "approved" | "rejected" | "needs_more_info",
    dermaNote: "Professional feedback..."
  }
```

## Analysis Output Example

```json
{
  "acneType": "Inflammatory Acne",
  "severity": "Moderate",
  "igaScore": 2,
  "lesionCount": 18,
  "confidence": 87,
  "skinConditions": ["inflammatory lesions", "mild erythema"],
  "affectedArea": "T-zone and cheeks",
  "recommendation": "Apply topical retinoid at night...",
  "skinScore": 65,
  "inflammatory": 65,
  "nonInflammatory": 35,
  "aiAnalysis": "Detailed analysis summary..."
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "AI Analysis Failed" | Check API key in `.env.local`, restart app |
| Slow analysis | Check internet, compress image |
| Dermas not receiving | Verify `role: 'derma'` in database |
| API quota exceeded | Check Google Cloud Console, upgrade plan |

## Environment Variables

```env
# Required
REACT_APP_GEMINI_API_KEY=your_gemini_api_key

# Optional
REACT_APP_FIREBASE_API_KEY=your_firebase_key
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
```

## Integration Points

```
Patient Upload Photo
     ↓
Gemini AI Analysis
     ↓
Firebase Firestore (Save Report)
     ↓
Auto-Send to Dermas
     ↓
Derma Notification
     ↓
Derma Reviews & Responds
     ↓
Patient Sees Feedback
```

## API Usage Tips

- **Free tier:** ~50 calls/minute limit
- **Pricing:** Check [Google AI Studio pricing](https://aistudio.google.com/pricing)
- **Rate limits:** Implement retry logic for production
- **Quotas:** Monitor at Google Cloud Console

## Security

- ✅ API key in `.env.local` (excluded from git)
- ✅ Never hardcode API keys
- ✅ Never commit `.env` files
- ✅ Rotate keys periodically
- ✅ Use environment-specific keys

## Next Steps (Future)

1. Add derma notification UI screen
2. Implement real-time chat between patient and derma
3. Generate PDF reports with Gemini analysis
4. Compare before/after skin images
5. Add prescription tracking

---

For detailed setup, see `GEMINI_SETUP.md`
