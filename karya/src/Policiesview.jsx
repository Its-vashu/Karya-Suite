import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from './theme/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from './AuthContext';
import { API_BASE_URL_EXPORT as API_BASE_URL } from './api';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const PoliciesView = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedPolicy, setExpandedPolicy] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Fetch policies from API
  const fetchPolicies = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/policies`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPolicies(data);
      } else {
        console.error('Failed to fetch policies:', response.status);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.token]);

  // Download policy document - Fixed version with better error handling
  const downloadPolicyDocument = useCallback(async (policyId, policyName) => {
    if (!policyId) {
      Alert.alert('Download Error', 'Invalid policy id');
      return;
    }
    
    if (downloading) return;

    const BASE = (API_BASE_URL || '').replace(/\/+$/, '');
    const url = `${BASE}/policies/${policyId}/download`;
    const safeName = (policyName || `policy-${policyId}`).replace(/[^a-z0-9_.-]/gi, '_') + '.pdf';
    
    console.log('🔽 Downloading policy:', policyId);
    console.log('📡 URL:', url);

    try {
      setDownloading(true);

      // Use FileSystem.downloadAsync like web's direct download
      console.log('� Starting download with FileSystem.downloadAsync...');
      const destUri = `${FileSystem.documentDirectory}${safeName}`;
      
      const downloadResult = await FileSystem.downloadAsync(
        url,
        destUri,
        {
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Accept': 'application/pdf'
          }
        }
      );

      console.log('📊 Download result:', downloadResult.status);
      console.log('📦 File URI:', downloadResult.uri);

      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }

      // Verify the file exists
      const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
      console.log('✅ File info:', fileInfo);
      
      if (!fileInfo.exists) {
        throw new Error('File was not saved successfully');
      }

      console.log('📊 File size:', (fileInfo.size / 1024).toFixed(1), 'KB');

      // On mobile, we need to use Share to open PDFs (Android security)
      // Direct file:// URLs don't work due to FileProvider restrictions
      const canShare = await Sharing.isAvailableAsync();
      
      if (canShare) {
        console.log('📤 Opening share dialog...');
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: policyName || 'Policy Document',
          UTI: 'com.adobe.pdf'
        });
        console.log('✅ PDF shared successfully - user can open in any PDF viewer');
      } else {
        console.warn('⚠️ Sharing not available');
        Alert.alert(
          '✅ Download Complete',
          `${policyName}\nSize: ${(fileInfo.size / 1024).toFixed(1)} KB\n\nFile saved to app storage`,
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('❌ Download error:', error);
      console.error('❌ Error details:', error.message);
      
      // Better error messages
      let errorMessage = error.message || 'Could not download the policy document';
      
      if (error.message?.includes('404')) {
        errorMessage = 'Policy document not found on server';
      } else if (error.message?.includes('500')) {
        errorMessage = 'Server error: PDF file may be missing or corrupted. Please contact admin.';
      } else if (error.message?.includes('Network request failed')) {
        errorMessage = 'Network error: Please check your internet connection';
      }
      
      Alert.alert(
        '❌ Download Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setDownloading(false);
    }
  }, [user?.token, downloading]);  // Extract unique categories from policies
  const categories = ['All', ...new Set(policies.map(policy => policy.category || policy.department).filter(Boolean))];

  // Filter policies based on search query and active category
  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = searchQuery === '' || 
      (policy.title || policy.name)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.department?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = activeCategory === 'All' || 
      policy.category === activeCategory || 
      policy.department === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPolicies();
  }, [fetchPolicies]);

  // Initial data loading
  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // Render policy item
  const renderPolicyItem = ({ item, index }) => {
    const isExpanded = expandedPolicy === (item.id || index);
    const policyName = item.title || item.name || `Policy ${index + 1}`;
    const policyCategory = item.category || item.department || 'General';

    // Calculate if the policy is new (less than 30 days old)
    const isNewPolicy = item.created_at && 
      (new Date().getTime() - new Date(item.created_at).getTime()) < (30 * 24 * 60 * 60 * 1000);
    
    // Calculate if the policy was recently updated (updated in the last 7 days)
    const isRecentlyUpdated = (item.lastUpdated || item.updated_at) && 
      (new Date().getTime() - new Date(item.lastUpdated || item.updated_at).getTime()) < (7 * 24 * 60 * 60 * 1000);

    return (
      <View style={styles.policyCard}>
        <TouchableOpacity
          style={styles.policyHeader}
          onPress={() => setExpandedPolicy(isExpanded ? null : (item.id || index))}
        >
          <View style={styles.policyHeaderLeft}>
            <MaterialIcons 
              name="description" 
              size={24} 
              color="#1976D2" 
              style={styles.policyIcon} 
            />
            <View style={styles.policyHeaderText}>
              <Text style={styles.policyTitle}>{policyName}</Text>
              <Text style={styles.policyCategory}>{policyCategory}</Text>
            </View>
          </View>
          <View style={styles.policyHeaderRight}>
            {isNewPolicy && (
              <View style={styles.newBadge}>
                <Text style={styles.badgeText}>NEW</Text>
              </View>
            )}
            {!isNewPolicy && isRecentlyUpdated && (
              <View style={styles.updatedBadge}>
                <Text style={styles.badgeText}>UPDATED</Text>
              </View>
            )}
            <MaterialIcons
              name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={24}
              color="#666"
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.policyDetails}>
            {/* Description Section */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={styles.policyDescription}>
                {item.description || "No description available."}
              </Text>
            </View>
            
            {/* Content Section */}
            {item.content && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionLabel}>Policy Content</Text>
                <View style={styles.contentBox}>
                  <Text style={styles.contentText}>
                    {item.content}
                  </Text>
                </View>
              </View>
            )}
            
            {/* Metadata Grid */}
            <View style={styles.metadataGrid}>
              <View style={styles.metadataRow}>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Department</Text>
                  <Text style={styles.metadataValue}>{item.department || policyCategory}</Text>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Category</Text>
                  <Text style={styles.metadataValue}>{item.category || 'General'}</Text>
                </View>
              </View>
              
              <View style={styles.metadataRow}>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Effective Date</Text>
                  <Text style={styles.metadataValue}>
                    {item.effective_date ? new Date(item.effective_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </Text>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Created Date</Text>
                  <Text style={styles.metadataValue}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.metadataRow}>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Last Updated</Text>
                  <Text style={styles.metadataValue}>
                    {(item.updated_at || item.lastUpdated) ? new Date(item.updated_at || item.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </Text>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Status</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Active</Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Download Button - Always show even if no file_path */}
            <TouchableOpacity 
              style={styles.downloadButton}
              onPress={() => downloadPolicyDocument(item.id, policyName)}
            >
              <MaterialIcons name="file-download" size={20} color="white" />
              <Text style={styles.downloadButtonText}>Download Policy Document</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Render category filter button
  const renderCategoryButton = (category) => {
    const count = category === 'All' 
      ? policies.length 
      : policies.filter(p => (p.category === category || p.department === category)).length;

    return (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryButton,
          activeCategory === category && styles.activeCategoryButton
        ]}
        onPress={() => setActiveCategory(category)}
      >
        <Text style={[
          styles.categoryButtonText,
          activeCategory === category && styles.activeCategoryButtonText
        ]}>
          {category}
        </Text>
        <View style={[
          styles.countBadge,
          activeCategory === category && styles.activeCountBadge
        ]}>
          <Text style={[
            styles.countBadgeText,
            activeCategory === category && styles.activeCountBadgeText
          ]}>
            {count}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerTitleText}>Company Policies</Text>
          <Text style={styles.headerSubtitle}>Guidelines and regulations</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.searchInputWrapper, { 
          backgroundColor: theme.colors.background,
          borderColor: theme.name === 'dark' ? '#2D3748' : '#E0E0E0'
        }]}>
          <MaterialIcons name="search" size={20} color={theme.colors.muted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search policies..."
            placeholderTextColor={theme.colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={theme.colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filters */}
      {categories.length > 1 && (
        <View style={styles.categoriesContainer}>
          <Text style={styles.categoriesTitle}>Filter by Department or Category</Text>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          >
            {categories.map(renderCategoryButton)}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading policies...</Text>
        </View>
      ) : filteredPolicies.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="description" size={48} color="#1976D2" style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No Policies Found</Text>
          {searchQuery || activeCategory !== 'All' ? (
            <Text style={styles.emptyText}>
              No policies match your current search criteria. Try adjusting your search or filter settings.
            </Text>
          ) : (
            <Text style={styles.emptyText}>
              There are currently no company policies available. New policies will appear here once they are published.
            </Text>
          )}

          {(searchQuery || activeCategory !== 'All') && (
            <View style={styles.emptyActions}>
              {searchQuery && (
                <TouchableOpacity 
                  style={styles.emptyActionButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.emptyActionButtonText}>Clear Search</Text>
                </TouchableOpacity>
              )}
              {activeCategory !== 'All' && (
                <TouchableOpacity 
                  style={[styles.emptyActionButton, styles.emptyPrimaryButton]}
                  onPress={() => setActiveCategory('All')}
                >
                  <Text style={[styles.emptyActionButtonText, styles.emptyPrimaryButtonText]}>Show All Policies</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.resultsInfo}>
            <Text style={styles.resultsCount}>
              Showing {filteredPolicies.length} of {policies.length} policies
              {activeCategory !== 'All' && ` in ${activeCategory}`}
            </Text>
            {searchQuery && (
              <Text style={styles.searchInfo}>
                Search results for: "{searchQuery}"
              </Text>
            )}
          </View>

          <FlatList
            data={filteredPolicies}
            keyExtractor={(item, index) => (item.id || `policy-${index}`)}
            renderItem={renderPolicyItem}
            contentContainerStyle={styles.policiesList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#1976D2',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEDF3',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 8,
    padding: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEDF3',
    backgroundColor: 'white',
  },
  categoriesTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  categoriesList: {
    paddingVertical: 4,
    flexDirection: 'row',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  activeCategoryButton: {
    backgroundColor: '#1976D2',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeCategoryButtonText: {
    color: 'white',
  },
  countBadge: {
    backgroundColor: '#DDE1E7',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  activeCountBadge: {
    backgroundColor: 'white',
  },
  countBadgeText: {
    fontSize: 10,
    color: '#666',
    fontWeight: 'bold',
  },
  activeCountBadgeText: {
    color: '#1976D2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  emptyActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F0F2F5',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  emptyPrimaryButton: {
    backgroundColor: '#1976D2',
  },
  emptyActionButtonText: {
    fontSize: 14,
    color: '#666',
  },
  emptyPrimaryButtonText: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
  resultsInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEDF3',
    backgroundColor: 'white',
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
  },
  searchInfo: {
    fontSize: 14,
    color: '#1976D2',
    marginTop: 4,
    fontStyle: 'italic',
  },
  policiesList: {
    padding: 16,
  },
  policyCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  policyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  policyIcon: {
    marginRight: 12,
  },
  policyHeaderText: {
    flex: 1,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  policyCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  policyHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  updatedBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  policyDetails: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EAEDF3',
    backgroundColor: '#FAFBFC',
  },
  detailSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  policyDescription: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
    textAlign: 'justify',
  },
  contentBox: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#1976D2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    textAlign: 'justify',
  },
  metadataGrid: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metadataItem: {
    flex: 1,
    paddingRight: 8,
  },
  metadataLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metadataValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D2',
    borderRadius: 8,
    padding: 14,
    marginTop: 16,
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  downloadButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  }
});

export default PoliciesView;
