# OceanEmbed Deployment Guide (Vercel & Cloud Hosting)

This guide provides step-by-step instructions to deploy both the **React + Vite Frontend** and the **FastAPI + PyTorch Backend** to the cloud.

---

## 🌐 Architecture Overview

- **Frontend (SPA)**: Hosted on **Vercel** with global Edge CDN caching for blazing fast map rendering.
- **Backend (PyTorch ML API)**: Hosted on **Render**, **Railway**, **Hugging Face Spaces**, or **AWS/GCP** (due to PyTorch C++ binaries and NetCDF datasets).

---

## Part 1: Deploy Frontend on Vercel (2 Minutes)

### Option A: Via Vercel Web Dashboard (Recommended)
1. Push your repository to **GitHub**:
   ```bash
   git add .
   git commit -m "OceanEmbed SIH26066 prototype"
   git push origin main
   ```
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository `Hack_Havoc_COEP`.
4. Configure the Project Settings:
   - **Root Directory**: Select `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://your-backend-service.onrender.com` *(or your deployed backend URL)*
6. Click **Deploy**. Your dashboard will be live at `https://your-project.vercel.app`!

---

### Option B: Via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend and deploy
cd frontend
vercel --prod
```

---

## Part 2: Deploy Backend on Render (Free & Fast)

[Render.com](https://render.com) provides free Python web service hosting with full PyTorch support.

1. Create a new **Web Service** on Render connected to your GitHub repo.
2. Configure settings:
   - **Root Directory**: `.` (leave default)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
3. Click **Create Web Service**.
4. Copy your live backend URL (e.g., `https://oceanembed-api.onrender.com`) and paste it as `VITE_API_BASE_URL` in Vercel.

---

## Part 3: Deploy Backend on Hugging Face Spaces (Free GPU/CPU)

1. Create a new Space on [huggingface.co/spaces](https://huggingface.co/spaces).
2. Choose **Docker** or **FastAPI** template.
3. Push the `backend/` files and `backend/requirements.txt`.
4. Hugging Face will host your API with free HTTPS endpoints.

---

## 🔒 Security & CORS Note
The FastAPI backend in `backend/main.py` is pre-configured with `CORSMiddleware(allow_origins=["*"])`, allowing your Vercel frontend to seamlessly query the API without CORS errors.

