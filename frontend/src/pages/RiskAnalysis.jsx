import React, { useState, useEffect } from 'react';
import { riskAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Target,
  BarChart3
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';

const RISK_COLORS = {
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
  low: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' }
};

const RiskAnalysis = () => {
  const [riskScore, setRiskScore] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [scoreRes, analysisRes, trendsRes] = await Promise.all([
        riskAPI.getScore(),
        riskAPI.getAnalysis(),
        riskAPI.getTrends(30)
      ]);
      setRiskScore(scoreRes.data);
      setAnalysis(analysisRes.data);
      setTrends(trendsRes.data);
    } catch (error) {
      console.error('Failed to fetch risk data:', error);
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

  const radarData = riskScore ? [
    { subject: 'Threat Exposure', value: riskScore.threat_exposure, fullMark: 100 },
    { subject: 'Vulnerabilities', value: riskScore.vulnerability_score, fullMark: 100 },
    { subject: 'Attack Surface', value: riskScore.attack_surface, fullMark: 100 },
    { subject: 'Compliance Gap', value: 100 - riskScore.compliance_score, fullMark: 100 },
    { subject: 'Historical Risk', value: Math.min(riskScore.historical_incidents * 2, 100), fullMark: 100 }
  ] : [];

  const riskColors = RISK_COLORS[riskScore?.risk_level] || RISK_COLORS.medium;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Risk Analysis</h1>
          <p className="text-slate-400">Advanced ML-based risk scoring and analysis</p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchData} className="text-slate-400">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Risk Score */}
      {riskScore && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className={`lg:col-span-1 ${riskColors.bg} ${riskColors.border} border-2`}>
            <CardContent className="p-8 text-center">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="12"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke={riskScore.risk_level === 'critical' ? '#ef4444' :
                           riskScore.risk_level === 'high' ? '#f97316' :
                           riskScore.risk_level === 'medium' ? '#eab308' : '#22c55e'}
                    strokeWidth="12"
                    strokeDasharray={`${riskScore.overall_score * 4.4} 440`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className={`text-5xl font-bold ${riskColors.text}`}>
                    {Math.round(riskScore.overall_score)}
                  </span>
                  <span className="text-slate-400 text-sm">Risk Score</span>
                </div>
              </div>
              <Badge className={`mt-4 ${riskColors.bg} ${riskColors.text} ${riskColors.border} text-lg px-4 py-1 capitalize`}>
                {riskScore.risk_level} Risk
              </Badge>
              <p className="mt-4 text-sm text-slate-400">
                Last calculated: {new Date(riskScore.calculated_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Risk Factor Analysis</CardTitle>
              <CardDescription className="text-slate-400">Multi-dimensional risk assessment</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b' }} />
                  <Radar
                    name="Risk Score"
                    dataKey="value"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Risk Components */}
      {riskScore && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400 mb-1">Threat Exposure</p>
              <p className="text-2xl font-bold text-red-400">{riskScore.threat_exposure}</p>
              <Progress value={riskScore.threat_exposure} className="mt-2 h-1 bg-slate-700" />
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400 mb-1">Vulnerabilities</p>
              <p className="text-2xl font-bold text-orange-400">{riskScore.vulnerability_score}</p>
              <Progress value={riskScore.vulnerability_score} className="mt-2 h-1 bg-slate-700" />
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400 mb-1">Attack Surface</p>
              <p className="text-2xl font-bold text-yellow-400">{riskScore.attack_surface}</p>
              <Progress value={riskScore.attack_surface} className="mt-2 h-1 bg-slate-700" />
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400 mb-1">Compliance</p>
              <p className="text-2xl font-bold text-green-400">{riskScore.compliance_score}%</p>
              <Progress value={riskScore.compliance_score} className="mt-2 h-1 bg-slate-700" />
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400 mb-1">Past Incidents</p>
              <p className="text-2xl font-bold text-purple-400">{riskScore.historical_incidents}</p>
              <p className="text-xs text-slate-500 mt-1">in last 90 days</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Risk Trends */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Risk Score Trend (30 Days)</CardTitle>
          <CardDescription className="text-slate-400">Historical risk score progression</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickFormatter={(val) => val.slice(5)} />
              <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }}
              />
              <Legend />
              <Line type="monotone" dataKey="risk_score" name="Overall Risk" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="threat_exposure" name="Threat Exposure" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="vulnerability_score" name="Vulnerabilities" stroke="#eab308" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Risks & Recommendations */}
      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Top Security Risks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.top_risks?.map((risk, index) => (
                  <div key={index} className="p-4 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white font-medium">{risk.risk}</p>
                      <Badge className={`${
                        risk.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        risk.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      } capitalize`}>
                        {risk.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{risk.affected_systems} systems affected</span>
                      <span className="text-cyan-400">{risk.recommendation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-400" />
                Attack Surface Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.attack_surface_breakdown && Object.entries(analysis.attack_surface_breakdown).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                      <span className="text-slate-300 capitalize">{key.replace('_', ' ')}</span>
                    </div>
                    <span className="text-white font-bold">{value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700">
                <p className="text-sm text-slate-400 mb-3">Industry Benchmark</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-2 bg-slate-700/50 rounded">
                    <p className="text-lg font-bold text-cyan-400">{analysis.industry_benchmark?.your_score}</p>
                    <p className="text-xs text-slate-400">Your Score</p>
                  </div>
                  <div className="p-2 bg-slate-700/50 rounded">
                    <p className="text-lg font-bold text-slate-400">{analysis.industry_benchmark?.industry_average}</p>
                    <p className="text-xs text-slate-400">Industry Avg</p>
                  </div>
                  <div className="p-2 bg-slate-700/50 rounded">
                    <p className="text-lg font-bold text-green-400">{analysis.industry_benchmark?.top_performers}</p>
                    <p className="text-xs text-slate-400">Top 10%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations */}
      {riskScore?.recommendations && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              AI Recommendations
            </CardTitle>
            <CardDescription className="text-slate-400">Priority actions to reduce risk score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {riskScore.recommendations.map((rec, index) => (
                <div key={index} className="p-4 bg-slate-700/30 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300 text-sm">{rec}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RiskAnalysis;
