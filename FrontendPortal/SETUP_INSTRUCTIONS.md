# 🚀 Frontend Portal Setup Instructions

This is the web frontend for the Employee Management System. It can be configured to work with any backend by simply changing environment variables.

---

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **Backend API** URL (your backend deployment)
- **APK Download Link** (optional - for mobile app distribution)

---

## 🔧 Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Backend API URL (REQUIRED)
REACT_APP_API_BASE_URL=https://your-backend-url.com

# APK Download Link (OPTIONAL)
# If not provided, will use default GitHub release link
REACT_APP_APK_DOWNLOAD_URL=https://your-apk-hosting.com/app.apk
```

### 3. Start Development Server

```bash
npm start
```

Application will open at: http://localhost:3000

---

## 🌐 Production Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized build in the `build/` folder.

### Deploy to Hosting

Upload the `build/` folder to:
- **Netlify** (recommended)
- **Vercel**
- **GitHub Pages**
- **Firebase Hosting**
- Any static hosting service

---

## 🔐 Backend Requirements

Your backend must support the following endpoints:

### Authentication Endpoints:
- `POST /auth/employee/login` - Employee login
- `POST /auth/hr/login` - HR login
- `POST /auth/admin/login` - Admin login

### CORS Configuration:
Your backend must allow requests from your frontend domain:

```python
# Example for FastAPI
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📱 Mobile App QR Code Feature

The login page includes a "Download Mobile App" button that shows a QR code.

### How it works:
1. User clicks "Download Mobile App" button
2. Modal popup shows QR code
3. User scans QR code with phone camera
4. APK downloads automatically

### Configure APK Link:

**Option 1: Environment Variable (Recommended)**
```env
REACT_APP_APK_DOWNLOAD_URL=https://your-apk-link.com/app.apk
```

**Option 2: Edit Code Directly**
```javascript
// src/components/Login.js (line 11)
const APK_DOWNLOAD_URL = 'https://your-apk-link.com/app.apk';
```

### APK Hosting Options:
- **GitHub Releases** (free, version controlled)
- **Google Drive** (easy, requires format change)
- **Dropbox** (simple, add `?dl=1` to link)
- **Firebase Storage** (professional)

---

## 🎨 Customization

### Change Company Logo
Replace logo in: `public/logo.png`

### Update Theme Colors
Edit: `src/components/Login.js` - Look for gradient colors in styles section

### Modify Features
All main components are in: `src/components/`

---

## 📝 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `REACT_APP_API_BASE_URL` | ✅ Yes | Backend API URL | `https://api.company.com` |
| `REACT_APP_APK_DOWNLOAD_URL` | ❌ No | Mobile app APK link | `https://github.com/.../app.apk` |

---

## 🐛 Troubleshooting

### CORS Errors
- Check backend CORS configuration
- Ensure your frontend domain is in `allow_origins`
- Check browser console for detailed error

### API Connection Failed
- Verify backend URL in `.env`
- Check if backend is running
- Test API directly with Postman/curl

### QR Code Not Working
- Verify APK link is publicly accessible
- Test link in incognito browser window
- Check if hosting requires authentication

---

## 📞 Support

For issues or questions, contact the development team.

---

## 📄 License

Copyright © 2025 Concientech IT Solutions

---

**Note:** Always keep your `.env` file private and never commit it to version control!
