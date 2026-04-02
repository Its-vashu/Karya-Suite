import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { API_BASE_URL_EXPORT } from '../api';

// Use properly configured BASE_URL from api.js (includes forced live URL)
const API_BASE = API_BASE_URL_EXPORT;

const ViewDownloadMom = () => {
  const { token } = useAuth() || {};
  const mounted = useRef(true);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    mounted.current = true;
    fetchMomList();
    return () => { mounted.current = false; };
  }, []);

  const fetchMomList = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/mom/`;
      const res = await axios.get(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!mounted.current) return;
      const data = Array.isArray(res.data) ? res.data : res.data.items || [];
      setItems(data);
    } catch (err) {
      console.warn('fetchMomList error', err?.response || err.message || err);
      if (!mounted.current) return;
      setError('Unable to load MoMs');
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const openDownload = async (id) => {
    try {
      const url = `${API_BASE}/mom/${encodeURIComponent(id)}/download`;
      // Prefer opening in external browser which handles downloads
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot open', 'Unable to open download URL.');
      }
    } catch (e) {
      console.warn('openDownload error', e);
      Alert.alert('Error', 'Could not open download.');
    }
  };

  const renderItem = ({ item }) => {
    const id = item.id || item._id || item.uuid || item.mom_id || '';
    const title = item.title || item.name || 'Untitled MoM';
    const date = item.date ? new Date(item.date).toLocaleString() : '-';
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>Date: {date}</Text>
        </View>
        <TouchableOpacity style={styles.downloadBtn} onPress={() => openDownload(id)}>
          <Text style={styles.downloadText}>Open</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (error) return (
    <View style={styles.center}><Text style={styles.error}>{error}</Text><TouchableOpacity onPress={fetchMomList} style={styles.retry}><Text style={{ color: 'white' }}>Retry</Text></TouchableOpacity></View>
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={(it, i) => String(it.id || it._id || i)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<View style={styles.center}><Text style={styles.empty}>No MoMs available</Text></View>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  meta: { color: '#64748b', fontSize: 12 },
  downloadBtn: { backgroundColor: '#0ea5a4', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  downloadText: { color: 'white', fontWeight: '700' },
  error: { color: '#ef4444', marginBottom: 8 },
  retry: { backgroundColor: '#0f1724', padding: 8, borderRadius: 6 },
  empty: { color: '#64748b' },
});

export default ViewDownloadMom;
