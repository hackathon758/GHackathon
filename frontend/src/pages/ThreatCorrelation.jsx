import React, { useState, useEffect } from 'react';
import { correlationAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  GitBranch,
  Link2,
  AlertTriangle,
  RefreshCw,
  Target,
  Clock,
  Server,
  ChevronRight
} from 'lucide-react';

const PATTERN_COLORS = {
  attack_chain: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
  campaign: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' },
  apt: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50' },
  botnet: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/50' },
  coordinated_attack: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/50' }
};

const ThreatCorrelation = () => {
  const [patterns, setPatterns] = useState([]);
  const [clusters, setClusters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPattern, setSelectedPattern] = useState(null);

  const fetchData = async () => {
    try {
      const [patternsRes, clustersRes] = await Promise.all([
        correlationAPI.getPatterns(),
        correlationAPI.getClusters()
      ]);
      setPatterns(patternsRes.data);
      setClusters(clustersRes.data);
    } catch (error) {
      console.error('Failed to fetch correlation data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Threat Correlation</h1>
          <p className="text-slate-400">AI-powered pattern detection and threat clustering</p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchData} className="text-slate-400">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-cyan-400">{patterns.length}</p>
            <p className="text-xs text-slate-400">Detected Patterns</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-400">{clusters?.clusters?.length || 0}</p>
            <p className="text-xs text-slate-400">Threat Clusters</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">
              {patterns.reduce((sum, p) => sum + p.threat_ids.length, 0)}
            </p>
            <p className="text-xs text-slate-400">Correlated Threats</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-400">{clusters?.unclustered_count || 0}</p>
            <p className="text-xs text-slate-400">Unclustered</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Correlation Patterns */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-cyan-400" />
              Correlation Patterns
            </CardTitle>
            <CardDescription className="text-slate-400">
              Identified attack patterns and campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {patterns.map((pattern) => {
                const colors = PATTERN_COLORS[pattern.pattern_type] || PATTERN_COLORS.attack_chain;
                
                return (
                  <div
                    key={pattern.id}
                    className={`p-4 rounded-lg cursor-pointer transition-all border ${
                      selectedPattern?.id === pattern.id 
                        ? `${colors.bg} ${colors.border}` 
                        : 'bg-slate-700/30 border-transparent hover:bg-slate-700/50'
                    }`}
                    onClick={() => setSelectedPattern(pattern)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium">{pattern.pattern_name}</h4>
                      <Badge className={`${colors.bg} ${colors.text} ${colors.border} capitalize`}>
                        {pattern.pattern_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        {pattern.threat_ids.length} threats
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {pattern.attack_vector}
                      </span>
                    </div>
                    
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-slate-500">Confidence:</span>
                      <Progress value={pattern.correlation_score * 100} className="flex-1 h-1.5 bg-slate-700" />
                      <span className="text-xs text-cyan-400">{Math.round(pattern.correlation_score * 100)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Threat Clusters */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-400" />
              Threat Clusters
            </CardTitle>
            <CardDescription className="text-slate-400">
              Grouped threats by common attributes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clusters?.clusters?.map((cluster) => (
                <div key={cluster.cluster_id} className="p-4 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-medium">{cluster.name}</h4>
                    <Badge className={`${
                      cluster.risk_level === 'critical' ? 'bg-red-500/20 text-red-400' :
                      cluster.risk_level === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      cluster.risk_level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    } capitalize`}>
                      {cluster.risk_level}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-2xl font-bold text-cyan-400">{cluster.threat_count}</div>
                    <span className="text-slate-400 text-sm">threats in cluster</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {cluster.common_attributes.map((attr, i) => (
                      <Badge key={i} className="bg-slate-600 text-slate-300 text-xs">
                        {attr.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Pattern Details */}
      {selectedPattern && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">{selectedPattern.pattern_name}</CardTitle>
                <CardDescription className="text-slate-400">
                  Detailed correlation analysis
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedPattern(null)} className="text-slate-400">
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Timeline */}
              <div>
                <p className="text-sm text-slate-400 mb-2 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> Timeline
                </p>
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <p className="text-xs text-slate-500">Start</p>
                  <p className="text-white">{new Date(selectedPattern.timeline_start).toLocaleDateString()}</p>
                  <div className="my-2 border-l-2 border-cyan-500/50 h-8 ml-2"></div>
                  <p className="text-xs text-slate-500">End</p>
                  <p className="text-white">{new Date(selectedPattern.timeline_end).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Indicators */}
              <div>
                <p className="text-sm text-slate-400 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Indicators
                </p>
                <div className="space-y-2">
                  {selectedPattern.indicators.map((indicator, i) => (
                    <div key={i} className="p-2 bg-slate-700/30 rounded text-sm text-slate-300 font-mono">
                      {indicator}
                    </div>
                  ))}
                </div>
              </div>

              {/* Affected Systems */}
              <div>
                <p className="text-sm text-slate-400 mb-2 flex items-center gap-1">
                  <Server className="w-4 h-4" /> Affected Systems
                </p>
                <div className="space-y-2">
                  {selectedPattern.affected_systems.map((system, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-slate-700/30 rounded">
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      <span className="text-sm text-slate-300">{system}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="mt-6 pt-4 border-t border-slate-700">
              <p className="text-sm text-slate-400 mb-3">Recommended Actions</p>
              <div className="flex flex-wrap gap-2">
                {selectedPattern.recommendations.map((rec, i) => (
                  <Badge key={i} className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                    <ChevronRight className="w-3 h-3 mr-1" />
                    {rec}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ThreatCorrelation;
