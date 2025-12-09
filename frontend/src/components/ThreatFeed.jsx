import React, { useState, useEffect, useRef } from 'react';
import { threatFeedAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  AlertTriangle,
  Shield,
  RefreshCw,
  Pause,
  Play,
  Zap
} from 'lucide-react';

const SEVERITY_COLORS = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/50',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  low: 'bg-green-500/20 text-green-400 border-green-500/50'
};

const ThreatFeed = ({ compact = false }) => {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const scrollRef = useRef(null);

  const fetchFeed = async () => {
    if (isPaused) return;
    
    try {
      const response = await threatFeedAPI.getLive(30, 60);
      setThreats(response.data.threats || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch threat feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewThreats = async () => {
    try {
      await threatFeedAPI.generate(3);
      await fetchFeed();
    } catch (error) {
      console.error('Failed to generate threats:', error);
    }
  };

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [isPaused]);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleString();
  };

  if (compact) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
              Live Threat Feed
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? <Play className="w-3 h-3 text-green-400" /> : <Pause className="w-3 h-3 text-slate-400" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {threats.slice(0, 5).map((threat, index) => (
                <div 
                  key={threat.id || index}
                  className="flex items-center gap-2 p-2 bg-slate-700/30 rounded text-xs animate-fade-in"
                >
                  <div className={`w-2 h-2 rounded-full ${
                    threat.severity === 'critical' ? 'bg-red-500 animate-pulse' :
                    threat.severity === 'high' ? 'bg-orange-500' :
                    threat.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <span className="text-slate-300 truncate flex-1">{threat.name}</span>
                  <span className="text-slate-500">{formatTime(threat.detected_at)}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
              Real-Time Threat Feed
            </CardTitle>
            <CardDescription className="text-slate-400">
              Live threat detection stream • Last update: {lastUpdate.toLocaleTimeString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateNewThreats}
              className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
            >
              <Zap className="w-4 h-4 mr-1" />
              Simulate
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPaused(!isPaused)}
              className={isPaused ? 'text-green-400' : 'text-slate-400'}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={fetchFeed} className="text-slate-400">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96" ref={scrollRef}>
          <div className="space-y-3">
            {threats.map((threat, index) => (
              <div
                key={threat.id || index}
                className="flex items-start gap-4 p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                  threat.severity === 'critical' ? 'bg-red-500 animate-pulse' :
                  threat.severity === 'high' ? 'bg-orange-500' :
                  threat.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                }`}></div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">{threat.name}</span>
                    <Badge className={SEVERITY_COLORS[threat.severity]}>
                      {threat.severity}
                    </Badge>
                    <Badge className="bg-slate-600 text-slate-300">
                      {threat.category}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-slate-400 mb-2">{threat.description}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Source: {threat.source_ip}</span>
                    <span>Target: {threat.target_system}</span>
                    <span>Confidence: {Math.round((threat.confidence_score || 0) * 100)}%</span>
                  </div>
                </div>
                
                <div className="text-right flex-shrink-0">
                  <p className="text-sm text-slate-400">{formatTime(threat.detected_at)}</p>
                  <Badge className="mt-1 bg-cyan-500/20 text-cyan-400 text-xs">
                    {threat.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Status Bar */}
        <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              {isPaused ? 'Paused' : 'Monitoring'}
            </span>
            <span className="text-slate-500">{threats.length} threats in feed</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              Critical: {threats.filter(t => t.severity === 'critical').length}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              High: {threats.filter(t => t.severity === 'high').length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThreatFeed;
