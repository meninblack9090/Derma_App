import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dates = [14, 15, 16, 17, 18, 19, 20];
const today = 15;

const initialSlots = {
  Mon: [],
  Tue: ['9:00 AM', '10:30 AM', '2:00 PM'],
  Wed: ['9:00 AM', '11:00 AM'],
  Thu: ['10:00 AM', '3:00 PM', '4:30 PM'],
  Fri: ['9:00 AM', '1:00 PM'],
  Sat: [],
  Sun: [],
};

const bookedSlots = { Tue: ['10:30 AM'], Thu: ['10:00 AM'] };

const availableTimes = [
  '8:00 AM', '9:00 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '4:30 PM',
];

export default function ScheduleScreen() {
  const [selectedDay, setSelectedDay] = useState('Tue');
  const [slots, setSlots] = useState(initialSlots);
  const [addingSlot, setAddingSlot] = useState(false);
  const [newSlot, setNewSlot] = useState(null);
  const [saved, setSaved] = useState(false);

  const daySlots = slots[selectedDay] || [];
  const dayBooked = bookedSlots[selectedDay] || [];

  const addSlot = () => {
    if (!newSlot) return;
    if (!slots[selectedDay].includes(newSlot)) {
      setSlots((prev) => ({
        ...prev,
        [selectedDay]: [...prev[selectedDay], newSlot].sort(),
      }));
    }
    setNewSlot(null);
    setAddingSlot(false);
  };

  const removeSlot = (slot) => {
    if (dayBooked.includes(slot)) return;
    setSlots((prev) => ({
      ...prev,
      [selectedDay]: prev[selectedDay].filter((s) => s !== slot),
    }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const totalSlots = Object.values(slots).reduce((sum, s) => sum + s.length, 0);
  const totalBooked = Object.values(bookedSlots).reduce((sum, s) => sum + s.length, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Schedule</Text>
        <View style={styles.weekBadge}>
          <Text style={styles.weekText}>Apr 14–20</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Weekly calendar strip */}
        <View style={styles.calendarCard}>
          <View style={styles.calRow}>
            {days.map((day, i) => {
              const isSelected = selectedDay === day;
              const isToday = dates[i] === today;
              const hasSlots = (slots[day] || []).length > 0;
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayCol, isSelected && styles.dayColSelected]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>{day}</Text>
                  <View style={[styles.dateCircle, isSelected && styles.dateCircleSelected, isToday && !isSelected && styles.dateCircleToday]}>
                    <Text style={[styles.dateText, isSelected && styles.dateTextSelected, isToday && !isSelected && styles.dateTextToday]}>
                      {dates[i]}
                    </Text>
                  </View>
                  {hasSlots && <View style={[styles.slotDot, { backgroundColor: isSelected ? colors.white : colors.teal }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Summary stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Available Slots', value: totalSlots, color: colors.teal, bg: colors.tealLight },
            { label: 'Booked', value: totalBooked, color: colors.primary, bg: colors.primaryLight },
            { label: 'Open Today', value: (slots[selectedDay] || []).filter(s => !(bookedSlots[selectedDay] || []).includes(s)).length, color: colors.emerald, bg: colors.emeraldLight },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { borderColor: s.color + '30' }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Selected day slots */}
        <View style={styles.daySlotsHeader}>
          <Text style={styles.daySlotsTitle}>{selectedDay}, Apr {dates[days.indexOf(selectedDay)]}</Text>
          <TouchableOpacity
            style={styles.addSlotBtn}
            onPress={() => setAddingSlot(true)}
          >
            <Ionicons name="add" size={16} color={colors.white} />
            <Text style={styles.addSlotText}>Add Slot</Text>
          </TouchableOpacity>
        </View>

        {daySlots.length > 0 ? (
          <View style={styles.slotsList}>
            {daySlots.map((slot) => {
              const isBooked = dayBooked.includes(slot);
              return (
                <View key={slot} style={[styles.slotRow, isBooked && styles.slotRowBooked]}>
                  <View style={styles.slotLeft}>
                    <Ionicons
                      name={isBooked ? 'person-circle' : 'time-outline'}
                      size={16}
                      color={isBooked ? colors.teal : colors.slate500}
                    />
                    <Text style={[styles.slotTime, isBooked && styles.slotTimeBooked]}>{slot}</Text>
                    {isBooked && (
                      <View style={styles.bookedPill}>
                        <Text style={styles.bookedPillText}>Booked</Text>
                      </View>
                    )}
                  </View>
                  {!isBooked && (
                    <TouchableOpacity
                      style={styles.removeSlotBtn}
                      onPress={() => removeSlot(slot)}
                    >
                      <Ionicons name="close" size={14} color={colors.red} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptySlots}>
            <Ionicons name="calendar-outline" size={36} color={colors.slate300} />
            <Text style={styles.emptySlotsText}>No slots for {selectedDay}</Text>
            <Text style={styles.emptySlotsSubText}>Tap "Add Slot" to set your availability</Text>
          </View>
        )}

        {/* Add slot picker */}
        {addingSlot && (
          <View style={styles.slotPicker}>
            <View style={styles.slotPickerHeader}>
              <Text style={styles.slotPickerTitle}>Choose a time slot</Text>
              <TouchableOpacity onPress={() => setAddingSlot(false)}>
                <Ionicons name="close" size={18} color={colors.slate500} />
              </TouchableOpacity>
            </View>
            <View style={styles.timeGrid}>
              {availableTimes
                .filter((t) => !slots[selectedDay].includes(t))
                .map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeChip, newSlot === time && styles.timeChipSelected]}
                    onPress={() => setNewSlot(time)}
                  >
                    <Text style={[styles.timeChipText, newSlot === time && styles.timeChipTextSelected]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
            <TouchableOpacity
              style={[styles.confirmSlotBtn, !newSlot && styles.confirmSlotBtnDisabled]}
              onPress={addSlot}
              disabled={!newSlot}
            >
              <Text style={styles.confirmSlotBtnText}>Add {newSlot || 'a time'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <LinearGradient
            colors={saved ? [colors.emerald, '#059669'] : [colors.teal, colors.tealDark]}
            style={styles.saveBtnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name={saved ? 'checkmark-circle' : 'save-outline'} size={18} color={colors.white} />
            <Text style={styles.saveBtnText}>{saved ? 'Schedule Saved!' : 'Save Schedule'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.slate900 },
  weekBadge: { backgroundColor: colors.tealLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  weekText: { fontSize: 12, fontWeight: '700', color: colors.teal },

  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  calendarCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  calRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 14,
    flex: 1,
  },
  dayColSelected: { backgroundColor: colors.teal },
  dayLabel: { fontSize: 10, fontWeight: '600', color: colors.slate400 },
  dayLabelSelected: { color: 'rgba(255,255,255,0.8)' },
  dateCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dateCircleSelected: { backgroundColor: 'rgba(255,255,255,0.25)' },
  dateCircleToday: { borderWidth: 1.5, borderColor: colors.teal },
  dateText: { fontSize: 13, fontWeight: '700', color: colors.slate700 },
  dateTextSelected: { color: colors.white },
  dateTextToday: { color: colors.teal },
  slotDot: { width: 5, height: 5, borderRadius: 3 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 9, color: colors.slate400, fontWeight: '600', textAlign: 'center', marginTop: 2 },

  daySlotsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  daySlotsTitle: { fontSize: 14, fontWeight: '700', color: colors.slate800 },
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.teal,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  addSlotText: { fontSize: 12, fontWeight: '700', color: colors.white },

  slotsList: { gap: 8, marginBottom: 16 },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  slotRowBooked: { borderColor: colors.tealMid, backgroundColor: colors.tealLight },
  slotLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotTime: { fontSize: 13, fontWeight: '600', color: colors.slate700 },
  slotTimeBooked: { color: colors.tealDark },
  bookedPill: { backgroundColor: colors.teal, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  bookedPillText: { fontSize: 10, fontWeight: '700', color: colors.white },
  removeSlotBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptySlots: { alignItems: 'center', paddingVertical: 32, gap: 6, marginBottom: 16 },
  emptySlotsText: { fontSize: 14, fontWeight: '700', color: colors.slate500 },
  emptySlotsSubText: { fontSize: 12, color: colors.slate400 },

  slotPicker: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.tealMid,
    marginBottom: 16,
  },
  slotPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  slotPickerTitle: { fontSize: 14, fontWeight: '700', color: colors.slate800 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.slate50,
    borderWidth: 1.5,
    borderColor: colors.slate200,
  },
  timeChipSelected: { backgroundColor: colors.tealLight, borderColor: colors.teal },
  timeChipText: { fontSize: 12, fontWeight: '500', color: colors.slate600 },
  timeChipTextSelected: { color: colors.tealDark, fontWeight: '700' },
  confirmSlotBtn: {
    backgroundColor: colors.teal,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmSlotBtnDisabled: { backgroundColor: colors.slate300 },
  confirmSlotBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },

  saveBtn: { borderRadius: 18, overflow: 'hidden' },
  saveBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: colors.white },
});
