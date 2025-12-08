import React, { useState, useEffect } from 'react';
import { dashboardAPI, threatAPI, incidentAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Shield,
  Activity,
  Network,
  Link2,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Database
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e'
};

const CATEGORY_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#84cc16'];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [autoResponseLoading, setAutoResponseLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateThreats = async () => {
    setSimulating(true);
    try {
      await threatAPI.simulate(15);
      await fetchStats();
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setSimulating(false);
    }
  };

  const handleAutonomousResponse = async () => {
    setAutoResponseLoading(true);
    try {
      await incidentAPI.simulateAutonomous();
      await fetchStats();
    } catch (error) {
      console.error('Autonomous response failed:', error);
    } finally {
      setAutoResponseLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="dashboard-loading">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  const categoryData = stats?.threats_by_category ? 
    Object.entries(stats.threats_by_category).map(([name, value]) => ({ name, value })) : [];

  const severityData = stats?.threats_by_severity ?
    Object.entries(stats.threats_by_severity).map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value,
      fill: SEVERITY_COLORS[name]
    })) : [];

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Security Dashboard</h1>
          <p className="text-slate-400">Real-time threat intelligence and system status</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleAutonomousResponse}
            disabled={autoResponseLoading}
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
            data-testid="autonomous-response-btn"
          >
            <Zap className="w-4 h-4 mr-2" />
            {autoResponseLoading ? 'Responding...' : 'AI Auto-Response'}
          </Button>
          <Button
            onClick={handleSimulateThreats}
            disabled={simulating}
            className="bg-gradient-to-r from-cyan-500 to-blue-600"
            data-testid="simulate-threats-btn"
          >
            <Play className="w-4 h-4 mr-2" />
            {simulating ? 'Simulating...' : 'Simulate Threats'}
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchStats} className="text-slate-400" data-testid="refresh-btn">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700" data-testid="total-threats-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Threats</p>
                <p className="text-3xl font-bold text-white">{stats?.total_threats || 0}</p>
              </div>
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                {stats?.mitigated_threats || 0} Mitigated
              </Badge>
              <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                {stats?.active_threats || 0} Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700" data-testid="critical-alerts-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Critical Alerts</p>
                <p className="text-3xl font-bold text-red-400">{stats?.critical_alerts || 0}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-orange-400" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">High: {stats?.high_alerts || 0}</span>
                <span className="text-slate-400">Medium: {stats?.medium_alerts || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700" data-testid="federated-models-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">FL Models Active</p>
                <p className="text-3xl font-bold text-cyan-400">{stats?.federated_models_active || 0}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Network className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Collaborative learning active</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700" data-testid="blockchain-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Blockchain Tx</p>
                <p className="text-3xl font-bold text-purple-400">{stats?.blockchain_transactions || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Link2 className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm text-slate-400">All verified</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health & AI Response */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700" data-testid="system-health-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-5xl font-bold text-green-400">{stats?.system_health || 0}%</p>
                <p className="text-slate-400">Overall Health Score</p>
              </div>
              <Progress value={stats?.system_health || 0} className="h-3 bg-slate-700" />
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-2xl font-bold text-cyan-400">{stats?.autonomous_responses_today || 0}</p>
                  <p className="text-xs text-slate-400">AI Responses Today</p>
                </div>
                <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-400">99.9%</p>
                  <p className="text-xs text-slate-400">Uptime</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700" data-testid="threat-trend-card">
          <CardHeader>
            <CardTitle className="text-white">Threat Trend (7 Days)</CardTitle>
            <CardDescription className="text-slate-400">Detected vs Mitigated threats</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats?.recent_threats_trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Legend />
                <Line type="monotone" dataKey="count" name="Detected" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} />
                <Line type="monotone" dataKey="mitigated" name="Mitigated" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700" data-testid="threats-by-category-card">
          <CardHeader>
            <CardTitle className="text-white">Threats by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700" data-testid="threats-by-severity-card">
          <CardHeader>
            <CardTitle className="text-white">Threats by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={{ stroke: '#64748b' }}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-slate-800/50 border-slate-700" data-testid="quick-actions-card">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
          <CardDescription className="text-slate-400">Common security operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2 border-slate-700 text-slate-300 hover:bg-slate-700" data-testid="action-scan">
              <Shield className="w-6 h-6" />
              <span>Run Scan</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 border-slate-700 text-slate-300 hover:bg-slate-700" data-testid="action-report">
              <Database className="w-6 h-6" />
              <span>Generate Report</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 border-slate-700 text-slate-300 hover:bg-slate-700" data-testid="action-train">
              <Network className="w-6 h-6" />
              <span>Train Model</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 border-slate-700 text-slate-300 hover:bg-slate-700" data-testid="action-audit">
              <Link2 className="w-6 h-6" />
              <span>Audit Trail</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
