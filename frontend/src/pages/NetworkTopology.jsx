import React, { useState, useEffect, useRef, useCallback } from 'react';
import { networkAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Server,
  Shield,
  Router,
  Cloud,
  Laptop,
  AlertTriangle,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';

const NODE_COLORS = {
  active: '#22c55e',
  inactive: '#64748b',
  compromised: '#ef4444',
  quarantined: '#f97316'
};

const NODE_ICONS = {
  server: Server,
  firewall: Shield,
  router: Router,
  switch: Server,
  endpoint: Laptop,
  edge_device: Router,
  cloud: Cloud
};

const RISK_COLORS = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444'
};

const NetworkTopology = () => {
  const [topology, setTopology] = useState({ nodes: [], connections: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const fetchTopology = async () => {
    try {
      const response = await networkAPI.getTopology();
      setTopology(response.data);
    } catch (error) {
      console.error('Failed to fetch topology:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopology();
    const interval = setInterval(fetchTopology, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseDown = useCallback((e) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleZoom = (delta) => {
    setZoom(prev => Math.max(0.5, Math.min(2, prev + delta)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  const { nodes, connections, stats } = topology;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Network Topology</h1>
          <p className="text-slate-400">Interactive visualization of network infrastructure</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => handleZoom(0.1)} className="border-slate-700">
            <ZoomIn className="w-4 h-4 text-slate-400" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleZoom(-0.1)} className="border-slate-700">
            <ZoomOut className="w-4 h-4 text-slate-400" />
          </Button>
          <Button variant="outline" size="icon" onClick={resetView} className="border-slate-700">
            <Maximize2 className="w-4 h-4 text-slate-400" />
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchTopology} className="text-slate-400">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.total_nodes}</p>
            <p className="text-xs text-slate-400">Total Nodes</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.active_nodes}</p>
            <p className="text-xs text-slate-400">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.compromised_nodes}</p>
            <p className="text-xs text-slate-400">Compromised</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-cyan-400">{stats.total_connections}</p>
            <p className="text-xs text-slate-400">Connections</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-400">{stats.suspicious_connections}</p>
            <p className="text-xs text-slate-400">Suspicious</p>
          </CardContent>
        </Card>
      </div>

      {/* Network Visualization */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-0">
          <svg
            ref={svgRef}
            width="100%"
            height="500"
            className="bg-slate-900/50 cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <g transform={`translate(${pan.x + 100}, ${pan.y + 50}) scale(${zoom})`}>
              {/* Connections */}
              {connections.map((conn) => {
                const sourceNode = nodes.find(n => n.id === conn.source_id);
                const targetNode = nodes.find(n => n.id === conn.target_id);
                if (!sourceNode || !targetNode) return null;
                
                const strokeColor = conn.connection_type === 'suspicious' ? '#ef4444' :
                                    conn.connection_type === 'blocked' ? '#f97316' : '#334155';
                const strokeDash = conn.connection_type === 'blocked' ? '5,5' : 'none';
                
                return (
                  <line
                    key={conn.id}
                    x1={sourceNode.x_position}
                    y1={sourceNode.y_position}
                    x2={targetNode.x_position}
                    y2={targetNode.y_position}
                    stroke={strokeColor}
                    strokeWidth={conn.connection_type === 'suspicious' ? 3 : 2}
                    strokeDasharray={strokeDash}
                    opacity={0.7}
                  />
                );
              })}
              
              {/* Nodes */}
              {nodes.map((node) => {
                const NodeIcon = NODE_ICONS[node.node_type] || Server;
                const nodeColor = NODE_COLORS[node.status] || '#64748b';
                const riskColor = RISK_COLORS[node.risk_level] || '#22c55e';
                const isSelected = selectedNode?.id === node.id;
                
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x_position}, ${node.y_position})`}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer"
                  >
                    {/* Risk indicator ring */}
                    <circle
                      r={isSelected ? 35 : 30}
                      fill="transparent"
                      stroke={riskColor}
                      strokeWidth={3}
                      opacity={0.5}
                    />
                    
                    {/* Main node circle */}
                    <circle
                      r={25}
                      fill={nodeColor}
                      stroke={isSelected ? '#06b6d4' : '#1e293b'}
                      strokeWidth={isSelected ? 3 : 2}
                    />
                    
                    {/* Icon placeholder */}
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {node.node_type.charAt(0).toUpperCase()}
                    </text>
                    
                    {/* Node name */}
                    <text
                      y={40}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="10"
                    >
                      {node.name.length > 15 ? node.name.substring(0, 15) + '...' : node.name}
                    </text>
                    
                    {/* Status indicator */}
                    {node.status === 'compromised' && (
                      <circle cx={18} cy={-18} r={8} fill="#ef4444">
                        <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
                      </circle>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span className="text-sm text-slate-400">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-slate-500"></div>
          <span className="text-sm text-slate-400">Inactive</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <span className="text-sm text-slate-400">Compromised</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-orange-500"></div>
          <span className="text-sm text-slate-400">Quarantined</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-red-500"></div>
          <span className="text-sm text-slate-400">Suspicious Connection</span>
        </div>
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                {React.createElement(NODE_ICONS[selectedNode.node_type] || Server, { className: 'w-5 h-5 text-cyan-400' })}
                {selectedNode.name}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedNode(null)} className="text-slate-400">
                Close
              </Button>
            </div>
            <CardDescription className="text-slate-400">
              {selectedNode.ip_address} • {selectedNode.node_type}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400">Status</p>
                <Badge className={`mt-1 ${
                  selectedNode.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  selectedNode.status === 'compromised' ? 'bg-red-500/20 text-red-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {selectedNode.status}
                </Badge>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400">Risk Level</p>
                <Badge className={`mt-1 ${
                  selectedNode.risk_level === 'critical' ? 'bg-red-500/20 text-red-400' :
                  selectedNode.risk_level === 'high' ? 'bg-orange-500/20 text-orange-400' :
                  selectedNode.risk_level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {selectedNode.risk_level}
                </Badge>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400">CPU Usage</p>
                <p className="text-white font-bold">{selectedNode.metrics?.cpu || 0}%</p>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400">Connections</p>
                <p className="text-white font-bold">{selectedNode.connections?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NetworkTopology;
