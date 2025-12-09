import React, { useState, useEffect } from 'react';
import { aiAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  Lightbulb,
  Shield,
  Search,
  Settings,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';

const PRIORITY_COLORS = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/50',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  low: 'bg-green-500/20 text-green-400 border-green-500/50'
};

const TYPE_ICONS = {
  mitigation: Shield,
  prevention: Lightbulb,
  investigation: Search,
  configuration: Settings
};

const AISuggestions = ({ compact = false }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  const fetchSuggestions = async () => {
    try {
      const response = await aiAPI.getSuggestions();
      setSuggestions(response.data);
    } catch (error) {
      console.error('Failed to fetch AI suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
    const interval = setInterval(fetchSuggestions, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (suggestionId, action) => {
    try {
      await aiAPI.updateSuggestionStatus(suggestionId, action);
      setSuggestions(prev => prev.map(s => 
        s.id === suggestionId ? { ...s, status: action } : s
      ));
    } catch (error) {
      console.error('Failed to update suggestion:', error);
    }
  };

  if (compact) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            AI Suggestions
            <Badge className="bg-purple-500/20 text-purple-400 ml-auto">
              {suggestions.filter(s => s.status === 'pending').length} new
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="space-y-2">
            {suggestions.slice(0, 3).map((suggestion) => {
              const TypeIcon = TYPE_ICONS[suggestion.suggestion_type] || Lightbulb;
              return (
                <div
                  key={suggestion.id}
                  className="flex items-center gap-2 p-2 bg-slate-700/30 rounded text-xs cursor-pointer hover:bg-slate-700/50"
                  onClick={() => setSelectedSuggestion(suggestion)}
                >
                  <TypeIcon className="w-3 h-3 text-purple-400" />
                  <span className="text-slate-300 truncate flex-1">{suggestion.title}</span>
                  <Badge className={`${PRIORITY_COLORS[suggestion.priority]} text-xs py-0`}>
                    {suggestion.priority}
                  </Badge>
                </div>
              );
            })}
          </div>
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
              <Brain className="w-5 h-5 text-purple-400" />
              AI-Driven Security Suggestions
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </CardTitle>
            <CardDescription className="text-slate-400">
              Intelligent recommendations based on threat analysis
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchSuggestions} className="text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {suggestions.map((suggestion) => {
              const TypeIcon = TYPE_ICONS[suggestion.suggestion_type] || Lightbulb;
              const isExpanded = selectedSuggestion?.id === suggestion.id;
              
              return (
                <div
                  key={suggestion.id}
                  className={`p-4 rounded-lg transition-all cursor-pointer ${
                    suggestion.status === 'applied' ? 'bg-green-500/10 border border-green-500/30' :
                    suggestion.status === 'dismissed' ? 'bg-slate-700/20 opacity-50' :
                    'bg-slate-700/30 hover:bg-slate-700/50'
                  }`}
                  onClick={() => setSelectedSuggestion(isExpanded ? null : suggestion)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="w-5 h-5 text-purple-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">{suggestion.title}</span>
                        <Badge className={PRIORITY_COLORS[suggestion.priority]}>
                          {suggestion.priority}
                        </Badge>
                        <Badge className="bg-slate-600 text-slate-300 capitalize">
                          {suggestion.suggestion_type}
                        </Badge>
                        {suggestion.status !== 'pending' && (
                          <Badge className={suggestion.status === 'applied' ? 
                            'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-400'
                          }>
                            {suggestion.status}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-400 mb-2">{suggestion.description}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Confidence: {Math.round(suggestion.confidence * 100)}%</span>
                        <span>Impact: {suggestion.estimated_impact}</span>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-700 animate-fade-in">
                          <p className="text-sm text-slate-400 mb-3">Recommended Actions:</p>
                          <div className="space-y-2">
                            {suggestion.recommended_actions?.map((action, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <ChevronRight className="w-4 h-4 text-cyan-400" />
                                <span className="text-slate-300">{action}</span>
                              </div>
                            ))}
                          </div>
                          
                          {suggestion.status === 'pending' && (
                            <div className="flex items-center gap-2 mt-4">
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction(suggestion.id, 'applied');
                                }}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Apply
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-600 text-slate-400"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction(suggestion.id, 'dismissed');
                                }}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Dismiss
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-slate-400">{suggestions.length} suggestions</span>
            <span className="text-green-400">
              {suggestions.filter(s => s.status === 'applied').length} applied
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              {suggestions.filter(s => s.priority === 'critical' && s.status === 'pending').length} critical
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AISuggestions;
