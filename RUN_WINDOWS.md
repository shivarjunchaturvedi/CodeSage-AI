# CodeSage AI — Windows Run Guide

## Requirements
- Node.js 20.19+ or 22.12+
- npm 10+

## Run the application
Open PowerShell in the project root:

```powershell
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Important
- No Gemini key is required.
- No `.env` file is required for normal local use.
- The active analysis pipeline is fully local/deterministic.
- Submitted code is analyzed as data; it is never executed by CodeSage.

## If npm still reports old dependency errors
Use a clean install:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm cache clean --force
npm install
npm run dev
```

## Verify the build
In another terminal:

```powershell
npm run lint
npm run build
```

## Optional Python test suite
Python tests are for the optional FastAPI backend:

```powershell
python -m pytest tests/test_pipeline.py -q
```

The active web app does not require Python, PostgreSQL, Docker, or any API key.
