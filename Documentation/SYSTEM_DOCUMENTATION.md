# PRMSC Land Donation System (LDS) - Complete System Documentation

> **Version**: 1.0  
> **Last Updated**: February 2026  
> **Prepared by**: Senior Development Team Audit

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Data Models](#data-models)
6. [API Endpoints](#api-endpoints)
7. [Frontend Components](#frontend-components)
8. [Mobile Application](#mobile-application)
9. [Security Implementation](#security-implementation)
10. [Deployment Architecture](#deployment-architecture)
11. [MySQL Migration Assessment](#mysql-migration-assessment)
12. [Known Issues & Recommendations](#known-issues--recommendations)
13. [Production Readiness Checklist](#production-readiness-checklist)

---

## Executive Summary

The PRMSC Land Donation System (LDS) is a comprehensive asset management platform designed for managing land requisitions, consultant asset plans, water quality monitoring, and field operations across Punjab's rural municipalities. The system comprises:

- **Web Application**: Angular 20+ single-page application
- **Backend API**: Node.js/Express REST API with MongoDB
- **Mobile Application**: React Native/Expo cross-platform app for field operations

### Core Business Functions

1. **Land Requisition Management**: Track land donations, acquisitions, and utilization
2. **Asset Management (Red Book)**: Geo-spatial tracking of infrastructure assets (pipelines, reservoirs, etc.)
3. **Water Quality Monitoring**: Sample collection, lab analysis, and quality scoring workflow
4. **Maintenance Scheduling**: Preventive/corrective maintenance tracking for assets
5. **Field Operations**: Mobile-first data collection with offline sync capabilities

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                             │
├─────────────────────┬─────────────────────┬─────────────────────────────┤
│   Angular Web App   │  React Native App   │      NGINX Reverse Proxy    │
│   (Port 4200 dev)   │   (Expo/Android)    │       (Port 80/443)         │
└─────────┬───────────┴─────────┬───────────┴───────────┬─────────────────┘
          │                     │                       │
          └─────────────────────┼───────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                           API LAYER                                      │
│                     Node.js/Express (Port 3000/4000)                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Routes: /users, /requisition, /consultant-plans, /water-quality-samples │
│  Middleware: JWT Auth, Rate Limiting, CORS, Validation                   │
│  Services: User ID sequencing, Water Quality computation                 │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                           DATA LAYER                                     │
│                       MongoDB (Port 27017)                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Collections: users, requisitions, consultantplans, waterqualitysamples │
│               supportrequests, accessrequests, counters                  │
│  Indexes: Geo-spatial (2dsphere), compound indexes for performance      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Authentication**: JWT tokens (24h expiry) issued on login, validated per request
2. **Authorization**: Role-based access control (RBAC) with tehsil scoping for field users
3. **File Storage**: Local filesystem (`/uploads/`) with multer middleware
4. **Geo-spatial**: MongoDB 2dsphere indexes for location queries, GeoJSON features stored

---

## Technology Stack

### Backend
| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 22.x |
| Framework | Express.js | 4.21.x |
| Database | MongoDB + Mongoose | 8.19.x |
| Authentication | JWT (jsonwebtoken) | 9.0.x |
| Password Hashing | bcryptjs | 3.0.x |
| Validation | express-validator | 7.2.x |
| File Upload | multer | 2.0.x |
| Rate Limiting | express-rate-limit | 8.2.x |
| PDF Generation | pdfkit | 0.15.x |

### Frontend (Web)
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Angular | 20.3.x |
| UI Components | Angular Material/CDK | 20.2.x |
| Maps | MapLibre GL + Leaflet | 3.5.x / 1.9.x |
| State Management | Angular Signals | Built-in |
| HTTP | Angular HttpClient | Built-in |
| Build Tool | Angular CLI / esbuild | 20.3.x |

### Mobile Application
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React Native | 0.74.x |
| Platform | Expo | 51.x |
| Navigation | React Navigation | 6.x |
| Maps | Mapbox GL (@rnmapbox/maps) | 10.2.x |
| State | Zustand | 4.5.x |
| Data Fetching | React Query | 3.39.x |
| Offline Storage | expo-sqlite + expo-secure-store | Latest |

---

## User Roles & Permissions

### Role Hierarchy

| Role | Description | Access Level |
|------|-------------|--------------|
| **Super Admin** | Full system access | All modules, all tehsils |
| **Admin** | Administrative access | All modules, all tehsils |
| **DM Tehsil** | District Manager | Requisitions in assigned tehsil |
| **Infra Engineer** | Infrastructure planning | Asset management, requisitions |
| **CID** | Central Investigation | Read access to land records |
| **Chief BCC** | Chief Building Control | Approval workflows |
| **BCC Officer Tehsil** | Building Control Officer | Tehsil-scoped approvals |
| **EDCS Consultant** | External consultant | Asset management (EDCS dashboard) |
| **EDCS User** | EDCS viewer | Read-only EDCS dashboard |
| **Tehsil Manager** | Field operations manager | Maintenance, asset updates |
| **RA Environment** | Environmental Assessment | Mark critical assets, water quality |
| **PCRWR Sampler** | Water sample collector | Field collection workflow |
| **PCRWR Lab** | Lab technician | Lab analysis, results upload |
| **WB User** | World Bank observer | Read-only dashboard access |
| **Citizen** | Public user | Self-service portal (limited) |

### Access Control Implementation

```javascript
// Backend: Role guard middleware
function requireRole(...allowed) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ msg: 'Forbidden' });
    }
    next();
  };
}

// Frontend: Angular route guard
export const roleGuard = (allowedRoles: string[]) => () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.getCurrentUser();
  if (user && allowedRoles.includes(user.role)) {
    return true;
  }
  router.navigate(['/login']);
  return false;
};
```

---

## Data Models

### User Model
```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (hashed with bcrypt),
  role: Enum [15 roles],
  gender: String,
  cnic: String,
  cnicExpiry: String,
  address: String,
  dob: String,
  phone: String,
  activeStatus: String (default: 'inactive'),
  simpleId: Number (auto-generated sequence)
}
```

### Requisition Model
```javascript
{
  title: String (required),
  description: String,
  purpose: String (required),
  division: String,
  district: String,
  tehsil: String (required),
  requestedBy: ObjectId (ref: User),
  sequenceNumber: Number (auto-generated),
  
  // Land dimensions
  landBreadth: Number,
  landDepth: Number,
  calculatedAreaSqFt: Number,
  calculatedAreaMarlas: Number,
  calculatedAreaKanals: Number,
  
  // Location data
  location: {
    address: String,
    coordinates: { lat: Number, lng: Number }
  },
  mapMarker: { lat: Number, lng: Number },
  mapFeatures: [Mixed],  // GeoJSON features
  
  // Land Acquisition workflow
  landAcquisition: {
    type: Enum ['Govt Land', 'Private Land'],
    status: String,
    donor: { fullName, cnic, contactNumber, address, ... },
    land: { khasraNumber, area, latitude, longitude, ... },
    donation: { donationType, purpose, willingnessDate, ... },
    verification: { verifiedBy, verifiedDate, approvalStatus, ... }
  },
  
  // Land Utilization tracking
  landUtilization: {
    overview: { phase, summary, nextMilestone },
    civilStructures: [CivilStructureSchema],
    machinery: [MachinerySchema],
    progressUpdates: [ProgressUpdateSchema],
    gallery: [String]
  },
  
  // Workflow
  status: String (default: 'Pending'),
  priority: Enum ['Low', 'Medium', 'High'],
  assignedTo: ObjectId (ref: User),
  activityLog: [ActivityLogSchema],
  
  // Timestamps
  dateCreated: Date,
  lastUpdated: Date
}
```

### ConsultantPlan Model (Asset)
```javascript
{
  title: String (required),
  assetType: String (required),
  assetLabel: String (required),
  category: String (required),  // 'Water Supply', 'Sewerage', 'Support Facility'
  layerName: String,
  description: String,
  requisition: ObjectId (ref: Requisition),
  tehsil: String,
  district: String,
  
  // GeoJSON Feature
  feature: {
    type: 'Feature',
    geometry: Mixed (Point, LineString, Polygon),
    properties: Mixed
  },
  
  // Flexible attributes
  attributes: Mixed,
  attachments: [{ storedName, originalName, mimeType, size }],
  
  // Maintenance tracking
  maintenanceRecords: [{
    performedAt: Date,
    type: Enum ['preventive', 'corrective', 'emergency', 'inspection'],
    status: Enum ['completed', 'pending', 'cancelled'],
    description: String,
    cost: Number,
    notes: String,
    recordedBy: ObjectId
  }],
  
  // Critical asset flagging (Water Quality workflow)
  criticalFlag: Boolean,
  criticalReason: String,
  criticalMarkedAt: Date,
  criticalMarkedBy: ObjectId,
  
  // Water quality summary
  latestQualityStatus: {
    status: String,
    score: Number,
    label: String,
    updatedAt: Date
  },
  
  // Ownership
  createdBy: ObjectId,
  updatedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### WaterQualitySample Model
```javascript
{
  plan: ObjectId (ref: ConsultantPlan, required),
  planSnapshot: { planId, title, category, tehsil, district },
  
  status: Enum [
    'awaiting_assignment',
    'awaiting_collection', 
    'collecting',
    'in_lab',
    'results_ready',
    'closed',
    'cancelled'
  ],
  
  statusHistory: [{
    code: String,
    label: String,
    note: String,
    tone: Enum ['info', 'success', 'warning', 'critical'],
    createdAt: Date,
    createdBy: ObjectId
  }],
  
  // Assignment
  assignedSampler: ObjectId (ref: User),
  assignedSamplerName: String,
  assignedAt: Date,
  
  // Collection data
  collection: {
    collectedAt: Date,
    fieldNotes: String,
    attachments: [AttachmentSchema],
    location: { lat: Number, lng: Number },
    collectedBy: ObjectId
  },
  
  // Lab analysis
  labAnalysis: {
    receivedAt: Date,
    completedAt: Date,
    analyst: ObjectId,
    metrics: {
      ph: Number,
      turbidity: Number,
      tds: Number,
      // extensible
    },
    attachments: [AttachmentSchema],
    notes: String
  },
  
  // Computed water quality score
  computedScore: {
    indexName: 'potability-index',
    value: Number (0-100),
    rating: Enum ['excellent', 'good', 'fair', 'poor', 'pending']
  },
  
  // Timestamps
  createdBy: ObjectId,
  updatedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/users/register` | Register new user | Public |
| POST | `/users/login` | Login, get JWT | Public |
| GET | `/users` | List/search users | Auth |
| POST | `/users` | Admin create user | Admin |
| PUT | `/users/:id` | Update user | Admin |
| DELETE | `/users/:id` | Delete user | Admin |

### Requisitions
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/requisition` | List requisitions | Auth |
| GET | `/requisition/:id` | Get requisition detail | Auth |
| POST | `/requisition` | Create requisition | Auth |
| PUT | `/requisition/:id` | Update requisition | Auth |
| DELETE | `/requisition/:id` | Delete requisition | Admin |
| POST | `/requisition/:id/land-acquisition` | Update land acquisition | Auth |
| POST | `/requisition/:id/land-utilization` | Update land utilization | Auth |

### Consultant Plans (Assets)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/consultant-plans` | List assets | Auth |
| GET | `/consultant-plans/:id` | Get asset detail | Auth |
| POST | `/consultant-plans` | Create asset | Auth |
| PUT | `/consultant-plans/:id` | Update asset | Auth |
| DELETE | `/consultant-plans/:id` | Delete asset | Admin |
| POST | `/consultant-plans/:id/maintenance` | Add maintenance record | Auth |
| PUT | `/consultant-plans/:id/critical` | Mark as critical | RA Environment |
| POST | `/consultant-plans/:id/attachments` | Upload attachments | Auth |

### Water Quality Samples
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/water-quality-samples` | List samples | Auth |
| GET | `/water-quality-samples/:id` | Get sample detail | Auth |
| POST | `/water-quality-samples` | Create sample (from critical asset) | RA Environment |
| PUT | `/water-quality-samples/:id/assign` | Assign sampler | Admin/RA |
| PUT | `/water-quality-samples/:id/collection` | Submit collection data | PCRWR Sampler |
| PUT | `/water-quality-samples/:id/lab-results` | Submit lab results | PCRWR Lab |
| POST | `/water-quality-samples/:id/attachments` | Upload attachments | Auth |

### Support & Access Requests
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/support` | List support tickets | Auth |
| POST | `/support` | Create support ticket | Auth |
| GET | `/access-requests` | List access requests | Admin |
| POST | `/access-requests` | Request account access | Public |
| PUT | `/access-requests/:id` | Approve/reject request | Admin |

### Health Check
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | System health status | Public |

---

## Frontend Components

### Angular Application Structure

```
src/app/
├── components/
│   ├── auth/
│   │   ├── login/
│   │   ├── register/
│   │   └── request-access/
│   ├── dashboard/
│   │   ├── dashboard/                    # Main dashboard
│   │   ├── edcs-consultant-dashboard/    # Asset management
│   │   ├── land-activity-dashboard/      # Land utilization tracking
│   │   ├── water-quality-dashboard/      # Water quality monitoring
│   │   ├── tehsil-dm-dashboard/          # Tehsil manager view
│   │   └── maintenance-module/           # Maintenance overlay
│   ├── requisitions/
│   │   ├── requisition-list/
│   │   ├── requisition-detail/
│   │   └── requisition-create/
│   ├── shared/
│   │   ├── maps/
│   │   │   ├── map-workspace.component   # MapLibre integration
│   │   │   ├── asset-layer-toggle        # Layer visibility control
│   │   │   └── maplibre-helpers          # Map utilities
│   │   ├── modal.component
│   │   └── notification.service
│   ├── support/
│   │   └── support-center/
│   └── users/
├── services/
│   ├── asset-layer.service.ts
│   ├── asset-metadata.service.ts
│   ├── cache.service.ts
│   ├── map-layer-integration.service.ts
│   ├── map.service.ts
│   └── pdf-report.service.ts
├── guards/
│   └── auth.guard.ts
├── interceptors/
│   └── http.interceptor.ts
└── app.routes.ts
```

### Key Components

1. **EdcsConsultantDashboard**: Main asset management with MapLibre map, asset form, maintenance module
2. **WaterQualityDashboard**: Sample workflow tracking, lab results, quality scoring charts
3. **RequisitionList/Detail**: Land requisition CRUD with land acquisition and utilization workflows
4. **MapWorkspaceComponent**: Standalone MapLibre GL map with drawing tools, layer management

---

## Mobile Application

### Architecture

```
mobile/app/
├── src/
│   ├── components/          # Reusable UI components
│   ├── core/
│   │   ├── api/
│   │   │   ├── httpClient.ts     # Fetch wrapper with auth
│   │   │   ├── prmscService.ts   # API service methods
│   │   │   ├── queryClient.ts    # React Query config
│   │   │   └── mockService.ts    # Offline fallback data
│   │   ├── auth/
│   │   │   └── tokenStore.ts     # Secure token storage
│   │   ├── config/
│   │   │   └── env.ts            # Environment configuration
│   │   ├── hooks/
│   │   │   ├── useSession.ts     # Auth state hook
│   │   │   └── useSyncQueueProcessor.ts  # Offline sync
│   │   ├── state/
│   │   │   ├── sessionStore.ts   # Auth state (Zustand)
│   │   │   ├── syncStore.ts      # Offline queue state
│   │   │   ├── taskStore.ts      # Tasks state
│   │   │   └── requisitionStore.ts
│   │   └── types/                # TypeScript interfaces
│   ├── navigation/
│   │   ├── AppNavigator.tsx      # Root navigator
│   │   └── MainNavigator.tsx     # Tab navigation
│   ├── roles/                    # Role-specific components
│   └── screens/
│       ├── SignInScreen.tsx
│       ├── DashboardScreen.tsx
│       ├── TasksScreen.tsx
│       ├── MapExplorerScreen.tsx
│       ├── SyncCenterScreen.tsx
│       └── requisitions/
│           ├── RequisitionListScreen.tsx
│           └── RequisitionDetailScreen.tsx
├── App.tsx                       # App entry point
└── app.json                      # Expo configuration
```

### Offline Sync Capability

The mobile app implements offline-first architecture:

1. **Local Storage**: expo-sqlite for structured data, expo-secure-store for tokens
2. **Sync Queue**: Zustand store persisted to SQLite, processes when online
3. **Fallback Data**: Mock service returns cached data when API unreachable
4. **Optimistic Updates**: UI updates immediately, syncs in background

---

## Security Implementation

### Current Security Measures

1. **Authentication**: JWT with 24-hour expiry
2. **Password Security**: bcrypt with salt rounds (10)
3. **Rate Limiting**: 
   - General: 500 requests/15 minutes
   - Auth endpoints: 10 attempts/15 minutes
4. **CORS**: Configured allowed origins (localhost in dev)
5. **Input Validation**: express-validator on all routes
6. **File Upload Validation**: MIME type and size limits

### Security Concerns Identified

```
⚠️ HIGH: JWT_SECRET hardcoded fallback in auth.js
   - Risk: Token forgery if env not set
   - Fix: Fail startup if JWT_SECRET not configured

⚠️ MEDIUM: No HTTPS enforcement in code
   - Risk: Token interception
   - Fix: Require TLS in production via reverse proxy

⚠️ MEDIUM: File uploads stored on local filesystem
   - Risk: Path traversal, storage exhaustion
   - Fix: Use cloud storage (S3) with signed URLs

⚠️ LOW: Debug logging includes sensitive paths
   - Risk: Information disclosure
   - Fix: Sanitize logs in production
```

---

## Deployment Architecture

### Recommended Production Setup

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LOAD BALANCER (Optional)                      │
│                         (HAProxy / AWS ALB)                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                      NGINX REVERSE PROXY                             │
│                    (SSL Termination, Gzip)                           │
│  - lds.example.com → Angular static files                           │
│  - lds.example.com/api → Backend Node.js                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
│   Frontend    │       │   Backend     │       │   MongoDB     │
│   (NGINX)     │       │   (PM2/Node)  │       │   (Replica)   │
│   Port: 80    │       │   Port: 3000  │       │   Port: 27017 │
└───────────────┘       └───────────────┘       └───────────────┘
```

---

## MySQL Migration Assessment

### Feasibility: **MODERATE EFFORT** (4-6 weeks for experienced team)

### Pros of Migration
1. **ACID Compliance**: Better transaction support for financial/audit data
2. **Tooling**: Mature ecosystem (MySQL Workbench, replication, backups)
3. **Hosting Options**: More budget VPS options, managed RDS
4. **Team Familiarity**: If team knows SQL better than NoSQL

### Cons of Migration
1. **Schema Rigidity**: Current flexible `attributes` fields require JSON columns
2. **GeoSpatial**: MySQL's spatial support is less mature than MongoDB 2dsphere
3. **Code Changes**: Every Mongoose model → Sequelize/TypeORM model
4. **Migration Risk**: Data transformation for nested documents

### Migration Effort Breakdown

| Area | Effort | Complexity |
|------|--------|------------|
| Schema Design | 1 week | Medium |
| ORM Replacement (Mongoose → Sequelize) | 2 weeks | High |
| Data Migration Scripts | 1 week | Medium |
| Query Optimization | 1 week | Medium |
| Testing & Validation | 1 week | High |
| **Total** | **5-6 weeks** | |

### Schema Translation Example

**MongoDB (Current)**:
```javascript
{
  attributes: { pipeMaterial: 'HDPE', diameter: 200 },
  feature: { type: 'Feature', geometry: {...} }
}
```

**MySQL (Proposed)**:
```sql
CREATE TABLE consultant_plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  attributes JSON,  -- Flexible JSON column
  feature_geometry GEOMETRY,  -- Spatial column
  -- ... other columns
);

-- Spatial index
CREATE SPATIAL INDEX idx_geometry ON consultant_plans(feature_geometry);
```

### Recommendation

**Stay with MongoDB** unless there's a compelling business reason:
- Current schema leverages MongoDB's strengths (flexible attributes, GeoJSON)
- Migration effort is significant with limited ROI
- MongoDB Atlas provides production-ready hosting with backups

If MySQL is required (e.g., client mandate), use **MySQL 8.0+** with JSON columns and spatial extensions.

---

## Known Issues & Recommendations

### Critical Issues

| ID | Issue | File | Fix |
|----|-------|------|-----|
| 1 | JWT_SECRET fallback | `backend/middleware/auth.js` | Fail startup if not set |
| 2 | Deprecated Mongo options | `backend/app.js` | Remove useNewUrlParser, useUnifiedTopology |
| 3 | Missing input sanitization | `routes/*.js` | Add XSS sanitization middleware |

### Medium Priority

| ID | Issue | File | Fix |
|----|-------|------|-----|
| 4 | No request timeout | `backend/app.js` | Add connect-timeout middleware |
| 5 | File upload no virus scan | `multer config` | Add ClamAV or cloud scanning |
| 6 | No API versioning | `routes/` | Add /api/v1 prefix |
| 7 | Missing pagination | `GET /requisition` | Add limit/offset params |

### Low Priority / Enhancements

| ID | Issue | Fix |
|----|-------|-----|
| 8 | No API documentation | Add Swagger/OpenAPI |
| 9 | No automated tests | Add Jest/Supertest |
| 10 | No logging aggregation | Add Winston + log shipping |

---

## Production Readiness Checklist

### Environment Configuration

- [ ] Set `NODE_ENV=production`
- [ ] Configure `JWT_SECRET` (256-bit random key)
- [ ] Set `MONGO_URI` to production MongoDB
- [ ] Configure `ALLOWED_ORIGINS` for production domains
- [ ] Enable HTTPS via reverse proxy

### Security Hardening

- [ ] Enable Helmet.js middleware
- [ ] Configure CSP headers
- [ ] Enable HSTS
- [ ] Disable X-Powered-By header
- [ ] Implement request logging with PII masking

### Performance

- [ ] Enable gzip compression
- [ ] Configure MongoDB connection pooling
- [ ] Add Redis for session/cache (optional)
- [ ] Enable Angular production build with AOT

### Monitoring & Logging

- [ ] Health check endpoint (`/health`)
- [ ] Application metrics (Prometheus/Datadog)
- [ ] Error tracking (Sentry)
- [ ] Log aggregation (ELK/CloudWatch)

### Backup & Recovery

- [ ] MongoDB automated backups (mongodump or Atlas)
- [ ] Upload files backup to S3/offsite
- [ ] Disaster recovery runbook

### CI/CD

- [ ] Automated build pipeline
- [ ] Automated tests (unit, integration)
- [ ] Staging environment
- [ ] Blue-green deployment capability

---

## Appendix: Quick Start

### Development Setup

```bash
# Backend
cd backend
npm install
export MONGO_URI=mongodb://localhost:27017/landdonation
npm start

# Frontend
cd ..
npm install
npm start  # Angular dev server on :4200

# Mobile
cd mobile/app
npm install
npx expo start
```

### Docker Deployment

```bash
docker-compose up -d
# Includes: frontend (nginx), backend (node), mongodb
```

---

*Document generated by Senior Development Team Audit - February 2026*
