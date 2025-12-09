import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Shield,
  LayoutDashboard,
  AlertTriangle,
  Bell,
  Network,
  Link2,
  Users,
  FileText,
  Settings,
  Zap,
  Activity,
  Router,
  Trophy,
  GitBranch,
  Globe,
  BarChart3,
  Radio,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const mainMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: AlertTriangle, label: 'Threats', path: '/threats' },
  { icon: Bell, label: 'Alerts', path: '/alerts' },
  { icon: Zap, label: 'Incident Response', path: '/incidents' },
];

const advancedMenuItems = [
  { icon: Router, label: 'Edge Devices', path: '/edge-devices' },
  { icon: GitBranch, label: 'Network Topology', path: '/network-topology' },
  { icon: Globe, label: 'Threat Map', path: '/threat-map' },
  { icon: Radio, label: 'Threat Correlation', path: '/threat-correlation' },
  { icon: BarChart3, label: 'Risk Analysis', path: '/risk-analysis' },
  { icon: Trophy, label: 'Reputation', path: '/reputation' },
];

const platformMenuItems = [
  { icon: Network, label: 'Federated Learning', path: '/federated' },
  { icon: Link2, label: 'Blockchain', path: '/blockchain' },
  { icon: Users, label: 'Collaboration', path: '/collaboration' },
  { icon: FileText, label: 'Compliance', path: '/compliance' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const Sidebar = () => {
  const location = useLocation();
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [platformOpen, setPlatformOpen] = useState(true);

  const renderMenuItem = (item) => {
    const isActive = location.pathname === item.path || 
      (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
    
    return (
      <Link
        key={item.path}
        to={item.path}
        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200',
          isActive
            ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-400 border-l-2 border-cyan-400'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        )}
      >
        <item.icon className="w-4 h-4" />
        <span className="font-medium text-sm">{item.label}</span>
      </Link>
    );
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 z-40 flex flex-col" data-testid="sidebar">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">DCTIP</h1>
            <p className="text-xs text-slate-500">Threat Intelligence</p>
          </div>
        </Link>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Main Menu */}
        <div className="mb-4">
          <p className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Main</p>
          {mainMenuItems.map(renderMenuItem)}
        </div>

        {/* Advanced Features */}
        <div className="mb-4">
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-400"
          >
            <span>Advanced</span>
            {advancedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {advancedOpen && (
            <div className="space-y-1">
              {advancedMenuItems.map(renderMenuItem)}
            </div>
          )}
        </div>

        {/* Platform Features */}
        <div className="mb-4">
          <button
            onClick={() => setPlatformOpen(!platformOpen)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-400"
          >
            <span>Platform</span>
            {platformOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {platformOpen && (
            <div className="space-y-1">
              {platformMenuItems.map(renderMenuItem)}
            </div>
          )}
        </div>
      </nav>

      {/* System Status */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-sm text-slate-300">System Status</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400">All Systems Operational</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
