import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DROPDOWN_WIDTH = Math.min(SCREEN_WIDTH - 40, 340);

/**
 * NotificationBell — reusable bell icon with animated badge + dropdown panel.
 *
 * Props
 * ──────
 * @param {'patient' | 'derma'} role          Controls the accent colour.
 * @param {Array}               notifications Array of { id, title, subtitle, icon, time, read? }
 * @param {Function}            [onPress]     Called with the notification when tapped.
 */
export default function NotificationBell({
  role = 'patient',
  notifications: initialNotifications = [],
  onPress,
}) {
  const accent = role === 'derma' ? colors.teal : colors.primary;
  const [notifications, setNotifications] = useState(initialNotifications);
  const [visible, setVisible] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Keep in sync if parent changes the list
  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  // ─── Badge animations ────────────────────────────────────────────────────────
  const badgeScale = useRef(new Animated.Value(unreadCount > 0 ? 1 : 0)).current;
  const bellShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(badgeScale, {
      toValue: unreadCount > 0 ? 1 : 0,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }, [unreadCount]);

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(bellShake, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(bellShake, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(bellShake, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(bellShake, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(bellShake, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [bellShake]);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const toggleDropdown = () => {
    shake();
    // When opening the modal immediately after the bell press, the
    // overlay's onPress can receive the same click/tap and close it
    // instantly (especially on web). Delay opening slightly to avoid
    // that race and keep the dropdown visible for the user.
    if (!visible) {
      setTimeout(() => setVisible(true), 50);
    } else {
      setVisible(false);
    }
  };

  const handleNotificationPress = (notif) => {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
    );
    onPress?.(notif);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Bell button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={toggleDropdown}
        style={styles.bellBtn}
      >
        <Animated.View style={{ transform: [{ rotate: bellShake.interpolate({
          inputRange: [-12, 12],
          outputRange: ['-12deg', '12deg'],
        }) }] }}>
          <Ionicons
            name={visible ? 'notifications' : 'notifications-outline'}
            size={22}
            color={visible ? accent : colors.slate600}
          />
        </Animated.View>

        {/* Badge */}
        {unreadCount > 0 && (
          <Animated.View
            style={[
              styles.badge,
              {
                backgroundColor: colors.red,
                transform: [{ scale: badgeScale }],
              },
            ]}
          >
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* Dropdown modal */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.dropdownAnchor}>
            {/* Notch / arrow */}
            <View style={[styles.dropdownArrow, { borderBottomColor: colors.white }]} />

            <View style={styles.dropdown}>
              {/* Header */}
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Notifications</Text>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllRead}>
                    <Text style={[styles.markAll, { color: accent }]}>Mark all read</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Items */}
              <ScrollView
                style={styles.dropdownScroll}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {notifications.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="notifications-off-outline" size={36} color={colors.slate300} />
                    <Text style={styles.emptyText}>No notifications</Text>
                  </View>
                ) : (
                  notifications.map((n) => {
                    const isUnread = !n.read;
                    return (
                      <TouchableOpacity
                        key={n.id}
                        style={[
                          styles.notifItem,
                          isUnread && { backgroundColor: role === 'derma' ? colors.tealLight : colors.primaryLight },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => handleNotificationPress(n)}
                      >
                        <View style={[styles.notifIcon, { backgroundColor: isUnread ? accent + '18' : colors.slate100 }]}>
                          <Ionicons
                            name={n.icon || 'notifications-outline'}
                            size={18}
                            color={isUnread ? accent : colors.slate400}
                          />
                        </View>
                        <View style={styles.notifContent}>
                          <Text
                            style={[
                              styles.notifTitle,
                              isUnread && { fontWeight: '700', color: colors.slate900 },
                            ]}
                            numberOfLines={1}
                          >
                            {n.title}
                          </Text>
                          {n.subtitle ? (
                            <Text style={styles.notifSub} numberOfLines={2}>
                              {n.subtitle}
                            </Text>
                          ) : null}
                          {n.time ? (
                            <Text style={styles.notifTime}>{n.time}</Text>
                          ) : null}
                        </View>
                        {isUnread && <View style={[styles.unreadDot, { backgroundColor: accent }]} />}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    position: 'relative',
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.slate200,
  },

  // Badge
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.red,
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.white,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

  // Dropdown positioning
  dropdownAnchor: {
    position: 'absolute',
    top: 100,                       // below header area
    right: 20,
    width: DROPDOWN_WIDTH,
    alignItems: 'flex-end',
  },
  dropdownArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginRight: 14,
    marginBottom: -1,
  },

  dropdown: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
    overflow: 'hidden',
  },

  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate900,
  },
  markAll: {
    fontSize: 12,
    fontWeight: '600',
  },

  dropdownScroll: {
    maxHeight: 340,
  },

  // Notification item
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
    gap: 2,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate700,
  },
  notifSub: {
    fontSize: 11,
    color: colors.slate500,
    lineHeight: 16,
  },
  notifTime: {
    fontSize: 10,
    color: colors.slate400,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.slate400,
    fontWeight: '500',
  },
});
