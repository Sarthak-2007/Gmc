import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createStudyConsoleMcpServer, executeMcpDirect } from './src/services/mcpServer';
import {
  DEFAULT_PACING_SETTINGS,
  DEFAULT_SETTINGS,
  INITIAL_CHAPTERS,
  INITIAL_STUDY_LOGS,
  INITIAL_TESTS,
  INITIAL_TEST_SCORES,
} from './src/data/seedData';
import { AppState } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const STATE_FILE_PATH = path.resolve(__dirname, 'data', 'server-state.json');

// Ensure data dir exists
if (!fs.existsSync(path.resolve(__dirname, 'data'))) {
  fs.mkdirSync(path.resolve(__dirname, 'data'), { recursive: true });
}

// In-memory application state
function getInitialState(): AppState {
  if (fs.existsSync(STATE_FILE_PATH)) {
    try {
      const raw = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.chapters)) {
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse server-state.json, falling back to seed data:', e);
    }
  }

  return {
    chapters: INITIAL_CHAPTERS,
    studyLogs: INITIAL_STUDY_LOGS,
    tests: INITIAL_TESTS,
    testScores: INITIAL_TEST_SCORES,
    settings: DEFAULT_SETTINGS,
    pacingSettings: DEFAULT_PACING_SETTINGS,
    tutorialCompleted: true,
    updatedAt: Date.now(),
  };
}

let serverState: AppState = getInitialState();

function saveStateToDisk() {
  try {
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(serverState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write state to server-state.json:', err);
  }
}

export function getState(): AppState {
  return serverState;
}

export function updateState(updater: (prev: AppState) => AppState): AppState {
  serverState = updater(serverState);
  saveStateToDisk();
  return serverState;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // CORS headers for local / external clients accessing MCP endpoints
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Session-Id');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Active SSE transports map
  const sseSessions = new Map<string, SSEServerTransport>();

  // =========================================================================
  // MCP ROUTE 1: GET /api/mcp/sse (Standard MCP Server-Sent Events stream)
  // =========================================================================
  app.get('/api/mcp/sse', async (req: Request, res: Response) => {
    try {
      // Connect standard SSEServerTransport
      const transport = new SSEServerTransport('/api/mcp/message', res);
      const mcpServer = createStudyConsoleMcpServer(getState, updateState);

      const sessionId = transport.sessionId;
      sseSessions.set(sessionId, transport);

      transport.onclose = () => {
        sseSessions.delete(sessionId);
      };

      await mcpServer.connect(transport);
    } catch (err) {
      console.error('Error starting MCP SSE transport:', err);
      if (!res.headersSent) {
        res.status(500).send('Failed to establish MCP SSE stream');
      }
    }
  });

  // =========================================================================
  // MCP ROUTE 2: POST /api/mcp/message (SSE Post message recipient)
  // =========================================================================
  app.post('/api/mcp/message', async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId query parameter' });
      return;
    }

    const transport = sseSessions.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: `Session not found: ${sessionId}` });
      return;
    }

    try {
      await transport.handlePostMessage(req, res, req.body);
    } catch (err: any) {
      console.error('Error handling MCP message:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || 'Error processing MCP message' });
      }
    }
  });

  // =========================================================================
  // MCP ROUTE 3: POST /api/mcp (Direct JSON-RPC 2.0 endpoint for testing & HTTP clients)
  // Supports single JSON-RPC requests AND JSON-RPC 2.0 batch request arrays!
  // =========================================================================
  app.post('/api/mcp', async (req: Request, res: Response) => {
    try {
      if (Array.isArray(req.body)) {
        // Standard JSON-RPC 2.0 Batch request
        const responses = await Promise.all(
          req.body.map((item) => executeMcpDirect(item, getState, updateState))
        );
        res.json(responses);
        return;
      }

      const response = await executeMcpDirect(req.body, getState, updateState);
      res.json(response);
    } catch (err: any) {
      res.status(500).json({
        jsonrpc: '2.0',
        id: req.body?.id || null,
        error: { code: -32603, message: err?.message || 'Internal Error' },
      });
    }
  });

  // =========================================================================
  // MCP ROUTE 4: GET /api/mcp/info (Server metadata & client configs)
  // =========================================================================
  app.get('/api/mcp/info', (req: Request, res: Response) => {
    const host = req.get('host') || `localhost:${PORT}`;
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    res.json({
      name: 'PCB-01 NEET Study Console MCP Server',
      version: '2.1.0',
      status: 'ONLINE',
      protocolVersion: '2024-11-05',
      endpoints: {
        sse: `${baseUrl}/api/mcp/sse`,
        message: `${baseUrl}/api/mcp/message`,
        directJsonRpc: `${baseUrl}/api/mcp`,
      },
      activeSseSessionsCount: sseSessions.size,
      tools: [
        'get_app_features_and_analytics',
        'get_feature_manifest',
        'get_analytics_breakdown',
        'get_everything',
        'get_daily_summary',
        'simulate_decay_forecast',
        'diagnose_weak_spots',
        'get_study_status',
        'list_due_chapters',
        'search_chapters',
        'get_chapter_details',
        'add_chapter',
        'update_chapter',
        'update_chapter_pillars',
        'archive_chapter',
        'batch_update_chapters',
        'reset_chapter_progress',
        'generate_study_session',
        'log_study_session',
        'batch_log_study_sessions',
        'list_tests',
        'get_test_details',
        'add_test',
        'delete_test',
        'link_chapters_to_test',
        'add_test_score',
        'update_spaced_repetition_settings',
        'update_pacing_settings',
        'export_backup_data',
        'import_restore_data',
        'get_action_history',
        'get_weekly_audit_receipt',
        'get_panoramic_matrix_status',
      ],
      resources: [
        'neet://system/features-and-analytics',
        'neet://everything',
        'neet://daily/summary',
        'neet://forecast/decay',
        'neet://weak-spots',
        'neet://syllabus/overview',
        'neet://due-today',
        'neet://tests/upcoming',
        'neet://history/actions',
      ],
      resourceTemplates: [
        'neet://chapter/{chapterId}',
        'neet://test/{testId}',
      ],
      prompts: [
        'generate_neet_revision_plan',
        'diagnose_weak_spots',
        'mock_test_postmortem',
      ],
      clientConfigs: {
        claudeDesktop: {
          mcpServers: {
            'pcb01-study-console': {
              url: `${baseUrl}/api/mcp/sse`,
            },
          },
        },
        cursor: {
          mcpServers: {
            'pcb01-study-console': {
              url: `${baseUrl}/api/mcp/sse`,
            },
          },
        },
        windsurf: {
          mcpServers: {
            'pcb01-study-console': {
              serverUrl: `${baseUrl}/api/mcp/sse`,
            },
          },
        },
      },
    });
  });

  // =========================================================================
  // STATE SYNC ROUTES: /api/state
  // =========================================================================
  app.get('/api/state', (req: Request, res: Response) => {
    res.json(serverState);
  });

  app.post('/api/state', (req: Request, res: Response) => {
    if (req.body && Array.isArray(req.body.chapters)) {
      serverState = {
        ...req.body,
        updatedAt: Date.now(),
      };
      saveStateToDisk();
      res.json({ success: true, updatedAt: serverState.updatedAt });
    } else {
      res.status(400).json({ error: 'Invalid state payload: chapters array required' });
    }
  });

  // =========================================================================
  // VITE DEV SERVER / PRODUCTION STATIC HOSTING
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PCB-01 Full-Stack & MCP Server listening on http://0.0.0.0:${PORT}`);
    console.log(`MCP SSE endpoint: http://0.0.0.0:${PORT}/api/mcp/sse`);
    console.log(`MCP Direct JSON-RPC: http://0.0.0.0:${PORT}/api/mcp`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
