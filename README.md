# HCCDA-AI Admission Test

A lightweight, secure, automated online assessment test with anti-cheat protections (tab switch limits), instant auto-grading, and an administrative dashboard with Excel CSV export.

---

## 🚀 Deploy to Vercel (Online Test)

### Step 1: Push code to GitHub
1. Create a repository on GitHub (e.g. `hccda-ai-admission-test`).
2. Initialize and push your project:
   ```bash
   git init
   git add .
   git commit -m "HCCDA-AI Admission Test setup for Vercel"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/hccda-ai-admission-test.git
   git push -u origin main
   ```

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New..."** -> **"Project"**.
3. Import your GitHub repository.
4. In the **Environment Variables** section, add:
   - `ADMIN_KEY`: Choose a secure secret key for accessing `/admin`.
   - `MONGODB_URI` *(Recommended for live exams)*: Your MongoDB Atlas connection string (e.g., `mongodb+srv://admin:pass@cluster.mongodb.net/?retryWrites=true&w=majority`).
     *(Note: MongoDB Atlas is completely free up to 512MB and ensures permanent persistence of all student answers across serverless invocations).*
5. Click **Deploy**.

### Live URLs:
- **Student Exam Portal:** `https://your-project.vercel.app/`
- **Admin Dashboard:** `https://your-project.vercel.app/admin`

---

## 💻 Run Locally (Offline / Local Network)

1. Make sure Node.js 18+ is installed.
2. In PowerShell / Terminal run:
   ```powershell
   $env:ADMIN_KEY = "my-secret-admin-key"
   npm start
   ```
3. Open `http://localhost:3000` on your computer, or `http://YOUR-COMPUTER-IP:3000` on devices connected to the same Wi-Fi / Local Area Network.
