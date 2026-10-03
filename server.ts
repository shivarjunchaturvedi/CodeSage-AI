import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { StaticAnalysisEngine } from './src/server/staticEngine.ts';
import { getAIProvider } from './src/server/aiProvider.ts';
import { DeterministicScorer } from './src/server/scoring.ts';
import { AppStore } from './src/server/store.ts';
import { SAMPLE_CODES } from './src/server/sampleCodes.ts';
import { AnalysisResult, Finding } from './src/types/analysis.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const store = AppStore.getInstance();

  app.use(express.json({ limit: '5mb' }));

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      platform: 'CodeSage AI Platform',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      aiProviderConfigured: false,
      analysisEngine: 'deterministic-local',
    });
  });

  // 2. Auth Endpoints
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || {
      id: 'usr-' + Date.now(),
      email,
      fullName: email.split('@')[0],
      role: 'developer' as const,
      createdAt: new Date().toISOString(),
    };
    return res.json({
      token: 'jwt_mock_token_' + Buffer.from(email).toString('base64'),
      user,
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const { email, password, fullName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const newUser = {
      id: 'usr-' + Date.now(),
      email,
      fullName: fullName || email.split('@')[0],
      role: 'developer' as const,
      createdAt: new Date().toISOString(),
    };
    store.users.push(newUser);
    return res.status(201).json({
      token: 'jwt_mock_token_' + Buffer.from(email).toString('base64'),
      user: newUser,
    });
  });

  app.get('/api/auth/me', (req, res) => {
    res.json({ user: store.users[0] });
  });

  // 3. Projects Endpoints
  app.get('/api/projects', (req, res) => {
    res.json({ projects: store.projects });
  });

  app.post('/api/projects', (req, res) => {
    const { name, description, repositoryUrl, defaultLanguage } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Project name is required.' });
    }
    const newProj = {
      id: 'proj-' + Date.now(),
      userId: store.users[0].id,
      name,
      description: description || '',
      repositoryUrl: repositoryUrl || '',
      defaultLanguage: defaultLanguage || 'python',
      createdAt: new Date().toISOString(),
      analysisCount: 0,
      averageScore: 100,
    };
    store.projects.unshift(newProj);
    res.status(201).json({ project: newProj });
  });

  app.delete('/api/projects/:id', (req, res) => {
    const id = req.params.id;
    store.projects = store.projects.filter((p) => p.id !== id);
    store.analyses = store.analyses.filter((a) => a.projectId !== id);
    res.json({ success: true, message: 'Project deleted successfully.' });
  });

  // 4. Sample Codes for testing
  app.get('/api/samples', (req, res) => {
    res.json({ samples: SAMPLE_CODES });
  });

  // 5. Dashboard Statistics
  app.get('/api/dashboard/stats', (req, res) => {
    const stats = store.getDashboardMetrics();
    res.json({ stats });
  });

  // 6. Core Analysis Execution Pipeline
  app.post('/api/analyses', async (req, res) => {
    const startTime = Date.now();
    const { sourceCode, language, fileName, projectId } = req.body;

    if (!sourceCode || typeof sourceCode !== 'string') {
      return res.status(400).json({ error: 'Source code content is required.' });
    }

    // Security Guardrails: payload and source-size boundaries.
    if (sourceCode.length > 500000) {
      return res.status(413).json({ error: 'Source payload exceeds 500KB boundary limit.' });
    }
    const sourceLineCount = sourceCode.split(/\r?\n/).length;
    if (sourceLineCount > 3000) {
      return res.status(413).json({ error: 'Source exceeds the 3,000-line analysis boundary.' });
    }

    const cleanLang = (language || 'python').toLowerCase();
    const cleanFileName = fileName || `snippet.${cleanLang === 'python' ? 'py' : cleanLang === 'javascript' ? 'js' : cleanLang === 'typescript' ? 'ts' : cleanLang === 'java' ? 'java' : 'c'}`;

    try {
      // Step A: Deterministic Static Analysis & CWE Security Scanner
      const staticResult = StaticAnalysisEngine.analyze(sourceCode, cleanLang, cleanFileName);

      // Step B: Local Semantic Review (Deterministic Provider)
      let aiFindings: Finding[] = [];
      let aiSummary = '';
      let improvedCode: string | undefined = undefined;

      try {
        const aiProvider = getAIProvider();
        const aiOutput = await aiProvider.analyzeCode(
          sourceCode,
          cleanLang,
          cleanFileName,
          staticResult.findings
        );
        aiFindings = aiOutput.findings;
        aiSummary = aiOutput.summary;
        improvedCode = aiOutput.improvedCode;
      } catch (aiErr: any) {
        console.warn('AI analysis fallback triggered:', aiErr?.message);
        aiSummary = 'Deterministic static analysis completed. AI semantic enrichment was skipped due to provider connectivity.';
      }

      // Step C: Result Aggregation (Merge static findings + AI findings without duplicating line numbers)
      const allFindings: Finding[] = [...staticResult.findings];
      const analysisId = 'analysis-' + Date.now();

      aiFindings.forEach((f) => {
        // Tag with analysisId
        f.analysisId = analysisId;
        // Check for duplicate line & CWE
        const duplicate = allFindings.some(
          (sf) => sf.lineNumber === f.lineNumber && sf.cweId === f.cweId
        );
        if (!duplicate) {
          allFindings.push(f);
        }
      });

      allFindings.forEach((f, i) => {
        f.analysisId = analysisId;
        if (!f.id) f.id = `FND-${i + 1}`;
      });

      // Step D: Deterministic Score Calculation
      const scores = DeterministicScorer.calculate(allFindings, staticResult.metrics);

      // Update project metrics if associated
      let targetProject = store.projects.find((p) => p.id === projectId);
      if (targetProject) {
        const previousCount = targetProject.analysisCount || 0;
        const previousAverage = targetProject.averageScore || 0;
        targetProject.analysisCount = previousCount + 1;
        targetProject.averageScore = Math.round(
          ((previousAverage * previousCount) + scores.overallScore) / targetProject.analysisCount
        );
      }

      const durationMs = Date.now() - startTime;

      const finalResult: AnalysisResult = {
        id: analysisId,
        projectId: targetProject?.id,
        projectName: targetProject?.name,
        submissionId: 'sub-' + Date.now(),
        fileName: cleanFileName,
        language: cleanLang,
        sourceCode,
        improvedCode,
        status: 'completed',
        overallScore: scores.overallScore,
        securityScore: scores.securityScore,
        reliabilityScore: scores.reliabilityScore,
        maintainabilityScore: scores.maintainabilityScore,
        qualityScore: scores.qualityScore,
        summary: aiSummary || `Static analysis completed with ${allFindings.length} findings.`,
        durationMs,
        createdAt: new Date().toISOString(),
        metrics: staticResult.metrics,
        findings: allFindings,
        staticAnalysisAvailable: staticResult.isAvailable,
      };

      store.analyses.unshift(finalResult);

      return res.status(201).json({
        analysis: finalResult,
        scoringExplanation: scores.explanation,
      });
    } catch (err: any) {
      console.error('Analysis error:', err);
      return res.status(500).json({
        error: 'An internal error occurred during code analysis pipeline execution.',
      });
    }
  });

  // 7. Analyses History & Retrieval
  app.get('/api/analyses', (req, res) => {
    const { language, severity, projectId, search } = req.query;
    let results = [...store.analyses];

    if (language) {
      results = results.filter((a) => a.language.toLowerCase() === String(language).toLowerCase());
    }
    if (projectId) {
      results = results.filter((a) => a.projectId === String(projectId));
    }
    if (severity) {
      results = results.filter((a) =>
        a.findings.some((f) => f.severity.toLowerCase() === String(severity).toLowerCase())
      );
    }
    if (search) {
      const q = String(search).toLowerCase();
      results = results.filter(
        (a) =>
          a.fileName.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          (a.projectName && a.projectName.toLowerCase().includes(q))
      );
    }

    res.json({ analyses: results });
  });

  app.get('/api/analyses/:id', (req, res) => {
    const analysis = store.analyses.find((a) => a.id === req.params.id);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis record not found.' });
    }
    res.json({ analysis });
  });

  app.delete('/api/analyses/:id', (req, res) => {
    const id = req.params.id;
    store.analyses = store.analyses.filter((a) => a.id !== id);
    res.json({ success: true, message: 'Analysis record removed from repository.' });
  });

  // 8. Serve the React app. In development we mount Vite middleware;
  // in production we serve the compiled dist directory directly so the
  // API and frontend remain on the same origin.
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[CodeSage AI] Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
