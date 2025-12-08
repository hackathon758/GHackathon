import React, { useState, useEffect } from 'react';
import { threatAPI } from '../lib/api';
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
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Eye,
  Shield,
  Clock,
  Server,
  Globe,
  Link2,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

const SEVERITY_STYLES = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/50',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  low: 'bg-green-500/20 text-green-400 border-green-500/50'
};

const STATUS_STYLES = {
  active: 'bg-red-500/20 text-red-400 border-red-500/50',
  mitigated: 'bg-green-500/20 text-green-400 border-green-500/50',
  investigating: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  false_positive: 'bg-slate-500/20 text-slate-400 border-slate-500/50'
};

const Threats = () => {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', severity: '', category: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newThreat, setNewThreat] = useState({
    name: '',
    description: '',
    severity: 'medium',
    category: 'malware',
    source_ip: '',
    target_system: '',
    industry_tags: []
  });

  const fetchThreats = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.severity) params.severity = filters.severity;
      if (filters.category) params.category = filters.category;
      
      const response = await threatAPI.getAll(params);
      setThreats(response.data);
    } catch (error) {
      console.error('Failed to fetch threats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreats();
  }, [filters]);

  const handleStatusChange = async (threatId, newStatus) => {
    try {
      await threatAPI.updateStatus(threatId, newStatus);
      fetchThreats();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleCreateThreat = async () => {
    try {
      await threatAPI.create(newThreat);
      setShowCreateDialog(false);
      setNewThreat({
        name: '',
        description: '',
        severity: 'medium',
        category: 'malware',
        source_ip: '',
        target_system: '',
        industry_tags: []
      });
      fetchThreats();
    } catch (error) {
      console.error('Failed to create threat:', error);
    }
  };

  const filteredThreats = threats.filter(threat =>
    threat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    threat.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6" data-testid="threats-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Threat Management</h1>
          <p className="text-slate-400">Monitor and manage detected security threats</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={fetchThreats} className="text-slate-400" data-testid="refresh-threats-btn">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600" data-testid="create-threat-btn">
                <Plus className="w-4 h-4 mr-2" />
                Report Threat
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white">Report New Threat</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Manually report a detected security threat
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Threat Name</Label>
                  <Input
                    value={newThreat.name}
                    onChange={(e) => setNewThreat({ ...newThreat, name: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    placeholder="e.g., Suspicious SSH Activity"
                    data-testid="threat-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Description</Label>
                  <Textarea
                    value={newThreat.description}
                    onChange={(e) => setNewThreat({ ...newThreat, description: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    placeholder="Describe the threat..."
                    data-testid="threat-description-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Severity</Label>
                    <Select value={newThreat.severity} onValueChange={(v) => setNewThreat({ ...newThreat, severity: v })}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white" data-testid="threat-severity-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="critical" className="text-white">Critical</SelectItem>
                        <SelectItem value="high" className="text-white">High</SelectItem>
                        <SelectItem value="medium" className="text-white">Medium</SelectItem>
                        <SelectItem value="low" className="text-white">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Category</Label>
                    <Select value={newThreat.category} onValueChange={(v) => setNewThreat({ ...newThreat, category: v })}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white" data-testid="threat-category-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="malware" className="text-white">Malware</SelectItem>
                        <SelectItem value="phishing" className="text-white">Phishing</SelectItem>
                        <SelectItem value="ddos" className="text-white">DDoS</SelectItem>
                        <SelectItem value="intrusion" className="text-white">Intrusion</SelectItem>
                        <SelectItem value="ransomware" className="text-white">Ransomware</SelectItem>
                        <SelectItem value="data_breach" className="text-white">Data Breach</SelectItem>
                        <SelectItem value="insider_threat" className="text-white">Insider Threat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Source IP</Label>
                    <Input
                      value={newThreat.source_ip}
                      onChange={(e) => setNewThreat({ ...newThreat, source_ip: e.target.value })}
                      className="bg-slate-700/50 border-slate-600 text-white"
                      placeholder="192.168.1.1"
                      data-testid="threat-source-ip-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Target System</Label>
                    <Input
                      value={newThreat.target_system}
                      onChange={(e) => setNewThreat({ ...newThreat, target_system: e.target.value })}
                      className="bg-slate-700/50 border-slate-600 text-white"
                      placeholder="server-01"
                      data-testid="threat-target-input"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-slate-600 text-slate-300">
                  Cancel
                </Button>
                <Button onClick={handleCreateThreat} className="bg-gradient-to-r from-cyan-500 to-blue-600" data-testid="submit-threat-btn">
                  Report Threat
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Search threats..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700/50 border-slate-600 text-white"
                  data-testid="search-threats-input"
                />
              </div>
            </div>
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="w-[150px] bg-slate-700/50 border-slate-600 text-white" data-testid="filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white">All Status</SelectItem>
                <SelectItem value="active" className="text-white">Active</SelectItem>
                <SelectItem value="mitigated" className="text-white">Mitigated</SelectItem>
                <SelectItem value="investigating" className="text-white">Investigating</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.severity} onValueChange={(v) => setFilters({ ...filters, severity: v })}>
              <SelectTrigger className="w-[150px] bg-slate-700/50 border-slate-600 text-white" data-testid="filter-severity">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white">All Severity</SelectItem>
                <SelectItem value="critical" className="text-white">Critical</SelectItem>
                <SelectItem value="high" className="text-white">High</SelectItem>
                <SelectItem value="medium" className="text-white">Medium</SelectItem>
                <SelectItem value="low" className="text-white">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
              <SelectTrigger className="w-[150px] bg-slate-700/50 border-slate-600 text-white" data-testid="filter-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white">All Categories</SelectItem>
                <SelectItem value="malware" className="text-white">Malware</SelectItem>
                <SelectItem value="phishing" className="text-white">Phishing</SelectItem>
                <SelectItem value="ddos" className="text-white">DDoS</SelectItem>
                <SelectItem value="intrusion" className="text-white">Intrusion</SelectItem>
                <SelectItem value="ransomware" className="text-white">Ransomware</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Threats Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-700/50">
                <TableHead className="text-slate-400">Threat</TableHead>
                <TableHead className="text-slate-400">Severity</TableHead>
                <TableHead className="text-slate-400">Category</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Confidence</TableHead>
                <TableHead className="text-slate-400">Detected</TableHead>
                <TableHead className="text-slate-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredThreats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    No threats found. Click "Simulate Threats" to generate demo data.
                  </TableCell>
                </TableRow>
              ) : (
                filteredThreats.map((threat) => (
                  <TableRow key={threat.id} className="border-slate-700 hover:bg-slate-700/50" data-testid={`threat-row-${threat.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{threat.name}</p>
                          <p className="text-sm text-slate-500 truncate max-w-[200px]">{threat.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={SEVERITY_STYLES[threat.severity]}>
                        {threat.severity.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-300 capitalize">{threat.category.replace('_', ' ')}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_STYLES[threat.status]}>
                        {threat.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-cyan-500 rounded-full" 
                            style={{ width: `${(threat.confidence_score || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-400">{((threat.confidence_score || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{formatDate(threat.detected_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-slate-400 hover:text-white"
                              onClick={() => setSelectedThreat(threat)}
                              data-testid={`view-threat-${threat.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                                {selectedThreat?.name}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <p className="text-sm text-slate-400">Severity</p>
                                  <Badge className={SEVERITY_STYLES[selectedThreat?.severity || 'medium']}>
                                    {selectedThreat?.severity?.toUpperCase()}
                                  </Badge>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm text-slate-400">Status</p>
                                  <Badge className={STATUS_STYLES[selectedThreat?.status || 'active']}>
                                    {selectedThreat?.status?.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-slate-400">Description</p>
                                <p className="text-white">{selectedThreat?.description}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <p className="text-sm text-slate-400 flex items-center gap-2">
                                    <Globe className="w-4 h-4" /> Source IP
                                  </p>
                                  <p className="text-white font-mono">{selectedThreat?.source_ip || 'N/A'}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm text-slate-400 flex items-center gap-2">
                                    <Server className="w-4 h-4" /> Target System
                                  </p>
                                  <p className="text-white font-mono">{selectedThreat?.target_system || 'N/A'}</p>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-slate-400 flex items-center gap-2">
                                  <Link2 className="w-4 h-4" /> Blockchain Hash
                                </p>
                                <p className="text-cyan-400 font-mono text-sm break-all">{selectedThreat?.blockchain_hash}</p>
                              </div>
                            </div>
                            <DialogFooter>
                              <Select 
                                value={selectedThreat?.status} 
                                onValueChange={(v) => handleStatusChange(selectedThreat?.id, v)}
                              >
                                <SelectTrigger className="w-[180px] bg-slate-700/50 border-slate-600 text-white">
                                  <SelectValue placeholder="Change Status" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                  <SelectItem value="active" className="text-white">Active</SelectItem>
                                  <SelectItem value="mitigated" className="text-white">Mitigated</SelectItem>
                                  <SelectItem value="investigating" className="text-white">Investigating</SelectItem>
                                  <SelectItem value="false_positive" className="text-white">False Positive</SelectItem>
                                </SelectContent>
                              </Select>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        {threat.status === 'active' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-green-400 hover:text-green-300"
                            onClick={() => handleStatusChange(threat.id, 'mitigated')}
                            data-testid={`mitigate-threat-${threat.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Threats;
