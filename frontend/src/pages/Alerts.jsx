import React, { useState, useEffect } from 'react';
import { alertAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Bell,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Mail,
  Monitor,
  Settings,
  Eye
} from 'lucide-react';

const SEVERITY_STYLES = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/50',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  low: 'bg-green-500/20 text-green-400 border-green-500/50'
};

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [newConfig, setNewConfig] = useState({
    name: '',
    severity_levels: ['critical', 'high'],
    categories: ['malware', 'ransomware'],
    notification_email: true,
    notification_dashboard: true,
    is_active: true
  });

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const [alertsRes, configsRes] = await Promise.all([
        alertAPI.getAll(),
        alertAPI.getConfigs()
      ]);
      setAlerts(alertsRes.data);
      setConfigs(configsRes.data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleMarkRead = async (alertId) => {
    try {
      await alertAPI.markRead(alertId);
      fetchAlerts();
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertAPI.markAllRead();
      fetchAlerts();
    } catch (error) {
      console.error('Failed to mark all alerts as read:', error);
    }
  };

  const handleCreateConfig = async () => {
    try {
      await alertAPI.createConfig(newConfig);
      setShowConfigDialog(false);
      setNewConfig({
        name: '',
        severity_levels: ['critical', 'high'],
        categories: ['malware', 'ransomware'],
        notification_email: true,
        notification_dashboard: true,
        is_active: true
      });
      fetchAlerts();
    } catch (error) {
      console.error('Failed to create config:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <div className="space-y-6" data-testid="alerts-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Alerts</h1>
          <p className="text-slate-400">Monitor and configure security alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleMarkAllRead}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            data-testid="mark-all-read-btn"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchAlerts} className="text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600" data-testid="create-config-btn">
                <Plus className="w-4 h-4 mr-2" />
                New Alert Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white">Create Alert Rule</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Configure when you want to receive alerts
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Rule Name</Label>
                  <Input
                    value={newConfig.name}
                    onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    placeholder="e.g., Critical Threat Alerts"
                    data-testid="config-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Severity Levels</Label>
                  <div className="flex flex-wrap gap-2">
                    {['critical', 'high', 'medium', 'low'].map((severity) => (
                      <Badge
                        key={severity}
                        className={`cursor-pointer ${newConfig.severity_levels.includes(severity) ? SEVERITY_STYLES[severity] : 'bg-slate-700 text-slate-400'}`}
                        onClick={() => {
                          const levels = newConfig.severity_levels.includes(severity)
                            ? newConfig.severity_levels.filter(s => s !== severity)
                            : [...newConfig.severity_levels, severity];
                          setNewConfig({ ...newConfig, severity_levels: levels });
                        }}
                      >
                        {severity.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-300">Notification Channels</Label>
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300">Email Notifications</span>
                    </div>
                    <Switch
                      checked={newConfig.notification_email}
                      onCheckedChange={(checked) => setNewConfig({ ...newConfig, notification_email: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300">Dashboard Alerts</span>
                    </div>
                    <Switch
                      checked={newConfig.notification_dashboard}
                      onCheckedChange={(checked) => setNewConfig({ ...newConfig, notification_dashboard: checked })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowConfigDialog(false)} className="border-slate-600 text-slate-300">
                  Cancel
                </Button>
                <Button onClick={handleCreateConfig} className="bg-gradient-to-r from-cyan-500 to-blue-600" data-testid="submit-config-btn">
                  Create Rule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Alerts</p>
                <p className="text-3xl font-bold text-white">{alerts.length}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Unread</p>
                <p className="text-3xl font-bold text-red-400">{unreadCount}</p>
              </div>
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active Rules</p>
                <p className="text-3xl font-bold text-green-400">{configs.filter(c => c.is_active).length}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Alerts</CardTitle>
          <CardDescription className="text-slate-400">Your latest security notifications</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-700/50">
                <TableHead className="text-slate-400">Alert</TableHead>
                <TableHead className="text-slate-400">Severity</TableHead>
                <TableHead className="text-slate-400">Category</TableHead>
                <TableHead className="text-slate-400">Time</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    No alerts found. Alerts will appear when threats are detected.
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((alert) => (
                  <TableRow key={alert.id} className={`border-slate-700 hover:bg-slate-700/50 ${!alert.is_read ? 'bg-slate-800/70' : ''}`} data-testid={`alert-row-${alert.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${SEVERITY_STYLES[alert.severity].split(' ')[0]}`}>
                          <Bell className="w-5 h-5 text-current" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{alert.message}</p>
                          <p className="text-sm text-slate-500">Threat ID: {alert.threat_id.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={SEVERITY_STYLES[alert.severity]}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-300 capitalize">{alert.category.replace('_', ' ')}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{formatDate(alert.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={alert.is_read ? 'bg-slate-500/20 text-slate-400 border-slate-500/50' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'}>
                        {alert.is_read ? 'Read' : 'Unread'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!alert.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-cyan-400 hover:text-cyan-300"
                          onClick={() => handleMarkRead(alert.id)}
                          data-testid={`mark-read-${alert.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Alert Rules */}
      {configs.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Alert Rules</CardTitle>
            <CardDescription className="text-slate-400">Your configured alert rules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {configs.map((config) => (
                <div key={config.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg" data-testid={`config-${config.id}`}>
                  <div>
                    <p className="text-white font-medium">{config.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {config.severity_levels.map((sev) => (
                        <Badge key={sev} className={SEVERITY_STYLES[sev]} variant="outline">
                          {sev}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {config.notification_email && <Mail className="w-4 h-4 text-slate-400" />}
                      {config.notification_dashboard && <Monitor className="w-4 h-4 text-slate-400" />}
                    </div>
                    <Badge className={config.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}>
                      {config.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Alerts;
