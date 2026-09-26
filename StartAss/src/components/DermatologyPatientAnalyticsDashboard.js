import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../theme/colors';

const DIAGNOSIS_COLORS = [colors.primary, colors.teal, colors.violet, colors.amber, colors.rose, colors.emerald];
const IGA_BINS = [0, 1, 2, 3, 4];
const SORT_OPTIONS = [
  { key: 'visitDate', label: 'Visit date' },
  { key: 'igaScore', label: 'IGA score' },
  { key: 'easiScore', label: 'EASI score' },
  { key: 'dlqiScore', label: 'DLQI score' },
  { key: 'patientName', label: 'Patient name' },
];

function safeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseInputDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = safeDate(value);
  if (!date) return 'Unknown date';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCompactDate(value) {
  const date = safeDate(value);
  if (!date) return '--';
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function ChartCard({ title, subtitle, children, icon, accent }) {
  return (
    <View style={styles.chartCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
        </View>
        {icon ? (
          <View style={[styles.cardIcon, { backgroundColor: accent + '18' }]}>
            <Ionicons name={icon} size={18} color={accent} />
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function SummaryCard({ label, value, detail, accent, icon }) {
  return (
    <LinearGradient colors={gradients.card} style={styles.summaryCard}>
      <View style={styles.summaryTopRow}>
        <View style={[styles.summaryIcon, { backgroundColor: accent + '18' }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <Text style={[styles.summaryValue, { color: accent }]}>{value}</Text>
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      {detail ? <Text style={styles.summaryDetail}>{detail}</Text> : null}
    </LinearGradient>
  );
}

function Pill({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function buildLinePath(points) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

export default function DermatologyPatientAnalyticsDashboard({
  records = samplePatientRecords,
  title = 'Dermatology Patient Analytics',
  subtitle = 'Filter visits, track severity trends, and review diagnosis distribution.',
  initialSelectedPatientId,
  onRecordPress,
}) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.max(windowWidth - 32, 320);

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [igaMin, setIgaMin] = useState('');
  const [igaMax, setIgaMax] = useState('');
  const [diagnosisFilter, setDiagnosisFilter] = useState('All');
  const [treatmentFilter, setTreatmentFilter] = useState('All');
  const [sortField, setSortField] = useState('visitDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedPatientId, setSelectedPatientId] = useState(initialSelectedPatientId ?? '');

  const normalizedRecords = useMemo(
    () =>
      records.map((record) => {
        const visitDate = safeDate(record.visitDate);
        const followUpDate = safeDate(record.followUpDate);
        return {
          ...record,
          visitDateObj: visitDate,
          followUpDateObj: followUpDate,
          searchable: `${record.patientName ?? ''} ${record.patientId ?? ''}`.toLowerCase(),
          diagnosisLabel: record.diagnosis ?? 'Unknown',
          treatmentLabel: record.treatmentPrescribed ?? 'Unknown',
        };
      }),
    [records],
  );

  const diagnosisOptions = useMemo(
    () => ['All', ...uniq(normalizedRecords.map((record) => record.diagnosisLabel)).sort((a, b) => a.localeCompare(b))],
    [normalizedRecords],
  );

  const treatmentOptions = useMemo(
    () => ['All', ...uniq(normalizedRecords.map((record) => record.treatmentLabel)).sort((a, b) => a.localeCompare(b))],
    [normalizedRecords],
  );

  const filteredRecords = useMemo(() => {
    const fromDate = parseInputDate(startDate);
    const toDate = parseInputDate(endDate);
    const minIga = igaMin === '' ? null : Number(igaMin);
    const maxIga = igaMax === '' ? null : Number(igaMax);

    return normalizedRecords.filter((record) => {
      const visitDay = record.visitDateObj ? startOfDay(record.visitDateObj) : null;
      if (searchQuery && !record.searchable.includes(searchQuery.toLowerCase().trim())) return false;
      if (diagnosisFilter !== 'All' && record.diagnosisLabel !== diagnosisFilter) return false;
      if (treatmentFilter !== 'All' && record.treatmentLabel !== treatmentFilter) return false;
      if (fromDate && (!visitDay || visitDay < startOfDay(fromDate))) return false;
      if (toDate && (!visitDay || visitDay > startOfDay(toDate))) return false;
      if (minIga !== null && !Number.isNaN(minIga) && Number(record.igaScore) < minIga) return false;
      if (maxIga !== null && !Number.isNaN(maxIga) && Number(record.igaScore) > maxIga) return false;
      return true;
    });
  }, [diagnosisFilter, endDate, igaMax, igaMin, normalizedRecords, searchQuery, startDate, treatmentFilter]);

  const sortedRecords = useMemo(() => {
    const next = [...filteredRecords];
    const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

    next.sort((left, right) => {
      let leftValue = left[sortField];
      let rightValue = right[sortField];

      if (sortField === 'visitDate') {
        leftValue = left.visitDateObj?.getTime() ?? 0;
        rightValue = right.visitDateObj?.getTime() ?? 0;
      } else if (sortField === 'patientName') {
        leftValue = String(left.patientName ?? '').toLowerCase();
        rightValue = String(right.patientName ?? '').toLowerCase();
      } else {
        leftValue = Number(leftValue ?? 0);
        rightValue = Number(rightValue ?? 0);
      }

      if (leftValue < rightValue) return -1 * directionMultiplier;
      if (leftValue > rightValue) return 1 * directionMultiplier;
      return 0;
    });

    return next;
  }, [filteredRecords, sortDirection, sortField]);

  const uniquePatients = useMemo(() => {
    const map = new Map();
    normalizedRecords.forEach((record) => {
      if (!map.has(record.patientId)) {
        map.set(record.patientId, {
          patientId: record.patientId,
          patientName: record.patientName,
        });
      }
    });
    return [...map.values()].sort((left, right) => left.patientName.localeCompare(right.patientName));
  }, [normalizedRecords]);

  useEffect(() => {
    if (uniquePatients.length === 0) {
      setSelectedPatientId('');
      return;
    }
    if (!selectedPatientId || !uniquePatients.some((patient) => patient.patientId === selectedPatientId)) {
      setSelectedPatientId(initialSelectedPatientId && uniquePatients.some((patient) => patient.patientId === initialSelectedPatientId)
        ? initialSelectedPatientId
        : uniquePatients[0].patientId);
    }
  }, [initialSelectedPatientId, selectedPatientId, uniquePatients]);

  const selectedPatientRecords = useMemo(() => {
    const patientRecords = filteredRecords
      .filter((record) => record.patientId === selectedPatientId)
      .filter((record) => record.visitDateObj);
    return patientRecords.sort((left, right) => (left.visitDateObj?.getTime() ?? 0) - (right.visitDateObj?.getTime() ?? 0));
  }, [filteredRecords, selectedPatientId]);

  const summaryMetrics = useMemo(() => {
    const uniquePatientCount = new Set(filteredRecords.map((record) => record.patientId)).size;
    const averageIga = filteredRecords.length
      ? filteredRecords.reduce((sum, record) => sum + Number(record.igaScore ?? 0), 0) / filteredRecords.length
      : 0;
    const remissionCount = filteredRecords.filter((record) => Number(record.igaScore ?? 0) <= 1).length;
    const remissionRate = filteredRecords.length ? remissionCount / filteredRecords.length : 0;
    const today = startOfDay(new Date());
    const futureWindow = new Date(today);
    futureWindow.setDate(futureWindow.getDate() + 14);
    const followUps = filteredRecords.filter((record) => {
      if (!record.followUpDateObj) return false;
      const followUpDay = startOfDay(record.followUpDateObj);
      return followUpDay >= today && followUpDay <= futureWindow;
    }).length;

    return {
      uniquePatientCount,
      averageIga,
      remissionRate,
      followUps,
    };
  }, [filteredRecords]);

  const igaDistribution = useMemo(() => {
    const counts = IGA_BINS.map((value) => ({ value, count: 0 }));
    filteredRecords.forEach((record) => {
      const score = clamp(Number(record.igaScore ?? 0), 0, 4);
      counts[score].count += 1;
    });
    return counts;
  }, [filteredRecords]);

  const diagnosisDistribution = useMemo(() => {
    const map = new Map();
    filteredRecords.forEach((record) => {
      map.set(record.diagnosisLabel, (map.get(record.diagnosisLabel) ?? 0) + 1);
    });
    return [...map.entries()].map(([label, count]) => ({ label, count }));
  }, [filteredRecords]);

  const lineChartData = useMemo(() => {
    if (selectedPatientRecords.length === 0) return [];
    return selectedPatientRecords.map((record) => ({
      xLabel: formatCompactDate(record.visitDateObj),
      y: Number(record.igaScore ?? 0),
      date: record.visitDateObj,
    }));
  }, [selectedPatientRecords]);

  const lineChartDimensions = {
    width: cardWidth - 32,
    height: 220,
    padding: 28,
  };

  const lineChart = useMemo(() => {
    const { width, height, padding } = lineChartDimensions;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxScore = 4;
    const minScore = 0;

    if (lineChartData.length === 0) {
      return null;
    }

    const stepX = lineChartData.length === 1 ? 0 : chartWidth / (lineChartData.length - 1);
    const points = lineChartData.map((entry, index) => {
      const x = padding + stepX * index;
      const y = padding + chartHeight - ((entry.y - minScore) / (maxScore - minScore)) * chartHeight;
      return { ...entry, x, y };
    });

    return {
      points,
      path: buildLinePath(points),
      width,
      height,
      padding,
      chartHeight,
      chartWidth,
    };
  }, [lineChartData]);

  const chartRadius = 72;
  const chartStroke = 18;
  const chartCircumference = 2 * Math.PI * chartRadius;

  const donutSegments = useMemo(() => {
    let offset = 0;

    return diagnosisDistribution.map((segment, index) => {
      const fraction = segment.count / Math.max(filteredRecords.length, 1);
      const dashLength = Math.max(fraction * chartCircumference, 0.1);
      const color = DIAGNOSIS_COLORS[index % DIAGNOSIS_COLORS.length];
      const element = (
        <Circle
          key={segment.label}
          cx="90"
          cy="90"
          r={chartRadius}
          stroke={color}
          strokeWidth={chartStroke}
          strokeDasharray={`${dashLength} ${chartCircumference - dashLength}`}
          strokeDashoffset={-offset}
          strokeLinecap="round"
          fill="none"
          transform="rotate(-90 90 90)"
        />
      );
      offset += dashLength;
      return element;
    });
  }, [chartCircumference, chartRadius, chartStroke, diagnosisDistribution, filteredRecords.length]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[colors.slate50, colors.white]} style={styles.hero}>
        <Text style={styles.kicker}>Clinical analytics</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.summaryGrid}>
          <SummaryCard
            label="Total patients"
            value={summaryMetrics.uniquePatientCount}
            detail={`${filteredRecords.length} filtered visits`}
            accent={colors.primary}
            icon="people-outline"
          />
          <SummaryCard
            label="Average IGA"
            value={summaryMetrics.averageIga.toFixed(1)}
            detail="Across filtered records"
            accent={colors.teal}
            icon="pulse-outline"
          />
          <SummaryCard
            label="In remission"
            value={percent(summaryMetrics.remissionRate)}
            detail="IGA 0-1"
            accent={colors.emerald}
            icon="checkmark-circle-outline"
          />
          <SummaryCard
            label="Follow-ups"
            value={summaryMetrics.followUps}
            detail="Next 14 days"
            accent={colors.amber}
            icon="calendar-outline"
          />
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <ChartCard title="Search and filters" subtitle="Refine the patient set before charting it." icon="options-outline" accent={colors.primary}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Search by patient name or ID</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="e.g. Maria Cruz or PT-104"
              placeholderTextColor={colors.slate400}
              style={styles.input}
            />
          </View>

          <View style={styles.rowWrap}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Start date</Text>
              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.slate400}
                style={styles.input}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>End date</Text>
              <TextInput
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.slate400}
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.rowWrap}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>IGA min</Text>
              <TextInput
                value={igaMin}
                onChangeText={setIgaMin}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor={colors.slate400}
                style={styles.input}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>IGA max</Text>
              <TextInput
                value={igaMax}
                onChangeText={setIgaMax}
                placeholder="4"
                keyboardType="numeric"
                placeholderTextColor={colors.slate400}
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Diagnosis type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
              {diagnosisOptions.map((option) => (
                <Pill key={option} label={option} active={diagnosisFilter === option} onPress={() => setDiagnosisFilter(option)} />
              ))}
            </ScrollView>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Treatment type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
              {treatmentOptions.map((option) => (
                <Pill key={option} label={option} active={treatmentFilter === option} onPress={() => setTreatmentFilter(option)} />
              ))}
            </ScrollView>
          </View>
        </ChartCard>
      </View>

      <View style={styles.section}>
        <ChartCard title="Sort records" subtitle="Control the ordering of the patient table below." icon="swap-vertical-outline" accent={colors.teal}>
          <View style={styles.sortWrap}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                activeOpacity={0.8}
                onPress={() => setSortField(option.key)}
                style={[styles.sortChip, sortField === option.key && styles.sortChipActive]}
              >
                <Text style={[styles.sortChipText, sortField === option.key && styles.sortChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
              style={[styles.sortDirection, sortDirection === 'asc' && styles.sortChipActive]}
            >
              <Ionicons name={sortDirection === 'asc' ? 'arrow-up-outline' : 'arrow-down-outline'} size={16} color={sortDirection === 'asc' ? colors.white : colors.slate700} />
              <Text style={[styles.sortChipText, sortDirection === 'asc' && styles.sortChipTextActive]}>
                {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              </Text>
            </TouchableOpacity>
          </View>
        </ChartCard>
      </View>

      <View style={styles.section}>
        <ChartCard
          title="IGA trend by patient"
          subtitle="Select a patient to review severity across visits."
          icon="trending-up-outline"
          accent={colors.primary}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.patientPills}>
            {uniquePatients.map((patient) => (
              <Pill
                key={patient.patientId}
                label={patient.patientName}
                active={selectedPatientId === patient.patientId}
                onPress={() => setSelectedPatientId(patient.patientId)}
              />
            ))}
          </ScrollView>

          {lineChart ? (
            <View style={styles.svgWrap}>
              <Svg width={lineChart.width} height={lineChart.height}>
                {[0, 1, 2, 3, 4].map((gridLine) => {
                  const y = lineChart.padding + lineChart.chartHeight - (gridLine / 4) * lineChart.chartHeight;
                  return (
                    <React.Fragment key={gridLine}>
                      <Line x1={lineChart.padding} y1={y} x2={lineChart.padding + lineChart.chartWidth} y2={y} stroke={colors.slate200} strokeDasharray="4 4" />
                      <SvgText x={6} y={y + 4} fill={colors.slate400} fontSize="10">
                        {gridLine}
                      </SvgText>
                    </React.Fragment>
                  );
                })}
                <Path d={lineChart.path} fill="none" stroke={colors.primary} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
                {lineChart.points.map((point) => (
                  <React.Fragment key={`${point.date?.toISOString() ?? point.xLabel}-${point.y}`}>
                    <Circle cx={point.x} cy={point.y} r={5.5} fill={colors.white} stroke={colors.primary} strokeWidth={3} />
                    <SvgText x={point.x} y={lineChart.height - 6} fill={colors.slate500} fontSize="10" textAnchor="middle">
                      {point.xLabel}
                    </SvgText>
                  </React.Fragment>
                ))}
              </Svg>
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="analytics-outline" size={28} color={colors.slate300} />
              <Text style={styles.emptyText}>No visits for the selected patient.</Text>
            </View>
          )}
        </ChartCard>
      </View>

      <View style={styles.section}>
        <ChartCard title="IGA distribution" subtitle="Counts across the filtered patient set." icon="bar-chart-outline" accent={colors.teal}>
          <View style={styles.barChartWrap}>
            <View style={styles.barChartPlot}>
              {igaDistribution.map((bucket) => {
                const maxCount = Math.max(...igaDistribution.map((entry) => entry.count), 1);
                const barHeight = bucket.count ? (bucket.count / maxCount) * 132 : 0;
                return (
                  <View key={bucket.value} style={styles.barColumn}>
                    <View style={styles.barValueWrap}>
                      <Text style={styles.barValue}>{bucket.count}</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: Math.max(barHeight, bucket.count > 0 ? 12 : 0), backgroundColor: DIAGNOSIS_COLORS[bucket.value % DIAGNOSIS_COLORS.length] }]} />
                    </View>
                    <Text style={styles.barLabel}>{bucket.value}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ChartCard>
      </View>

      <View style={styles.section}>
        <ChartCard title="Diagnosis breakdown" subtitle="Donut chart for the currently filtered patients." icon="pie-chart-outline" accent={colors.violet}>
          <View style={styles.donutRow}>
            <View style={styles.donutWrap}>
              <Svg width={180} height={180}>
                <Circle cx="90" cy="90" r={chartRadius} stroke={colors.slate100} strokeWidth={chartStroke} fill="none" />
                {donutSegments}
                <Circle cx="90" cy="90" r={chartRadius - chartStroke - 10} fill={colors.white} />
              </Svg>
              <View style={styles.donutCenter} pointerEvents="none">
                <Text style={styles.donutCenterValue}>{filteredRecords.length}</Text>
                <Text style={styles.donutCenterLabel}>records</Text>
              </View>
            </View>
            <View style={styles.legendWrap}>
              {diagnosisDistribution.length === 0 ? (
                <Text style={styles.emptyLegend}>No diagnosis data available.</Text>
              ) : (
                diagnosisDistribution.map((segment, index) => (
                  <View key={segment.label} style={styles.legendItem}>
                    <View style={[styles.legendSwatch, { backgroundColor: DIAGNOSIS_COLORS[index % DIAGNOSIS_COLORS.length] }]} />
                    <Text style={styles.legendLabel} numberOfLines={1}>{segment.label}</Text>
                    <Text style={styles.legendCount}>{segment.count}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </ChartCard>
      </View>

      <View style={styles.section}>
        <ChartCard title="Patient records" subtitle="Sorted and filtered visit log." icon="document-text-outline" accent={colors.rose}>
          {sortedRecords.length === 0 ? (
            <View style={styles.emptyChart}>
              <Ionicons name="search-outline" size={28} color={colors.slate300} />
              <Text style={styles.emptyText}>No records match the current filters.</Text>
            </View>
          ) : (
            sortedRecords.map((record) => (
              <TouchableOpacity
                key={`${record.patientId}-${record.visitDate}`}
                activeOpacity={0.85}
                onPress={() => onRecordPress?.(record)}
                style={styles.recordCard}
              >
                <View style={styles.recordTopRow}>
                  <View>
                    <Text style={styles.recordName}>{record.patientName}</Text>
                    <Text style={styles.recordMeta}>{record.patientId} • {formatDate(record.visitDate)}</Text>
                  </View>
                  <View style={styles.igaBadge}>
                    <Text style={styles.igaBadgeText}>IGA {record.igaScore}</Text>
                  </View>
                </View>

                <Text style={styles.recordDiagnosis}>{record.diagnosisLabel}</Text>

                <View style={styles.scoreRow}>
                  <View style={styles.scoreChip}>
                    <Text style={styles.scoreChipLabel}>EASI</Text>
                    <Text style={styles.scoreChipValue}>{record.easiScore}</Text>
                  </View>
                  <View style={styles.scoreChip}>
                    <Text style={styles.scoreChipLabel}>DLQI</Text>
                    <Text style={styles.scoreChipValue}>{record.dlqiScore}</Text>
                  </View>
                  <View style={styles.scoreChipWide}>
                    <Text style={styles.scoreChipLabel}>Treatment</Text>
                    <Text style={styles.scoreChipValue} numberOfLines={1}>{record.treatmentLabel}</Text>
                  </View>
                </View>

                {record.followUpDate ? (
                  <View style={styles.followUpRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.amber} />
                    <Text style={styles.followUpText}>Follow-up {formatDate(record.followUpDate)}</Text>
                  </View>
                ) : null}

                {record.physicianNotes ? <Text style={styles.notes}>{record.physicianNotes}</Text> : null}
              </TouchableOpacity>
            ))
          )}
        </ChartCard>
      </View>
    </ScrollView>
  );
}

export const samplePatientRecords = [
  {
    patientName: 'Maria Cruz',
    patientId: 'PT-104',
    visitDate: '2026-05-02',
    diagnosis: 'Atopic Dermatitis',
    igaScore: 3,
    easiScore: 18,
    dlqiScore: 14,
    treatmentPrescribed: 'Topical corticosteroid + emollient',
    physicianNotes: 'Active flare on flexural areas. Reinforce moisturizer use twice daily.',
    followUpDate: '2026-05-16',
  },
  {
    patientName: 'Maria Cruz',
    patientId: 'PT-104',
    visitDate: '2026-04-12',
    diagnosis: 'Atopic Dermatitis',
    igaScore: 2,
    easiScore: 12,
    dlqiScore: 10,
    treatmentPrescribed: 'Tacrolimus ointment',
    physicianNotes: 'Improving but still itchy at night.',
    followUpDate: '2026-05-16',
  },
  {
    patientName: 'John Reyes',
    patientId: 'PT-221',
    visitDate: '2026-05-07',
    diagnosis: 'Psoriasis',
    igaScore: 4,
    easiScore: 22,
    dlqiScore: 19,
    treatmentPrescribed: 'Topical vitamin D analog + steroid',
    physicianNotes: 'Plaque thickening noted on elbows and knees.',
    followUpDate: '2026-05-21',
  },
  {
    patientName: 'John Reyes',
    patientId: 'PT-221',
    visitDate: '2026-03-29',
    diagnosis: 'Psoriasis',
    igaScore: 3,
    easiScore: 19,
    dlqiScore: 16,
    treatmentPrescribed: 'Phototherapy',
    physicianNotes: 'Phototherapy started three times weekly.',
    followUpDate: '2026-04-18',
  },
  {
    patientName: 'Ana Dela Cruz',
    patientId: 'PT-318',
    visitDate: '2026-05-01',
    diagnosis: 'Rosacea',
    igaScore: 1,
    easiScore: 4,
    dlqiScore: 3,
    treatmentPrescribed: 'Azelaic acid gel',
    physicianNotes: 'Good response. Trigger avoidance reviewed.',
    followUpDate: '2026-06-01',
  },
  {
    patientName: 'Ana Dela Cruz',
    patientId: 'PT-318',
    visitDate: '2026-02-19',
    diagnosis: 'Rosacea',
    igaScore: 2,
    easiScore: 6,
    dlqiScore: 5,
    treatmentPrescribed: 'Metronidazole cream',
    physicianNotes: 'Baseline visit before current therapy.',
    followUpDate: '2026-03-19',
  },
  {
    patientName: 'Carlo Bautista',
    patientId: 'PT-522',
    visitDate: '2026-05-09',
    diagnosis: 'Atopic Dermatitis',
    igaScore: 0,
    easiScore: 1,
    dlqiScore: 1,
    treatmentPrescribed: 'Maintenance emollients',
    physicianNotes: 'In remission. Continue skin-barrier maintenance.',
    followUpDate: '2026-06-09',
  },
  {
    patientName: 'Lena Santos',
    patientId: 'PT-734',
    visitDate: '2026-05-10',
    diagnosis: 'Eczema',
    igaScore: 2,
    easiScore: 9,
    dlqiScore: 7,
    treatmentPrescribed: 'Barrier repair cream',
    physicianNotes: 'New patient. Mild-moderate disease burden.',
    followUpDate: '2026-05-24',
  },
];

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.slate50,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  hero: {
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.slate200,
    marginBottom: 16,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.primaryDark,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.slate900,
  },
  subtitle: {
    marginTop: 8,
    color: colors.slate600,
    lineHeight: 20,
  },
  summaryGrid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    width: '48%',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  summaryLabel: {
    color: colors.slate900,
    fontWeight: '800',
    fontSize: 14,
  },
  summaryDetail: {
    color: colors.slate500,
    marginTop: 4,
    fontSize: 12,
  },
  section: {
    marginBottom: 14,
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate200,
    shadowColor: colors.slate900,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.slate900,
  },
  cardSubtitle: {
    marginTop: 4,
    color: colors.slate500,
    fontSize: 12,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: colors.slate600,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.slate50,
    color: colors.slate900,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  rowWrap: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  pillRow: {
    gap: 8,
    paddingRight: 6,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
  },
  pillActive: {
    backgroundColor: colors.slate900,
    borderColor: colors.slate900,
  },
  pillText: {
    color: colors.slate700,
    fontWeight: '700',
  },
  pillTextActive: {
    color: colors.white,
  },
  sortWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  sortChipActive: {
    backgroundColor: colors.slate900,
    borderColor: colors.slate900,
  },
  sortChipText: {
    color: colors.slate700,
    fontWeight: '700',
  },
  sortChipTextActive: {
    color: colors.white,
  },
  sortDirection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  patientPills: {
    gap: 8,
    paddingBottom: 12,
  },
  svgWrap: {
    alignItems: 'center',
    paddingTop: 6,
  },
  emptyChart: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    color: colors.slate400,
    textAlign: 'center',
  },
  barChartWrap: {
    alignItems: 'center',
  },
  barChartPlot: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 6,
    height: 210,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  barValueWrap: {
    minHeight: 18,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.slate700,
  },
  barTrack: {
    width: '62%',
    height: 148,
    borderRadius: 18,
    backgroundColor: colors.slate100,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 18,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.slate600,
  },
  donutRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  donutWrap: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterValue: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.slate900,
  },
  donutCenterLabel: {
    marginTop: 2,
    color: colors.slate500,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  legendWrap: {
    flex: 1,
    gap: 10,
  },
  emptyLegend: {
    color: colors.slate400,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    flex: 1,
    color: colors.slate700,
    fontWeight: '700',
  },
  legendCount: {
    color: colors.slate500,
    fontWeight: '800',
  },
  recordCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate200,
    marginBottom: 12,
  },
  recordTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  recordName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.slate900,
  },
  recordMeta: {
    marginTop: 4,
    color: colors.slate500,
    fontSize: 12,
  },
  igaBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.slate900,
  },
  igaBadgeText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  recordDiagnosis: {
    marginTop: 12,
    color: colors.slate700,
    fontWeight: '800',
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  scoreChip: {
    flex: 1,
    borderRadius: 16,
    padding: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  scoreChipWide: {
    flex: 1.6,
    borderRadius: 16,
    padding: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  scoreChipLabel: {
    color: colors.slate500,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  scoreChipValue: {
    color: colors.slate900,
    fontWeight: '800',
  },
  followUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  followUpText: {
    color: colors.amber,
    fontWeight: '800',
  },
  notes: {
    marginTop: 10,
    color: colors.slate600,
    lineHeight: 20,
  },
  cardHeaderGap: {
    marginBottom: 10,
  },
});