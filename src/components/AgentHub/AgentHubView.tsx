import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Key,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plug,
  Zap,
  RefreshCw,
  Terminal,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  Settings2,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface AgentHubConfig {
  hubUrl: string;
  securityToken: string;
}

interface HubStatus {
  connected: boolean;
  authorized: boolean;
  message?: string;
}

interface Plugin {
  pluginId: string;
  name: string;
  version: string;
  capabilities: string[];
}

interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

const DEFAULT_CONFIG: AgentHubConfig = {
  hubUrl: 'http://localhost:56789',
  securityToken: 'CHANGE-THIS-TO-SECURE-TOKEN'
};

const STORAGE_KEY = 'agenthub_config';

const loadConfig = (): AgentHubConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load AgentHub config:', e);
  }
  return DEFAULT_CONFIG;
};

const saveConfig = (config: AgentHubConfig) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save AgentHub config:', e);
  }
};

export const AgentHubView: React.FC = () => {
  const [config, setConfig] = useState<AgentHubConfig>(loadConfig);
  const [hubStatus, setHubStatus] = useState<HubStatus>({ connected: false, authorized: false });
  const [isChecking, setIsChecking] = useState(false);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [actionResults, setActionResults] = useState<ActionResult[]>([]);
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isConfigEditing, setIsConfigEditing] = useState(false);
  const [tempConfig, setTempConfig] = useState<AgentHubConfig>(config);
  const [showToken, setShowToken] = useState(false);
  // THEME STATE DE DEBUG PAYLOAD TRUC TIEP TREN GIAO DIEN
  const [debugPayload, setDebugPayload] = useState<any>(null);

  // CAU HINH THAM SO CHO CAC HANH DONG CUA PLUGIN
  const [echoMessage, setEchoMessage] = useState('Hello Agent Hub!');
  const [printDocName, setPrintDocName] = useState('TestDocument.pdf');
  const [printCopies, setPrintCopies] = useState(1);
  const [scanDocName, setScanDocName] = useState('HoaDonBanHang');
  const [scanStatus, setScanStatus] = useState('Chua thanh toan');
  const [scanDate, setScanDate] = useState(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}${mm}${yyyy}`;
  });
  const [scanSimulate, setScanSimulate] = useState(true);

  const syncLastEchoMessage = useCallback(async (hubUrl: string, token: string) => {
    console.log("syncLastEchoMessage: Start syncing with hubUrl =", hubUrl, "token =", token);
    try {
      const execUrl = `${hubUrl.replace(/\/$/, '')}/api/execute`;
      const response = await fetch(execUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Token': token
        },
        body: JSON.stringify({
          pluginId: 'sample-hardware-plugin',
          action: 'echo',
          data: {}
        }),
        signal: AbortSignal.timeout(3000)
      });
      console.log("syncLastEchoMessage: Response status =", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("syncLastEchoMessage: Received data =", data);
        if (data.success && data.result && data.result.echoedMessage) {
          console.log("syncLastEchoMessage: Setting echoMessage to", data.result.echoedMessage);
          setEchoMessage(data.result.echoedMessage);
        }
      }
    } catch (e) {
      console.error('Failed to sync last echo message:', e);
    }
  }, []);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    setPlugins([]);
    setHubStatus({ connected: false, authorized: false });

    try {
      // Step 1: Check health endpoint (no token required)
      const healthUrl = `${config.hubUrl.replace(/\/$/, '')}/api/status/health`;
      const healthRes = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (!healthRes.ok) {
        setHubStatus({
          connected: false,
          authorized: false,
          message: `Health check failed with status ${healthRes.status}`
        });
        setIsChecking(false);
        return;
      }

      // Step 2: Check status endpoint with token
      const statusUrl = `${config.hubUrl.replace(/\/$/, '')}/api/status`;
      const statusRes = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Token': config.securityToken
        },
        signal: AbortSignal.timeout(5000)
      });

      if (statusRes.status === 401 || statusRes.status === 403) {
        // Tu dong lay token neu ket noi den localhost
        const isLocalhost = config.hubUrl.includes('localhost') || config.hubUrl.includes('127.0.0.1');
        if (isLocalhost) {
          try {
            console.log('Tu dong tai Token tu localhost Backend...');
            const tokenUrl = `${config.hubUrl.replace(/\/$/, '')}/api/status/token`;
            const tokenRes = await fetch(tokenUrl, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(3000)
            });

            if (tokenRes.ok) {
              const tokenData = await tokenRes.json();
              if (tokenData.token) {
                console.log('Tu dong tai Token thanh cong:', tokenData.token);
                
                // Cap nhat token moi
                const newConfig = {
                  ...config,
                  securityToken: tokenData.token
                };
                
                // Luu vao state va localStorage
                setConfig(newConfig);
                setTempConfig(newConfig);
                saveConfig(newConfig);

                // Thu lai ket noi voi Token moi vua nhan duoc
                const retryRes = await fetch(statusUrl, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Agent-Token': tokenData.token
                  },
                  signal: AbortSignal.timeout(5000)
                });

                if (retryRes.ok) {
                  const retryData = await retryRes.json();
                  const parsedPlugins: Plugin[] = [];
                  if (retryData.plugins && Array.isArray(retryData.plugins)) {
                    for (const plugin of retryData.plugins) {
                      parsedPlugins.push({
                        pluginId: plugin.pluginId || plugin.plugin_id || '',
                        name: plugin.name || 'Unknown Plugin',
                        version: plugin.version || '1.0.0',
                        capabilities: plugin.capabilities || plugin.actions || []
                      });
                    }
                  }
                  setPlugins(parsedPlugins);
                  setHubStatus({
                    connected: true,
                    authorized: true,
                    message: retryData.message || 'Connected & Ready (Auto-Authorized)'
                  });
                  syncLastEchoMessage(config.hubUrl, tokenData.token);
                  setIsChecking(false);
                  return;
                }
              }
            }
          } catch (tokenErr) {
            console.error('Tu dong tai Token that bai:', tokenErr);
          }
        }

        setHubStatus({
          connected: true,
          authorized: false,
          message: 'Unauthorized - Invalid or missing token'
        });
        setIsChecking(false);
        return;
      }

      if (!statusRes.ok) {
        setHubStatus({
          connected: true,
          authorized: false,
          message: `Status check failed with status ${statusRes.status}`
        });
        setIsChecking(false);
        return;
      }

      const statusData = await statusRes.json();

      // Parse plugins from response
      const parsedPlugins: Plugin[] = [];
      if (statusData.plugins && Array.isArray(statusData.plugins)) {
        for (const plugin of statusData.plugins) {
          parsedPlugins.push({
            pluginId: plugin.pluginId || plugin.plugin_id || '',
            name: plugin.name || 'Unknown Plugin',
            version: plugin.version || '1.0.0',
            capabilities: plugin.capabilities || plugin.actions || []
          });
        }
      } else if (statusData.capabilities && Array.isArray(statusData.capabilities)) {
        parsedPlugins.push({
          pluginId: 'hub-capabilities',
          name: 'Hub Capabilities',
          version: statusData.version || '1.0.0',
          capabilities: statusData.capabilities
        });
      }

      setPlugins(parsedPlugins);
      setHubStatus({
        connected: true,
        authorized: true,
        message: statusData.message || 'Connected & Ready'
      });
      syncLastEchoMessage(config.hubUrl, config.securityToken);

    } catch (error: any) {
      console.error('Connection check failed:', error);
      let errorMessage = 'Connection failed';

      if (error.name === 'AbortError') {
        errorMessage = 'Connection timeout - Agent Hub may be offline';
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        errorMessage = 'Cannot reach Agent Hub - Please ensure it is running via `dotnet run`';
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }

      setHubStatus({
        connected: false,
        authorized: false,
        message: errorMessage
      });
    }

    setIsChecking(false);
  }, [config]);

  useEffect(() => {
    // Auto-check connection when config changes
    checkConnection();
  }, []);

  const handleSaveConfig = () => {
    saveConfig(tempConfig);
    setConfig(tempConfig);
    setIsConfigEditing(false);
    checkConnection();
  };

  const handleCancelEdit = () => {
    setTempConfig(config);
    setIsConfigEditing(false);
  };

  const executeAction = async (pluginId: string, action: string, payloadData: any = {}) => {
    const result: ActionResult = {
      success: false,
      timestamp: new Date().toISOString()
    };

    // LOG DE DEBUG PAYLOAD GUI DI
    console.log("DEBUG AGENT HUB PAYLOAD:", { pluginId, action, payloadData });
    setDebugPayload({ pluginId, action, payloadData });

    try {
      const execUrl = `${config.hubUrl.replace(/\/$/, '')}/api/execute`;
      const response = await fetch(execUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Token': config.securityToken
        },
        body: JSON.stringify({
          pluginId: pluginId,
          action: action,
          data: payloadData
        }),
        signal: AbortSignal.timeout(10000)
      });

      const data = await response.json();

      if (response.ok) {
        result.success = true;
        result.data = data;
      } else {
        result.success = false;
        result.error = data.error || `Request failed with status ${response.status}`;
      }
    } catch (error: any) {
      result.success = false;
      result.error = error.message || 'Execution failed';
    }

    setActionResults(prev => [result, ...prev.slice(0, 9)]);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const getStatusBadge = () => {
    if (isChecking) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <Loader2 className="size-4 animate-spin text-blue-400" />
          <span className="text-blue-400 text-sm font-medium">Checking...</span>
        </div>
      );
    }

    if (!hubStatus.connected) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg">
          <WifiOff className="size-4 text-red-400" />
          <span className="text-red-400 text-sm font-medium">Disconnected</span>
        </div>
      );
    }

    if (!hubStatus.authorized) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertTriangle className="size-4 text-yellow-400" />
          <span className="text-yellow-400 text-sm font-medium">Connected - Unauthorized</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
        <CheckCircle2 className="size-4 text-green-400" />
        <span className="text-green-400 text-sm font-medium">Connected & Ready</span>
      </div>
    );
  };

  const renderJsonBeautifully = (obj: any): string => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <Server className="size-5" />
            </div>
            Agent Hub Settings
          </h1>
          <p className="text-text-dim text-sm mt-1">
            Configure and connect to your local Agent Hub server
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Configuration Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card-dark border border-border-dark rounded-2xl overflow-hidden"
      >
        <div
          className="flex items-center justify-between p-4 border-b border-border-dark cursor-pointer"
          onClick={() => !isConfigEditing && setIsConfigEditing(!isConfigEditing)}
        >
          <div className="flex items-center gap-3">
            <div className="size-10 bg-sidebar-dark rounded-xl flex items-center justify-center">
              <Settings2 className="size-5 text-text-dim" />
            </div>
            <div>
              <h2 className="text-white font-bold">Connection Configuration</h2>
              <p className="text-text-dim text-sm">Hub URL and Security Token</p>
            </div>
          </div>
          {isConfigEditing ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-sm font-medium text-text-dim hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <ChevronDown className={cn("size-5 text-text-dim transition-transform", isConfigEditing && "rotate-180")} />
          )}
        </div>

        <AnimatePresence>
          {isConfigEditing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-text-dim">
                      <Server className="size-4" />
                      Agent Hub URL
                    </label>
                    <input
                      type="url"
                      value={tempConfig.hubUrl}
                      onChange={(e) => setTempConfig(prev => ({ ...prev, hubUrl: e.target.value }))}
                      className="w-full px-4 py-3 bg-sidebar-dark border border-border-dark rounded-xl text-white placeholder-text-dim/50 focus:outline-none focus:border-primary transition-colors"
                      placeholder="http://localhost:56789"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-text-dim">
                      <Key className="size-4" />
                      Security Token (X-Agent-Token)
                    </label>
                    <div className="relative">
                      <input
                        type={showToken ? "text" : "password"}
                        value={tempConfig.securityToken}
                        onChange={(e) => setTempConfig(prev => ({ ...prev, securityToken: e.target.value }))}
                        className="w-full px-4 py-3 pr-12 bg-sidebar-dark border border-border-dark rounded-xl text-white placeholder-text-dim/50 focus:outline-none focus:border-primary transition-colors"
                        placeholder="CHANGE-THIS-TO-SECURE-TOKEN"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-dim hover:text-white transition-colors"
                        title={showToken ? "áº¨n token" : "Hiá»‡n token"}
                      >
                        {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <button
                    onClick={checkConnection}
                    disabled={isChecking}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                      "bg-primary text-white hover:bg-primary-hover",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isChecking ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    Check Connection
                  </button>

                  {hubStatus.message && !hubStatus.authorized && (
                    <div className="flex items-center gap-2 text-sm text-yellow-400">
                      <AlertTriangle className="size-4" />
                      {hubStatus.message}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Plugins & Capabilities */}
      {hubStatus.connected && hubStatus.authorized && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card-dark border border-border-dark rounded-2xl overflow-hidden"
        >
          <div className="p-4 border-b border-border-dark">
            <h2 className="text-white font-bold flex items-center gap-3">
              <div className="size-10 bg-sidebar-dark rounded-xl flex items-center justify-center">
                <Plug className="size-5 text-text-dim" />
              </div>
              Available Plugins & Capabilities
            </h2>
          </div>

          <div className="p-4 space-y-3">
            {plugins.length === 0 ? (
              <div className="text-center py-8 text-text-dim">
                <Plug className="size-12 mx-auto mb-3 opacity-50" />
                <p>No plugins available</p>
              </div>
            ) : (
              plugins.map((plugin, index) => (
                <div key={index} className="border border-border-dark rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedPlugin(expandedPlugin === plugin.name ? null : plugin.name)}
                    className="w-full flex items-center justify-between p-4 bg-sidebar-dark hover:bg-sidebar-dark/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                        <Zap className="size-5" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-white font-bold">{plugin.name}</h3>
                        <p className="text-text-dim text-sm">v{plugin.version}</p>
                      </div>
                    </div>
                    {expandedPlugin === plugin.name ? (
                      <ChevronDown className="size-5 text-text-dim" />
                    ) : (
                      <ChevronRight className="size-5 text-text-dim" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedPlugin === plugin.name && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-text-dim mb-2 flex items-center gap-2">
                              <Zap className="size-4" />
                              Actions
                            </h4>
                            <div className="space-y-3">
                              {plugin.capabilities.map((cap, capIndex) => {
                                if (cap === 'echo') {
                                  return (
                                    <div key={capIndex} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-sidebar-dark/45 rounded-xl border border-border-dark">
                                      <button
                                        onClick={() => executeAction(plugin.pluginId, cap, { message: echoMessage })}
                                        className={cn(
                                          "px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0",
                                          "bg-primary text-white hover:bg-primary-hover shadow-md shadow-primary/10"
                                        )}
                                      >
                                        echo
                                      </button>
                                      <div className="flex-1 flex items-center gap-2">
                                        <span className="text-text-dim text-xs font-bold uppercase whitespace-nowrap">Tin nhắn:</span>
                                        <input
                                          type="text"
                                          value={echoMessage}
                                          onChange={(e) => setEchoMessage(e.target.value)}
                                          className="flex-1 px-3 py-1.5 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary transition-colors font-semibold"
                                          placeholder="Nhập tin nhắn..."
                                        />
                                      </div>
                                    </div>
                                  );
                                }
                                
                                if (cap === 'simulate-print') {
                                  return (
                                    <div key={capIndex} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-sidebar-dark/45 rounded-xl border border-border-dark">
                                      <button
                                        onClick={() => executeAction(plugin.pluginId, cap, { documentName: printDocName, copies: printCopies })}
                                        className={cn(
                                          "px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0",
                                          "bg-primary text-white hover:bg-primary-hover shadow-md shadow-primary/10"
                                        )}
                                      >
                                        simulate-print
                                      </button>
                                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                                        <div className="flex items-center gap-2">
                                          <span className="text-text-dim text-xs font-bold uppercase whitespace-nowrap">Tên file:</span>
                                          <input
                                            type="text"
                                            value={printDocName}
                                            onChange={(e) => setPrintDocName(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary transition-colors font-semibold"
                                            placeholder="Tên tài liệu..."
                                          />
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-text-dim text-xs font-bold uppercase whitespace-nowrap">Số bản in:</span>
                                          <input
                                            type="number"
                                            value={printCopies}
                                            onChange={(e) => setPrintCopies(parseInt(e.target.value) || 1)}
                                            className="w-16 px-3 py-1.5 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-primary transition-colors font-semibold"
                                            min="1"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                if (cap === 'start-scan') {
                                  return (
                                    <div key={capIndex} className="flex flex-col gap-3 p-4 bg-sidebar-dark/45 rounded-xl border border-border-dark space-y-2">
                                      <div className="flex items-center justify-between border-b border-border-dark pb-2 mb-2">
                                        <button
                                          onClick={() => executeAction(plugin.pluginId, cap, {
                                            documentName: scanDocName,
                                            status: scanStatus,
                                            date: scanDate,
                                            simulate: scanSimulate
                                          })}
                                          className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-bold transition-all shrink-0",
                                            "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/10 flex items-center gap-2"
                                          )}
                                        >
                                          <Zap className="size-4" />
                                          Bắt đầu Quét (start-scan)
                                        </button>
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            id="chk_scanSimulate"
                                            checked={scanSimulate}
                                            onChange={(e) => setScanSimulate(e.target.checked)}
                                            className="size-4 accent-indigo-600 rounded"
                                          />
                                          <label htmlFor="chk_scanSimulate" className="text-text-dim text-xs font-bold uppercase cursor-pointer">Chế độ giả lập (Simulation)</label>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="flex flex-col gap-1">
                                          <span className="text-text-dim text-[10px] font-bold uppercase">Tên tài liệu:</span>
                                          <input
                                            type="text"
                                            value={scanDocName}
                                            onChange={(e) => setScanDocName(e.target.value)}
                                            className="px-3 py-1.5 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-indigo-600 font-semibold"
                                            placeholder="Tên tài liệu..."
                                          />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-text-dim text-[10px] font-bold uppercase">Trạng thái:</span>
                                          <input
                                            type="text"
                                            value={scanStatus}
                                            onChange={(e) => setScanStatus(e.target.value)}
                                            className="px-3 py-1.5 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-indigo-600 font-semibold"
                                            placeholder="Trạng thái (Hủy/Bị thay thế sẽ bị chặn)..."
                                          />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-text-dim text-[10px] font-bold uppercase">Ngày (DDMMYYYY):</span>
                                          <input
                                            type="text"
                                            value={scanDate}
                                            onChange={(e) => setScanDate(e.target.value)}
                                            className="px-3 py-1.5 bg-sidebar-dark border border-border-dark rounded-lg text-white text-xs focus:outline-none focus:border-indigo-600 font-semibold"
                                            placeholder="DDMMYYYY"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div key={capIndex} className="flex items-center justify-between p-3 bg-sidebar-dark/45 rounded-xl border border-border-dark">
                                    <button
                                      onClick={() => executeAction(plugin.pluginId, cap, {})}
                                      className={cn(
                                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                                        "bg-primary/10 text-primary border border-primary/20",
                                        "hover:bg-primary/20 hover:border-primary/40"
                                      )}
                                    >
                                      {cap}
                                    </button>
                                    <span className="text-text-dim text-xs italic">Không yêu cầu tham số</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Hien thi debug payload gui di */}
      {debugPayload && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs text-blue-400 font-mono">
          [DEBUG] Last Payload: {JSON.stringify(debugPayload)}
        </div>
      )}

      {/* Action Results Log */}
      {actionResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card-dark border border-border-dark rounded-2xl overflow-hidden"
        >
          <div className="p-4 border-b border-border-dark">
            <h2 className="text-white font-bold flex items-center gap-3">
              <div className="size-10 bg-sidebar-dark rounded-xl flex items-center justify-center">
                <Terminal className="size-5 text-text-dim" />
              </div>
              Action Results
              <span className="text-text-dim text-sm font-normal">({actionResults.length})</span>
            </h2>
          </div>

          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {actionResults.map((result, index) => {
              const resultId = `${result.timestamp}-${index}`;
              return (
                <div
                  key={resultId}
                  className={cn(
                    "border rounded-xl overflow-hidden",
                    result.success ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
                  )}
                >
                  <div className="flex items-center justify-between p-3 border-b border-border-dark bg-sidebar-dark/50">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle2 className="size-4 text-green-400" />
                      ) : (
                        <AlertTriangle className="size-4 text-red-400" />
                      )}
                      <span className={cn("text-sm font-medium", result.success ? "text-green-400" : "text-red-400")}>
                        {result.success ? 'Success' : 'Error'}
                      </span>
                      <span className="text-text-dim text-xs">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(renderJsonBeautifully(result.success ? result.data : result.error), resultId)}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedId === resultId ? (
                        <Check className="size-4 text-green-400" />
                      ) : (
                        <Copy className="size-4 text-text-dim" />
                      )}
                    </button>
                  </div>
                  <div className="p-3 space-y-3">
                    {result.success && result.data?.result?.base64Data && (
                      <div className="border border-border-dark rounded-lg overflow-hidden max-w-md bg-black/40 p-2">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase mb-2">Ảnh quét xem trước (Preview):</p>
                        <img 
                          src={`data:image/jpeg;base64,${result.data.result.base64Data}`} 
                          alt="Scanned Document Preview" 
                          className="w-full h-auto rounded border border-border-dark object-contain max-h-64"
                        />
                      </div>
                    )}
                    <pre className="text-xs text-text-dim font-mono whitespace-pre-wrap break-all">
                      {result.success ? renderJsonBeautifully(result.data) : result.error}
                    </pre>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Troubleshooting Tips */}
      {!hubStatus.connected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-yellow-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="text-yellow-400 font-bold">Troubleshooting Tips</h3>
              <ul className="text-sm text-text-dim space-y-1">
                <li>â€¢ Make sure the Agent Hub is running: run <code className="bg-sidebar-dark px-2 py-0.5 rounded">dotnet run</code> on your PC</li>
                <li>â€¢ Check if the Hub URL is correct (default: http://localhost:56789)</li>
                <li>â€¢ Verify CORS is enabled on the Agent Hub server</li>
                <li>â€¢ Ensure the Security Token matches the one configured in your Hub</li>
                <li>â€¢ Check your firewall settings to allow connections to the Hub port</li>
              </ul>
              <a
                href={config.hubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-hover transition-colors"
              >
                Open Hub in browser
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
