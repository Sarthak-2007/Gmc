import React, { useState, useEffect } from 'react';
import {
  Server,
  Terminal,
  Copy,
  Check,
  Play,
  RefreshCw,
  Cpu,
  BookOpen,
  Sparkles,
  X,
  Radio,
  FileCode,
  Zap,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
  Database,
  Search,
  Sliders,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { AppState, Chapter, LearningStage, Subject } from '../types';

interface McpModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  onStateRefresh?: () => void;
}

type TabType = 'overview' | 'config' | 'playground' | 'directory';
type ToolCategory = 'all' | 'master' | 'analytics' | 'read' | 'write' | 'batch' | 'prompt';
type DirectorySubTab = 'tools' | 'resources' | 'prompts';

interface DiagnosticStep {
  name: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  latencyMs?: number;
  error?: string;
  preview?: string;
}

interface CallHistoryItem {
  id: string;
  toolName: string;
  timestamp: string;
  durationMs: number;
  success: boolean;
  args: Record<string, any>;
  response: any;
}

export const McpModal: React.FC<McpModalProps> = ({
  isOpen,
  onClose,
  appState,
  onStateRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [pingMs, setPingMs] = useState<number | null>(null);

  // Playground State
  const [selectedTool, setSelectedTool] = useState<string>('get_app_features_and_analytics');
  const [toolCategoryFilter, setToolCategoryFilter] = useState<ToolCategory>('all');
  const [toolSearchQuery, setToolSearchQuery] = useState<string>('');
  const [inputMode, setInputMode] = useState<'form' | 'json'>('form');
  const [rawJsonArgs, setRawJsonArgs] = useState<string>('{}');
  const [playgroundArgs, setPlaygroundArgs] = useState<Record<string, any>>({});
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [playgroundResponse, setPlaygroundResponse] = useState<any>(null);
  const [playgroundError, setPlaygroundError] = useState<string | null>(null);
  const [lastExecutionMs, setLastExecutionMs] = useState<number | null>(null);
  const [responseSizeKb, setResponseSizeKb] = useState<string | null>(null);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);

  // Self-Test Diagnostic Suite State
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState<boolean>(false);
  const [diagnosticSteps, setDiagnosticSteps] = useState<DiagnosticStep[]>([]);
  const [diagnosticOverallResult, setDiagnosticOverallResult] = useState<string | null>(null);

  // Config Tab State
  const [selectedClientConfig, setSelectedClientConfig] = useState<'claude' | 'cursor' | 'windsurf' | 'vscode' | 'python' | 'node' | 'curl'>('claude');

  // Directory Sub-tab
  const [directorySubTab, setDirectorySubTab] = useState<DirectorySubTab>('tools');
  const [directorySearchQuery, setDirectorySearchQuery] = useState<string>('');

  // Fetch Server Info & Check Health
  const checkServerHealth = async () => {
    setServerStatus('checking');
    const start = performance.now();
    try {
      const res = await fetch('/api/mcp/info');
      if (res.ok) {
        const data = await res.json();
        setServerInfo(data);
        setServerStatus('online');
        setPingMs(Math.round(performance.now() - start));
      } else {
        setServerStatus('offline');
      }
    } catch {
      setServerStatus('offline');
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkServerHealth();
    }
  }, [isOpen]);

  // Set default playground args based on tool
  useEffect(() => {
    const firstCh = appState.chapters?.[0]?.id || 'ch-phy-01';
    const firstTest = appState.tests?.[0]?.id || 'test-01';

    let initialArgs: Record<string, any> = {};

    switch (selectedTool) {
      case 'get_app_features_and_analytics':
      case 'get_feature_manifest':
        initialArgs = { includeLiveAnalytics: true, detailedFeature: 'all' };
        break;
      case 'get_daily_summary':
        initialArgs = { date: '' };
        break;
      case 'simulate_decay_forecast':
        initialArgs = { subject: 'All', daysAhead: 30 };
        break;
      case 'diagnose_weak_spots':
        initialArgs = { subject: 'All', limit: 10 };
        break;
      case 'get_analytics_breakdown':
        initialArgs = { subject: 'All' };
        break;
      case 'get_everything':
        initialArgs = { subject: 'All', includeArchived: true };
        break;
      case 'get_study_status':
        initialArgs = {};
        break;
      case 'list_due_chapters':
        initialArgs = { subject: 'All', overdueOnly: false, limit: 15 };
        break;
      case 'search_chapters':
        initialArgs = { query: '', subject: 'All', limit: 20 };
        break;
      case 'get_chapter_details':
        initialArgs = { chapterId: firstCh };
        break;
      case 'add_chapter':
        initialArgs = { name: 'Nuclear Physics & Radioactivity', subject: 'Physics', clusterName: 'Modern Physics', classLevel: '12' };
        break;
      case 'update_chapter':
        initialArgs = { chapterId: firstCh, currentConfidence: 4, learningStage: 'IN_REVISION' };
        break;
      case 'update_chapter_pillars':
        initialArgs = { chapterId: firstCh, lectures: true, bookReading: true, questionPractice: true, anki: true };
        break;
      case 'archive_chapter':
        initialArgs = { chapterId: firstCh, isArchived: true };
        break;
      case 'batch_log_study_sessions':
        initialArgs = {
          sessions: [
            { chapterId: firstCh, confidenceRating: 4, hoursSpent: 1.5, sessionType: 'revision_round_complete', note: 'Formula drill' },
          ],
        };
        break;
      case 'batch_update_chapters':
        initialArgs = { chapterIds: [firstCh], currentConfidence: 4, learningStage: 'IN_REVISION' };
        break;
      case 'reset_chapter_progress':
        initialArgs = { chapterId: firstCh, resetPillars: false };
        break;
      case 'export_backup_data':
        initialArgs = { includeAuditLogs: true };
        break;
      case 'import_restore_data':
        initialArgs = { backupPayload: { data: { chapters: appState.chapters || [] } }, mode: 'merge' };
        break;
      case 'generate_study_session':
        initialArgs = { mode: 'worst_first', availableMinutes: 120, subject: 'All' };
        break;
      case 'log_study_session':
        initialArgs = { chapterId: firstCh, confidenceRating: 4, hoursSpent: 1.5, sessionType: 'revision_round_complete', note: 'Active recall formula drill' };
        break;
      case 'list_tests':
        initialArgs = { limit: 15 };
        break;
      case 'get_test_details':
        initialArgs = { testId: firstTest };
        break;
      case 'add_test':
        initialArgs = { name: 'NEET Grand Mock 08', date: '2026-11-20', subjectOrScope: 'Full Syllabus NEET Pattern', coachingName: 'Allen', totalMarks: 720 };
        break;
      case 'delete_test':
        initialArgs = { testId: firstTest };
        break;
      case 'link_chapters_to_test':
        initialArgs = { testId: firstTest, chapterIds: [firstCh], syncDeadlines: true };
        break;
      case 'add_test_score':
        initialArgs = { testId: firstTest, totalScore: 650, physicsScore: 165, chemistryScore: 160, botanyScore: 165, zoologyScore: 160, notes: 'Solid accuracy' };
        break;
      case 'update_spaced_repetition_settings':
        initialArgs = { defaultGaps: [3, 7, 14, 30], confMultiplier3: 1.0, confMultiplier4: 1.5 };
        break;
      case 'update_pacing_settings':
        initialArgs = { targetExamDate: '2027-05-02', targetSyllabusDate: '2026-12-31', targetRevisionPasses: 3, targetMockTestsCount: 25 };
        break;
      case 'get_weekly_audit_receipt':
      case 'get_panoramic_matrix_status':
        initialArgs = {};
        break;
      case 'get_action_history':
        initialArgs = { limit: 50, entityType: 'all' };
        break;
      default:
        initialArgs = {};
    }

    setPlaygroundArgs(initialArgs);
    setRawJsonArgs(JSON.stringify(initialArgs, null, 2));
    setPlaygroundResponse(null);
    setPlaygroundError(null);
  }, [selectedTool, appState.chapters, appState.tests]);

  // Execute Tool in Playground
  const executePlaygroundTool = async (customTool?: string, customArgs?: Record<string, any>) => {
    const toolToRun = customTool || selectedTool;
    let argsToRun = customArgs || playgroundArgs;

    if (inputMode === 'json' && !customArgs) {
      try {
        argsToRun = JSON.parse(rawJsonArgs);
      } catch {
        setPlaygroundError('Invalid JSON in raw editor: Please fix syntax before executing.');
        return;
      }
    }

    setIsExecuting(true);
    setPlaygroundError(null);
    setPlaygroundResponse(null);
    const start = performance.now();

    try {
      const payload = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolToRun,
          arguments: argsToRun,
        },
      };

      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      const duration = Math.round(performance.now() - start);
      setLastExecutionMs(duration);

      const jsonStr = JSON.stringify(data);
      const sizeKb = (new Blob([jsonStr]).size / 1024).toFixed(1);
      setResponseSizeKb(sizeKb);

      if (data.error) {
        setPlaygroundError(`[${data.error.code}] ${data.error.message}`);
      } else if (data.result?.content?.[0]?.text) {
        try {
          const parsed = JSON.parse(data.result.content[0].text);
          setPlaygroundResponse(parsed);
        } catch {
          setPlaygroundResponse(data.result.content[0].text);
        }
      } else {
        setPlaygroundResponse(data.result);
      }

      // Add to call history
      const historyItem: CallHistoryItem = {
        id: 'call-' + Date.now(),
        toolName: toolToRun,
        timestamp: new Date().toLocaleTimeString(),
        durationMs: duration,
        success: !data.error,
        args: argsToRun,
        response: data.result || data.error,
      };
      setCallHistory((prev) => [historyItem, ...prev.slice(0, 7)]);

      // If state modifying action, trigger parent refresh
      if (
        onStateRefresh &&
        [
          'log_study_session',
          'batch_log_study_sessions',
          'add_chapter',
          'update_chapter',
          'batch_update_chapters',
          'reset_chapter_progress',
          'add_test_score',
          'update_chapter_pillars',
          'import_restore_data',
        ].includes(toolToRun)
      ) {
        onStateRefresh();
      }
    } catch (err: any) {
      setPlaygroundError(err?.message || 'Network error executing MCP tool');
    } finally {
      setIsExecuting(false);
    }
  };

  // Run Automated Diagnostic Suite
  const runSelfTestDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    setDiagnosticOverallResult(null);

    const initialSteps: DiagnosticStep[] = [
      { name: '1. Protocol Ping', description: 'JSON-RPC 2.0 handshake ping test', status: 'running' },
      { name: '2. Tool Catalog Discovery', description: 'Discovers tools/list specifications', status: 'pending' },
      { name: '3. System Resources Registry', description: 'Inspects resources/list and templates', status: 'pending' },
      { name: '4. Workflow Prompt Registry', description: 'Validates prompts/list catalog', status: 'pending' },
      { name: '5. Daily Intelligence Query', description: 'Executes get_daily_summary tool call', status: 'pending' },
      { name: '6. Master Architecture Manifest', description: 'Executes get_app_features_and_analytics', status: 'pending' },
    ];
    setDiagnosticSteps(initialSteps);

    const updateStep = (index: number, patch: Partial<DiagnosticStep>) => {
      setDiagnosticSteps((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], ...patch };
        return next;
      });
    };

    let allPassed = true;

    // Test 1: ping
    try {
      const t0 = performance.now();
      const r1 = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 101, method: 'ping' }),
      });
      const d1 = await r1.json();
      const lat = Math.round(performance.now() - t0);
      if (r1.ok && !d1.error) {
        updateStep(0, { status: 'success', latencyMs: lat, preview: 'Pong received in ' + lat + 'ms' });
      } else {
        throw new Error(d1.error?.message || 'Ping failed');
      }
    } catch (e: any) {
      allPassed = false;
      updateStep(0, { status: 'failed', error: e.message });
    }

    // Test 2: tools/list
    updateStep(1, { status: 'running' });
    try {
      const t0 = performance.now();
      const r2 = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 102, method: 'tools/list' }),
      });
      const d2 = await r2.json();
      const lat = Math.round(performance.now() - t0);
      const toolsCount = d2.result?.tools?.length || 0;
      if (r2.ok && toolsCount >= 20) {
        updateStep(1, { status: 'success', latencyMs: lat, preview: `${toolsCount} compliant tools registered` });
      } else {
        throw new Error(`Expected at least 20 tools, found ${toolsCount}`);
      }
    } catch (e: any) {
      allPassed = false;
      updateStep(1, { status: 'failed', error: e.message });
    }

    // Test 3: resources/list
    updateStep(2, { status: 'running' });
    try {
      const t0 = performance.now();
      const r3 = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 103, method: 'resources/list' }),
      });
      const d3 = await r3.json();
      const lat = Math.round(performance.now() - t0);
      const resCount = d3.result?.resources?.length || 0;
      if (r3.ok && resCount >= 6) {
        updateStep(2, { status: 'success', latencyMs: lat, preview: `${resCount} system resources active` });
      } else {
        throw new Error(`Expected at least 6 resources, found ${resCount}`);
      }
    } catch (e: any) {
      allPassed = false;
      updateStep(2, { status: 'failed', error: e.message });
    }

    // Test 4: prompts/list
    updateStep(3, { status: 'running' });
    try {
      const t0 = performance.now();
      const r4 = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 104, method: 'prompts/list' }),
      });
      const d4 = await r4.json();
      const lat = Math.round(performance.now() - t0);
      const pCount = d4.result?.prompts?.length || 0;
      if (r4.ok && pCount >= 1) {
        updateStep(3, { status: 'success', latencyMs: lat, preview: `${pCount} workflow prompts verified` });
      } else {
        throw new Error(`Prompts catalog empty`);
      }
    } catch (e: any) {
      allPassed = false;
      updateStep(3, { status: 'failed', error: e.message });
    }

    // Test 5: get_daily_summary tool call
    updateStep(4, { status: 'running' });
    try {
      const t0 = performance.now();
      const r5 = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 105,
          method: 'tools/call',
          params: { name: 'get_daily_summary', arguments: {} },
        }),
      });
      const d5 = await r5.json();
      const lat = Math.round(performance.now() - t0);
      if (r5.ok && !d5.error && d5.result?.content?.[0]?.text) {
        updateStep(4, { status: 'success', latencyMs: lat, preview: 'Live study summary computed' });
      } else {
        throw new Error(d5.error?.message || 'Tool execution error');
      }
    } catch (e: any) {
      allPassed = false;
      updateStep(4, { status: 'failed', error: e.message });
    }

    // Test 6: get_app_features_and_analytics
    updateStep(5, { status: 'running' });
    try {
      const t0 = performance.now();
      const r6 = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 106,
          method: 'tools/call',
          params: { name: 'get_app_features_and_analytics', arguments: { detailedFeature: 'all' } },
        }),
      });
      const d6 = await r6.json();
      const lat = Math.round(performance.now() - t0);
      if (r6.ok && !d6.error && d6.result?.content?.[0]?.text) {
        updateStep(5, { status: 'success', latencyMs: lat, preview: 'Full manifest verified' });
      } else {
        throw new Error(d6.error?.message || 'Tool execution error');
      }
    } catch (e: any) {
      allPassed = false;
      updateStep(5, { status: 'failed', error: e.message });
    }

    setIsRunningDiagnostics(false);
    setDiagnosticOverallResult(allPassed ? 'ALL_PASSED' : 'SOME_FAILED');
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadJsonResult = () => {
    if (!playgroundResponse) return;
    const blob = new Blob([JSON.stringify(playgroundResponse, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-${selectedTool}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const sseUrl = `${currentOrigin}/api/mcp/sse`;
  const httpUrl = `${currentOrigin}/api/mcp`;

  const claudeConfigJson = JSON.stringify(
    {
      mcpServers: {
        'pcb01-study-console': {
          url: sseUrl,
        },
      },
    },
    null,
    2
  );

  const cursorConfigJson = JSON.stringify(
    {
      mcpServers: {
        'pcb01-study-console': {
          url: sseUrl,
        },
      },
    },
    null,
    2
  );

  const windsurfConfigJson = JSON.stringify(
    {
      mcpServers: {
        'pcb01-study-console': {
          serverUrl: sseUrl,
        },
      },
    },
    null,
    2
  );

  const pythonSnippet = `# Install: pip install mcp
import asyncio
from mcp import ClientSession
from mcp.client.sse import sse_client

async def main():
    async with sse_client("${sseUrl}") as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # 1. Inspect live study status
            status = await session.call_tool("get_study_status", {})
            print("Status:", status)
            
            # 2. Get today's productivity summary
            summary = await session.call_tool("get_daily_summary", {})
            print("Daily Summary:", summary)

asyncio.run(main())
`;

  const nodeSnippet = `// Install: npm install @modelcontextprotocol/sdk
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function run() {
  const transport = new SSEClientTransport(new URL("${sseUrl}"));
  const client = new Client({ name: "neet-agent", version: "1.0.0" }, { capabilities: {} });

  await client.connect(transport);
  
  // Call Master Manifest Tool
  const manifest = await client.callTool({
    name: "get_app_features_and_analytics",
    arguments: { detailedFeature: "all" }
  });
  console.log("Manifest:", manifest);
}

run().catch(console.error);
`;

  // Filter tools list in playground
  const allToolOptions = [
    { id: 'get_app_features_and_analytics', label: 'get_app_features_and_analytics', category: 'master', desc: 'Exhaustive manual of every feature, formulas & live analytics' },
    { id: 'get_weekly_audit_receipt', label: 'get_weekly_audit_receipt', category: 'master', desc: 'Official 7-day tactical performance audit receipt: tests (logged vs unlogged), standardized rounds, error forensics & ASCII receipt' },
    { id: 'get_panoramic_matrix_status', label: 'get_panoramic_matrix_status', category: 'master', desc: 'Real-time 16:9 panoramic radar: all 4 subjects side-by-side, pink S-rank count & syllabus mastery tracking' },
    { id: 'get_daily_summary', label: 'get_daily_summary', category: 'master', desc: 'Today study sessions, streak, due items & pacing delta' },
    { id: 'get_everything', label: 'get_everything', category: 'master', desc: 'Master export of all chapters, logs, tests & forensic history' },
    { id: 'get_analytics_breakdown', label: 'get_analytics_breakdown', category: 'master', desc: 'Real-time 5-pillar, decay, pacing & test analytics' },

    { id: 'simulate_decay_forecast', label: 'simulate_decay_forecast', category: 'analytics', desc: 'Ebbinghaus retention projection at 7, 14, 30, 60 days' },
    { id: 'diagnose_weak_spots', label: 'diagnose_weak_spots', category: 'analytics', desc: 'Pinpoint Top 10 High Priority Danger Topics' },
    { id: 'get_study_status', label: 'get_study_status', category: 'read', desc: 'Overall progress, due chapters & mock test radar' },
    { id: 'list_due_chapters', label: 'list_due_chapters', category: 'read', desc: 'Spaced repetition revision queue sorted by urgency' },
    { id: 'search_chapters', label: 'search_chapters', category: 'read', desc: 'Search by topic name, NEET subject, stage or confidence' },
    { id: 'get_chapter_details', label: 'get_chapter_details', category: 'read', desc: 'Full chapter record with historical study logs & tests' },
    { id: 'list_tests', label: 'list_tests', category: 'read', desc: 'Scheduled mock tests with syllabus coverage' },
    { id: 'get_test_details', label: 'get_test_details', category: 'read', desc: 'Test question scores, mistakes & linked chapters' },
    { id: 'get_action_history', label: 'get_action_history', category: 'read', desc: 'Forensic audit trail of all user actions with timestamps' },

    { id: 'generate_study_session', label: 'generate_study_session', category: 'write', desc: 'Algorithmically generate optimal study session block' },
    { id: 'log_study_session', label: 'log_study_session', category: 'write', desc: 'Log completed session, updating SM-2 interval' },
    { id: 'add_chapter', label: 'add_chapter', category: 'write', desc: 'Create new syllabus chapter with timestamps' },
    { id: 'update_chapter', label: 'update_chapter', category: 'write', desc: 'Update name, stage, confidence, deadline or notes' },
    { id: 'update_chapter_pillars', label: 'update_chapter_pillars', category: 'write', desc: 'Update 5-pillar milestone checklist' },
    { id: 'archive_chapter', label: 'archive_chapter', category: 'write', desc: 'Archive or restore a chapter' },
    { id: 'add_test', label: 'add_test', category: 'write', desc: 'Schedule a new mock test' },
    { id: 'delete_test', label: 'delete_test', category: 'write', desc: 'Delete a mock test record' },
    { id: 'link_chapters_to_test', label: 'link_chapters_to_test', category: 'write', desc: 'Link syllabus topics to mock test scope' },
    { id: 'add_test_score', label: 'add_test_score', category: 'write', desc: 'Record mock test score with 5-way error breakdown' },
    { id: 'update_spaced_repetition_settings', label: 'update_spaced_repetition_settings', category: 'write', desc: 'Configure SM-2 base gaps and multipliers' },
    { id: 'update_pacing_settings', label: 'update_pacing_settings', category: 'write', desc: 'Adjust target exam date and syllabus pacing runway' },

    { id: 'batch_log_study_sessions', label: 'batch_log_study_sessions', category: 'batch', desc: 'Atomic bulk logging for multiple chapters' },
    { id: 'batch_update_chapters', label: 'batch_update_chapters', category: 'batch', desc: 'Bulk modify stages, confidence or deadlines' },
    { id: 'reset_chapter_progress', label: 'reset_chapter_progress', category: 'batch', desc: 'Reset chapter back to NOT_STARTED for fresh restart' },
    { id: 'export_backup_data', label: 'export_backup_data', category: 'batch', desc: 'Export full portable backup with checksum' },
    { id: 'import_restore_data', label: 'import_restore_data', category: 'batch', desc: 'Restore or safely merge backup snapshot' },
  ];

  const filteredTools = allToolOptions.filter((t) => {
    const matchesCat = toolCategoryFilter === 'all' || t.category === toolCategoryFilter;
    const matchesSearch =
      toolSearchQuery.trim() === '' ||
      t.label.toLowerCase().includes(toolSearchQuery.toLowerCase()) ||
      t.desc.toLowerCase().includes(toolSearchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#FAF9F6] border-2 border-[#141416] shadow-[6px_6px_0px_#141416] flex flex-col max-h-[94vh] overflow-hidden rounded-xs">
        {/* Hardware Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#ECEAE4] border-b-2 border-[#141416]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B00] border border-[#141416]" />
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#FF3B00]" />
              <span className="font-mono text-xs md:text-sm font-bold tracking-wider uppercase text-[#141416]">
                PCB-01 // MODEL CONTEXT PROTOCOL (MCP) INTERFACE v2.1
              </span>
            </div>
            {serverStatus === 'online' ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 border border-[#0047FF] text-[#0047FF] text-[10px] font-mono font-bold uppercase rounded-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0047FF] animate-pulse" />
                ONLINE {pingMs !== null ? `(${pingMs}ms)` : ''}
              </span>
            ) : serverStatus === 'checking' ? (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 border border-amber-600 text-amber-800 text-[10px] font-mono font-bold uppercase">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" /> CHECKING
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-red-100 border border-red-600 text-red-800 text-[10px] font-mono font-bold uppercase">
                OFFLINE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runSelfTestDiagnostics}
              disabled={isRunningDiagnostics}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-[#FAF9F6] border border-[#141416] hover:bg-[#FF3B00] hover:text-white transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-[#FF3B00]" />
              {isRunningDiagnostics ? 'TESTING...' : 'RUN SELF-TEST'}
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#FAF9F6] text-[#141416] border border-[#141416] rounded-xs transition-colors"
              title="Close Console"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b-2 border-[#141416] bg-[#FAF9F6] px-3 gap-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'OVERVIEW & DIAGNOSTICS', icon: Activity },
            { id: 'playground', label: 'TOOL PLAYGROUND & INSPECTOR', icon: Terminal },
            { id: 'config', label: 'CLIENT CONFIG (CLAUDE / CURSOR)', icon: FileCode },
            { id: 'directory', label: 'CAPABILITIES DIRECTORY (31+)', icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-3.5 py-2.5 font-mono text-xs font-bold uppercase transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
                  isActive
                    ? 'border-[#FF3B00] text-[#FF3B00] bg-[#ECEAE4]'
                    : 'border-transparent text-[#5C5A52] hover:text-[#141416] hover:bg-[#F3F1EB]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* TAB 1: OVERVIEW & DIAGNOSTICS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Health and Overview Card */}
              <div className="bg-[#ECEAE4] p-4 border border-[#141416] rounded-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-mono text-sm font-bold uppercase text-[#141416] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#FF3B00]" />
                      PCB-01 Spaced Repetition Model Context Protocol Server
                    </h3>
                    <p className="text-xs text-[#5C5A52] mt-1 font-sans">
                      Enables LLMs and autonomous coding assistants (Claude Desktop, Cursor, Gemini, Windsurf) to query syllabus retention, inspect decay risks, compute pacing forecasts, and commit verified study rounds directly into the database.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={checkServerHealth}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-[#FAF9F6] border border-[#141416] hover:bg-[#F4F3EE] active:translate-y-0.5"
                    >
                      <RefreshCw className="w-3 h-3" /> PING SERVER
                    </button>
                    <button
                      onClick={runSelfTestDiagnostics}
                      disabled={isRunningDiagnostics}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-[#FF3B00] text-white border border-[#141416] hover:bg-[#E03400] active:translate-y-0.5 shadow-[2px_2px_0px_#141416]"
                    >
                      <Zap className="w-3 h-3" /> {isRunningDiagnostics ? 'TESTING...' : 'RUN SELF-TEST'}
                    </button>
                  </div>
                </div>

                {/* Quick stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div className="bg-white p-2.5 border border-[#141416]">
                    <span className="text-[10px] font-mono uppercase text-[#5C5A52] block">Registered Tools</span>
                    <span className="text-lg font-mono font-bold text-[#141416]">31 Tools</span>
                  </div>
                  <div className="bg-white p-2.5 border border-[#141416]">
                    <span className="text-[10px] font-mono uppercase text-[#5C5A52] block">System Resources</span>
                    <span className="text-lg font-mono font-bold text-[#141416]">9 URIs</span>
                  </div>
                  <div className="bg-white p-2.5 border border-[#141416]">
                    <span className="text-[10px] font-mono uppercase text-[#5C5A52] block">Prompt Workflows</span>
                    <span className="text-lg font-mono font-bold text-[#141416]">3 Prompts</span>
                  </div>
                  <div className="bg-white p-2.5 border border-[#141416]">
                    <span className="text-[10px] font-mono uppercase text-[#5C5A52] block">Forensic Audit Log</span>
                    <span className="text-lg font-mono font-bold text-[#FF3B00]">{(appState.actionHistory || []).length} Entries</span>
                  </div>
                </div>
              </div>

              {/* Automated Diagnostic Suite Results */}
              {diagnosticSteps.length > 0 && (
                <div className="bg-white border-2 border-[#141416] p-4 shadow-[3px_3px_0px_#141416]">
                  <div className="flex items-center justify-between mb-3 border-b border-[#ECEAE4] pb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#0047FF]" />
                      <h4 className="font-mono text-xs font-bold uppercase text-[#141416]">
                        Automated MCP Diagnostic Health Suite
                      </h4>
                    </div>
                    {diagnosticOverallResult === 'ALL_PASSED' && (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-100 border border-[#0047FF] text-[#0047FF]">
                        100% HEALTHY - ALL 6 CHECKS PASSED
                      </span>
                    )}
                    {diagnosticOverallResult === 'SOME_FAILED' && (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red-100 border border-red-600 text-red-800">
                        DIAGNOSTIC ISSUES DETECTED
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {diagnosticSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 border flex items-center justify-between text-xs font-mono ${
                          step.status === 'success'
                            ? 'bg-blue-50/60 border-blue-300'
                            : step.status === 'failed'
                            ? 'bg-red-50/60 border-red-300'
                            : step.status === 'running'
                            ? 'bg-amber-50/60 border-amber-300'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {step.status === 'success' && <CheckCircle2 className="w-4 h-4 text-[#0047FF] shrink-0" />}
                          {step.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
                          {step.status === 'running' && <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />}
                          {step.status === 'pending' && <Clock className="w-4 h-4 text-gray-400 shrink-0" />}
                          <div>
                            <span className="font-bold block text-[#141416]">{step.name}</span>
                            <span className="text-[10px] text-[#5C5A52]">{step.preview || step.description}</span>
                          </div>
                        </div>
                        {step.latencyMs !== undefined && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-white border border-[#141416] font-bold">
                            {step.latencyMs}ms
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Endpoint URLs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-white border border-[#141416] shadow-[2px_2px_0px_#141416]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold uppercase text-[#FF3B00] flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5" /> SSE ENDPOINT (TRANSPORT)
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#ECEAE4] border border-[#141416]">
                      GET /api/mcp/sse
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[#FAF9F6] p-2 border border-[#C5C3BB] font-mono text-xs text-[#141416] break-all">
                    <span>{sseUrl}</span>
                    <button
                      onClick={() => copyToClipboard(sseUrl, 'sse')}
                      className="ml-2 p-1 text-[#5C5A52] hover:text-[#141416] hover:bg-[#ECEAE4]"
                      title="Copy URL"
                    >
                      {copiedKey === 'sse' ? <Check className="w-3.5 h-3.5 text-[#FF3B00]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#5C5A52] mt-2 font-mono">
                    Used by Claude Desktop & Cursor to establish persistent Server-Sent Events channel.
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-[#141416] shadow-[2px_2px_0px_#141416]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold uppercase text-[#0047FF] flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" /> HTTP JSON-RPC 2.0 (DIRECT & BATCH)
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#ECEAE4] border border-[#141416]">
                      POST /api/mcp
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[#FAF9F6] p-2 border border-[#C5C3BB] font-mono text-xs text-[#141416] break-all">
                    <span>{httpUrl}</span>
                    <button
                      onClick={() => copyToClipboard(httpUrl, 'http')}
                      className="ml-2 p-1 text-[#5C5A52] hover:text-[#141416] hover:bg-[#ECEAE4]"
                      title="Copy URL"
                    >
                      {copiedKey === 'http' ? <Check className="w-3.5 h-3.5 text-[#FF3B00]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#5C5A52] mt-2 font-mono">
                    Direct HTTP POST endpoint supporting both single calls and JSON-RPC 2.0 batch arrays.
                  </p>
                </div>
              </div>

              {/* Master Tools Showcase */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-[#141416] text-[#FAF9F6] p-4 border border-[#141416] shadow-[3px_3px_0px_#FF3B00] flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-[#FF3B00]" />
                      <h4 className="font-mono text-xs font-bold uppercase text-[#FF3B00]">
                        APP FEATURES & MANIFEST
                      </h4>
                    </div>
                    <p className="text-xs text-[#C5C3BB] mt-1 font-sans">
                      Microscopic documentation of every single feature, schema timestamps, SM-2 & Ebbinghaus formulas, and working analytics.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTool('get_app_features_and_analytics');
                      setActiveTab('playground');
                      executePlaygroundTool('get_app_features_and_analytics', { includeLiveAnalytics: true, detailedFeature: 'all' });
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono font-bold bg-[#FF3B00] text-white hover:bg-[#E03400]"
                  >
                    <Play className="w-3 h-3" /> INSPECT MANIFEST
                  </button>
                </div>

                <div className="bg-[#141416] text-[#FAF9F6] p-4 border border-[#141416] shadow-[3px_3px_0px_#00E5FF] flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#00E5FF]" />
                      <h4 className="font-mono text-xs font-bold uppercase text-[#00E5FF]">
                        DAILY PRODUCTIVITY SUMMARY
                      </h4>
                    </div>
                    <p className="text-xs text-[#C5C3BB] mt-1 font-sans">
                      Today's active study hours, sessions logged, active streak, remaining due chapters, and daily syllabus pacing delta.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTool('get_daily_summary');
                      setActiveTab('playground');
                      executePlaygroundTool('get_daily_summary', { date: '' });
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono font-bold bg-[#00E5FF] text-[#141416] hover:bg-[#00C4DA]"
                  >
                    <Play className="w-3 h-3" /> GET TODAY SUMMARY
                  </button>
                </div>

                <div className="bg-[#141416] text-[#FAF9F6] p-4 border border-[#141416] shadow-[3px_3px_0px_#FFB800] flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#FFB800]" />
                      <h4 className="font-mono text-xs font-bold uppercase text-[#FFB800]">
                        DECAY FORECAST SIMULATION
                      </h4>
                    </div>
                    <p className="text-xs text-[#C5C3BB] mt-1 font-sans">
                      Simulates Ebbinghaus forgetting curve across 86 chapters at 7, 14, 30, and 60 days, flagging impending memory drop-offs.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTool('simulate_decay_forecast');
                      setActiveTab('playground');
                      executePlaygroundTool('simulate_decay_forecast', { subject: 'All', daysAhead: 30 });
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono font-bold bg-[#FFB800] text-[#141416] hover:bg-[#E5A600]"
                  >
                    <Play className="w-3 h-3" /> SIMULATE DECAY
                  </button>
                </div>

                <div className="bg-[#141416] text-[#FAF9F6] p-4 border border-[#141416] shadow-[3px_3px_0px_#F04FCB] flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#F04FCB]" />
                      <h4 className="font-mono text-xs font-bold uppercase text-[#F04FCB]">
                        WEEKLY AUDIT THERMAL RECEIPT
                      </h4>
                    </div>
                    <p className="text-xs text-[#C5C3BB] mt-1 font-sans">
                      Official 7-day tactical performance audit receipt: tests (logged vs unlogged), standardized rounds, error forensics & ASCII receipt.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTool('get_weekly_audit_receipt');
                      setActiveTab('playground');
                      executePlaygroundTool('get_weekly_audit_receipt', {});
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono font-bold bg-[#F04FCB] text-white hover:bg-[#D926AA]"
                  >
                    <Play className="w-3 h-3" /> RUN AUDIT RECEIPT
                  </button>
                </div>

                <div className="bg-[#141416] text-[#FAF9F6] p-4 border border-[#141416] shadow-[3px_3px_0px_#493EA4] flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#818CF8]" />
                      <h4 className="font-mono text-xs font-bold uppercase text-[#818CF8]">
                        16:9 PANORAMIC RADAR STATUS
                      </h4>
                    </div>
                    <p className="text-xs text-[#C5C3BB] mt-1 font-sans">
                      Real-time 16:9 panoramic radar status: all 4 subjects side-by-side, pink S-rank dominance count & syllabus mastery tracking.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTool('get_panoramic_matrix_status');
                      setActiveTab('playground');
                      executePlaygroundTool('get_panoramic_matrix_status', {});
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono font-bold bg-[#493EA4] text-white hover:bg-[#3D338C]"
                  >
                    <Play className="w-3 h-3" /> QUERY PANORAMIC RADAR
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE PLAYGROUND */}
          {activeTab === 'playground' && (
            <div className="space-y-4">
              {/* Category Filter Chips & Tool Selector */}
              <div className="bg-[#ECEAE4] p-3 border border-[#141416] space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-mono text-xs font-bold uppercase text-[#141416]">
                    FILTER TOOL CATEGORY:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'all', label: `ALL (${allToolOptions.length})` },
                      { id: 'master', label: '⭐ MASTER (6)' },
                      { id: 'analytics', label: '📊 ANALYTICS (2)' },
                      { id: 'read', label: '📖 READ (7)' },
                      { id: 'write', label: '✏️ LOG & WRITE (12)' },
                      { id: 'batch', label: '⚡ BATCH & BACKUP (5)' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setToolCategoryFilter(cat.id as ToolCategory)}
                        className={`px-2 py-0.5 text-[11px] font-mono font-bold uppercase border transition-colors ${
                          toolCategoryFilter === cat.id
                            ? 'bg-[#141416] text-[#FAF9F6] border-[#141416]'
                            : 'bg-white text-[#5C5A52] border-[#C5C3BB] hover:border-[#141416]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tool Search & Dropdown */}
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-[#5C5A52] absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Quick search tools by keyword (e.g. decay, backup, session, pacing)..."
                      value={toolSearchQuery}
                      onChange={(e) => setToolSearchQuery(e.target.value)}
                      className="w-full bg-white border border-[#141416] pl-8 pr-3 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <select
                    value={selectedTool}
                    onChange={(e) => setSelectedTool(e.target.value)}
                    className="bg-white border border-[#141416] px-3 py-1.5 text-xs font-mono font-bold text-[#141416]"
                  >
                    {filteredTools.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => executePlaygroundTool()}
                    disabled={isExecuting}
                    className="te-btn-orange flex items-center justify-center gap-2 px-5 py-1.5 text-xs font-mono font-bold cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isExecuting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    {isExecuting ? 'EXECUTING...' : 'RUN TOOL'}
                  </button>
                </div>
              </div>

              {/* Mode Toggle (Form vs Raw JSON) */}
              <div className="flex items-center justify-between border-b border-[#ECEAE4] pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInputMode('form')}
                    className={`px-3 py-1 text-xs font-mono font-bold flex items-center gap-1.5 border ${
                      inputMode === 'form' ? 'bg-[#141416] text-[#FAF9F6] border-[#141416]' : 'bg-white text-[#5C5A52] border-[#C5C3BB]'
                    }`}
                  >
                    <Sliders className="w-3 h-3" /> FORM CONTROLS
                  </button>
                  <button
                    onClick={() => {
                      setInputMode('json');
                      setRawJsonArgs(JSON.stringify(playgroundArgs, null, 2));
                    }}
                    className={`px-3 py-1 text-xs font-mono font-bold flex items-center gap-1.5 border ${
                      inputMode === 'json' ? 'bg-[#141416] text-[#FAF9F6] border-[#141416]' : 'bg-white text-[#5C5A52] border-[#C5C3BB]'
                    }`}
                  >
                    <FileCode className="w-3 h-3" /> RAW JSON EDITOR
                  </button>
                </div>
                {callHistory.length > 0 && (
                  <span className="text-[11px] font-mono text-[#5C5A52]">
                    History: {callHistory.length} calls
                  </span>
                )}
              </div>

              {/* Tool Arguments Area */}
              <div className="bg-white border border-[#141416] p-4">
                {inputMode === 'json' ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-mono font-bold text-[#5C5A52]">Raw JSON Arguments Object:</label>
                      <button
                        onClick={() => {
                          try {
                            const formatted = JSON.stringify(JSON.parse(rawJsonArgs), null, 2);
                            setRawJsonArgs(formatted);
                          } catch {
                            // ignore format error
                          }
                        }}
                        className="text-[10px] font-mono px-2 py-0.5 bg-[#ECEAE4] border border-[#141416]"
                      >
                        Prettify JSON
                      </button>
                    </div>
                    <textarea
                      value={rawJsonArgs}
                      onChange={(e) => setRawJsonArgs(e.target.value)}
                      rows={6}
                      className="w-full bg-[#141416] text-[#FAF9F6] p-3 text-xs font-mono rounded-xs focus:outline-hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Tool specific form fields */}
                    {selectedTool === 'get_app_features_and_analytics' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-[#5C5A52] mb-1">Deep Dive Feature Subsystem</label>
                          <select
                            value={playgroundArgs.detailedFeature || 'all'}
                            onChange={(e) => setPlaygroundArgs({ ...playgroundArgs, detailedFeature: e.target.value })}
                            className="w-full bg-[#FAF9F6] border border-[#141416] p-1.5 text-xs font-mono"
                          >
                            <option value="all">All Subsystems (Exhaustive Architecture Manual)</option>
                            <option value="spaced_repetition">SuperMemo SM-2 Spaced Repetition Engine</option>
                            <option value="pacing_engine">Flight Plan & Pacing Engine</option>
                            <option value="error_taxonomy">Mock Test Scoring & Error Taxonomy</option>
                            <option value="5_pillars">5-Pillars Framework</option>
                            <option value="mock_tests">Mock Test Radar</option>
                            <option value="audit_logging">Forensic Action Audit Trail</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                          <input
                            type="checkbox"
                            id="liveAnalyticsToggle"
                            checked={playgroundArgs.includeLiveAnalytics !== false}
                            onChange={(e) => setPlaygroundArgs({ ...playgroundArgs, includeLiveAnalytics: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <label htmlFor="liveAnalyticsToggle" className="text-xs font-mono text-[#141416]">
                            Include Live Computed Working Analytics
                          </label>
                        </div>
                      </div>
                    )}

                    {selectedTool === 'get_daily_summary' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-[#5C5A52] mb-1">Date (YYYY-MM-DD)</label>
                          <input
                            type="text"
                            placeholder="Leave empty for today"
                            value={playgroundArgs.date || ''}
                            onChange={(e) => setPlaygroundArgs({ ...playgroundArgs, date: e.target.value })}
                            className="w-full bg-[#FAF9F6] border border-[#141416] p-1.5 text-xs font-mono"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => setPlaygroundArgs({ ...playgroundArgs, date: '' })}
                            className="px-3 py-1.5 text-xs font-mono bg-[#ECEAE4] border border-[#141416]"
                          >
                            Reset to Today
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedTool === 'simulate_decay_forecast' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-[#5C5A52] mb-1">Subject Filter</label>
                          <select
                            value={playgroundArgs.subject || 'All'}
                            onChange={(e) => setPlaygroundArgs({ ...playgroundArgs, subject: e.target.value })}
                            className="w-full bg-[#FAF9F6] border border-[#141416] p-1.5 text-xs font-mono"
                          >
                            <option value="All">All 4 NEET Subjects</option>
                            <option value="Physics">Physics</option>
                            <option value="Chemistry">Chemistry</option>
                            <option value="Botany">Botany</option>
                            <option value="Zoology">Zoology</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono text-[#5C5A52] mb-1">
                            Projection Days Horizon: {playgroundArgs.daysAhead || 30} days
                          </label>
                          <input
                            type="range"
                            min="7"
                            max="90"
                            step="7"
                            value={playgroundArgs.daysAhead || 30}
                            onChange={(e) => setPlaygroundArgs({ ...playgroundArgs, daysAhead: Number(e.target.value) })}
                            className="w-full accent-[#FF3B00]"
                          />
                        </div>
                      </div>
                    )}

                    {selectedTool === 'diagnose_weak_spots' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-[#5C5A52] mb-1">Subject Filter</label>
                          <select
                            value={playgroundArgs.subject || 'All'}
                            onChange={(e) => setPlaygroundArgs({ ...playgroundArgs, subject: e.target.value })}
                            className="w-full bg-[#FAF9F6] border border-[#141416] p-1.5 text-xs font-mono"
                          >
                            <option value="All">All Subjects</option>
                            <option value="Physics">Physics</option>
                            <option value="Chemistry">Chemistry</option>
                            <option value="Botany">Botany</option>
                            <option value="Zoology">Zoology</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono text-[#5C5A52] mb-1">Maximum Vulnerable Topics</label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={playgroundArgs.limit || 10}
                            onChange={(e) => setPlaygroundArgs({ ...playgroundArgs, limit: Number(e.target.value) })}
                            className="w-full bg-[#FAF9F6] border border-[#141416] p-1.5 text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {selectedTool === 'get_chapter_details' && (
                      <div>
                        <label className="block text-[11px] font-mono text-[#5C5A52] mb-1">Select Chapter</label>
                        <select
                          value={playgroundArgs.chapterId || ''}
                          onChange={(e) => setPlaygroundArgs({ ...playgroundArgs, chapterId: e.target.value })}
                          className="w-full bg-[#FAF9F6] border border-[#141416] p-1.5 text-xs font-mono"
                        >
                          {(appState.chapters || []).map((c) => (
                            <option key={c.id} value={c.id}>
                              [{c.subject.slice(0, 3)}] {c.name} ({c.id})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedTool === 'batch_update_chapters' && (
                      <div className="space-y-2">
                        <label className="block text-[11px] font-mono text-[#5C5A52]">Target Confidence & Stage</label>
                        <div className="grid grid-cols-2 gap-3">
                          <select
                            value={playgroundArgs.currentConfidence ?? 4}
                            onChange={(e) => setPlaygroundArgs({ ...playgroundArgs, currentConfidence: Number(e.target.value) })}
                            className="bg-[#FAF9F6] border border-[#141416] p-1.5 text-xs font-mono"
                          >
                            <option value={1}>1 - Red Alert (Severe Doubt)</option>
                            <option value={2}>2 - Weak (Requires Revision)</option>
                            <option value={3}>3 - Moderate (Formula Confusion)</option>
                            <option value={4}>4 - Good (Active Recall Ready)</option>
                            <option value={5}>5 - Mastered (PyQ Solved)</option>
                          </select>
                          <select
                            value={playgroundArgs.learningStage || 'IN_REVISION'}
                            onChange={(e) => setPlaygroundArgs({ ...playgroundArgs, learningStage: e.target.value })}
                            className="bg-[#FAF9F6] border border-[#141416] p-1.5 text-xs font-mono"
                          >
                            <option value="NOT_STARTED">NOT_STARTED</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="FIRST_PASS_DONE">FIRST_PASS_DONE</option>
                            <option value="IN_REVISION">IN_REVISION</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {selectedTool === 'reset_chapter_progress' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-[#5C5A52] mb-1">Chapter to Reset</label>
                          <select
                            value={playgroundArgs.chapterId || ''}
                            onChange={(e) => setPlaygroundArgs({ ...playgroundArgs, chapterId: e.target.value })}
                            className="w-full bg-[#FAF9F6] border border-[#141416] p-1.5 text-xs font-mono"
                          >
                            {(appState.chapters || []).map((c) => (
                              <option key={c.id} value={c.id}>
                                [{c.subject.slice(0, 3)}] {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                          <input
                            type="checkbox"
                            id="resetPillars"
                            checked={!!playgroundArgs.resetPillars}
                            onChange={(e) => setPlaygroundArgs({ ...playgroundArgs, resetPillars: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <label htmlFor="resetPillars" className="text-xs font-mono text-[#141416]">
                            Also reset 5-pillar study checklist
                          </label>
                        </div>
                      </div>
                    )}

                    {selectedTool === 'export_backup_data' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="includeAuditLogs"
                          checked={playgroundArgs.includeAuditLogs !== false}
                          onChange={(e) => setPlaygroundArgs({ ...playgroundArgs, includeAuditLogs: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <label htmlFor="includeAuditLogs" className="text-xs font-mono text-[#141416]">
                          Include historical action audit logs in backup payload
                        </label>
                      </div>
                    )}

                    {/* Generic fallback / notice */}
                    {![
                      'get_app_features_and_analytics',
                      'get_daily_summary',
                      'simulate_decay_forecast',
                      'diagnose_weak_spots',
                      'get_chapter_details',
                      'batch_update_chapters',
                      'reset_chapter_progress',
                      'export_backup_data',
                    ].includes(selectedTool) && (
                      <p className="text-xs font-mono text-[#5C5A52]">
                        Parameters configured for <strong>{selectedTool}</strong>. Ready to execute or edit in Raw JSON mode.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* JSON-RPC Output Inspector */}
              <div className="bg-[#141416] border border-[#141416] text-[#FAF9F6] p-4 rounded-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold uppercase text-[#FFB800] flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      LIVE JSON-RPC 2.0 RESPONSE
                    </span>
                    {lastExecutionMs !== null && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#28282B] text-[#FF3B00] border border-[#444]">
                        {lastExecutionMs}ms
                      </span>
                    )}
                    {responseSizeKb && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#28282B] text-[#C5C3BB] border border-[#444]">
                        {responseSizeKb} KB
                      </span>
                    )}
                  </div>
                  {playgroundResponse && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={downloadJsonResult}
                        className="text-xs font-mono text-[#C5C3BB] hover:text-white flex items-center gap-1 px-2 py-0.5 bg-[#28282B] border border-[#444]"
                      >
                        <Download className="w-3 h-3" /> EXPORT JSON
                      </button>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(playgroundResponse, null, 2), 'response')}
                        className="text-xs font-mono text-[#C5C3BB] hover:text-white flex items-center gap-1 px-2 py-0.5 bg-[#28282B] border border-[#444]"
                      >
                        {copiedKey === 'response' ? <Check className="w-3 h-3 text-[#FF3B00]" /> : <Copy className="w-3 h-3" />}
                        COPY
                      </button>
                    </div>
                  )}
                </div>

                {playgroundError && (
                  <div className="text-red-400 font-mono text-xs mb-2 p-2 bg-red-950/50 border border-red-800">
                    Error: {playgroundError}
                  </div>
                )}

                {playgroundResponse ? (
                  <pre className="text-xs font-mono text-[#FAF9F6] bg-[#0A0A0C] p-3 rounded-xs max-h-[380px] overflow-y-auto whitespace-pre-wrap">
                    {JSON.stringify(playgroundResponse, null, 2)}
                  </pre>
                ) : (
                  <div className="text-xs font-mono text-[#5C5A52] py-8 text-center border border-dashed border-[#333]">
                    Click &quot;RUN TOOL&quot; above to execute an MCP tool against the live database state.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CLIENT CONFIGS */}
          {activeTab === 'config' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 flex-wrap border-b border-[#ECEAE4] pb-2">
                {[
                  { id: 'claude', label: 'Claude Desktop' },
                  { id: 'cursor', label: 'Cursor IDE' },
                  { id: 'windsurf', label: 'Windsurf IDE' },
                  { id: 'vscode', label: 'Cline / Roo Code' },
                  { id: 'python', label: 'Python MCP Client' },
                  { id: 'node', label: 'Node.js MCP SDK' },
                  { id: 'curl', label: 'Terminal cURL' },
                ].map((cfg) => (
                  <button
                    key={cfg.id}
                    onClick={() => setSelectedClientConfig(cfg.id as any)}
                    className={`px-3 py-1.5 text-xs font-mono font-bold uppercase border transition-colors ${
                      selectedClientConfig === cfg.id
                        ? 'bg-[#141416] text-[#FAF9F6] border-[#141416]'
                        : 'bg-white text-[#5C5A52] border-[#C5C3BB] hover:border-[#141416]'
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>

              {selectedClientConfig === 'claude' && (
                <div className="bg-white border border-[#141416] p-4 shadow-[2px_2px_0px_#141416]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold uppercase text-[#141416]">
                      Claude Desktop Configuration (claude_desktop_config.json)
                    </span>
                    <button
                      onClick={() => copyToClipboard(claudeConfigJson, 'claude')}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-[#ECEAE4] border border-[#141416]"
                    >
                      {copiedKey === 'claude' ? <Check className="w-3.5 h-3.5 text-[#FF3B00]" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'claude' ? 'COPIED!' : 'COPY CONFIG'}
                    </button>
                  </div>
                  <pre className="bg-[#141416] text-[#FAF9F6] p-3 text-xs font-mono rounded-xs overflow-x-auto">
                    {claudeConfigJson}
                  </pre>
                </div>
              )}

              {selectedClientConfig === 'cursor' && (
                <div className="bg-white border border-[#141416] p-4 shadow-[2px_2px_0px_#141416]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold uppercase text-[#141416]">
                      Cursor IDE (.cursor/mcp.json)
                    </span>
                    <button
                      onClick={() => copyToClipboard(cursorConfigJson, 'cursor')}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-[#ECEAE4] border border-[#141416]"
                    >
                      {copiedKey === 'cursor' ? <Check className="w-3.5 h-3.5 text-[#FF3B00]" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'cursor' ? 'COPIED!' : 'COPY CONFIG'}
                    </button>
                  </div>
                  <pre className="bg-[#141416] text-[#FAF9F6] p-3 text-xs font-mono rounded-xs overflow-x-auto">
                    {cursorConfigJson}
                  </pre>
                </div>
              )}

              {selectedClientConfig === 'windsurf' && (
                <div className="bg-white border border-[#141416] p-4 shadow-[2px_2px_0px_#141416]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold uppercase text-[#141416]">
                      Windsurf IDE (mcp_config.json)
                    </span>
                    <button
                      onClick={() => copyToClipboard(windsurfConfigJson, 'windsurf')}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-[#ECEAE4] border border-[#141416]"
                    >
                      {copiedKey === 'windsurf' ? <Check className="w-3.5 h-3.5 text-[#FF3B00]" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'windsurf' ? 'COPIED!' : 'COPY CONFIG'}
                    </button>
                  </div>
                  <pre className="bg-[#141416] text-[#FAF9F6] p-3 text-xs font-mono rounded-xs overflow-x-auto">
                    {windsurfConfigJson}
                  </pre>
                </div>
              )}

              {selectedClientConfig === 'python' && (
                <div className="bg-white border border-[#141416] p-4 shadow-[2px_2px_0px_#141416]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold uppercase text-[#141416]">
                      Python Async Client Snippet (mcp package)
                    </span>
                    <button
                      onClick={() => copyToClipboard(pythonSnippet, 'python')}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-[#ECEAE4] border border-[#141416]"
                    >
                      {copiedKey === 'python' ? <Check className="w-3.5 h-3.5 text-[#FF3B00]" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'python' ? 'COPIED!' : 'COPY CODE'}
                    </button>
                  </div>
                  <pre className="bg-[#141416] text-[#FAF9F6] p-3 text-xs font-mono rounded-xs overflow-x-auto">
                    {pythonSnippet}
                  </pre>
                </div>
              )}

              {selectedClientConfig === 'node' && (
                <div className="bg-white border border-[#141416] p-4 shadow-[2px_2px_0px_#141416]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold uppercase text-[#141416]">
                      Node.js TypeScript SDK Snippet
                    </span>
                    <button
                      onClick={() => copyToClipboard(nodeSnippet, 'node')}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-[#ECEAE4] border border-[#141416]"
                    >
                      {copiedKey === 'node' ? <Check className="w-3.5 h-3.5 text-[#FF3B00]" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'node' ? 'COPIED!' : 'COPY CODE'}
                    </button>
                  </div>
                  <pre className="bg-[#141416] text-[#FAF9F6] p-3 text-xs font-mono rounded-xs overflow-x-auto">
                    {nodeSnippet}
                  </pre>
                </div>
              )}

              {selectedClientConfig === 'curl' && (
                <div className="bg-white border border-[#141416] p-4 shadow-[2px_2px_0px_#141416]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold uppercase text-[#141416]">
                      Terminal cURL Command
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `curl -X POST ${httpUrl} -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_daily_summary","arguments":{}}}'`,
                          'curl'
                        )
                      }
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-[#ECEAE4] border border-[#141416]"
                    >
                      {copiedKey === 'curl' ? <Check className="w-3.5 h-3.5 text-[#FF3B00]" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'curl' ? 'COPIED!' : 'COPY CURL'}
                    </button>
                  </div>
                  <pre className="bg-[#141416] text-[#FAF9F6] p-3 text-xs font-mono rounded-xs overflow-x-auto whitespace-pre-wrap">
                    {`curl -X POST ${httpUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_daily_summary","arguments":{}}}'`}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DIRECTORY */}
          {activeTab === 'directory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-mono text-sm font-bold uppercase text-[#141416]">
                    Full MCP Capabilities Specification (v2.1)
                  </h3>
                  <p className="text-xs text-[#5C5A52] font-sans">
                    Complete registered tool catalog, system resources, URI templates, and prompt workflows.
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setDirectorySubTab('tools')}
                    className={`px-3 py-1 text-xs font-mono font-bold uppercase border ${
                      directorySubTab === 'tools' ? 'bg-[#141416] text-white border-[#141416]' : 'bg-white border-[#C5C3BB]'
                    }`}
                  >
                    TOOLS (31)
                  </button>
                  <button
                    onClick={() => setDirectorySubTab('resources')}
                    className={`px-3 py-1 text-xs font-mono font-bold uppercase border ${
                      directorySubTab === 'resources' ? 'bg-[#141416] text-white border-[#141416]' : 'bg-white border-[#C5C3BB]'
                    }`}
                  >
                    RESOURCES (9)
                  </button>
                  <button
                    onClick={() => setDirectorySubTab('prompts')}
                    className={`px-3 py-1 text-xs font-mono font-bold uppercase border ${
                      directorySubTab === 'prompts' ? 'bg-[#141416] text-white border-[#141416]' : 'bg-white border-[#C5C3BB]'
                    }`}
                  >
                    PROMPTS (3)
                  </button>
                </div>
              </div>

              {directorySubTab === 'tools' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#5C5A52] absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filter capabilities..."
                      value={directorySearchQuery}
                      onChange={(e) => setDirectorySearchQuery(e.target.value)}
                      className="w-full bg-white border border-[#141416] pl-8 pr-3 py-1.5 text-xs font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {allToolOptions
                      .filter(
                        (t) =>
                          directorySearchQuery.trim() === '' ||
                          t.label.toLowerCase().includes(directorySearchQuery.toLowerCase()) ||
                          t.desc.toLowerCase().includes(directorySearchQuery.toLowerCase())
                      )
                      .map((t) => (
                        <div key={t.id} className="bg-white border border-[#141416] p-3 shadow-[2px_2px_0px_#ECEAE4]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs font-bold text-[#141416]">{t.label}</span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 border uppercase font-bold ${
                                t.category === 'master'
                                  ? 'bg-[#FF3B00] text-white border-[#141416]'
                                  : t.category === 'analytics'
                                  ? 'bg-[#00E5FF] text-[#141416] border-[#141416]'
                                  : t.category === 'write' || t.category === 'batch'
                                  ? 'bg-amber-100 text-amber-900 border-amber-600'
                                  : 'bg-blue-100 text-blue-900 border-[#0047FF]'
                              }`}
                            >
                              {t.category}
                            </span>
                          </div>
                          <p className="text-xs text-[#5C5A52] font-sans">{t.desc}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {directorySubTab === 'resources' && (
                <div className="space-y-3">
                  {[
                    { uri: 'neet://system/features-and-analytics', name: 'App Features & Architecture Manifest', desc: 'Exhaustive documentation of all features, timestamp schemas, and live calculated analytics.' },
                    { uri: 'neet://everything', name: 'Master Data Dump', desc: 'All 86 chapters, study sessions history, scheduled tests, and forensic audit logs.' },
                    { uri: 'neet://daily/summary', name: 'Today Study Summary', desc: 'Hours studied, streak, chapters reviewed today, and pacing status.' },
                    { uri: 'neet://forecast/decay', name: 'Ebbinghaus Decay Forecast', desc: 'Predicted retention percentages across 7, 14, 30, and 60 days.' },
                    { uri: 'neet://weak-spots', name: 'Clinical Weak Spots', desc: 'Top vulnerable chapters ranked by composite risk score.' },
                    { uri: 'neet://syllabus/overview', name: 'Syllabus Overview', desc: 'Breakdown of completed, in-progress, and unstarted chapters by subject.' },
                    { uri: 'neet://due-today', name: 'Due Today Queue', desc: 'All chapters currently due or overdue for spaced repetition revision.' },
                    { uri: 'neet://tests/upcoming', name: 'Upcoming Mock Tests', desc: 'Schedule of mock tests with linked chapter syllabus coverage.' },
                    { uri: 'neet://chapter/{chapterId}', name: 'Specific Chapter Template', desc: 'Direct URI template query for a single chapter with full study log history.' },
                    { uri: 'neet://test/{testId}', name: 'Specific Test Template', desc: 'Direct URI template query for a single mock test with scores and error breakdown.' },
                  ].map((res, idx) => (
                    <div key={idx} className="bg-white border border-[#141416] p-3 shadow-[2px_2px_0px_#ECEAE4]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-[#FF3B00]">{res.uri}</span>
                        <span className="text-[10px] font-mono text-[#141416] font-bold">{res.name}</span>
                      </div>
                      <p className="text-xs text-[#5C5A52] font-sans">{res.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {directorySubTab === 'prompts' && (
                <div className="space-y-3">
                  {[
                    {
                      name: 'generate_neet_revision_plan',
                      args: 'hoursAvailable (number, default: 4)',
                      desc: 'Generates an evidence-backed Pomodoro revision schedule allocating time across NCERT theory, high-frequency PYQs, and formula drills based on overdue chapters.',
                    },
                    {
                      name: 'diagnose_weak_spots',
                      args: 'subject (optional)',
                      desc: 'Clinical diagnostic analysis identifying top vulnerable topics and structuring a targeted 7-Day Intensive Recovery Protocol.',
                    },
                    {
                      name: 'mock_test_postmortem',
                      args: 'testId (optional)',
                      desc: 'Forensic error postmortem classifying root causes of lost marks (conceptual vs silly vs calculation fatigue) and generating a remedial protocol.',
                    },
                  ].map((prompt, idx) => (
                    <div key={idx} className="bg-white border border-[#141416] p-3 shadow-[2px_2px_0px_#ECEAE4]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-[#0047FF]">{prompt.name}</span>
                        <span className="text-[10px] font-mono text-[#5C5A52]">{prompt.args}</span>
                      </div>
                      <p className="text-xs text-[#5C5A52] font-sans">{prompt.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
