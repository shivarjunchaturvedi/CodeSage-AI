# CodeSage AI
> **AI-Powered Code Review, Bug Detection & Security Analysis Platform**

[![Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20React%2019%20%7C%20TypeScript%20%7C%20PostgreSQL-blue)](#tech-stack)
[![Security](https://img.shields.io/badge/Security-CWE%20Verified%20%7C%20Zero--Execution-emerald)](#security-architecture)
[![AI Engine](https://img.shields.io/badge/AI-Deterministic%20Local%20Engine-purple)](#ai-pipeline)

CodeSage AI is an enterprise-grade, defensive code review platform engineered for software engineering portfolios, technical interviews, and real-world team deployment. It pairs **deterministic static AST analysis** and **CWE rule verification** with **semantic LLM reasoning** to detect bugs, architectural vulnerabilities, and code quality degradation without executing untrusted code.

---

## Key Features

- **Monaco Code Editor**: Professional developer editor with multi-language syntax highlighting (Python, JavaScript, TypeScript, Java, C, C++), line numbers, file upload, and pre-loaded vulnerability test fixtures.
- **Dual-Tier Analysis Pipeline**:
  - *Tier 1 (Deterministic)*: In-memory AST validation, cyclomatic complexity calculations, Maintainability Index (MI), and CWE security rule matching (CWE-89, CWE-78, CWE-798, CWE-327, CWE-502).
  - *Tier 2 (Semantic AI)*: Optional local semantic review with a deterministic local fallback when no API key is configured.
- **Transparent Scoring Formula**: No black-box AI scores. Calculated deterministically:  
  `Overall = (0.35 × Security) + (0.25 × Reliability) + (0.20 × Maintainability) + (0.20 × Quality)`
- **Side-by-Side Remediation Diff**: Review original vulnerable code against hardened refactored code with one-click editor replacement.
- **Project Workspaces**: Group scans into projects with historical telemetry tracking.
- **Executive Audit Export**: Downloadable compliance reports in JSON and printable PDF format.
- **Job-Ready Interview Guide**: 35+ technical Q&As, 60s/3m elevator pitches, and ATS resume bullets directly accessible in the app.

---

## Architecture Diagram

```
User Code Input
      │
      ▼
┌─────────────────────────────────┐
│       Analysis Pipeline         │
│                                 │
│ 1. Input Sanitization & LOC Check
│ 2. Deterministic AST Analysis   │
│ 3. CWE Rule Security Scanner    │
│ 4. Cyclomatic & Maintainability │
│ 5. Optional Local Semantic Review│
│ 6. Deterministic Score Engine   │
└────────────────┬────────────────┘
                 │
                 ▼
       Result Aggregator
                 │
    ┌────────────┴────────────┐
    ▼                         ▼
In-memory Demo Store   Interactive Workspace
(Optional FastAPI +     (Diff Viewer & Report Export)
PostgreSQL backend)
```

---
## 📸 Application Screenshots

### 🔍 Security Analysis Workspace

![CodeSage AI Workspace](PASTE_IMAGE_FILENAME_HERE)

### 🛡️ Security Findings & Quality Score

![CodeSage AI Security Findings](PASTE_IMAGE_FILENAME_HERE)
## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Monaco Editor (`@monaco-editor/react`), Lucide React.
- **Active API / Dev Server**: Node.js, Express, TypeScript, with the React app served by the same origin. **Optional backend module**: Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0 (Async), PostgreSQL.
- **Database**: PostgreSQL 16 support is included for the optional FastAPI backend; the active demo Express store is in-memory.
- **AI Abstraction**: Deterministic local semantic engine with no external AI dependency.
- **Containerization**: Docker, Docker Compose.

---

## Running Locally

### Option 1: Live Full-Stack Dev Server (Express + React + Monaco)
```bash
# 1. Install dependencies
npm install

# 2. Start full-stack application (runs on http://localhost:3000)
npm run dev
```

### Option 2: Docker Compose (optional PostgreSQL/FastAPI stack)
```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Launch containerized cluster
docker compose up --build
```
- App + API: `http://localhost:3000`
- Optional FastAPI API Docs (Swagger): `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

---

## Security Model: Zero-Execution Policy

CodeSage AI treats user-submitted code as **untrusted data**.
1. **No Remote Code Execution**: User code is never compiled, eval'd, or spawned in subshells.
2. **In-Memory Parsing**: Static checks run via safe lexical tokenization and AST parsing.
3. **Credential Detection**: Common AWS keys, GitHub PATs, and hardcoded secret assignments are detected by deterministic rules. Do not submit real production credentials to the analyzer.
4. **Boundary Limits**: Max payload size capped at 500 KB / 3,000 LOC.

---

## Automated Tests

```bash
# Run backend pytest suite
pytest tests/ -v
```

---

## Technical Interview Preparation & Resume

Check `docs/interview_prep.md` for 35+ technical Q&As covering system design, FastAPI vs Django, PostgreSQL indexing, JWT security, and ATS resume bullet points.
