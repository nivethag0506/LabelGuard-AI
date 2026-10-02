# LegalScan — AI-Powered Packaged Commodity Compliance Assistant

> **SCAN • VERIFY • PROTECT**  
> *"Transform packaged product labels into actionable compliance insights in seconds."*

---

## ⚖️ Statutory Advisory & Legal Limitation

> **IMPORTANT LEGAL NOTICE:**  
> **LegalScan provides a preliminary, automated assessment of detectable package declarations for assistance and review. It does not constitute legal certification, enforcement action, or a substitute for verification by the competent authority under the Legal Metrology (Packaged Commodities) Rules, 2011.**  
>
> Assessments use terminology such as:
> - *Preliminary Compliance Assessment*
> - *Potential Issue*
> - *Not Detected*
> - *Needs Review*
> - *High Risk*

---

## 📋 Problem Statement

Under the **Legal Metrology Act, 2009** and the **Legal Metrology (Packaged Commodities) Rules, 2011**, all pre-packaged commodities sold in India must display mandatory statutory declarations (such as Generic Product Name, Manufacturer/Packer Details, Complete Address, Net Quantity in SI units, Maximum Retail Price inclusive of all taxes, Month & Year of Manufacture, Batch Number, Country of Origin, and Consumer Care details).

Manual verification of packaging labels by enforcement inspectors, quality assurance teams, and consumer rights groups is slow, labor-intensive, and prone to human error. There is no automated, centralized tool to rapidly evaluate label declarations and prioritize non-compliant goods for regulatory review.

---

## 💡 Solution

**LegalScan** is an end-to-end full-stack software system that automates the verification of packaged commodities. By uploading or capturing a photo of a packaging label, the system:
1. Extracts textual declarations using optical character recognition (OCR) and pattern recognition.
2. Identifies structured packaged commodity declarations.
3. Evaluates declarations against a configurable **Compliance Rule Engine** stored in MongoDB.
4. Generates a **Preliminary Compliance Score (0–100)** and categorizes the item as **Compliant**, **Needs Review**, or **High Risk**.
5. Explains detected issues with statutory rationale (*"Why this matters"*) and actionable next steps (*"Recommended action"*).
6. Persists every inspection to MongoDB Atlas for historical tracking and regulatory auditing.
7. Aggregates market data into an interactive **Authority Dashboard** showing compliance distributions, trends, and common market defects.

---

## 🚀 Key Features

- **Multi-Input Scanning**: Drag-and-drop desktop upload, file browser, and mobile-friendly camera capture (`capture="environment"`).
- **Dual Deterministic Demo Pipeline**:
  - *Demo Product A (Premium Rice)*: Fully compliant sample with all 10 declarations detected (Est. Score: 100%, Status: COMPLIANT).
  - *Demo Product B (Premium Snack)*: Deficient sample missing Consumer Care, Origin, Expiry, and partial address (Est. Score: ~66%, Status: HIGH_RISK).
- **5-Stage Analysis Loader**: Snappy real-time progress indicators (*Reading image &rarr; Extracting label &rarr; Checking declarations &rarr; Running rules &rarr; Generating report*).
- **Detailed Compliance Report**:
  - Preliminary Compliance Score Gauge with pass/warn/fail counts.
  - Mandatory Declarations Checklist with weighted point contributions.
  - Structured extraction matrix comparing detected values against statutory benchmarks.
  - Dedicated Issue Cards explaining non-compliance reasons and recommended actions.
  - One-click Print/Export for audit logging.
- **Searchable Inspection History**: Filter past scans by status (Compliant, Needs Review, High Risk), search by keyword, and sort by date or score.
- **Authority Analytics Dashboard**: Real-time metrics, responsive SVG compliance distribution bar, 7-day trend chart, and common market defects ranking.
- **Mobile-First Responsive UI**: Clean public-sector govtech design system built with CSS variables. Zero horizontal scrolling across 320px–1920px viewports.

---

## 🏗️ Architecture & Technology Stack

```
                          ┌─────────────────────────────────────┐
                          │         React 18 + Vite SPA         │
                          │   Mobile-First • Vanilla CSS Tokens  │
                          └──────────────────┬──────────────────┘
                                             │
                                     REST API / HTTPS
                                             │
                          ┌──────────────────▼──────────────────┐
                          │      Node.js + Express Backend      │
                          │  Multer Uploads • Compliance Engine │
                          └──────────────────┬──────────────────┘
                                             │
                                     Mongoose 8.x ODM
                                             │
                          ┌──────────────────▼──────────────────┐
                          │        MongoDB Atlas Cluster        │
                          │     Database: legalscan             │
                          │     Collections:                    │
                          │     - scans                         │
                          │     - compliancerules               │
                          │     - users                         │
                          └──────────────────┬──────────────────┘
                                             │
                                     MongoDB Compass
                              (Optional GUI DB Inspection)
```

- **Frontend**: React 18, Vite 6, React Router DOM 6, Lucide React icons, Vanilla CSS Design System.
- **Backend**: Node.js 22, Express 4, Multer, Dotenv, CORS.
- **Database**: MongoDB Atlas / Local MongoDB, Mongoose 8 ODM.
- **Scoring & Evaluation**: Configurable Rule Engine loaded dynamically from MongoDB.

---

## 📁 Project Structure

```
LegalScan/
│
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnalysisLoader.jsx / .css
│   │   │   ├── ChartCard.jsx / .css
│   │   │   ├── ComplianceChecklist.jsx / .css
│   │   │   ├── ComplianceScore.jsx / .css
│   │   │   ├── DashboardMetric.jsx / .css
│   │   │   ├── Disclaimer.jsx
│   │   │   ├── Footer.jsx / .css
│   │   │   ├── ImagePreview.jsx / .css
│   │   │   ├── IssueCard.jsx / .css
│   │   │   ├── Navbar.jsx / .css
│   │   │   ├── ProductInfoCard.jsx / .css
│   │   │   ├── ScanCard.jsx / .css
│   │   │   ├── SearchFilter.jsx / .css
│   │   │   ├── StateFeedback.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── UploadZone.jsx / .css
│   │   ├── pages/
│   │   │   ├── AboutPage.jsx / .css
│   │   │   ├── DashboardPage.jsx / .css
│   │   │   ├── HistoryPage.jsx / .css
│   │   │   ├── LandingPage.jsx / .css
│   │   │   ├── ResultPage.jsx / .css
│   │   │   └── ScanPage.jsx / .css
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── styles/
│   │   │   └── index.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   └── .env
│
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── dashboardController.js
│   │   ├── ruleController.js
│   │   └── scanController.js
│   ├── middleware/
│   │   └── uploadMiddleware.js
│   ├── models/
│   │   ├── ComplianceRule.js
│   │   ├── Scan.js
│   │   └── User.js
│   ├── routes/
│   │   ├── dashboardRoutes.js
│   │   ├── demoRoutes.js
│   │   ├── ruleRoutes.js
│   │   └── scanRoutes.js
│   ├── seed/
│   │   └── seedDatabase.js
│   ├── services/
│   │   ├── complianceEngine.js
│   │   └── ocrService.js
│   ├── uploads/
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   └── .env
│
├── test_system.mjs
├── .gitignore
├── .env.example
├── README.md
└── package.json
```

---

## 🗄️ Database Architecture & Collections

### 1. `scans` Collection (`Scan` Model)
| Field | Type | Description |
|---|---|---|
| `productName` | String | Declared common or generic product name |
| `manufacturer` | String | Manufacturer, packer, or importer name |
| `manufacturerAddress` | String | Premises address including street, city, state, PIN |
| `netQuantity` | String | Net quantity in SI units (kg, g, l, ml) |
| `mrp` | String | Maximum Retail Price inclusive of all taxes |
| `batchNumber` | String | Batch / lot / identification number |
| `manufacturingDate` | String | Month and year of manufacture or pre-packing |
| `bestBefore` | String | Best before duration or expiry date |
| `countryOfOrigin` | String | Country of origin |
| `consumerCare` | String | Consumer grievance cell telephone, email, and address |
| `rawExtractedText` | String | Full raw text extracted via OCR |
| `productImageUrl` | String | URL / path to label image |
| `complianceScore` | Number | Preliminary score (0 to 100) |
| `status` | String | `COMPLIANT`, `NEEDS_REVIEW`, `HIGH_RISK` |
| `passedRules` | Number | Number of passed rules |
| `warningRules` | Number | Number of rules with potential issues |
| `failedRules` | Number | Number of missing/failed rules |
| `totalRules` | Number | Total active rules evaluated |
| `issues` | Array | Array of objects `{ ruleId, field, title, severity, detectedValue, explanation, recommendation }` |
| `createdAt` / `updatedAt`| Date | Timestamps |

### 2. `compliancerules` Collection (`ComplianceRule` Model)
| Field | Type | Description |
|---|---|---|
| `ruleId` | String | Unique identifier (e.g. `LMR-01`, `LMR-05`) |
| `label` | String | Human readable rule title |
| `field` | String | Target product field |
| `description` | String | Legal requirement description |
| `category` | String | `IDENTITY`, `MANUFACTURER`, `PRICING`, `QUANTITY`, etc. |
| `required` | Boolean | Whether declaration is statutory mandatory |
| `severity` | String | `HIGH`, `MEDIUM`, `LOW` |
| `weight` | Number | Point weight contribution (sum = 100 pts) |
| `active` | Boolean | Rule activation status |

### 3. `users` Collection (`User` Model)
| Field | Type | Description |
|---|---|---|
| `name` | String | Inspector or admin name |
| `email` | String | Email address |
| `role` | String | `INSPECTOR` or `ADMIN` |

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```ini
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/legalscan
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<USER>:<PASSWORD>@<CLUSTER>.mongodb.net/legalscan?retryWrites=true&w=majority
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend (`frontend/.env`)
```ini
VITE_API_URL=http://localhost:5000/api
```

---

## 🛠️ Step-by-Step Local Setup

### 1. Clone & Enter Project
```bash
git clone https://github.com/your-org/LegalScan.git
cd LegalScan
```

### 2. Setup & Start Backend
```bash
cd backend
npm install
npm run seed     # Seeds rules, users, and 8 realistic scan inspections
npm start        # Starts server on http://localhost:5000
```

### 3. Setup & Start Frontend
```bash
cd ../frontend
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```

### 4. Run Automated QA Suite
```bash
node test_system.mjs
```

---

## 🌐 MongoDB Atlas & Compass Setup

### Setting up MongoDB Atlas:
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create an account.
2. Create a new Cluster (M0 Free Tier).
3. Under **Database Access**, create a database user with read/write privileges.
4. Under **Network Access**, add IP Access `0.0.0.0/0` (allow from anywhere) or your current IP.
5. In your Cluster dashboard, click **Connect** &rarr; **Drivers** (Node.js).
6. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/legalscan?retryWrites=true&w=majority
   ```
7. Paste this connection URI into `backend/.env` under `MONGODB_URI`.
8. Run `npm run seed` inside `backend/` to seed the database in Atlas.

### Using MongoDB Compass (GUI Management):
1. Download and open **MongoDB Compass**.
2. Paste the exact same connection URI (`mongodb://127.0.0.1:27017/legalscan` or your Atlas connection string).
3. Click **Connect**.
4. In the left sidebar, click the `legalscan` database.
5. Inspect the collections:
   - `compliancerules`: View and configure rule weights.
   - `scans`: View saved inspections, raw OCR text, and issues.
   - `users`: View inspector credentials.

*(Note: The deployed backend connects directly to MongoDB Atlas via `MONGODB_URI`. Compass is solely an inspection tool.)*

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health status of the API server |
| `GET` | `/api/rules` | Retrieve all active compliance rules |
| `POST` | `/api/rules` | Create a new compliance rule (Admin) |
| `PUT` | `/api/rules/:id` | Update rule weights or status |
| `DELETE` | `/api/rules/:id` | Deactivate/remove a compliance rule |
| `GET` | `/api/demo/products` | Retrieve deterministic demo products list |
| `POST` | `/api/scans` | Run compliance analysis on image or demo payload |
| `GET` | `/api/scans` | Retrieve scan history (`?search=`, `?status=`, `?sort=`) |
| `GET` | `/api/scans/:id` | Retrieve detailed compliance report by ID |
| `DELETE` | `/api/scans/:id` | Delete an inspection record |
| `GET` | `/api/dashboard/stats` | Aggregated authority compliance statistics |

---

## 🚢 Production Deployment

### Frontend Deployment (Vercel)
1. Push code to GitHub.
2. In Vercel, import the repository and set the **Root Directory** to `frontend`.
3. Set Build Command: `npm run build`
4. Set Output Directory: `dist`
5. Add Environment Variable:
   - `VITE_API_URL`: `https://your-backend.onrender.com/api`
6. Deploy.

### Backend Deployment (Render)
1. In Render, create a new **Web Service** pointing to the repository.
2. Set **Root Directory** to `backend`.
3. Set Build Command: `npm install`
4. Set Start Command: `node server.js`
5. Add Environment Variables:
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `mongodb+srv://<USER>:<PASS>@cluster.mongodb.net/legalscan?retryWrites=true&w=majority`
   - `CLIENT_URL`: `https://your-frontend.vercel.app`
6. Deploy.

---

## 🔮 Future Enhancements

1. **Production OCR Adapter**: Native integration with Google Cloud Vision API and AWS Textract for skew-corrected extraction.
2. **Multilingual Regional Support**: Recognition of Hindi, Tamil, Telugu, Kannada, Marathi, and Bengali packaging text.
3. **Computer Vision Bounding Boxes**: Visual overlays directly on the label photo indicating the exact physical location of each declaration.
4. **Geo-Tagged Inspections**: GPS tracking of retail locations for field compliance enforcement officers.
5. **Role-Based Authentication**: Secure JWT-based login for authorized Legal Metrology inspectors.

---

## 📄 License
Built for hackathon demonstration under the MIT License.
