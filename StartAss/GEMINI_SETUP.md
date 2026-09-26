# Google Gemini AI Integration Setup Guide

## Overview
This guide explains how to set up and use Google Gemini AI for skin analysis in the DermaLink app. After a patient scans their skin, Gemini will analyze the image and automatically send the results to dermatologists for review.

## Setup Steps

### 1. Get Your Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy your API key

### 2. Add API Key to Your Project

**Option A: Using `.env.local` file (Recommended for development)**

1. Open the `.env.local` file in the project root:
```
d:\vscode projectsa\StartAss\.env.local
```

2. Replace `your_gemini_api_key_here` with your actual API key:
```
REACT_APP_GEMINI_API_KEY=your_actual_gemini_api_key_here
```

3. Save the file and **restart your development server**

**Option B: Using environment variables (For production)**

Set the environment variable before running the app:
```bash
export REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Restart the App

After adding the API key:
```bash
npm start
```

## How It Works

### Patient Workflow

1. Patient opens **ScanScreen** and uploads a skin photo
2. Patient taps **"Start AI Scan"**
3. The app will:
   - Read the image as base64
   - Send it to Google Gemini AI for analysis
   - Upload the image to ImgBB (cloud storage)
   - Save the analysis report to Firebase Firestore
   - **Automatically send the report to available dermatologists**
4. Patient is taken to **ResultScreen** to view their analysis

### Dermatologist Workflow

Dermatologists will receive notifications about new patient scans through a new **DermaNotifications** system:

1. **View notifications** - See list of new patient scans
2. **Mark as viewed** - Derma reviews the scan results
3. **Respond** - Provide feedback: approved, rejected, or needs more info
4. **Add notes** - Include professional recommendations

### Analysis Details

Gemini analyzes the skin image and provides:
- **Acne Type**: Specific classification (Comedonal, Inflammatory, Cystic, etc.)
- **Severity Level**: Clear, Mild, Moderate, or Severe
- **IGA Score**: International Global Acne Grading Score (0-4)
- **Lesion Count**: Estimated number of visible lesions
- **Confidence**: AI confidence level (0-100%)
- **Skin Conditions**: List of detected conditions
- **Skin Score**: Overall skin health score (0-100)
- **Inflammatory vs Non-inflammatory**: Percentage breakdown
- **Recommendations**: Specific treatment recommendations

## File Structure

### New/Modified Files

```
src/
├── firebase/
│   ├── gemini.js ✨ NEW - Gemini AI service
│   └── firestore.js (UPDATED)
│       ├── sendReportToDerma() - Send report to derma
│       ├── subscribeToDermaNotifications() - Get derma notifications
│       ├── markNotificationAsViewed() - Mark as viewed
│       ├── respondToNotification() - Derma responds to report
│       └── getReportsForDerma() - Get all reports for derma
│
└── screens/
    └── patient/
        └── ScanScreen.js (UPDATED)
            ├── Uses Gemini for real analysis instead of mock
            ├── Auto-sends reports to dermas
            └── Better error handling
```

## Gemini API Functions

### `analyzeSkinWithGemini(base64Image, mimeType)`

Analyzes a skin image using Gemini AI.

**Parameters:**
- `base64Image` (string): Base64 encoded image data
- `mimeType` (string, default: 'image/jpeg'): MIME type of the image

**Returns:**
```javascript
{
  success: true,
  data: {
    acneType: string,
    severity: string,
    igaScore: number,
    lesionCount: number,
    confidence: number,
    skinConditions: array,
    affectedArea: string,
    recommendation: string,
    skinScore: number,
    inflammatory: number,
    nonInflammatory: number,
    aiAnalysis: string
  },
  source: 'gemini-ai'
}
```

### `compareSkinImages(base64Images)`

Compares multiple skin images to track progression.

**Parameters:**
- `base64Images` (array): Array of base64 encoded images

**Returns:**
```javascript
{
  success: true,
  data: {
    progression: 'Improving' | 'Worsening' | 'Stable',
    changes: string,
    recommendation: string,
    comparisonScore: number
  }
}
```

### `getDetailedRecommendations(analysisData)`

Gets detailed skincare recommendations based on analysis.

**Parameters:**
- `analysisData` (object): The skin analysis data from `analyzeSkinWithGemini`

**Returns:**
```javascript
{
  success: true,
  recommendations: string
}
```

## Firestore Collections

### `dermaNotifications` (NEW)

Stores notifications for dermatologists about new patient scans.

```javascript
{
  reportId: string,
  dermaId: string,
  patientId: string,
  patientName: string,
  reportData: object,
  status: 'pending' | 'viewed' | 'responded',
  createdAt: timestamp,
  viewedAt: timestamp | null,
  respondedAt: timestamp | null,
  dermaResponse: 'approved' | 'rejected' | 'needs_more_info' | null,
  dermaNote: string | null
}
```

### `skinReports` (UPDATED)

Now includes:
```javascript
{
  // ... existing fields ...
  analyzedBy: 'gemini-ai',
  analyzedAt: ISO8601 timestamp,
  dermaNotifications: array of derma IDs,
  sentToDermaAt: timestamp
}
```

## Error Handling

If Gemini API key is missing or invalid:

1. Check that `.env.local` file has the correct API key
2. Verify the API key is active at [Google AI Studio](https://aistudio.google.com/app/apikey)
3. Ensure the key starts with `AIza` (Google API key format)
4. Restart the development server

The app will show an error message:
```
AI Analysis Failed
Gemini API error: [error details]

Make sure you have:
1. Added your Gemini API key to .env.local
2. Restarted the app after adding the key
```

## Testing

### Manual Testing

1. **Test basic scan:**
   - Open ScanScreen
   - Upload a skin photo
   - Tap "Start AI Scan"
   - Wait for analysis and check ResultScreen

2. **Test derma notifications:**
   - Sign in as a dermatologist
   - Check for notifications from new scans
   - View and respond to notifications

### Sample Test Images

Use clear, well-lit photos of skin conditions for best results:
- Natural lighting recommended
- Face centered in frame
- High resolution preferred (avoid blurry images)

## Best Practices

1. **API Key Security**
   - Never commit `.env.local` to version control
   - Use `.gitignore` to exclude environment files
   - Rotate keys periodically

2. **Rate Limiting**
   - Gemini API has usage limits
   - Monitor usage at [Google Cloud Console](https://console.cloud.google.com)

3. **Image Quality**
   - Ensure good lighting for accurate analysis
   - Remove glasses and pull back hair
   - Keep face centered in frame

4. **Error Messages**
   - Show clear feedback to users if analysis fails
   - Provide troubleshooting steps
   - Log errors for debugging

## Limitations

- Gemini AI is not a substitute for professional medical diagnosis
- Results should be reviewed by a qualified dermatologist
- Free tier has usage limits
- Analysis accuracy depends on image quality

## Future Enhancements

1. **Multi-image comparison** - Track skin changes over time
2. **Batch analysis** - Analyze multiple images at once
3. **Custom report generation** - Create detailed PDF reports
4. **Real-time collaboration** - Allow derma and patient chat during analysis
5. **ML model integration** - Combine Gemini with specialized ML models

## Support & Resources

- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Firebase Firestore Documentation](https://firebase.google.com/docs/firestore)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)

## Troubleshooting

### Issue: "AI Analysis Failed" Error

**Solution:**
1. Verify API key in `.env.local`
2. Check internet connection
3. Restart the app
4. Check API key is active

### Issue: Reports not appearing in derma screen

**Solution:**
1. Ensure dermatologists exist in database with `role: 'derma'`
2. Check Firestore rules allow access to `dermaNotifications`
3. Verify `sendReportToDerma` function is being called

### Issue: Slow analysis

**Solution:**
1. Check image file size (compress if necessary)
2. Verify internet connection speed
3. Check for API rate limits

---

**Last Updated:** April 30, 2026
**Version:** 1.0.0
