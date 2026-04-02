# 🌙 Dark Mode Implementation Guide

## ✅ **Completed Screens** (Fully Dark Mode Compatible)

### 1. **ExpenseScreen.jsx** ✓
- ✅ Theme hook imported and configured
- ✅ Container backgrounds use `theme.colors.background`
- ✅ Header uses `theme.colors.primary`
- ✅ Tabs use `theme.colors.surface`
- ✅ All text uses `theme.colors.text` / `theme.colors.muted`
- ✅ Input fields have dark mode styling
- ✅ Error/Success messages have dark backgrounds
- ✅ Theme passed to MyClaims component

### 2. **MyClaims.jsx** ✓
- ✅ Accepts theme prop from parent
- ✅ Stat cards use `theme.colors.surface`
- ✅ Claim cards have dark backgrounds
- ✅ Filter indicator styled for dark mode
- ✅ Empty state styled for dark mode
- ✅ All text colors adaptive

### 3. **HomeScreen.jsx** ✓ (Already implemented)
- ✅ Theme hook configured
- ✅ StatusBar adaptive
- ✅ Background colors dynamic
- ✅ Cards and buttons themed

### 4. **TimesheetScreen.jsx** ✓ (Already implemented)
- ✅ Theme hook imported
- ✅ UI elements themed

### 5. **BackgroundCheckForm.jsx** ✓ (Already implemented)
- ✅ Theme hook configured
- ✅ StatusBar themed

### 6. **Settings.jsx** ✓ (Already implemented)
- ✅ Dark mode toggle working
- ✅ Theme switcher functional

### 7. **App.jsx** ✓ (Already implemented)
- ✅ ThemeProvider wraps entire app
- ✅ Theme context available globally

---

## 🔄 **Partially Completed** (Hook imported, needs UI updates)

### 8. **LeaveManagementScreen.jsx** 🔄
- ✅ Theme hook imported
- ✅ Main container themed
- ✅ StatusBar adaptive
- ⚠️ **TODO:** Child components need theme props
- ⚠️ **TODO:** LeaveCard, ApplyLeaveForm need styling
- ⚠️ **TODO:** Modal needs dark background

### 9. **ProfileScreen.jsx** 🔄
- ✅ Theme hook imported
- ⚠️ **TODO:** Container backgrounds need theme colors
- ⚠️ **TODO:** Text colors need to be adaptive
- ⚠️ **TODO:** Cards need theme styling

### 10. **PoliciesView.jsx** 🔄
- ✅ Theme hook imported
- ⚠️ **TODO:** SafeAreaView background
- ⚠️ **TODO:** Search bar styling
- ⚠️ **TODO:** Policy cards styling
- ⚠️ **TODO:** Category buttons styling

---

## ❌ **Needs Implementation** (No theme hook yet)

### 11. **Appreciation Screens**
- ❌ ShowAppreciation.jsx
- ❌ ViewAllAppreciation.jsx
- ❌ MyAppreciations.jsx
- ❌ AppreciationDashboard.jsx

### 12. **Other Screens**
- ❌ About.jsx
- ❌ Calendar.jsx
- ❌ Tasks.jsx (if exists)
- ❌ AITracker.jsx (if exists)

---

## 🎨 **Theme Color Palette**

### Light Mode
```javascript
{
  background: '#F3F6FA',   // Main background
  surface: '#FFFFFF',      // Cards, modals
  primary: '#0B4A84',      // Headers, buttons
  accent: '#1976D2',       // Highlights
  text: '#111827',         // Primary text
  muted: '#6B7280',        // Secondary text
  card: '#EAF4FF',         // Card backgrounds
  success: '#10B981',      // Success states
  danger: '#EF4444'        // Error states
}
```

### Dark Mode
```javascript
{
  background: '#04050A',   // Main background
  surface: '#071028',      // Cards, modals
  primary: '#3EA8FF',      // Headers, buttons
  accent: '#60A5FA',       // Highlights
  text: '#E6EEF8',         // Primary text
  muted: '#9AA6B2',        // Secondary text
  card: '#0E1A2B',         // Card backgrounds
  success: '#34D399',      // Success states
  danger: '#FB7185'        // Error states
}
```

---

## 📋 **Implementation Checklist**

For each screen that needs dark mode:

### 1. **Import Theme Hook**
```javascript
import { useTheme } from './theme/ThemeContext';
```

### 2. **Use Theme in Component**
```javascript
const MyComponent = () => {
  const { theme } = useTheme();
  // ... rest of component
};
```

### 3. **Apply to Main Container**
```javascript
<SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
```

### 4. **Update StatusBar**
```javascript
<StatusBar 
  barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} 
  backgroundColor={theme.colors.primary} 
/>
```

### 5. **Update Cards/Surfaces**
```javascript
<View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
```

### 6. **Update Text Colors**
```javascript
<Text style={[styles.text, { color: theme.colors.text }]}>
<Text style={[styles.mutedText, { color: theme.colors.muted }]}>
```

### 7. **Update Input Fields**
```javascript
<TextInput
  style={[styles.input, { 
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    borderColor: theme.name === 'dark' ? '#2D3748' : '#E0E0E0'
  }]}
  placeholderTextColor={theme.colors.muted}
/>
```

### 8. **Update Borders**
```javascript
borderColor: theme.name === 'dark' ? '#1A2332' : '#E5E7EB'
```

---

## 🚀 **How to Test**

1. **Toggle Dark Mode:**
   - Open app → Profile → Settings
   - Toggle "Dark mode" switch
   - App should instantly update

2. **Check Each Screen:**
   - Navigate to every screen
   - Verify backgrounds, text, cards are properly themed
   - Check modals and overlays
   - Test input fields and buttons

3. **Verify Persistence:**
   - Close and reopen app
   - Theme preference should be remembered

---

## 🔧 **Common Patterns**

### Conditional Dark Mode Styling
```javascript
backgroundColor: theme.name === 'dark' ? '#0E1A2B' : '#FAFBFC'
```

### Using Theme Colors
```javascript
backgroundColor: theme.colors.surface
color: theme.colors.text
borderColor: theme.colors.muted
```

### StatusBar (iOS)
```javascript
barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'}
```

---

## ✨ **Best Practices**

1. **Always use theme colors** instead of hardcoded colors
2. **Test both light and dark modes** for every change
3. **Ensure proper contrast** for readability
4. **Use semantic color names** (text, muted, surface, etc.)
5. **Pass theme as prop** to child components when needed
6. **Maintain consistency** across all screens

---

## 📱 **User Experience**

### What Users See:
- ✅ Smooth transitions between themes
- ✅ Consistent color scheme app-wide
- ✅ Easy-to-read text in both modes
- ✅ Professional, modern appearance
- ✅ Battery-friendly dark mode on OLED screens
- ✅ Reduced eye strain in low light

---

## 🎯 **Priority Order for Remaining Screens**

1. **High Priority** (User-facing, frequently used):
   - ProfileScreen.jsx
   - PoliciesView.jsx
   - LeaveManagementScreen.jsx (complete child components)

2. **Medium Priority** (Important but less frequent):
   - ShowAppreciation.jsx
   - ViewAllAppreciation.jsx
   - Calendar.jsx

3. **Low Priority** (Admin/less common):
   - About.jsx
   - Help screens
   - Other utility screens

---

## 💡 **Tips**

- Use VSCode search/replace for batch updates
- Test on both iOS and Android
- Check modal backgrounds (they often get missed)
- Verify input focus states
- Test with actual dark mode images/icons if any

---

**Last Updated:** December 2024
**Status:** Core functionality complete, additional screens need implementation
