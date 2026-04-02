import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from './theme/ThemeContext';

const Settings = ({ navigation }) => {
  const { theme, mode, toggle, setMode } = useTheme();
  return (
  <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
  <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.card }]}> 
        {/* Theme toggle */}
        <View style={[styles.row, { borderBottomColor: theme.colors.card }]}>
          <Text style={[styles.rowText, { color: theme.colors.text }]}>Dark mode</Text>
          <Switch
            value={mode === 'dark'}
            onValueChange={() => toggle()}
            thumbColor={theme.colors.primary}
            trackColor={{ false: theme.colors.card, true: theme.colors.accent }}
          />
        </View>
        <TouchableOpacity style={[styles.row, { borderBottomColor: theme.colors.card }]} onPress={() => Alert.alert('Not implemented', 'Change password coming soon')}>
          <Text style={[styles.rowText, { color: theme.colors.text }]}>Change password</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.row, { borderBottomColor: theme.colors.card }]} onPress={() => Alert.alert('Not implemented', 'Notification preferences coming soon')}>
          <Text style={[styles.rowText, { color: theme.colors.text }]}>Notification preferences</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.row, { borderBottomColor: theme.colors.card }]} onPress={() => Alert.alert('Not implemented', 'Privacy settings coming soon')}>
          <Text style={[styles.rowText, { color: theme.colors.text }]}>Privacy settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backButton: { padding: 8 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  card: { borderRadius: 12, padding: 8, elevation: 1, borderWidth: 1 },
  row: { padding: 14, borderBottomWidth: 1 },
  rowText: { fontSize: 15 }
});

export default Settings;
