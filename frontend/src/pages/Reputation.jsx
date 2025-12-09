import React, { useState, useEffect } from 'react';
import { reputationAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Trophy,
  Medal,
  Star,
  Award,
  TrendingUp,
  Users,
  Shield,
  Clock,
  RefreshCw,
  Crown
} from 'lucide-react';

const TRUST_COLORS = {
  platinum: 'from-slate-300 to-slate-500',
  gold: 'from-yellow-400 to-yellow-600',
  silver: 'from-slate-400 to-slate-600',
  bronze: 'from-orange-400 to-orange-600'
};

const TRUST_BADGES = {
  platinum: { icon: Crown, color: 'text-slate-300' },
  gold: { icon: Trophy, color: 'text-yellow-400' },
  silver: { icon: Medal, color: 'text-slate-400' },
  bronze: { icon: Award, color: 'text-orange-400' }
};

const Reputation = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState(null);

  const fetchLeaderboard = async () => {
    try {
      const response = await reputationAPI.getLeaderboard();
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Reputation Leaderboard</h1>
          <p className="text-slate-400">Organization rankings based on threat intelligence contributions</p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchLeaderboard} className="text-slate-400">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topThree.map((org, index) => {
          const TrustIcon = TRUST_BADGES[org.trust_level]?.icon || Star;
          const position = index + 1;
          const heights = ['h-48', 'h-40', 'h-36'];
          const orders = ['order-2', 'order-1', 'order-3'];
          
          return (
            <Card 
              key={org.id} 
              className={`bg-gradient-to-br ${TRUST_COLORS[org.trust_level]} border-0 cursor-pointer transition-transform hover:scale-105 ${orders[index]} md:order-none`}
              onClick={() => setSelectedOrg(org)}
            >
              <CardContent className={`p-6 ${heights[index]} flex flex-col justify-between`}>
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    {position === 1 && <Crown className="w-10 h-10 text-yellow-300" />}
                    {position === 2 && <Medal className="w-8 h-8 text-slate-200" />}
                    {position === 3 && <Award className="w-8 h-8 text-orange-300" />}
                  </div>
                  <p className="text-4xl font-bold text-white">#{position}</p>
                </div>
                
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white mb-1">{org.organization_name}</h3>
                  <p className="text-2xl font-bold text-white/90">{org.reputation_score}</p>
                  <p className="text-sm text-white/70">Reputation Score</p>
                </div>

                <div className="flex justify-center gap-2 flex-wrap">
                  <Badge className="bg-white/20 text-white border-0">
                    <TrustIcon className="w-3 h-3 mr-1" />
                    {org.trust_level}
                  </Badge>
                  <Badge className="bg-white/20 text-white border-0">
                    {org.contributions_count} contributions
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Organizations</p>
                <p className="text-2xl font-bold text-white">{leaderboard.length}</p>
              </div>
              <Users className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Contributions</p>
                <p className="text-2xl font-bold text-green-400">
                  {leaderboard.reduce((sum, org) => sum + org.contributions_count, 0)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Threats Shared</p>
                <p className="text-2xl font-bold text-orange-400">
                  {leaderboard.reduce((sum, org) => sum + org.threats_shared, 0)}
                </p>
              </div>
              <Shield className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Models Contributed</p>
                <p className="text-2xl font-bold text-purple-400">
                  {leaderboard.reduce((sum, org) => sum + org.models_contributed, 0)}
                </p>
              </div>
              <Star className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Leaderboard Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Full Rankings</CardTitle>
          <CardDescription className="text-slate-400">All participating organizations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rest.map((org) => {
              const TrustIcon = TRUST_BADGES[org.trust_level]?.icon || Star;
              const trustColor = TRUST_BADGES[org.trust_level]?.color || 'text-slate-400';
              
              return (
                <div 
                  key={org.id}
                  className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedOrg(org)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-slate-300">#{org.rank}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{org.organization_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <TrustIcon className={`w-4 h-4 ${trustColor}`} />
                        <span className="text-xs text-slate-400 capitalize">{org.trust_level}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-cyan-400">{org.reputation_score}</p>
                      <p className="text-xs text-slate-400">Score</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-400">{org.contributions_count}</p>
                      <p className="text-xs text-slate-400">Contributions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-orange-400">{org.threats_shared}</p>
                      <p className="text-xs text-slate-400">Threats</p>
                    </div>
                    <div className="hidden md:flex gap-1">
                      {org.badges?.slice(0, 3).map((badge, i) => (
                        <Badge key={i} className="bg-slate-700 text-slate-300 text-xs">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Organization Details */}
      {selectedOrg && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">{selectedOrg.organization_name}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedOrg(null)} className="text-slate-400">
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                <p className="text-3xl font-bold text-cyan-400">{selectedOrg.reputation_score}</p>
                <p className="text-xs text-slate-400">Reputation Score</p>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                <p className="text-3xl font-bold text-green-400">{selectedOrg.contributions_count}</p>
                <p className="text-xs text-slate-400">Total Contributions</p>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                <p className="text-3xl font-bold text-orange-400">{(selectedOrg.false_positive_rate * 100).toFixed(1)}%</p>
                <p className="text-xs text-slate-400">False Positive Rate</p>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                <p className="text-3xl font-bold text-purple-400">{selectedOrg.response_time_avg}m</p>
                <p className="text-xs text-slate-400">Avg Response Time</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-2">Badges Earned</p>
                <div className="flex flex-wrap gap-2">
                  {selectedOrg.badges?.map((badge, i) => (
                    <Badge key={i} className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                      <Star className="w-3 h-3 mr-1" />
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock className="w-4 h-4" />
                <span>Last contribution: {new Date(selectedOrg.last_contribution).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reputation;
