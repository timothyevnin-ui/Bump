import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { fonts, softShadow } from '@/constants/theme';
import { usePalette } from '@/hooks/useTheme';
import { haptics } from '@/utils/haptics';

/**
 * Three tabs, on purpose. Today, Add, Settings — nothing else ships in the
 * MVP, because the simplicity is the product.
 */
export default function TabsLayout() {
  const palette = usePalette();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textTertiary,
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 11 },
        sceneStyle: { backgroundColor: palette.background },
        tabBarStyle: {
          backgroundColor: palette.card,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'sunny' : 'sunny-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarAccessibilityLabel: 'Add a reminder',
          tabBarIcon: () => (
            <View style={[styles.addButton, { backgroundColor: palette.accent }, softShadow(palette, 2)]}>
              <Ionicons name="add" size={28} color={palette.accentText} />
            </View>
          ),
        }}
        listeners={{
          // The middle tab is a button, not a destination — it opens the
          // full-screen composer with the keyboard already up.
          tabPress: (event) => {
            event.preventDefault();
            haptics.commit();
            router.push('/compose');
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
  },
});
