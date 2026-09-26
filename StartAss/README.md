# Dermatology Patient Analytics Dashboard

This workspace now includes a reusable React Native dashboard component at `src/components/DermatologyPatientAnalyticsDashboard.js`.

It supports:

- summary metrics for total patients, average IGA, remission rate, and upcoming follow-ups
- sorting by visit date, IGA, EASI, DLQI, and patient name
- filtering by date range, IGA range, diagnosis, treatment, and search text
- a selectable IGA trend chart per patient
- an IGA distribution bar chart
- a diagnosis breakdown donut chart

## Usage

```js
import DermatologyPatientAnalyticsDashboard, {
  samplePatientRecords,
} from './src/components/DermatologyPatientAnalyticsDashboard';

export default function Screen() {
  return (
    <DermatologyPatientAnalyticsDashboard
      records={samplePatientRecords}
    />
  );
}
```

The component expects records with these fields:

- `patientName`
- `patientId`
- `visitDate`
- `diagnosis`
- `igaScore`
- `easiScore`
- `dlqiScore`
- `treatmentPrescribed`
- `physicianNotes`

Optional `followUpDate` is used to count upcoming follow-ups.