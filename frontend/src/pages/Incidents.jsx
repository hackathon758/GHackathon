import React, { useState, useEffect } from 'react';
import { incidentAPI, threatAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Zap,
  RefreshCw,
  Plus,
  Bot,
  User,
  Clock,
  Shield,
  Ban,
  AlertTriangle,
  Server,
  Link2,
  CheckCircle2
} from 'lucide-react';

const ACTION_ICONS = {
  block_ip: Ban,
  quarantine: Shield,
  alert_admin: AlertTriangle,
  firewall_rule: Server,
  isolate_system: Server
};

const ACTION_COLORS = {
  block_ip: 'bg-red-500/20 text-red-400',
  quarantine: 'bg-orange-500/20 text-orange-400',
  alert_admin: 'bg-yellow-500/20 text-yellow-400',
  firewall_rule: 'bg-blue-500/20 text-blue-400',
  isolate_system: 'bg-purple-500/20 text-purple-400'
};

const STATUS_STYLES = {
  completed: 'bg-green-500/20 text-green-400 border-green-500/50',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  failed: 'bg-red-500/20 text-red-400 border-red-500/50'
};

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoResponseLoading, setAutoResponseLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterAutomated, setFilterAutomated] = useState('');
  const [newIncident, setNewIncident] = useState({
    threat_id: '',
    action_type: 'block_ip',
    description: '',
    is_automated: false
  });

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterAutomated === 'automated') params.is_automated = true;
      if (filterAutomated === 'manual') params.is_automated = false;
      
      const response = await incidentAPI.getAll(params);
      setIncidents(response.data);
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchThreats = async () => {
    try {
      const response = await threatAPI.getAll({ status: 'active' });
      setThreats(response.data);
    } catch (error) {
      console.error('Failed to fetch threats:', error);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchThreats();
  }, [filterAutomated]);

  const handleAutonomousResponse = async () => {
    setAutoResponseLoading(true);
    try {
      await incidentAPI.simulateAutonomous();
      await fetchIncidents();
      await fetchThreats();
    } catch (error) {
      console.error('Autonomous response failed:', error);
    } finally {
      setAutoResponseLoading(false);
    }
  };

  const handleCreateIncident = async () => {
    try {
      await incidentAPI.create(newIncident);
      setShowCreateDialog(false);
      setNewIncident({
        threat_id: '',
        action_type: 'block_ip',
        description: '',
        is_automated: false
      });
      fetchIncidents();
    } catch (error) {
      console.error('Failed to create incident:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const automatedCount = incidents.filter(i => i.is_automated).length;
  const manualCount = incidents.filter(i => !i.is_automated).length;

  return (
    <div className="space-y-6" data-testid="incidents-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Incident Response</h1>
          <p className="text-slate-400">Autonomous and manual security responses</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleAutonomousResponse}
            disabled={autoResponseLoading}
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
            data-testid="trigger-autonomous-btn"
          >
            <Bot className="w-4 h-4 mr-2" />
            {autoResponseLoading ? 'AI Responding...' : 'Trigger AI Response'}
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchIncidents} className="text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600" data-testid="create-incident-btn">
                <Plus className="w-4 h-4 mr-2" />
                Manual Response
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white">Create Incident Response</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Manually respond to a security threat
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Select Threat</Label>
                  <Select value={newIncident.threat_id} onValueChange={(v) => setNewIncident({ ...newIncident, threat_id: v })}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white" data-testid="incident-threat-select">
                      <SelectValue placeholder="Select a threat" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {threats.map((threat) => (
                        <SelectItem key={threat.id} value={threat.id} className="text-white">
                          {threat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Action Type</Label>
                  <Select value={newIncident.action_type} onValueChange={(v) => setNewIncident({ ...newIncident, action_type: v })}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white" data-testid="incident-action-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="block_ip" className="text-white">Block IP</SelectItem>
                      <SelectItem value="quarantine" className="text-white">Quarantine</SelectItem>
                      <SelectItem value="alert_admin" className="text-white">Alert Admin</SelectItem>
                      <SelectItem value="firewall_rule" className="text-white">Add Firewall Rule</SelectItem>
                      <SelectItem value="isolate_system" className="text-white">Isolate System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Description</Label>
                  <Textarea
                    value={newIncident.description}
                    onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    placeholder="Describe the response action..."
                    data-testid="incident-description-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-slate-600 text-slate-300">
                  Cancel
                </Button>
                <Button onClick={handleCreateIncident} className="bg-gradient-to-r from-cyan-500 to-blue-600" data-testid="submit-incident-btn">
                  Execute Response
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
                <p className="text-sm text-slate-400">Total Responses</p>
                <p className="text-3xl font-bold text-white">{incidents.length}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Autonomous (AI)</p>
                <p className="text-3xl font-bold text-purple-400">{automatedCount}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Manual Responses</p>
                <p className="text-3xl font-bold text-blue-400">{manualCount}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Select value={filterAutomated} onValueChange={setFilterAutomated}>
              <SelectTrigger className="w-[200px] bg-slate-700/50 border-slate-600 text-white" data-testid="filter-response-type">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white">All Responses</SelectItem>
                <SelectItem value="automated" className="text-white">Autonomous (AI)</SelectItem>
                <SelectItem value="manual" className="text-white">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Incidents Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-700/50">
                <TableHead className="text-slate-400">Response</TableHead>
                <TableHead className="text-slate-400">Action</TableHead>
                <TableHead className="text-slate-400">Type</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Executed At</TableHead>
                <TableHead className="text-slate-400">Blockchain</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : incidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    No incident responses found. Trigger AI Response to see autonomous actions.
                  </TableCell>
                </TableRow>
              ) : (
                incidents.map((incident) => {
                  const ActionIcon = ACTION_ICONS[incident.action_type] || Zap;
                  return (
                    <TableRow key={incident.id} className="border-slate-700 hover:bg-slate-700/50" data-testid={`incident-row-${incident.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ACTION_COLORS[incident.action_type]}`}>
                            <ActionIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-white font-medium capitalize">{incident.action_type.replace('_', ' ')}</p>
                            <p className="text-sm text-slate-500 truncate max-w-[250px]">{incident.description}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={ACTION_COLORS[incident.action_type]}>
                          {incident.action_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {incident.is_automated ? (
                            <>
                              <Bot className="w-4 h-4 text-purple-400" />
                              <span className="text-purple-400">Autonomous</span>
                            </>
                          ) : (
                            <>
                              <User className="w-4 h-4 text-blue-400" />
                              <span className="text-blue-400">Manual</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_STYLES[incident.status]}>
                          {incident.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{formatDate(incident.executed_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link2 className="w-4 h-4 text-cyan-400" />
                          <span className="text-cyan-400 font-mono text-xs truncate max-w-[100px]">
                            {incident.blockchain_hash?.substring(0, 12)}...
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Incidents;
