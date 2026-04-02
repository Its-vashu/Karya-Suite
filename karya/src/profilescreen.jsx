import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator, Modal, Pressable, Dimensions } from 'react-native';
import { useAuth } from './AuthContext';
import { useTheme } from './theme/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { dataAPI, API_BASE_URL_EXPORT } from './api';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, setUser } = useAuth();
  const { theme } = useTheme();
  const isFocused = useIsFocused();
  
  // Profile picture state
  const [profilePicUri, setProfilePicUri] = useState(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [loadingPic, setLoadingPic] = useState(false);
  const [showProfilePicMenu, setShowProfilePicMenu] = useState(false);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);

  useEffect(() => {
    if (!isFocused) return;

    // When screen becomes focused, re-load persisted profile and update AuthContext.
    // Prefer the newer 'userData' key but fall back to the legacy 'user' key for compatibility.
    (async () => {
      try {
        let stored = await AsyncStorage.getItem('userData');
        if (!stored) {
          stored = await AsyncStorage.getItem('user');
        }
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            // update in-memory user so UI reflects latest persisted profile
            setUser(parsed);

            // If stored profile looks incomplete (no full name or email), try fetching
            // a fuller profile from the backend and merge it. This handles cases
            // where login stored minimal data but the /users/{id}/details endpoint
            // has richer fields.
            const userId = parsed.id || parsed.user_id || parsed.userId || (parsed.user && parsed.user.id);
            const needFetch = (!parsed.full_name && !parsed.name) || !parsed.email;
            if (userId && needFetch) {
              try {
                const serverProfile = await dataAPI.fetchEmployeeDetails(userId);
                if (serverProfile) {
                  const merged = {
                    ...parsed,
                    full_name: parsed.full_name || serverProfile.full_name || serverProfile.fullName || parsed.fullName,
                    name: parsed.name || serverProfile.full_name || serverProfile.fullName || parsed.name,
                    username: parsed.username || serverProfile.username || parsed.username,
                    email: parsed.email || serverProfile.email,
                    nickname: parsed.nickname || serverProfile.nickname,
                    bio: parsed.bio || serverProfile.bio,
                    has_profile_pic: parsed.has_profile_pic ?? serverProfile.has_profile_pic ?? serverProfile.hasProfilePic
                  };

                  // Update context and persist merged profile
                  setUser(merged);
                  try {
                    await AsyncStorage.setItem('userData', JSON.stringify(merged));
                    await AsyncStorage.setItem('user', JSON.stringify(merged));
                  } catch (persistErr) {
                    console.warn('ProfileScreen: failed to persist merged profile', persistErr);
                  }
                }
              } catch (fetchErr) {
                console.warn('ProfileScreen: failed to fetch profile from API', fetchErr);
              }
            }
          } catch (parseErr) {
            console.warn('ProfileScreen: stored user JSON parse failed, clearing invalid value', parseErr);
            // remove corrupt storage so future loads aren't impacted
            await AsyncStorage.removeItem('userData');
            await AsyncStorage.removeItem('user');
          }
        }
        
        // Try to fetch profile picture if user exists (regardless of flag, as flag might be outdated)
        const userId = user?.id || user?.user_id || user?.userId;
        console.log('ProfileScreen: User ID:', userId);
        console.log('ProfileScreen: Has profile pic flag:', user?.has_profile_pic || user?.hasProfilePic);
        if (userId) {
          console.log('ProfileScreen: Attempting to fetch profile picture...');
          fetchProfilePicture(userId);
        } else {
          console.log('ProfileScreen: No userId found, skipping profile picture fetch');
        }
      } catch (e) {
        console.warn('ProfileScreen: failed to refresh user from storage', e);
      }
    })();
  }, [isFocused, setUser]);

  const fullName = user?.full_name || user?.name || user?.username || 'User';
  const email = user?.email || '';
  const phone = user?.phone || user?.mobile || '';

  // Fetch profile picture from backend
  const fetchProfilePicture = async (userId) => {
    try {
      setLoadingPic(true);
      const token = await AsyncStorage.getItem('authToken');
      const apiUrl = `${API_BASE_URL_EXPORT}/users/${userId}/profile-pic`;
      
      console.log('📸 Fetching profile pic from:', apiUrl);
      console.log('🔑 Auth token exists:', !!token);
      
      // Download image with auth headers using FileSystem
      const fileUri = FileSystem.cacheDirectory + `profile_${userId}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(
        apiUrl,
        fileUri,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      console.log('📥 Download result status:', downloadResult.status);
      
      if (downloadResult.status === 200) {
        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const dataUri = `data:image/jpeg;base64,${base64}`;
        console.log('✅ Profile picture loaded, length:', base64.length);
        setProfilePicUri(dataUri);
        
        // Update user flag if it was false but image exists
        if (!user?.has_profile_pic && !user?.hasProfilePic) {
          const updatedUser = { ...user, has_profile_pic: true, hasProfilePic: true };
          setUser(updatedUser);
          await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } else if (downloadResult.status === 404) {
        console.log('ℹ️ No profile picture found (404)');
        setProfilePicUri(null);
      } else {
        console.log('❌ Failed to download, status:', downloadResult.status);
        setProfilePicUri(null);
      }
    } catch (error) {
      // 404 is expected if no profile pic exists
      if (error.message?.includes('404')) {
        console.log('ℹ️ No profile picture found');
      } else {
        console.error('❌ Failed to fetch profile picture:', error);
      }
      setProfilePicUri(null);
    } finally {
      setLoadingPic(false);
    }
  };

  // Pick image from gallery or camera
  const pickProfileImage = async () => {
    console.log('📷 pickProfileImage called');
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📷 Gallery permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photos to update profile picture.');
        return;
      }

      Alert.alert(
        'Update Profile Picture',
        'Choose an option',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              console.log('📷 Take Photo selected');
              const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
              if (cameraStatus.status !== 'granted') {
                Alert.alert('Permission Required', 'Camera access is required.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              console.log('📷 Camera result:', result);
              if (!result.canceled && result.assets[0]) {
                console.log('📷 Uploading camera photo...');
                uploadProfilePicture(result.assets[0]);
              }
            }
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              console.log('🖼️ Choose from Gallery selected');
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              console.log('🖼️ Gallery result:', result);
              if (!result.canceled && result.assets[0]) {
                console.log('🖼️ Selected image URI:', result.assets[0].uri);
                uploadProfilePicture(result.assets[0]);
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => console.log('❌ Image picker canceled')
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Upload profile picture to backend
  const uploadProfilePicture = async (imageAsset) => {
    console.log('📤 uploadProfilePicture called');
    console.log('📤 Image asset:', imageAsset);
    
    try {
      setUploadingPic(true);
      const userId = user?.id || user?.user_id || user?.userId;
      
      console.log('👤 User ID:', userId);
      console.log('👤 User object:', user);
      
      if (!userId) {
        console.error('❌ User ID not found');
        Alert.alert('Error', 'User ID not found');
        return;
      }

      const formData = new FormData();
      // Backend expects user_id as a form field
      formData.append('user_id', userId.toString());
      formData.append('file', {
        uri: imageAsset.uri,
        type: imageAsset.mimeType || 'image/jpeg',
        name: imageAsset.fileName || `profile_${userId}.jpg`
      });

      console.log('📤 FormData prepared, uploading to /users/upload-profile-pic/');
      console.log('📤 Base URL:', API_BASE_URL_EXPORT);
      
      const response = await dataAPI.post('/users/upload-profile-pic/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Upload response:', response.data);

      if (response.data) {
        // Fetch the uploaded image from backend
        console.log('📥 Fetching uploaded image from backend...');
        await fetchProfilePicture(userId);
        
        // Update user context
        const updatedUser = { ...user, has_profile_pic: true, hasProfilePic: true };
        setUser(updatedUser);
        
        // Persist to storage
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        
        console.log('✅ Profile picture updated successfully');
        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (error) {
      console.error('❌ Error uploading profile picture:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to upload profile picture';
      Alert.alert('Error', errorMsg);
    } finally {
      setUploadingPic(false);
    }
  };

  // Delete profile picture
  const deleteProfilePicture = async () => {
    try {
      const userId = user?.id || user?.user_id || user?.userId;
      
      if (!userId) {
        Alert.alert('Error', 'User ID not found');
        return;
      }

      Alert.alert(
        'Delete Profile Picture',
        'Are you sure you want to remove your profile picture?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                setUploadingPic(true);
                await dataAPI.delete(`/users/${userId}/profile-pic`);
                
                // Clear local state
                setProfilePicUri(null);
                
                // Update user context
                const updatedUser = { ...user, has_profile_pic: false, hasProfilePic: false };
                setUser(updatedUser);
                
                // Persist to storage
                await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
                await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
                
                setShowProfilePicMenu(false);
                Alert.alert('Success', 'Profile picture deleted successfully!');
              } catch (error) {
                console.error('Error deleting profile picture:', error);
                Alert.alert('Error', 'Failed to delete profile picture. Please try again.');
              } finally {
                setUploadingPic(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in deleteProfilePicture:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Reset navigation stack and go to Login
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (e) {
      Alert.alert('Error', 'Logout failed. Please try again.');
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>My Profile</Text>
          <View style={{ width: 36 }} />
        </View>

      <View style={[styles.userCard, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={() => setShowProfilePicMenu(true)}
          disabled={uploadingPic}
        >
          {loadingPic ? (
            <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primary }]}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          ) : profilePicUri ? (
            <Image 
              source={{ uri: profilePicUri }} 
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarInitial}>{(user?.username || fullName || 'U').charAt(0).toUpperCase()}</Text>
            </View>
          )}
          
          {/* Edit button overlay */}
          <View style={styles.editIconContainer}>
            {uploadingPic ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialIcons name="camera-alt" size={16} color="#FFFFFF" />
            )}
          </View>
        </TouchableOpacity>
        
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.colors.text }]}>{fullName}</Text>
          {user?.nickname ? <Text style={[styles.userNickname, { color: theme.colors.accent }]}>{user.nickname}</Text> : null}
          {user?.bio ? <Text style={[styles.userBio, { color: theme.colors.muted }]}>{user.bio}</Text> : null}
          {email ? <Text style={[styles.userMeta, { color: theme.colors.muted }]}>{email}</Text> : null}
          {phone ? <Text style={[styles.userMeta, { color: theme.colors.muted }]}>{phone}</Text> : null}
        </View>
      </View>

      <View style={[styles.menuCard, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('UserDetails')}>
          <View style={[styles.menuIcon, { backgroundColor: theme.name === 'dark' ? 'rgba(62, 168, 255, 0.1)' : '#EEF2FF' }]}>
            <MaterialIcons name="person-outline" size={22} color={theme.colors.primary} />
          </View>
          <Text style={[styles.menuText, { color: theme.colors.text }]}>User Details</Text>
        </TouchableOpacity>

        {/* View Appreciations - added per user request: placed under User Details */}
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Appreciation', { screen: 'MyAppreciations' })}>
          <View style={[styles.menuIcon, { backgroundColor: theme.name === 'dark' ? 'rgba(62, 168, 255, 0.1)' : '#EEF2FF' }]}>
            <MaterialIcons name="emoji-people" size={22} color={theme.colors.primary} />
          </View>
          <Text style={[styles.menuText, { color: theme.colors.text }]}>My Appreciations</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Settings')}>
          <View style={[styles.menuIcon, { backgroundColor: theme.name === 'dark' ? 'rgba(62, 168, 255, 0.1)' : '#EEF2FF' }]}>
            <MaterialIcons name="settings" size={22} color={theme.colors.primary} />
          </View>
          <Text style={[styles.menuText, { color: theme.colors.text }]}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Help')}>
          <View style={[styles.menuIcon, { backgroundColor: theme.name === 'dark' ? 'rgba(62, 168, 255, 0.1)' : '#EEF2FF' }]}>
            <MaterialIcons name="help-outline" size={22} color={theme.colors.primary} />
          </View>
          <Text style={[styles.menuText, { color: theme.colors.text }]}>Help & Support</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('About')}>
          <View style={[styles.menuIcon, { backgroundColor: theme.name === 'dark' ? 'rgba(62, 168, 255, 0.1)' : '#EEF2FF' }]}>
            <MaterialIcons name="info-outline" size={22} color={theme.colors.primary} />
          </View>
          <Text style={[styles.menuText, { color: theme.colors.text }]}>About</Text>
        </TouchableOpacity>

  <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <View style={[styles.menuIcon, { backgroundColor: theme.name === 'dark' ? 'rgba(255, 66, 79, 0.15)' : '#FFEFEF' }]}>
            <MaterialIcons name="logout" size={22} color="#FF424F" />
          </View>
          <Text style={[styles.menuText, { color: '#FF424F' }]}>Log out</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>

      {/* Profile Picture Menu Modal */}
      <Modal
        visible={showProfilePicMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProfilePicMenu(false)}
      >
        <Pressable 
          style={styles.modalBackdrop}
          onPress={() => setShowProfilePicMenu(false)}
        >
          <Pressable 
            style={styles.profilePicMenuContainer}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Large Profile Picture Preview */}
            <TouchableOpacity 
              style={styles.profilePicPreview}
              activeOpacity={0.9}
              onPress={() => {
                if (profilePicUri) {
                  setShowFullScreenImage(true);
                }
              }}
            >
              {loadingPic ? (
                <ActivityIndicator size="large" color="#1976D2" />
              ) : profilePicUri ? (
                <Image 
                  source={{ uri: profilePicUri }} 
                  style={styles.profilePicPreviewImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.profilePicPreviewPlaceholder, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.profilePicPreviewInitial}>
                    {(user?.username || user?.full_name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.profilePicMenuTitle}>Profile Picture</Text>

            {/* Action Buttons */}
            <View style={styles.profilePicMenuActions}>
              <TouchableOpacity 
                style={styles.profilePicMenuButton}
                onPress={() => {
                  setShowProfilePicMenu(false);
                  setTimeout(() => pickProfileImage(), 300);
                }}
                disabled={uploadingPic}
              >
                <View style={[styles.profilePicMenuIconCircle, { backgroundColor: '#E8F5E9' }]}>
                  <MaterialIcons name="photo-camera" size={24} color="#2E7D32" />
                </View>
                <Text style={styles.profilePicMenuButtonText}>
                  {profilePicUri ? 'Change Picture' : 'Upload Picture'}
                </Text>
              </TouchableOpacity>

              {profilePicUri && (
                <TouchableOpacity 
                  style={styles.profilePicMenuButton}
                  onPress={() => {
                    setShowProfilePicMenu(false);
                    setTimeout(() => deleteProfilePicture(), 300);
                  }}
                  disabled={uploadingPic}
                >
                  <View style={[styles.profilePicMenuIconCircle, { backgroundColor: '#FFEBEE' }]}>
                    <MaterialIcons name="delete-outline" size={24} color="#C62828" />
                  </View>
                  <Text style={[styles.profilePicMenuButtonText, { color: '#C62828' }]}>Delete Picture</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[styles.profilePicMenuButton, styles.profilePicMenuCancelButton]}
                onPress={() => setShowProfilePicMenu(false)}
              >
                <Text style={styles.profilePicMenuCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Full Screen Zoomable Image Viewer */}
      <Modal
        visible={showFullScreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullScreenImage(false)}
      >
        <View style={styles.fullScreenImageContainer}>
          {/* Header with close button */}
          <View style={styles.fullScreenImageHeader}>
            <Text style={styles.fullScreenImageTitle}>Profile Picture</Text>
            <TouchableOpacity 
              onPress={() => setShowFullScreenImage(false)}
              style={styles.fullScreenImageCloseButton}
            >
              <MaterialIcons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Zoomable Image */}
          <ScrollView
            contentContainerStyle={styles.fullScreenImageScrollContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Pressable onPress={() => setShowFullScreenImage(false)}>
              {profilePicUri ? (
                <Image 
                  source={{ uri: profilePicUri }} 
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                />
              ) : null}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 40,
    backgroundColor: '#f6f8fb',
    minHeight: '100%'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#0a2850'
  },
  menuCard: {
    marginTop: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    elevation: 1
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)'
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  menuText: {
    fontSize: 15,
    color: '#1F2937'
  },
  userCard: {
    marginTop: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8EEF8',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  userInfo: {
    marginLeft: 12,
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a2850'
  },
  userNickname: {
    fontSize: 14,
    color: '#374151',
    marginTop: 4
  },
  userBio: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4
  },
  userMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2
  },
  // Profile Picture Menu Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  profilePicMenuContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  profilePicPreview: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignSelf: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  profilePicPreviewImage: {
    width: '100%',
    height: '100%',
  },
  profilePicPreviewPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicPreviewInitial: {
    fontSize: 64,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profilePicMenuTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 24,
  },
  profilePicMenuActions: {
    gap: 12,
  },
  profilePicMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  profilePicMenuIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicMenuButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  profilePicMenuCancelButton: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  profilePicMenuCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    flex: 1,
  },
  // Full Screen Image Viewer Styles
  fullScreenImageContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullScreenImageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  fullScreenImageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fullScreenImageCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  fullScreenImageScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
  },
});

export default ProfileScreen;
