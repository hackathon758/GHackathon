import React, { useState, useEffect } from 'react';
import { collaborationAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Users,
  RefreshCw,
  Plus,
  ThumbsUp,
  MessageSquare,
  Clock,
  Link2,
  Building,
  Globe,
  AlertTriangle,
  Shield
} from 'lucide-react';

const SEVERITY_STYLES = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/50',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  low: 'bg-green-500/20 text-green-400 border-green-500/50'
};

const INDUSTRY_ICONS = {
  healthcare: '🏥',
  finance: '🏦',
  government: '🏛️',
  education: '🎓',
  ecommerce: '🛒',
  manufacturing: '🏭',
  general: '🌐'
};

const Collaboration = () => {
  const [sharedIntel, setSharedIntel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [industryFilter, setIndustryFilter] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [newIntel, setNewIntel] = useState({
    title: '',
    description: '',
    threat_indicators: [],
    severity: 'medium',
    industry_relevance: ['general']
  });
  const [indicatorInput, setIndicatorInput] = useState('');

  const fetchSharedIntel = async () => {
    setLoading(true);
    try {
      const params = {};
      if (industryFilter && industryFilter !== 'all') params.industry = industryFilter;
      const response = await collaborationAPI.getShared(params);
      setSharedIntel(response.data);
    } catch (error) {
      console.error('Failed to fetch shared intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedIntel();
  }, [industryFilter]);

  const handleUpvote = async (intelId) => {
    try {
      await collaborationAPI.upvote(intelId);
      fetchSharedIntel();
    } catch (error) {
      console.error('Failed to upvote:', error);
    }
  };

  const handleShareIntel = async () => {
    try {
      await collaborationAPI.share(newIntel);
      setShowShareDialog(false);
      setNewIntel({
        title: '',
        description: '',
        threat_indicators: [],
        severity: 'medium',
        industry_relevance: ['general']
      });
      fetchSharedIntel();
    } catch (error) {
      console.error('Failed to share intelligence:', error);
    }
  };

  const addIndicator = () => {
    if (indicatorInput.trim()) {
      setNewIntel({
        ...newIntel,
        threat_indicators: [...newIntel.threat_indicators, indicatorInput.trim()]
      });
      setIndicatorInput('');
    }
  };

  const removeIndicator = (index) => {
    setNewIntel({
      ...newIntel,
      threat_indicators: newIntel.threat_indicators.filter((_, i) => i !== index)
    });
  };

  const toggleIndustry = (industry) => {
    const industries = newIntel.industry_relevance.includes(industry)
      ? newIntel.industry_relevance.filter(i => i !== industry)
      : [...newIntel.industry_relevance, industry];
    setNewIntel({ ...newIntel, industry_relevance: industries });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6" data-testid="collaboration-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Threat Intelligence Sharing</h1>
          <p className="text-slate-400">Collaborate securely with industry peers</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={fetchSharedIntel} className="text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600" data-testid="share-intel-btn">
                <Plus className="w-4 h-4 mr-2" />
                Share Intelligence
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white">Share Threat Intelligence</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Share threat intelligence with the community securely
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Title</Label>
                  <Input
                    value={newIntel.title}
                    onChange={(e) => setNewIntel({ ...newIntel, title: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    placeholder="e.g., New Ransomware Variant Detected"
                    data-testid="intel-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Description</Label>
                  <Textarea
                    value={newIntel.description}
                    onChange={(e) => setNewIntel({ ...newIntel, description: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    placeholder="Describe the threat in detail..."
                    data-testid="intel-description-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Severity</Label>
                  <Select value={newIntel.severity} onValueChange={(v) => setNewIntel({ ...newIntel, severity: v })}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white" data-testid="intel-severity-select">
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
                  <Label className="text-slate-300">Threat Indicators (IOCs)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={indicatorInput}
                      onChange={(e) => setIndicatorInput(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                      placeholder="IP, domain, hash, etc."
                      onKeyPress={(e) => e.key === 'Enter' && addIndicator()}
                      data-testid="intel-indicator-input"
                    />
                    <Button onClick={addIndicator} variant="outline" className="border-slate-600">
                      Add
                    </Button>
                  </div>
                  {newIntel.threat_indicators.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newIntel.threat_indicators.map((indicator, index) => (
                        <Badge
                          key={index}
                          className="bg-slate-700 text-slate-300 cursor-pointer"
                          onClick={() => removeIndicator(index)}
                        >
                          {indicator} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Industry Relevance</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(INDUSTRY_ICONS).map(([industry, icon]) => (
                      <Badge
                        key={industry}
                        className={`cursor-pointer ${newIntel.industry_relevance.includes(industry) ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-slate-700 text-slate-400'}`}
                        onClick={() => toggleIndustry(industry)}
                      >
                        {icon} {industry}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowShareDialog(false)} className="border-slate-600 text-slate-300">
                  Cancel
                </Button>
                <Button onClick={handleShareIntel} className="bg-gradient-to-r from-cyan-500 to-blue-600" data-testid="submit-intel-btn">
                  Share Intelligence
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Shared Intelligence</p>
                <p className="text-3xl font-bold text-cyan-400">{sharedIntel.length}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Critical Alerts</p>
                <p className="text-3xl font-bold text-red-400">{sharedIntel.filter(i => i.severity === 'critical').length}</p>
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
                <p className="text-sm text-slate-400">Contributing Orgs</p>
                <p className="text-3xl font-bold text-purple-400">{new Set(sharedIntel.map(i => i.shared_by_org)).size}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Upvotes</p>
                <p className="text-3xl font-bold text-green-400">{sharedIntel.reduce((sum, i) => sum + i.upvotes, 0)}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <ThumbsUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-[200px] bg-slate-700/50 border-slate-600 text-white" data-testid="filter-industry">
                <SelectValue placeholder="Filter by industry" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white">All Industries</SelectItem>
                {Object.entries(INDUSTRY_ICONS).map(([industry, icon]) => (
                  <SelectItem key={industry} value={industry} className="text-white">
                    {icon} {industry.charAt(0).toUpperCase() + industry.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Shared Intelligence List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        ) : sharedIntel.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-8 text-center text-slate-400">
              No shared intelligence found. Be the first to share!
            </CardContent>
          </Card>
        ) : (
          sharedIntel.map((intel) => (
            <Card key={intel.id} className="bg-slate-800/50 border-slate-700" data-testid={`intel-card-${intel.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{intel.title}</h3>
                      <Badge className={SEVERITY_STYLES[intel.severity]}>
                        {intel.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-slate-400 mb-4">{intel.description}</p>
                    
                    {/* Threat Indicators */}
                    {intel.threat_indicators && intel.threat_indicators.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-slate-500 mb-2">Threat Indicators (IOCs):</p>
                        <div className="flex flex-wrap gap-2">
                          {intel.threat_indicators.map((indicator, index) => (
                            <Badge key={index} className="bg-slate-700 text-cyan-400 font-mono text-xs">
                              {indicator}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Industry Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {intel.industry_relevance.map((industry) => (
                        <Badge key={industry} className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                          {INDUSTRY_ICONS[industry]} {industry}
                        </Badge>
                      ))}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        <span>{intel.shared_by_org}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(intel.timestamp)}</span>
                      </div>
                      {intel.blockchain_hash && (
                        <div className="flex items-center gap-2">
                          <Link2 className="w-4 h-4 text-cyan-400" />
                          <span className="text-cyan-400 font-mono">{intel.blockchain_hash.substring(0, 12)}...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpvote(intel.id)}
                      className="border-slate-600 text-slate-300 hover:bg-green-500/20 hover:text-green-400"
                      data-testid={`upvote-${intel.id}`}
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      {intel.upvotes}
                    </Button>
                    <div className="flex items-center gap-1 text-slate-500">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm">{intel.comments_count}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Collaboration;
