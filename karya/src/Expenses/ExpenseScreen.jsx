/**
 * ExpenseScreen.jsx
 * Complete Employee Expense Management (single file solution)
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Image,
  Linking,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { dataAPI, API_BASE_URL_EXPORT as API_BASE_URL } from '../api';
import apiExpense from '../apiExpense';
import MyClaims from './MyClaims';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const ExpenseScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Main navigation state
  const [activeView, setActiveView] = useState('claims'); // 'claims', 'new-claim'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  
  // Data states
  const [claims, setClaims] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reimbursements, setReimbursements] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState(null);
  const [selectedClaim, setSelectedClaim] = useState(null);
  
  // Form states for new claim
  const [claimTitle, setClaimTitle] = useState('');
  const [claimDescription, setClaimDescription] = useState('');
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseItems, setExpenseItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    category_id: '',
    description: '',
    // amount: formatted display string (e.g. "1,234.56")
    amount: '',
    // amountRaw: numeric value used for calculations/submission (e.g. 1234.56)
    amountRaw: 0,
    expense_date: new Date().toISOString().split('T')[0],
    vendor: '',
    receipt_number: '',
    receipt: null
  });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Selected claim details (items/documents)
  const [selectedClaimItems, setSelectedClaimItems] = useState([]);
  const [selectedClaimDocuments, setSelectedClaimDocuments] = useState([]);
  const [claimDetailsLoading, setClaimDetailsLoading] = useState(false);
  const [claimDetailsError, setClaimDetailsError] = useState(null);

  // Default categories
  const defaultCategories = [
    { id: 1, name: 'Software & Subscriptions', icon: '💻' },
    { id: 2, name: 'Hardware & Equipment', icon: '🖥️' },
    { id: 3, name: 'Office Supplies', icon: '📋' },
    { id: 4, name: 'Travel & Transportation', icon: '✈️' },
    { id: 5, name: 'Meals & Entertainment', icon: '🍽️' },
    { id: 6, name: 'Training & Certification', icon: '🎓' },
    { id: 7, name: 'Internet & Communication', icon: '📱' },
    { id: 8, name: 'Books & Learning', icon: '📚' },
    { id: 9, name: 'Marketing & Promotion', icon: '📈' },
    { id: 10, name: 'Professional Services', icon: '⚖️' },
    { id: 11, name: 'Health & Wellness', icon: '🏥' },
    { id: 12, name: 'Miscellaneous', icon: '📦' }
  ];

  // Map category names (lowercase) to MaterialCommunityIcons glyphs and colors
  const categoryIconMap = {
    'books & learning': { name: 'book-open-variant', color: '#60A5FA' },
    'books & resources': { name: 'book-open-variant', color: '#60A5FA' },
    'hardware & equipment': { name: 'desktop-classic', color: '#94A3B8' },
    'software & subscriptions': { name: 'laptop', color: '#7C3AED' },
    'office supplies': { name: 'clipboard-text-outline', color: '#F59E0B' },
    'travel & transportation': { name: 'airplane', color: '#38BDF8' },
    'meals & entertainment': { name: 'silverware-fork-knife', color: '#FB923C' },
    'training & certification': { name: 'school', color: '#10B981' },
    'internet & communication': { name: 'cellphone', color: '#06B6D4' },
    'marketing & promotion': { name: 'chart-line', color: '#F97316' },
    'marketing & advertising': { name: 'bullhorn', color: '#F97316' },
    'professional services': { name: 'scale-balance', color: '#F43F5E' },
    'health & wellness': { name: 'hospital-box', color: '#EF4444' },
    'miscellaneous': { name: 'cube-outline', color: '#94A3B8' }
  };

  // Helper: convert 6-digit hex (#RRGGBB) to rgba(r,g,b,a)
  const getAlphaColor = (hex, alpha = 0.12) => {
    try {
      const cleaned = (hex || '#000000').replace('#', '');
      const r = parseInt(cleaned.substring(0,2), 16);
      const g = parseInt(cleaned.substring(2,4), 16);
      const b = parseInt(cleaned.substring(4,6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch (e) {
      return `rgba(0,0,0,${alpha})`;
    }
  };

  // Payment methods intentionally removed for simplified mobile flow (kept on web)

  // Note: Mock claims data removed - now using real data from backend

  useEffect(() => {
    loadInitialData();
  }, []);

  // When selectedClaim changes, fetch its items and documents to display in modal
  useEffect(() => {
    const loadSelectedClaimDetails = async (claim) => {
      if (!claim || !claim.id) {
        setSelectedClaimItems([]);
        setSelectedClaimDocuments([]);
        return;
      }

      setClaimDetailsError(null);
      setClaimDetailsLoading(true);
      try {
        // Items
        let items = [];
        try {
          const resp = await dataAPI.get(`/api/expense/claims/${claim.id}/items`);
          items = Array.isArray(resp) ? resp : (resp.items || resp.data || []);
        } catch (itemsErr) {
          console.log('Could not fetch items; falling back to claim.items if present', itemsErr?.message || itemsErr);
          items = claim.items || [];
        }

        // Documents
        let documents = [];
        try {
          console.log(`📥 Fetching documents for claim ID: ${claim.id}`);
          const docs = await dataAPI.get(`/api/expense/documents/${claim.id}/`);
          console.log('📥 Raw documents response:', docs);
          documents = Array.isArray(docs) ? docs : (docs.items || docs.data || []);
          console.log(`✅ Loaded ${documents.length} documents:`, documents);
        } catch (docErr) {
          console.log('❌ No documents found for claim or endpoint missing', docErr?.message || docErr);
          documents = [];
        }

        setSelectedClaimItems(Array.isArray(items) ? items : []);
        setSelectedClaimDocuments(Array.isArray(documents) ? documents : []);
      } catch (err) {
        console.error('Failed to load selected claim details:', err);
        setClaimDetailsError('Unable to load claim details');
      } finally {
        setClaimDetailsLoading(false);
      }
    };

    loadSelectedClaimDetails(selectedClaim);
  }, [selectedClaim]);

  // Fetch categories on demand (used by modal open and initial load)
  const fetchCategories = async () => {
    setCategoryError(null);
    setCategoryLoading(true);
    try {
      const fetched = await dataAPI.get('/api/expense/categories');
      if (Array.isArray(fetched) && fetched.length > 0) {
        const backendCategories = fetched.map(c => ({ id: Number(c.id), name: c.category_name || c.name, icon: c.icon || '📋' }));
        setCategories(backendCategories);
        console.log(`📋 Fetched ${backendCategories.length} categories from API`);
      } else {
        // keep existing categories (loadInitialData will have set defaults)
        console.log('📋 Categories endpoint returned empty list, keeping existing categories');
      }
    } catch (err) {
      console.warn('📋 Error fetching categories:', err?.message || err);
      setCategoryError('Unable to load categories');
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleOpenCategoryModal = async () => {
    setShowCategoryModal(true);
    // If we don't have categories yet or only have defaults, try fetching fresh ones
    if (!categories || categories.length === 0 || (categories.length > 0 && categories[0]?.id === undefined)) {
      await fetchCategories();
    }
  };

  // Download document function (similar to Policies download)
  const handleDownloadDocument = async (doc, fileName) => {
    try {
      console.log('📥 Starting document download:', fileName);
      console.log('📄 Document object:', JSON.stringify(doc, null, 2));
      
      // Construct proper URL
      let fileUrl = null;
      if (doc.url) {
        fileUrl = doc.url;
      } else if (doc.file_url) {
        fileUrl = doc.file_url;
      } else if (doc.file_path) {
        let cleanPath = doc.file_path.replace(/\\/g, '/');
        if (cleanPath.startsWith('./')) cleanPath = cleanPath.substring(2);
        if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
        const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
        fileUrl = `${baseUrl}/${cleanPath}`;
      }

      if (!fileUrl) {
        Alert.alert('Error', 'Document URL not available');
        console.error('❌ No URL constructed from doc:', doc);
        return;
      }

      console.log('🔗 Download URL:', fileUrl);
      console.log('🔗 API_BASE_URL:', API_BASE_URL);

      // Get auth token for protected files
      const token = user?.token || user?.access_token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      console.log('🔑 Using auth headers:', headers);

      // Determine file extension
      const fileExtension = fileName.split('.').pop() || 'pdf';
      const localFileName = `expense_doc_${Date.now()}.${fileExtension}`;
      const downloadPath = FileSystem.documentDirectory + localFileName;

      console.log('⬇️ Downloading to:', downloadPath);

      // Show loading alert
      Alert.alert('Downloading...', 'Please wait while we download the document.');

      // Download file
      const downloadResult = await FileSystem.downloadAsync(
        fileUrl,
        downloadPath,
        { headers }
      );

      console.log('✅ Download result:', JSON.stringify(downloadResult, null, 2));
      console.log('📁 Downloaded to URI:', downloadResult.uri);
      console.log('📊 HTTP Status:', downloadResult.status);

      // Check if download was successful
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      // Check if file exists and get info
      const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
      console.log('📄 File info:', JSON.stringify(fileInfo, null, 2));
      
      if (!fileInfo.exists) {
        throw new Error('Downloaded file not found on device');
      }

      if (fileInfo.size === 0) {
        throw new Error('Downloaded file is empty (0 bytes)');
      }

      console.log('📄 File size:', fileInfo.size, 'bytes');
      console.log('📄 File URI:', fileInfo.uri);

      // Share the file
      const canShare = await Sharing.isAvailableAsync();
      console.log('📤 Sharing available:', canShare);
      
      if (canShare) {
        console.log('📤 Opening share dialog...');
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/octet-stream',
          dialogTitle: 'Open Document',
          UTI: 'public.item'
        });
        console.log('✅ File shared successfully');
      } else {
        Alert.alert('Success', `Document downloaded to: ${localFileName}\n\nSize: ${Math.round(fileInfo.size / 1024)} KB`);
      }

    } catch (error) {
      console.error('❌ Download error:', error);
      console.error('❌ Error stack:', error.stack);
      Alert.alert(
        'Download Failed',
        `Could not download document: ${error.message}\n\nFile: ${fileName}\n\nPlease check:\n- Backend server is running\n- File exists on server\n- You have internet connection`
      );
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading expense claims from backend...');
      
      // Use your existing dataAPI to fetch expense claims and reimbursements filtered by user_id
      try {
        const userId = user?.id || user?.user_id || user?.userId || null;
        console.log('📝 User ID for expense claims:', userId);
        
        if (userId) {
          // include both keys: user_id (used by reimbursements endpoint) and submitter_id (backend expects this for claims)
          const params = { user_id: userId, submitter: userId, submitter_id: userId };
          const [claimsResp, reimbursementsResp] = await Promise.all([
            dataAPI.get('/api/expense/claims', { params }),
            dataAPI.get('/api/expense/reimbursements', { params })
          ].map(p => p.catch(e => { console.warn('Partial fetch failed:', e?.message || e); return { data: [] };})));

          console.log('📦 Raw claims response:', claimsResp);
          console.log('📦 Raw reimbursements response:', reimbursementsResp);

          // dataAPI.get already returns response.data, so check if it's array or has nested data
          const normalizedClaims = Array.isArray(claimsResp) ? claimsResp : 
                                   Array.isArray(claimsResp?.data) ? claimsResp.data :
                                   Array.isArray(claimsResp?.items) ? claimsResp.items : [];
          
          const normalizedReimbursements = Array.isArray(reimbursementsResp) ? reimbursementsResp : 
                                          Array.isArray(reimbursementsResp?.data) ? reimbursementsResp.data :
                                          Array.isArray(reimbursementsResp?.items) ? reimbursementsResp.items : [];

          setClaims(normalizedClaims);
          setReimbursements(normalizedReimbursements);
          console.log(`✅ Successfully loaded ${normalizedClaims.length} expense claims for user ${userId}`);
        } else {
          const claimsResp = await dataAPI.get('/api/expense/claims');
          console.log('📦 Raw claims response (no user filter):', claimsResp);
          
          const normalizedClaims = Array.isArray(claimsResp) ? claimsResp : 
                                   Array.isArray(claimsResp?.data) ? claimsResp.data :
                                   Array.isArray(claimsResp?.items) ? claimsResp.items : [];
          
          setClaims(normalizedClaims);
          console.log(`✅ Successfully loaded ${normalizedClaims.length} expense claims (no user filter)`);
        }
      } catch (apiError) {
        console.log('❌ Backend API failed:', apiError.message || apiError);
        console.log('❌ Full error:', apiError);
        setError('Unable to connect to backend server');
        setClaims([]);
        setReimbursements([]);
      }
      
      // Try to load categories from backend
      try {
        const categories = await dataAPI.get('/api/expense/categories');
        if (categories && categories.length > 0) {
          const formattedCategories = categories.map(cat => ({
            id: cat.id,
            name: cat.category_name || cat.name,
            icon: '📋'
          }));
          setCategories(formattedCategories);
          console.log(`📋 Loaded ${categories.length} categories from backend`);
        } else {
          setCategories(defaultCategories);
          console.log('📋 Using default categories');
        }
      } catch (catError) {
        console.log('📋 Categories API failed, using defaults:', catError.message);
        setCategories(defaultCategories);
      }
      
    } catch (error) {
      console.error('❌ Error in loadInitialData:', error);
      setError('Failed to load expense data');
      setClaims([]);
      setCategories(defaultCategories);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  // Helper functions
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'pending': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  // Map payment method keys to display names
  const paymentMethodName = (key) => {
    const map = {
      personal_card: 'Personal Card',
      company_card: 'Company Card',
      cash: 'Cash',
      bank_transfer: 'Bank Transfer'
    };
    return map[key] || key || '';
  };

  const getCategoryNameById = (catId) => {
    if (!catId) return '';
    const c = categories.find(c => Number(c.id) === Number(catId));
    return c ? (c.category_name || c.name || c.title || c.label || '') : '';
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'check-circle';
      case 'rejected': return 'cancel';
      case 'pending': return 'schedule';
      default: return 'description';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Helper to format amount strings to two decimals for display
  const formatAmountForDisplay = (val) => {
    const n = parseFloat(String(val).replace(/,/g, ''));
    if (!Number.isFinite(n)) return '';
    return Number(n).toFixed(2);
  };

  const capitalize = (s) => {
    if (!s) return '';
    return String(s).split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Normalize status - treat draft as pending since we removed draft from UI
  const normalizeStatus = (status) => {
    const normalizedStatus = status?.toLowerCase();
    if (normalizedStatus === 'draft') {
      return 'pending';
    }
    return normalizedStatus;
  };

  // Filter claims based on status
  const getFilteredClaims = () => {
    if (statusFilter === 'all') {
      return claims;
    }
    return claims.filter(claim => normalizeStatus(claim.status) === statusFilter);
  };

  // Get counts for each status
  const getStatusCounts = () => {
    return {
      all: claims.length,
      pending: claims.filter(c => normalizeStatus(c.status) === 'pending').length,
      approved: claims.filter(c => normalizeStatus(c.status) === 'approved').length,
      rejected: claims.filter(c => normalizeStatus(c.status) === 'rejected').length,
    };
  };

  // Form handlers
  const selectCategory = (category) => {
    // Ensure category_id is stored as a number (backend expects numeric ids)
    setCurrentItem({...currentItem, category_id: Number(category.id)});
    setShowCategoryModal(false);
  };

  // Live amount input handler: keeps a formatted display string and a raw numeric value
  const handleAmountChange = (text) => {
    const incoming = String(text || '');
    // Allow only digits and dot
    let sanitized = incoming.replace(/[^0-9.]/g, '');
    if (sanitized === '') {
      setCurrentItem({ ...currentItem, amount: '', amountRaw: 0 });
      return;
    }

    // Ensure only one dot
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }

    const [intPart, decPart] = sanitized.split('.');
    // Remove leading zeros from integer part (but keep single zero)
    const cleanedInt = intPart ? intPart.replace(/^0+(?=\d)/, '') : '0';
    const intNumber = cleanedInt ? Number(cleanedInt) : 0;
    const formattedInt = new Intl.NumberFormat('en-IN').format(intNumber);

    let display = formattedInt;
    if (typeof decPart !== 'undefined' && decPart !== null && decPart !== '') {
      // preserve user typed decimals (limit to 2 places while typing)
      const limitedDec = decPart.slice(0, 2);
      display = `${formattedInt}.${limitedDec}`;
    }

    const raw = Number(sanitized) || 0;
    setCurrentItem({ ...currentItem, amount: display, amountRaw: raw });
  };

  const selectExpenseDate = (date) => {
    setCurrentItem({...currentItem, expense_date: date.toISOString().split('T')[0]});
    setSelectedDate(date);
    setShowDatePicker(false);
  };

  const openDatePicker = () => {
    // Set the initial date for the picker
    const currentExpenseDate = currentItem.expense_date ? new Date(currentItem.expense_date) : new Date();
    setSelectedDate(currentExpenseDate);
    setShowDatePicker(true);
  };

  // Debug helper: prints current runtime state for troubleshooting
  const debugDump = () => {
    console.log('--- DEBUG DUMP ---');
    console.log('Auth user:', JSON.stringify(user, null, 2));
    console.log('Categories:', JSON.stringify(categories, null, 2));
    console.log('Expense Items:', JSON.stringify(expenseItems, null, 2));
    Alert.alert('Debug', 'Printed user, categories and expenseItems to console/logcat');
  };

  const addExpenseItem = () => {
    if (!currentItem.category_id || !currentItem.description || !currentItem.amount) {
      Alert.alert('Error', 'Please fill all required fields (Category, Description, Amount)');
      return;
    }

    // Validate expense date is not in the future
    const expenseDate = new Date(currentItem.expense_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (expenseDate > today) {
      Alert.alert('Error', 'Expense date cannot be in the future');
      return;
    }

    const newItem = {
      ...currentItem,
      id: Date.now(),
      category_name: categories.find(c => c.id === currentItem.category_id)?.name || 
                     categories.find(c => c.id === parseInt(currentItem.category_id))?.name || 'Unknown',
      // use amountRaw (numeric) for calculations/submission
      amount: Number(currentItem.amountRaw) || 0,
      vendor_name: currentItem.vendor || '', // Map vendor to vendor_name
      business_purpose: currentItem.description // Add business purpose
    };

    setExpenseItems([...expenseItems, newItem]);
    setCurrentItem({
      category_id: '',
      description: '',
      amount: '',
      amountRaw: 0,
      expense_date: new Date().toISOString().split('T')[0],
      vendor: '',
      receipt_number: '',
      receipt: null
    });
    
    console.log('✅ Expense item added:', newItem);
  };

  const removeExpenseItem = (itemId) => {
    setExpenseItems(expenseItems.filter(item => item.id !== itemId));
  };

  const pickImage = () => {
    Alert.alert(
      'Select Receipt',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => takePhoto() },
        { text: 'Gallery', onPress: () => openGallery() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
        exif: false,
      });

      if (result.canceled) return;
      const asset = result.assets && result.assets[0];
      if (asset) {
        const normalized = { uri: asset.uri, fileName: asset.fileName || asset.uri.split('/').pop(), type: asset.type || 'image' };
        setCurrentItem(prev => ({ ...prev, receipt: normalized }));
      }
    } catch (err) {
      console.error('takePhoto failed', err);
      Alert.alert('Error', 'Unable to open camera');
    }
  };

  const openGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Storage permission is required to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
        exif: false,
      });

      if (result.canceled) return;
      const asset = result.assets && result.assets[0];
      if (asset) {
        const normalized = { uri: asset.uri, fileName: asset.fileName || asset.uri.split('/').pop(), type: asset.type || 'image' };
        setCurrentItem(prev => ({ ...prev, receipt: normalized }));
      }
    } catch (err) {
      console.error('openGallery failed', err);
      Alert.alert('Error', 'Unable to open gallery');
    }
  };

  // Admin/Manager actions: approve or reject selected claim
  const handleApproveClaim = async (claimId) => {
    if (!claimId) return;
    if (!user || !(user.role === 'admin' || user.role === 'manager')) {
      Alert.alert('Permission denied', 'You do not have permission to approve claims');
      return;
    }
    try {
      setClaimDetailsLoading(true);
      await dataAPI.post(`/api/expense/claims/${claimId}/approve`, { approved_by: user.id });
      Alert.alert('Claim Approved', 'The claim was approved successfully');
      await loadInitialData();
      setSelectedClaim(null);
    } catch (err) {
      console.error('Approve claim failed:', err);
      Alert.alert('Error', 'Unable to approve claim');
    } finally {
      setClaimDetailsLoading(false);
    }
  };

  const handleRejectClaim = async (claimId) => {
    if (!claimId) return;
    if (!user || !(user.role === 'admin' || user.role === 'manager')) {
      Alert.alert('Permission denied', 'You do not have permission to reject claims');
      return;
    }
    Alert.alert(
      'Reject Claim',
      'Are you sure you want to reject this claim? A reason will be recorded (default: Rejected via Mobile).',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: async () => {
            const reason = 'Rejected via Mobile';
            try {
              setClaimDetailsLoading(true);
              await dataAPI.post(`/api/expense/claims/${claimId}/reject`, { rejected_by: user.id, reason });
              Alert.alert('Claim Rejected', 'The claim was rejected');
              await loadInitialData();
              setSelectedClaim(null);
            } catch (err) {
              console.error('Reject claim failed:', err);
              Alert.alert('Error', 'Unable to reject claim');
            } finally {
              setClaimDetailsLoading(false);
            }
          }
        }
      ]
    );
  };

  const submitClaim = async () => {
    if (!claimTitle || expenseItems.length === 0) {
      Alert.alert('Error', 'Please add claim title and at least one expense item');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting claim submission...');

      // Resolve user / employee id
      let resolvedUserId = user?.id || null;
      let resolvedEmployeeId = null;

      if (!resolvedUserId && user?.email) {
        try {
          const profile = await dataAPI.get(`/api/expense/user-profile/${encodeURIComponent(user.email)}`);
          resolvedUserId = profile?.id || profile?.user?.id || profile?.profile?.user?.id || null;
          resolvedEmployeeId = profile?.profile?.employee?.id || profile?.employee?.id || null;
          console.log('🔎 Resolved profile from server:', { resolvedUserId, resolvedEmployeeId });
        } catch (profileErr) {
          console.warn('⚠️ Could not resolve profile from server:', profileErr?.message || profileErr);
        }
      }

      if (!resolvedEmployeeId && user?.employee_id) resolvedEmployeeId = user.employee_id;
      if (!resolvedEmployeeId && resolvedUserId) resolvedEmployeeId = resolvedUserId;

      if (!resolvedEmployeeId) {
        setError('Unable to resolve employee id for submission. Please ensure your account is linked.');
        Alert.alert('Error', 'Unable to resolve employee id for submission. Please ensure your account is linked.');
        return;
      }

      // Prepare claim data (backend requires user_id and total_amount)
  const totalAmountForClaim = expenseItems.reduce((s, it) => s + (Number(it.amount) || 0), 0);
      const claimData = {
        user_id: resolvedUserId ? Number(resolvedUserId) : Number(resolvedEmployeeId),
        title: claimTitle,
        description: claimDescription || '',
        claim_date: claimDate,
        total_amount: Number(totalAmountForClaim.toFixed(2)),
        currency: 'INR'
      };

      console.log('📋 Claim Data:', JSON.stringify(claimData, null, 2));

      // Create claim
      let createdClaim;
      try {
        console.log('⬆️ Creating claim - payload:', JSON.stringify(claimData, null, 2));
        createdClaim = await apiExpense.createClaim(claimData);
        console.log('✅ Claim created:', createdClaim);
      } catch (createErr) {
        console.error('❌ Create claim failed:', createErr);
        const axiosResp = createErr?.response;
        if (axiosResp) {
          console.error('Server response status:', axiosResp.status);
          console.error('Server response data:', axiosResp.data);
          Alert.alert('Submission Error', JSON.stringify(axiosResp.data, null, 2));
        } else {
          Alert.alert('Submission Error', createErr.message || String(createErr));
        }
        throw createErr;
      }

      const claimId = createdClaim.id;

      // Refresh categories mapping if possible
      let backendCategories = categories;
      try {
        const fetched = await dataAPI.get('/api/expense/categories');
        if (Array.isArray(fetched) && fetched.length > 0) {
          backendCategories = fetched.map(c => ({ id: Number(c.id), name: c.category_name || c.name }));
          setCategories(backendCategories);
        }
      } catch (catErr) {
        console.warn('Could not refresh categories before submission:', catErr?.message || catErr);
      }

      // Map items to backend payloads
      const mapItemToPayload = (item) => {
        let catId = item.category_id;
        if (typeof catId === 'string') catId = parseInt(catId, 10);
        if (!catId) {
          const byName = backendCategories.find(c => (c.name || '').toLowerCase() === (item.category_name || '').toLowerCase());
          catId = byName ? Number(byName.id) : null;
        }

        const payload = {
          claim_id: claimId,
          category_id: catId,
          item_description: item.description || item.business_purpose || item.item_description || '',
          // item.amount is stored as a numeric value when added
          amount: Number(item.amount) || 0,
          expense_date: item.expense_date,
          currency: 'INR'
        };
        if (item.vendor || item.vendor_name) payload.vendor_name = item.vendor || item.vendor_name;
        if (item.receipt_number) payload.receipt_number = item.receipt_number;
        return payload;
      };

      const itemsData = expenseItems.map(mapItemToPayload);
      const invalid = itemsData.filter(i => !i.category_id || Number.isNaN(Number(i.category_id)));
      if (invalid.length > 0) {
        setError('One or more items have an invalid category. Please re-select categories.');
        Alert.alert('Error', 'One or more items have an invalid category. Please re-select categories.');
        return;
      }

      // Create items via bulk endpoint
      let createdItems = [];
      if (itemsData.length > 0) {
        console.log('📦 Creating items via bulk endpoint...');
        console.log('⬆️ Bulk items payload:', JSON.stringify({ items: itemsData }, null, 2));
        try {
          const itemsResponse = await apiExpense.bulkCreateExpenseItems(claimId, itemsData);
          console.log('✅ Bulk items created:', itemsResponse);
          createdItems = itemsResponse.items || itemsResponse.items_created || itemsResponse || [];
        } catch (bulkError) {
          console.warn('⚠️ Bulk create failed:', bulkError?.message || bulkError);
        }
      }

      // Upload receipts if present
      for (let i = 0; i < expenseItems.length; i++) {
        const item = expenseItems[i];
        const createdItem = createdItems[i];
        if (item.receipt) {
          try {
            const formData = new FormData();
            formData.append('file', {
              uri: item.receipt.uri,
              type: item.receipt.type || 'image/jpeg',
              name: item.receipt.fileName || `receipt_${i + 1}.jpg`
            });
            if (createdItem && createdItem.id) formData.append('expense_item_id', String(createdItem.id));
            else formData.append('claim_id', String(claimId));
            if (resolvedEmployeeId) formData.append('uploaded_by', String(resolvedEmployeeId));
            try {
              await apiExpense.uploadDocument(formData, resolvedEmployeeId);
              console.log(`✅ Receipt uploaded for item ${i + 1}`);
            } catch (uploadErr) {
              console.warn(`⚠️ Receipt upload failed for item ${i + 1}:`, uploadErr?.message || uploadErr);
            }
          } catch (uploadError) {
            console.warn(`⚠️ Receipt upload error for item ${i + 1}:`, uploadError);
          }
        }
      }

      // Refresh data and show success
      await loadInitialData();
      setSuccess('Expense claim submitted successfully!');
      Alert.alert('Success', `Claim "${claimTitle}" submitted successfully!\nClaim ID: ${createdClaim.claim_number || claimId}`, [{ text: 'OK', onPress: () => setActiveView('claims') }]);

      // Reset form
      setClaimTitle('');
      setClaimDescription('');
      setExpenseItems([]);
      setCurrentItem({
        category_id: '',
        description: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        vendor: '',
        receipt_number: '',
        receipt: null
      });

    } catch (error) {
      console.error('❌ Submit claim error:', error);
      // error handling preserved from earlier code
      let errorMessage = 'Something went wrong while submitting your claim';
      let alertTitle = 'Submission Error';

      if (error?.response?.status === 500 || error?.status === 500) {
        errorMessage = 'There is a temporary server issue. Your claim data has been saved, but please try again later to complete the submission.';
        alertTitle = 'Server Issue';
      } else if (error?.detail) {
        if (Array.isArray(error.detail)) errorMessage = error.detail.map(d => d.msg || d.message || JSON.stringify(d)).join(', ');
        else errorMessage = error.detail || JSON.stringify(error);
      } else if (error.response?.data) {
        const d = error.response.data;
        if (Array.isArray(d.detail)) errorMessage = d.detail.map(err => err.msg || err.message || JSON.stringify(err)).join(', ');
        else if (d.detail) errorMessage = d.detail;
        else if (d.message) errorMessage = d.message;
      } else if (error.message) {
        if (error.message.includes('Failed to create any expense items')) {
          errorMessage = 'Your claim was created but there was an issue with the expense items. Please check your claims list and edit if needed.';
          alertTitle = 'Partial Success';
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
      Alert.alert(alertTitle, errorMessage);

    } finally {
      setLoading(false);
    }
  };

  const totalAmount = expenseItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  if (loading && claims.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading your expenses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.primary} 
      />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: 8 + insets.top, backgroundColor: theme.colors.primary }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Expenses</Text>
          <TouchableOpacity onPress={() => setActiveView('new-claim')}>
            <MaterialIcons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Navigation Tabs */}
        <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity 
            style={[styles.tab, activeView === 'claims' && styles.activeTab]}
            onPress={() => setActiveView('claims')}
          >
            <MaterialIcons 
              name="list" 
              size={20} 
              color={activeView === 'claims' ? theme.colors.primary : theme.colors.muted} 
            />
            <Text style={[
              styles.tabText, 
              { color: theme.colors.text },
              activeView === 'claims' && styles.activeTabText
            ]}>
              My Claims
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeView === 'new-claim' && styles.activeTab]}
            onPress={() => {
              setActiveView('new-claim');
              setStatusFilter('all'); // Reset filter when going to new claim
            }}
          >
            <MaterialIcons 
              name="add-circle-outline" 
              size={20} 
              color={activeView === 'new-claim' ? theme.colors.primary : theme.colors.muted} 
            />
            <Text style={[
              styles.tabText,
              { color: theme.colors.text }, 
              activeView === 'new-claim' && styles.activeTabText
            ]}>
              New Claim
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: theme.name === 'dark' ? '#2D1B1B' : '#FFEBEE' }]}>
          <MaterialIcons name="error" size={20} color={theme.colors.danger} />
          <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <MaterialIcons name="close" size={20} color={theme.colors.danger} />
          </TouchableOpacity>
        </View>
      )}
      
      {success && (
        <View style={[styles.successContainer, { backgroundColor: theme.name === 'dark' ? '#1B2D1B' : '#E8F5E9' }]}>
          <MaterialIcons name="check-circle" size={20} color={theme.colors.success} />
          <Text style={[styles.successText, { color: theme.colors.success }]}>{success}</Text>
          <TouchableOpacity onPress={() => setSuccess(null)}>
            <MaterialIcons name="close" size={20} color={theme.colors.success} />
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1976D2']}
            tintColor="#1976D2"
          />
        }
      >
        {activeView === 'claims' ? (
          <MyClaims
            claims={claims}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            getFilteredClaims={getFilteredClaims}
            getStatusCounts={getStatusCounts}
            normalizeStatus={normalizeStatus}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            onSelectClaim={(c) => setSelectedClaim(c)}
            setActiveView={setActiveView}
            onRefresh={onRefresh}
            refreshing={refreshing}
            styles={styles}
            theme={theme}
          />
        ) : (
          <View style={[styles.formContainer, { backgroundColor: theme.colors.background }]}>
                          {/* Stack title and date vertically for narrow mobile screens */}
                          <View style={{ flexDirection: 'column' }}>
                            <View style={{ marginBottom: 8 }}>
                              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Claim Title</Text>
                              <TextInput
                                style={[styles.input, { 
                                  backgroundColor: theme.colors.surface,
                                  color: theme.colors.text,
                                  borderColor: theme.name === 'dark' ? '#2D3748' : '#E0E0E0'
                                }]}
                                placeholder="e.g., Business Trip to Mumbai"
                                placeholderTextColor={theme.colors.muted}
                                value={claimTitle}
                                onChangeText={(text) => setClaimTitle(text)}
                              />
                            </View>

                            <View>
                              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Claim Date</Text>
                              <View style={[styles.dateBox, { 
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.name === 'dark' ? '#2D3748' : '#E0E0E0'
                              }]} accessible={false}>
                                <Text style={[styles.dateDisplayText, { color: theme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">{new Date(claimDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' })}</Text>
                              </View>
                              <Text style={[styles.noteText, { color: theme.colors.muted }]}>Automatically set to today's date</Text>
                            </View>
                          </View>

              {/* Description and totals removed to match web layout */}

            {/* Add Expense Item - First for better UX flow */}
            <View style={styles.addItemSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Add Expense Item</Text>
              
              {/* Category Selection */}
              <TouchableOpacity 
                style={[styles.categoryButton, {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.name === 'dark' ? '#2D3748' : '#E0E0E0'
                }]}
                onPress={handleOpenCategoryModal}
              >
                <Text style={[styles.categoryButtonText, { color: theme.colors.text }]}>
                  {currentItem.category_id 
                    ? categories.find(c => c.id === currentItem.category_id)?.name 
                    : 'Select Category *'
                  }
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={24} color="#757575" />
              </TouchableOpacity>

              <TextInput
                style={[styles.input, {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.name === 'dark' ? '#2D3748' : '#E0E0E0'
                }]}
                placeholder="Item Description *"
                placeholderTextColor={theme.colors.muted}
                value={currentItem.description}
                onChangeText={(text) => setCurrentItem({...currentItem, description: text})}
              />
              
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfWidth, {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text,
                    borderColor: theme.name === 'dark' ? '#2D3748' : '#E0E0E0'
                  }]}
                  placeholder="Amount *"
                  placeholderTextColor={theme.colors.muted}
                  value={currentItem.amount}
                  onChangeText={handleAmountChange}
                  keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                  returnKeyType="done"
                  onBlur={() => {
                    try {
                      const raw = Number(currentItem.amountRaw) || 0;
                      const formatted = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(raw);
                      setCurrentItem({...currentItem, amount: formatted});
                    } catch (e) { /* ignore */ }
                  }}
                />
                <TouchableOpacity 
                  style={[styles.input, styles.halfWidth, styles.dateButton]}
                  onPress={openDatePicker}
                >
                  <Text style={[styles.dateButtonText, !currentItem.expense_date && styles.placeholder]}>
                    {currentItem.expense_date ? formatDate(currentItem.expense_date) : 'Expense Date *'}
                  </Text>
                  <MaterialIcons name="calendar-today" size={20} color="#757575" />
                </TouchableOpacity>
              </View>

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfWidth]}
                  placeholder="Vendor"
                  placeholderTextColor="#999999"
                  value={currentItem.vendor}
                  onChangeText={(text) => setCurrentItem({...currentItem, vendor: text})}
                />
                <TextInput
                  style={[styles.input, styles.halfWidth]}
                  placeholder="Receipt/Invoice #"
                  placeholderTextColor="#999999"
                  value={currentItem.receipt_number}
                  onChangeText={(text) => setCurrentItem({...currentItem, receipt_number: text})}
                />
              </View>

              {/* Payment method removed for mobile flow */}

              {/* Receipt Upload */}
              <TouchableOpacity style={styles.receiptButton} onPress={pickImage}>
                <MaterialIcons name="camera-alt" size={20} color="#1976D2" />
                <Text style={styles.receiptButtonText}>
                  {currentItem.receipt ? 'Receipt Added' : 'Add Receipt (Optional)'}
                </Text>
              </TouchableOpacity>

              {currentItem.receipt && (
                <View style={styles.receiptPreview}>
                  <Image source={{ uri: currentItem.receipt.uri }} style={styles.receiptImage} />
                  <TouchableOpacity 
                    style={styles.removeReceiptButton}
                    onPress={() => setCurrentItem({...currentItem, receipt: null})}
                  >
                    <MaterialIcons name="close" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={styles.addItemButton} onPress={addExpenseItem}>
                <MaterialIcons name="add" size={20} color="white" />
                <Text style={styles.addItemButtonText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {/* Expense Items List */}
            {expenseItems.length > 0 && (
              <View style={styles.itemsList}>
                <Text style={styles.sectionTitle}>Expense Items ({expenseItems.length})</Text>
                {expenseItems.map((item) => (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.itemInfo}>
                      <View style={styles.itemHeaderRow}>
                        <Text style={styles.itemDescription} numberOfLines={1} ellipsizeMode="tail">{item.description || '—'}</Text>
                        <View style={styles.itemAmountWrap}>
                          {item.receipt && item.receipt.uri ? (
                            <Image source={{ uri: item.receipt.uri }} style={styles.itemThumbnail} />
                          ) : null}
                          <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
                        </View>
                      </View>

                      <Text style={styles.itemCategory}>{item.category_name}</Text>
                      <View style={styles.itemDetailsRow}>
                        <Text style={styles.itemDetail}>Date: {formatDate(item.expense_date)}</Text>
                        {item.vendor ? <Text style={styles.itemDetail}>Vendor: {capitalize(item.vendor)}</Text> : null}
                      </View>
                    </View>
                    <View style={styles.itemActions}>
                      {item.receipt_number ? (
                        <TouchableOpacity onPress={() => {
                          const maybeUrl = item.receipt_url || item.receipt_link || null;
                          if (maybeUrl) Linking.openURL(maybeUrl).catch(() => {});
                        }}>
                          <Text style={styles.receiptNumber} numberOfLines={1} ellipsizeMode="middle">Receipt No. {item.receipt_number}</Text>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => removeExpenseItem(item.id)}
                      >
                        <MaterialIcons name="delete" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                
                {/* Submit Button - Right after items list for better UX */}
                <View style={{ marginTop: 12 }}>
                  <Text style={{ textAlign: 'right', color: '#374151', marginBottom: 8, fontWeight: '600' }}>Total: {formatCurrency(totalAmount)}</Text>
                  <TouchableOpacity 
                    style={[styles.submitButton, (loading || !claimTitle || expenseItems.length === 0) && styles.disabledButton]} 
                    onPress={submitClaim}
                    disabled={loading || !claimTitle || expenseItems.length === 0}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <MaterialIcons name="send" size={20} color="white" />
                        <Text style={styles.submitButtonText}>Submit Claim • {formatCurrency(totalAmount)}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Helpful message when no items */}
            {expenseItems.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="receipt" size={48} color="#BDBDBD" />
                <Text style={styles.emptyStateText}>Add expense items to submit your claim</Text>
                <Text style={styles.emptyStateSubtext}>Use the "Add Item" button above to get started</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Category Selection Modal */}
      <Modal visible={showCategoryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <MaterialIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.categoriesList}>
              {categoryLoading && categories.length === 0 ? (
                <View style={styles.centeredMessage}>
                  <ActivityIndicator size="small" color="#1976D2" />
                  <Text style={styles.centeredMessageText}>Loading categories...</Text>
                </View>
              ) : categoryError ? (
                <View style={styles.centeredMessage}>
                  <Text style={[styles.centeredMessageText, { color: '#EF4444' }]}>{categoryError}</Text>
                  <TouchableOpacity onPress={fetchCategories} style={{ marginTop: 8 }}>
                    <Text style={{ color: '#1976D2' }}>Try again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView>
                  {categories.map((category, idx) => {
                    const lower = (category.name || '').toLowerCase();
                    const mapped = categoryIconMap[lower];
                    return (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.categoryRow}
                        onPress={() => { selectCategory(category); setShowCategoryModal(false); }}
                      >
                        {/* Priority: mapped vector icon -> backend image URL -> emoji/text */}
                        {mapped ? (
                          <View style={[styles.categoryEmojiWrap, { backgroundColor: getAlphaColor(mapped.color, 0.14) }]}>
                            <MaterialCommunityIcons name={mapped.name} size={18} color={mapped.color} />
                          </View>
                        ) : category.icon && (typeof category.icon === 'string' && (category.icon.startsWith('http') || category.icon.startsWith('/'))) ? (
                          <Image source={{ uri: category.icon }} style={styles.categoryImage} />
                        ) : (
                          <View style={styles.categoryEmojiWrap}>
                            <Text style={styles.categoryIcon}>{category.icon || '📋'}</Text>
                          </View>
                        )}

                        <Text style={styles.categoryName}>{category.name}</Text>

                        {/* Divider line except last */}
                        {idx < categories.length - 1 && <View style={styles.rowDivider} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>

  {/* Payment method selection removed */}

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            // On Android the `date` param can be undefined; use event.nativeEvent.timestamp as fallback
            let picked = date;
            try {
              if (!picked && event && event.nativeEvent && event.nativeEvent.timestamp) {
                picked = new Date(event.nativeEvent.timestamp);
              }
            } catch (e) { /* ignore */ }
            if ((event && event.type === 'set') || picked) {
              if (picked) selectExpenseDate(picked);
            }
            setShowDatePicker(false);
          }}
        />
      )}

      {/* Claim date is read-only on mobile — picker removed */}

      {/* Claim Details Modal */}
      {selectedClaim && (
        <Modal animationType="slide" transparent={false} visible={!!selectedClaim}>
          <SafeAreaView style={styles.detailModal}>
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setSelectedClaim(null)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.detailTitle}>Claim Details</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.detailContent}>
              {/* Header with Claim Number removed per design */}

              {/* Claim Information Section */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Claim Information</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Employee:</Text>
                  <Text style={styles.detailValue}>{selectedClaim.employee_name}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Title:</Text>
                  <Text style={styles.detailValue}>{selectedClaim.title}</Text>
                </View>
                
                {selectedClaim.description && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Description:</Text>
                    <Text style={styles.detailValue}>{selectedClaim.description}</Text>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Claim Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedClaim.claim_date)}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <View 
                    style={[
                      styles.statusBadgeModal, 
                      { backgroundColor: getStatusColor(normalizeStatus(selectedClaim.status)) }
                    ]}
                  >
                    <MaterialIcons 
                      name={getStatusIcon(normalizeStatus(selectedClaim.status))} 
                      size={14} 
                      color="white" 
                    />
                    <Text style={styles.statusTextModal}>
                      {normalizeStatus(selectedClaim.status)?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                {/* Approved Date moved to Additional Information */}
              </View>

              {/* Financial Summary Section */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Financial Summary</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Amount:</Text>
                  <Text style={styles.detailValueAmount}>{formatCurrency(selectedClaim.total_amount)}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Approved Amount:</Text>
                  <Text
                    style={[
                      styles.detailValueAmount,
                      { color: normalizeStatus(selectedClaim.status) === 'approved' ? '#10B981' : undefined }
                    ]}
                  >
                    {formatCurrency(selectedClaim.approved_amount || 0)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Currency:</Text>
                  <Text style={styles.detailValue}>INR</Text>
                </View>
              </View>

              {/* Additional Information */}
              {(selectedClaim.submission_date || selectedClaim.department || selectedClaim?.approved_date || selectedClaim?.approved_at || selectedClaim?.approval_date || selectedClaim?.approved_on || selectedClaim?.approved_timestamp || selectedClaim?.approvedOn) && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Additional Information</Text>
                  
                  {selectedClaim.submission_date && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Submission Date:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedClaim.submission_date)}</Text>
                    </View>
                  )}

                  { (normalizeStatus(selectedClaim.status) === 'approved') && (selectedClaim?.approved_date || selectedClaim?.approved_at || selectedClaim?.approval_date || selectedClaim?.approved_on || selectedClaim?.approved_timestamp || selectedClaim?.approvedOn) && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Approved Date:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedClaim?.approved_date || selectedClaim?.approved_at || selectedClaim?.approval_date || selectedClaim?.approved_on || selectedClaim?.approved_timestamp || selectedClaim?.approvedOn)}</Text>
                    </View>
                  )}
                  
                  {selectedClaim.department && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Department:</Text>
                      <Text style={styles.detailValue}>{selectedClaim.department}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Admin actions (approve/reject) for managers/admins */}
              {(user && (user.role === 'admin' || user.role === 'manager') && selectedClaim && selectedClaim.status === 'pending') && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Actions</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity style={[styles.approveButton]} onPress={() => handleApproveClaim(selectedClaim.id)}>
                      <MaterialIcons name="check" size={18} color="white" />
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.rejectButton]} onPress={() => handleRejectClaim(selectedClaim.id)}>
                      <MaterialIcons name="close" size={18} color="white" />
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Expense Items Section */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Expense Items</Text>
                {claimDetailsLoading ? (
                  <ActivityIndicator size="small" color="#1976D2" />
                ) : selectedClaimItems.length === 0 ? (
                  <Text style={styles.centeredMessageText}>No items found for this claim</Text>
                ) : (
                  selectedClaimItems.map((item, idx) => (
                    <View key={item.id || idx} style={styles.detailItemRow}>
                      <View style={styles.itemContent}>
                        {/* Description Row */}
                        <View style={styles.itemFieldRow}>
                          <Text style={styles.itemLabel}>Description:</Text>
                          <Text style={styles.itemValue}>{item.item_description || item.description || item.business_purpose}</Text>
                        </View>

                        {/* Category Row */}
                        <View style={styles.itemFieldRow}>
                          <Text style={styles.itemLabel}>Category:</Text>
                          <Text style={styles.itemValueSecondary}>{getCategoryNameById(item.category_id) || item.category_name}</Text>
                        </View>

                        {/* Date Row */}
                        <View style={styles.itemFieldRow}>
                          <Text style={styles.itemLabel}>Date:</Text>
                          <Text style={styles.itemValueSecondary}>{formatDate(item.expense_date)}</Text>
                        </View>

                        {/* Vendor Row - Always show with fallback */}
                        <View style={styles.itemFieldRow}>
                          <Text style={styles.itemLabel}>Vendor:</Text>
                          <Text style={styles.itemValueSecondary} numberOfLines={1}>
                            {item.vendor_name || item.vendor || 'Not specified'}
                          </Text>
                        </View>

                        {/* Receipt Number - Always show with fallback */}
                        <View style={styles.itemFieldRow}>
                          <Text style={styles.itemLabel}>Receipt No.</Text>
                            {item.receipt_number ? (
                              <TouchableOpacity onPress={() => {
                                const maybeUrl = item.receipt_url || item.receipt_link || null;
                                if (maybeUrl) Linking.openURL(maybeUrl).catch(() => {});
                              }}>
                                <Text style={styles.receiptLink}>{item.receipt_number}</Text>
                              </TouchableOpacity>
                            ) : (
                              <Text style={styles.itemValueSecondary}>No receipt</Text>
                            )}
                        </View>

                        {/* Business Purpose if different from description */}
                        {item.business_purpose && item.business_purpose !== item.item_description && (
                          <View style={[styles.itemFieldRow, { marginTop: 4 }]}>
                            <Text style={styles.itemLabel}>Purpose:</Text>
                            <Text style={styles.itemValueSecondary}>{item.business_purpose}</Text>
                          </View>
                        )}
                      </View>

                      {/* Amount column on the right */}
                      <View style={styles.itemAmountColumn}>
                        <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
                        {item.approved_amount && (
                          <Text style={styles.itemApprovedAmount}>Approved: {formatCurrency(item.approved_amount)}</Text>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Documents Section */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Documents{selectedClaimDocuments.length > 0 ? ` (${selectedClaimDocuments.length})` : ''}</Text>
                {selectedClaimDocuments.length === 0 ? (
                  <View style={[styles.emptyStateSmall, { paddingVertical: 12 }]}>
                    <Text style={[styles.emptyStateText, { color: theme?.colors?.muted || '#6B7280' }]}>No documents uploaded for this claim.</Text>
                  </View>
                ) : (
                  selectedClaimDocuments.map((doc, i) => {
                    const fileName = doc.file_name || doc.fileName || `Document ${i+1}`;
                    
                    // Construct proper URL for backend file access
                    let maybeUrl = null;
                    if (doc.url) {
                      // If full URL provided
                      maybeUrl = doc.url;
                    } else if (doc.file_url) {
                      // If file_url provided
                      maybeUrl = doc.file_url;
                    } else if (doc.file_path) {
                      // Backend stores full path like "uploads\\expense_documents\\uuid.png" (Windows) or "uploads/expense_documents/uuid.png"
                      // Backend serves via /uploads/ mount, so URL should be: http://api.com/uploads/expense_documents/file.png
                      let cleanPath = doc.file_path;
                      
                      // Convert Windows backslashes to forward slashes for URL
                      cleanPath = cleanPath.replace(/\\/g, '/');
                      
                      // Remove leading "./" if present
                      if (cleanPath.startsWith('./')) {
                        cleanPath = cleanPath.substring(2);
                      }
                      
                      // Remove leading "/" if present
                      if (cleanPath.startsWith('/')) {
                        cleanPath = cleanPath.substring(1);
                      }
                      
                      // Ensure API_BASE_URL doesn't have trailing slash
                      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
                      
                      // Construct URL - backend already includes "uploads/" in path
                      maybeUrl = `${baseUrl}/${cleanPath}`;
                    }
                    
                    const sizeKB = doc.size || doc.file_size || doc.bytes || null;
                    const sizeLabel = sizeKB ? `${Math.round((sizeKB || 0) / 1024)} KB` : null;

                    // Debug logging
                    console.log('📄 Document debug:', {
                      fileName,
                      doc_url: doc.url,
                      doc_file_url: doc.file_url,
                      doc_file_path: doc.file_path,
                      API_BASE_URL,
                      constructedUrl: maybeUrl,
                      fullDoc: doc
                    });

                    return (
                      <View key={doc.id || i} style={styles.documentRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <MaterialIcons name="insert-drive-file" size={18} color="#9E9E9E" style={{ marginRight: 8 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.documentName} numberOfLines={1} ellipsizeMode="middle">{fileName}</Text>
                            {sizeLabel && <Text style={styles.documentMeta}>{sizeLabel}</Text>}
                          </View>
                        </View>

                        <TouchableOpacity 
                          onPress={() => handleDownloadDocument(doc, fileName)}
                          style={{ padding: 8 }}
                        >
                          <MaterialIcons name="download" size={20} color="#1976D2" />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </View>

              {selectedClaim.rejection_reason && (
                <View style={[styles.modalSection, styles.rejectionSection]}>
                  <Text style={styles.modalSectionTitle}>Rejection Information</Text>
                  <View style={styles.rejectionBox}>
                    <MaterialIcons name="warning" size={20} color="#EF4444" />
                    <Text style={styles.rejectionText}>{selectedClaim.rejection_reason}</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#1976D2',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    elevation: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#1976D2',
  },
  tabText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 4,
  },
  activeTabText: {
    color: '#1976D2',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#757575',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    color: '#EF4444',
    marginLeft: 8,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  successText: {
    flex: 1,
    color: '#10B981',
    marginLeft: 8,
  },
  claimsContainer: {
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    /* keep cards on a single row and let parent ScrollView handle overflow */
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    /* give some vertical margin so wrapped rows have spacing */
    marginHorizontal: 6,
    marginVertical: 6,
    alignItems: 'center',
    elevation: 2,
    /* reduce minWidth slightly so cards fit better on narrow devices */
    minWidth: 72,
    maxWidth: 110,
  },
  /* Category modal / web-like list styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalCard: {
    width: '92%',
    maxHeight: '78%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827'
  },
  categoriesList: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: 'transparent'
  },
  categoryImage: {
    width: 34,
    height: 34,
    borderRadius: 6,
    marginRight: 12,
    resizeMode: 'cover'
  },
  categoryEmojiWrap: {
    width: 34,
    height: 34,
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC'
  },
  categoryIcon: {
    fontSize: 18
  },
  categoryName: {
    fontSize: 15,
    color: '#111827'
  },
  rowDivider: {
    position: 'absolute',
    left: 64,
    right: 12,
    bottom: 0,
    height: 1,
    backgroundColor: '#F1F5F9'
  },
  centeredMessage: {
    padding: 20,
    alignItems: 'center'
  },
  centeredMessageText: {
    marginTop: 8,
    color: '#666'
  },
  activeStatCard: {
    backgroundColor: '#1976D2',
    elevation: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  activeStatNumber: {
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  activeStatLabel: {
    color: 'white',
  },
  filterIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
  },
  filterText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  clearFilterButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  clearFilterText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  secondaryStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 12,
  },
  secondaryStatCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    minWidth: 80,
    alignItems: 'center',
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  activeSecondaryStatCard: {
    backgroundColor: '#6B7280',
    borderColor: '#6B7280',
  },
  secondaryStatNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  activeSecondaryStatNumber: {
    color: 'white',
  },
  secondaryStatLabel: {
    fontSize: 11,
    color: '#757575',
    marginTop: 2,
  },
  activeSecondaryStatLabel: {
    color: 'white',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    paddingVertical: 64,
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyStateSmall: {
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
  },
  emptyStateHint: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 20,
    maxWidth: 320,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  claimsList: {
    gap: 12,
  },
  claimCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  claimNumberContainer: {
    flex: 1,
  },
  claimNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 14,
    color: '#6C757D',
  },
  statusBadgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 80,
    justifyContent: 'center',
  },
  statusTextNew: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    marginLeft: 4,
  },
  cardContent: {
    padding: 16,
  },
  claimTitleNew: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343A40',
    marginBottom: 12,
  },
  amountDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amountContainer: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: '#6C757D',
    textTransform: 'uppercase',
    fontWeight: '500',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  dateContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 12,
    color: '#6C757D',
    textTransform: 'uppercase',
    fontWeight: '500',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  approvedAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  approvedLabel: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  approvedValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  footerLeft: {
    flex: 1,
  },
  submissionDate: {
    fontSize: 12,
    color: '#6C757D',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reviewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    marginRight: 4,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  claimInfo: {
    flex: 1,
  },
  claimTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  claimDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  claimDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  claimAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  rejectionReason: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 4,
    marginTop: 12,
  },
  rejectionText: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
  },
  // Corporate Card Styles - Premium MNC Design
  corporateCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 18,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  corporateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  claimIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  corporateClaimId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    fontFamily: 'monospace',
  },
  headerTextContainer: {
    marginLeft: 6,
  },
  headerLabel: {
    fontSize: 10,
    color: '#6C757D',
    textTransform: 'uppercase',
    fontWeight: '500',
    marginBottom: 2,
  },
  employeeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  corporateEmployeeName: {
    fontSize: 12,
    color: '#6C757D',
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  corporateStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  corporateStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  corporateCardBody: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  // Compact Card Styles - Space Efficient
  compactTitleSection: {
    marginBottom: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  compactTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  compactDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    flex: 1,
  },
  compactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactAmountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    elevation: 1,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  amountInfo: {
    marginLeft: 0,
  },
  compactAmountLabel: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  compactAmountValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: -0.5,
  },
  compactTimeline: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingLeft: 12,
  },
  compactTimelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  compactTimelineLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  compactTimelineText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  titleSection: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoContent: {
    flex: 1,
    marginLeft: 8,
  },
  infoLabel: {
    fontSize: 11,
    color: '#6C757D',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  corporateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 6,
    lineHeight: 24,
  },
  corporateDescription: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 20,
  },
  financialSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#343A40',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  financialGrid: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  financialItem: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#1976D2',
    alignItems: 'center',
  },
  approvedItem: {
    borderLeftColor: '#10B981',
  },
  financialLabel: {
    fontSize: 11,
    color: '#6C757D',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  financialValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    textAlign: 'center',
  },
  currencyLabel: {
    fontSize: 10,
    color: '#ADB5BD',
    marginTop: 2,
    textAlign: 'center',
  },
  timelineSection: {
    marginBottom: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 11,
    color: '#6C757D',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 2,
  },
  timelineText: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '500',
  },
  corporateCardFooter: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  corporateReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  corporateReviewText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
    marginLeft: 6,
  },
  footerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerMetaText: {
    fontSize: 10,
    color: '#ADB5BD',
    marginLeft: 4,
  },
  corporateRejectionAlert: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
  },
  rejectionIndicator: {
    width: 4,
    backgroundColor: '#EF4444',
  },
  rejectionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  corporateRejectionText: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  formContainer: {
    padding: 16,
  },
  claimSummary: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  claimSummaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  claimSummaryStack: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 12,
  },
  claimColumnLeft: {
    flex: 3,
  },
  claimColumnRight: {
    flex: 1,
  },
  claimColumnRightSmall: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  dateBox: {
    backgroundColor: '#F5F7FA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF'
  },
  dateDisplay: {
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  dateDisplayText: {
    color: '#495057',
    fontSize: 14,
    lineHeight: 18,
    minWidth: 130,
    textAlign: 'center'
  },
  formLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 6,
    fontWeight: '600'
  },
  noteText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333333',
    backgroundColor: 'white',
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  summaryCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  addItemSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  categoryButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#333',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333',
  },
  placeholder: {
    color: '#999',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#F9F9F9',
  },
  receiptButtonText: {
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 8,
  },
  receiptPreview: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  receiptImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeReceiptButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D2',
    borderRadius: 8,
    padding: 12,
  },
  addItemButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
  itemsList: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
    paddingRight: 8,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  itemAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  itemCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemVendor: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  itemDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  itemDetail: {
    fontSize: 12,
    color: '#666',
    marginRight: 12,
    marginBottom: 4,
  },
  itemReceiptNumber: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  // Prominent receipt label used in lists and detail modal
  receiptNumber: {
    fontSize: 12,
    color: '#1976D2',
    marginTop: 4,
    textDecorationLine: 'underline',
    textAlign: 'right'
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'center'
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 6,
    textAlign: 'right',
    minWidth: 88,
  },
  itemThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 8,
    resizeMode: 'cover'
  },
  removeButton: {
    padding: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D2',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 20,
    maxHeight: '70%',
    width: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  categoriesList: {
    maxHeight: 400,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    color: '#333',
  },
  detailModal: {
    flex: 1,
    backgroundColor: 'white',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  detailContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  rejectionSection: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
  },
  // New modal styles for enhanced details
  modalHeaderSection: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    marginBottom: 16,
  },
  modalClaimNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#343A40',
  },
  modalSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#343A40',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  detailValueAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  statusBadgeModal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTextModal: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    marginLeft: 4,
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  rejectionText: {
    fontSize: 14,
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  approveButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600'
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  rejectButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600'
  },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    marginBottom: 1,
  },
  itemContent: {
    flex: 1,
    paddingRight: 16,
  },
  itemFieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    width: 90,
    flexShrink: 0,
  },
  itemValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  itemValueSecondary: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  itemAmountColumn: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    minWidth: 80,
  },
  itemAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0B79D0',
    marginBottom: 4,
  },
  itemApprovedAmount: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  receiptLink: {
    fontSize: 14,
    color: '#1976D2',
    textDecorationLine: 'underline',
  },
  detailItemDesc: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
    marginBottom: 6
  },
  detailMeta: {
    fontSize: 13,
    color: '#374151',
    marginTop: 2,
    lineHeight: 18
  },
  detailMetaLabel: {
    fontSize: 12,
    color: '#6C757D',
    width: 72,
    fontWeight: '600'
  },
  detailMetaValue: {
    fontSize: 12,
    color: '#374151',
    flex: 1
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  documentName: {
    color: '#111827'
  },
  documentMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  downloadButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  downloadButtonText: {
    color: '#1565C0',
    fontWeight: '600'
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8
  },
  detailValueAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B79D0'
  },
});

export default ExpenseScreen;
