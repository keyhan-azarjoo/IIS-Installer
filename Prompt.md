# 🧠 Server Management Platform — Refactor & Upgrade Prompt

## 📌 Context

You are working on an **existing server management project**.

This project already includes many features and working components.

---

## ⚠️ CRITICAL RULES (MUST FOLLOW)

### 1. DO NOT BREAK EXISTING FUNCTIONALITY

- Do NOT remove any existing features  
- Do NOT change behavior in a breaking way  
- Do NOT delete logic unless it is clearly unused and safe  

All existing features must:

- Continue to work exactly as before  
- Be preserved and integrated into the new structure  

---

### 2. THIS IS A REFACTOR + UPGRADE (NOT A REWRITE)

You must:

- Reorganize the project into a clean architecture  
- Improve code quality  
- Improve UX/UI  
- Add missing features  

BUT:

- Keep all current capabilities  
- Reuse as much existing code as possible  

---

### 3. IMPROVE, DO NOT REPLACE

If something exists:

- Improve it  
- Standardize it  
- Modularize it  

Do NOT rebuild it from scratch unless absolutely necessary.

---

## 🎯 OBJECTIVE

Transform the current project into a:

- Professional  
- Modular  
- Scalable  
- Lightweight  
- Production-ready  

**Server Management Platform**

---

## 🧱 TARGET ARCHITECTURE

Refactor the project into clear layers:

### 1. Frontend (UI)
- Unified design (Material UI style)
- Reusable components
- Consistent layout

---

### 2. Backend (API / Controller)
- Central logic for:
  - Services
  - Ports
  - System info
  - Execution

---

### 3. Service Execution Layer
Handles:

- Starting services
- Stopping services
- Restarting services
- Monitoring services

Supports:

- Docker
- OS services (systemd / Windows Service)
- Scripts (.sh / .ps1 / .cmd / .py)

---

### 4. Core Layer (Shared)

Centralize:

- Port management
- Validation
- Logging
- System metrics

---

## 🗂️ STRUCTURE REFACTOR REQUIREMENT

Reorganize the project into logical modules:

- UI components → reusable
- Services → standardized
- Execution logic → centralized
- Configurations → unified

Avoid duplicated logic across files.

---

## 🚀 DEPLOYMENT (IMPORTANT)

The project must support:

### One-command execution

- Linux/macOS → `.sh`
- Windows → `.ps1`

Running this should:

- Start the entire system
- Require no manual setup
- Automatically configure dependencies

---

## ⚙️ RESOURCE CONSTRAINT

The system must run on:

- **1GB RAM server**

So:

- Avoid heavy processes  
- Avoid unnecessary background services  
- Optimize memory usage  

---

## 🔁 SERVICE LIFECYCLE (VERY IMPORTANT)

All services must:

- Start automatically after creation  
- Restart automatically if:
  - Crashed  
  - System restarted  

Services must run **continuously (24/7)**

They should ONLY stop if:

- User stops them  
- User deletes them  

---

## 📊 DASHBOARD IMPROVEMENT

Enhance existing dashboard:

Must include:

- CPU usage  
- Memory usage  
- Disk usage  
- Network usage  
- OS info  
- Uptime  

Make it:

- Clean  
- Professional  
- Real-time  

---

## 🧭 NAVIGATION (STANDARDIZE)

Unify sidebar:

- OS Info (top)
- Dashboard
- File Manager
- Platform Services
- AI & LM Services
- Docker
- Web Terminal
- Logs (bottom)

---

## 🏗️ SERVICES SYSTEM (STANDARDIZE)

All services must follow same structure:

Each service:

- Has a type (API, DB, AI, Website, etc.)
- Has an engine:
  - Docker
  - OS service
  - IIS (Windows)

---

### Service UI Requirements

Each service page must:

1. Explain the service  
2. Show configuration options  
3. Show list of services  

---

### Service List (Table)

Each row must show:

- Name  
- Status  
- Engine  
- Ports  
- URL  

---

### Row Interaction

Click row → open detail panel:

Allow:

- Start / Stop / Restart  
- Open URL  
- Copy URL  
- Edit ports / IP  
- Open service folder  

---

## 🔌 PORT MANAGEMENT (GLOBAL SYSTEM)

Centralize port handling:

- Track all used ports globally  
- Prevent duplicates  

If conflict:

- Show red warning  
- Block save  

---

## 📁 FILE MANAGER

- Keep existing implementation  
- Do NOT break it  

Enhance integration:

- Open service folders directly  
- Link services to their files  

---

## 🐳 DOCKER (IMPROVE EXISTING)

- Standardize container handling  
- Show:
  - Status  
  - Logs  
  - Resource usage  

---

## 💻 WEB TERMINAL

Enhance existing terminal:

- Clean UI  
- Stable execution  

---

## 📜 LOG SYSTEM (IMPROVE)

- Centralize logs  
- Show in dedicated panel  

Must allow:

- Copy  
- Clear  
- Auto-scroll  

---

## 🎨 UI/UX STANDARDIZATION

Unify entire UI:

- Same components everywhere  
- Same behavior across pages  

Examples:

- Buttons  
- Tables  
- Inputs  
- Modals  

---

## 🤖 AI & LM SERVICES (EXTEND EXISTING)

Add structured support for:

- Running AI models  
- Managing GPU / CPU  
- Handling endpoints  

---

## 🧩 CODE QUALITY IMPROVEMENTS

- Remove duplication  
- Use reusable components  
- Standardize naming  
- Separate concerns properly  

---

## 🚀 FUTURE-READY DESIGN

Prepare system for:

- Multi-user support  
- Remote server control  
- Scaling services  
- AI automation  

---

## 🔁 SERVICE PERSISTENCE (CRITICAL)

All services must:

- Run continuously (24/7)  
- Restart automatically on:
  - Crash  
  - Failure  
  - System reboot  

Services must NEVER stop unless:

- User stops them  
- User deletes them  

---

## 🔒 BACKWARD COMPATIBILITY (CRITICAL)

- Keep ALL existing features  
- Do NOT remove anything  
- Extend the current system  
- Ensure full compatibility  

---

## ✅ FINAL RESULT

The upgraded project must:

- Keep ALL existing features  
- Be cleaner and more structured  
- Be easier to maintain  
- Be more professional  
- Be deployable with one command  
- Ensure all services run continuously  

---

## 🔥 KEY MINDSET

- Do NOT rebuild → **refactor**
- Do NOT remove → **enhance**
- Do NOT simplify → **structure properly**