import React, { useState, useEffect } from 'react';
import { federatedAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Network,
  RefreshCw,
  Activity,
  Users,
  Brain,
  Shield,
  Clock,
  TrendingUp,
  Lock,
  Link2,
  CheckCircle2,
  Loader2
} from 'lucide-react';

const MODEL_TYPE_ICONS = {
  anomaly_detection: Brain,
  malware_detection: Shield,
  phishing_detection: Activity,
  intrusion_detection: Lock
};

const STATUS_STYLES = {
  deployed: 'bg-green-500/20 text-green-400 border-green-500/50',
  training: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  aggregating: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  idle: 'bg-slate-500/20 text-slate-400 border-slate-500/50'
};

const FederatedLearning = () => {
  const [models, setModels] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [modelsRes, contribRes] = await Promise.all([
        federatedAPI.getModels(),
        federatedAPI.getContributions()
      ]);
      setModels(modelsRes.data);
      setContributions(contribRes.data);
    } catch (error) {
      console.error('Failed to fetch federated data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const totalParticipants = models.reduce((sum, m) => sum + m.participants_count, 0);
  const avgAccuracy = models.length > 0 
    ? (models.reduce((sum, m) => sum + m.accuracy, 0) / models.length * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6" data-testid="federated-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Federated Learning</h1>
          <p className="text-slate-400">Privacy-preserving collaborative threat detection</p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchData} className="text-slate-400" data-testid="refresh-federated-btn">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active Models</p>
                <p className="text-3xl font-bold text-cyan-400">{models.length}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Participants</p>
                <p className="text-3xl font-bold text-purple-400">{totalParticipants}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Avg. Accuracy</p>
                <p className="text-3xl font-bold text-green-400">{avgAccuracy}%</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Contributions</p>
                <p className="text-3xl font-bold text-blue-400">{contributions.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Network className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="models" className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="models" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            Models
          </TabsTrigger>
          <TabsTrigger value="contributions" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            Contributions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          {/* Models Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
              </div>
            ) : (
              models.map((model) => {
                const ModelIcon = MODEL_TYPE_ICONS[model.model_type] || Brain;
                return (
                  <Card key={model.id} className="bg-slate-800/50 border-slate-700" data-testid={`model-card-${model.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                            <ModelIcon className="w-6 h-6 text-cyan-400" />
                          </div>
                          <div>
                            <CardTitle className="text-white text-lg">{model.model_name}</CardTitle>
                            <CardDescription className="text-slate-400 capitalize">
                              {model.model_type.replace('_', ' ')}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className={STATUS_STYLES[model.status]}>
                          {model.status === 'training' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                          {model.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-slate-700/50 rounded-lg">
                          <p className="text-2xl font-bold text-white">{model.participants_count}</p>
                          <p className="text-xs text-slate-400">Participants</p>
                        </div>
                        <div className="p-3 bg-slate-700/50 rounded-lg">
                          <p className="text-2xl font-bold text-green-400">{(model.accuracy * 100).toFixed(1)}%</p>
                          <p className="text-xs text-slate-400">Accuracy</p>
                        </div>
                        <div className="p-3 bg-slate-700/50 rounded-lg">
                          <p className="text-2xl font-bold text-cyan-400">{model.training_rounds}</p>
                          <p className="text-xs text-slate-400">Rounds</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Privacy Budget Remaining</span>
                          <span className="text-white">{(model.privacy_budget_remaining * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={model.privacy_budget_remaining * 100} className="h-2 bg-slate-700" />
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock className="w-4 h-4" />
                          <span>Last aggregation</span>
                        </div>
                        <span className="text-slate-300">{formatDate(model.last_aggregation)}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Version</span>
                        <Badge variant="outline" className="border-slate-600 text-slate-300">
                          v{model.version}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="contributions">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Recent Contributions</CardTitle>
              <CardDescription className="text-slate-400">
                Organizations contributing to federated learning models
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/50">
                    <TableHead className="text-slate-400">Organization</TableHead>
                    <TableHead className="text-slate-400">Contribution Type</TableHead>
                    <TableHead className="text-slate-400">Reputation</TableHead>
                    <TableHead className="text-slate-400">Timestamp</TableHead>
                    <TableHead className="text-slate-400">Blockchain</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    contributions.map((contrib) => (
                      <TableRow key={contrib.id} className="border-slate-700 hover:bg-slate-700/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                              <Users className="w-5 h-5 text-purple-400" />
                            </div>
                            <span className="text-white font-medium">{contrib.organization_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 capitalize">
                            {contrib.contribution_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 rounded-full" 
                                style={{ width: `${contrib.reputation_score * 100}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-400">{(contrib.reputation_score * 100).toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-slate-400">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">{formatDate(contrib.timestamp)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <span className="text-cyan-400 font-mono text-xs truncate max-w-[100px]">
                              {contrib.blockchain_hash?.substring(0, 12)}...
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Privacy Notice */}
      <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border-cyan-500/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Lock className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Privacy-Preserving Technology</h3>
              <p className="text-slate-400">
                All federated learning models use secure aggregation and differential privacy techniques. 
                Raw data never leaves your organization - only encrypted model updates are shared, ensuring 
                full compliance with GDPR, HIPAA, and other data protection regulations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FederatedLearning;
