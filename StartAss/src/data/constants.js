export const igaLabels = {
  0: { label: 'Clear', color: '#10b981', bg: '#ecfdf5' },
  1: { label: 'Almost Clear', color: '#3b82f6', bg: '#eff6ff' },
  2: { label: 'Mild', color: '#f59e0b', bg: '#fffbeb' },
  3: { label: 'Moderate', color: '#f97316', bg: '#fff7ed' },
  4: { label: 'Severe', color: '#ef4444', bg: '#fef2f2' },
};

export const symptomQuestions = [
  {
    id: 1,
    question: 'Where is the acne primarily located?',
    options: ['Forehead', 'Cheeks', 'Chin & Jawline', 'Full Face', 'Neck & Back'],
  },
  {
    id: 2,
    question: 'How long have you been experiencing this?',
    options: ['Less than 1 month', '1–3 months', '3–6 months', '6–12 months', 'Over 1 year'],
  },
  {
    id: 3,
    question: 'Which best describes your skin type?',
    options: ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive'],
  },
  {
    id: 4,
    question: 'What type of lesions do you have?',
    options: ['Blackheads', 'Whiteheads', 'Red bumps', 'Painful cysts', 'Mixed'],
  },
  {
    id: 5,
    question: 'How severe is the discomfort/pain?',
    options: ['None', 'Mild', 'Moderate', 'Severe', 'Very Severe'],
  },
];

export const faqItems = [
  {
    id: '1',
    category: 'Scanning',
    question: 'How does the AI skin scan work?',
    answer:
      'Our AI uses advanced computer vision to analyze your skin photo. It identifies acne lesions, classifies severity using the IGA scale, and provides a skin score from 0–100. The analysis takes under 10 seconds.',
  },
  {
    id: '2',
    category: 'Scanning',
    question: 'How accurate is the AI diagnosis?',
    answer:
      'Our AI achieves 92–95% accuracy validated against certified dermatologists. All AI assessments are reviewed and validated by licensed dermatologists on our platform.',
  },
  {
    id: '3',
    category: 'Consultations',
    question: 'How do I book a consultation?',
    answer:
      'Go to the Consultation tab, browse available dermatologists, and tap "Book Appointment." You can choose between video call or in-person visits based on availability.',
  },
  {
    id: '4',
    category: 'Subscription',
    question: 'What does the Premium plan include?',
    answer:
      'Premium includes unlimited AI scans, priority dermatologist access, detailed skin analytics, personalized treatment plans, and monthly progress reports.',
  },
  {
    id: '5',
    category: 'Privacy',
    question: 'How is my data protected?',
    answer:
      'All data is encrypted end-to-end and stored securely. Your photos are never shared without consent. We comply with HIPAA regulations for medical data protection.',
  },
];
