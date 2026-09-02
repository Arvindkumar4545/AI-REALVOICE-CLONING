# VoiceShield - Quick Start Guide

## 🚀 Start the Application (2 Commands)

### 1️⃣ Backend (Terminal 1)
```bash
cd f:\VoiceShieldData
f:/VoiceShieldData/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Wait for: `INFO: Uvicorn running on http://127.0.0.1:8000`

### 2️⃣ Frontend (Terminal 2)
```bash
cd f:\VoiceShieldData\frontend
npm run dev
```

Wait for: `✓ Ready in X.Xs`

## 🌐 Access the Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://127.0.0.1:8000
- **API Docs**: http://127.0.0.1:8000/docs (Swagger UI)

## ✅ Test the Setup

1. Visit http://localhost:3001 in your browser
2. Verify landing page loads with 3D visualization
3. Click "Analyze Audio" button
4. Drag/drop or upload an audio file (WAV, FLAC, MP3, OGG, or M4A)
5. Watch the processing animation
6. View detection results

## 📋 Supported Audio Formats

- WAV (recommended)
- FLAC (lossless)
- MP3
- OGG
- M4A

**Max file size**: 50MB

## 🔧 Configuration

### Frontend
- File: `frontend/.env.local`
- Default API: http://localhost:8000

### Backend  
- File: `backend/.env` (optional)
- Model path: `models/voiceshield_best/model.pt`
- Auto-loads on startup

## 📊 Pages Available

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Landing page with hero and features |
| Detect | `/detect` | Audio upload and detection |
| Dashboard | `/dashboard` | Analytics and statistics |
| Model | `/model` | Model architecture details |
| Research | `/research` | Research pipeline explanation |
| Datasets | `/datasets` | Dataset information |
| About | `/about` | Project information |

## ⚙️ System Requirements

- **Node.js**: 16+ (for frontend)
- **Python**: 3.10+ (for backend, already installed)
- **Disk Space**: 2GB minimum
- **RAM**: 4GB minimum
- **Ports**: 3001 (frontend), 8000 (backend)

## 🐛 Troubleshooting

### Port Already in Use
```bash
# If port 3001 is in use, Next.js auto-selects next available
# Check terminal output for actual port being used
```

### Backend Connection Error
```bash
# Ensure backend is running on http://127.0.0.1:8000
# Check firewall settings
# Verify NEXT_PUBLIC_API_URL in frontend/.env.local
```

### Model Not Found
```bash
# Ensure model exists at: models/voiceshield_best/model.pt
# Check file permissions
```

### Dependencies Error
```bash
# Reinstall backend dependencies:
pip install -r backend/requirements.txt

# Reinstall frontend dependencies:
cd frontend && npm install
```

## 📁 Key Files

- **Landing Page**: `frontend/src/app/page.tsx`
- **Detection Page**: `frontend/src/app/detect/page.tsx`
- **API Client**: `frontend/src/lib/api.ts`
- **Backend API**: `backend/main.py`
- **Documentation**: `README.md`
- **Build Summary**: `BUILD_SUMMARY.md`

## 📚 Learn More

- Read `README.md` for complete documentation
- Read `BUILD_SUMMARY.md` for project overview
- Check `backend/main.py` for API implementation
- Review `frontend/src/lib/api.ts` for API client

## 🎯 Next Steps

1. **Explore the UI**: Click through all pages
2. **Test Detection**: Upload sample audio file
3. **Review Metrics**: Check model information
4. **Understand Pipeline**: Read research methodology
5. **Plan Integration**: Consider database for analytics

## ⚡ Performance Tips

- **First load**: May take 10-30 seconds (model loading)
- **Subsequent detections**: 300-500ms per file
- **3D animations**: Smooth at 60fps on modern devices
- **On older machines**: May need to reduce animation complexity

## 🔒 Security Notes

- Audio files are not permanently stored
- Temporary files auto-deleted after processing
- No data sent to external services
- All processing happens locally
- CORS configured for localhost

## 📞 Support

If you encounter issues:
1. Check terminal output for error messages
2. Verify all dependencies installed
3. Ensure model file exists
4. Review firewall settings
5. Check README.md troubleshooting section

---

**Everything is configured and ready to run!** 🎉
