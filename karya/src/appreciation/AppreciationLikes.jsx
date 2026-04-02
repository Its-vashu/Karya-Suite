import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, SafeAreaView, Platform, StatusBar } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { dataAPI } from '../api';
import { useNavigation } from '@react-navigation/native';

const AppreciationLikes = ({ route }) => {
  const navigation = useNavigation();
  const { appreciationId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        if (!appreciationId) return setLikes([]);
        const res = await dataAPI.get(`/appreciation/${appreciationId}/likes`);
        // backend may return { likes: [...] } or an array
        const list = Array.isArray(res) ? res : (res?.likes || res?.data || res?.results || []);
        if (mounted) setLikes(Array.isArray(list) ? list : []);
      } catch (e) {
        console.warn('Failed to fetch likes for', appreciationId, e?.message || e);
        setError('Failed to load likes');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [appreciationId]);

  const renderItem = ({ item }) => {
    // item shape may vary; try common fields
    const name = item.username || item.full_name || item.name || item.display_name || item.user || 'User';
    const avatar = item.avatar || item.profile_image || item.photo || item.image || item.avatar_url || null;
    return (
      <View style={styles.row}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}><MaterialIcons name="person" size={20} color="#546E7A" /></View>
        )}
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.name}>{name}</Text>
          {item.role ? <Text style={styles.sub}>{item.role}</Text> : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, Platform.OS === 'android' ? { paddingTop: StatusBar.currentHeight || 8 } : null]}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Likes</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loading}><ActivityIndicator size="large" color="#1976D2" /></View>
        ) : error ? (
          <View style={styles.loading}><Text style={{ color: '#D32F2F' }}>{error}</Text></View>
        ) : (
          <FlatList
            data={likes}
            keyExtractor={(i, idx) => String(i?.id ?? i?.user_id ?? i?.likes_id ?? idx)}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 12 }}
            ListEmptyComponent={() => (<View style={{ padding: 20, alignItems: 'center' }}><Text style={{ color: '#9CA3AF' }}>No likes yet</Text></View>)}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1976D2', paddingHorizontal: 12, paddingVertical: 12 },
  back: { padding: 6 },
  title: { color: '#FFFFFF', fontWeight: '700', fontSize: 18 },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ECEFF1', justifyContent: 'center', alignItems: 'center' },
  name: { fontWeight: '700', color: '#263238' },
  sub: { color: '#90A4AE', fontSize: 12 }
});

export default AppreciationLikes;
