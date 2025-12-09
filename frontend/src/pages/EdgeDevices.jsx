import React, { useState, useEffect } from 'react';
import { edgeDeviceAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Cpu,
  HardDrive,
  Wifi,
  Server,
  Router,
  Shield,
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Signal,
  Clock
} from 'lucide-react';

const STATUS_COLORS = {
  online: 'bg-green-500/20 text-green-400 border-green-500/50',
  offline: 'bg-red-500/20 text-red-400 border-red-500/50',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  critical: 'bg-red-500/20 text-red-400 border-red-500/50'
};

const DEVICE_ICONS = {
  gateway: Router,
  sensor: Signal,
  firewall: Shield,
  router: Router,
  iot_hub: Wifi,
  endpoint: Server
};

const EdgeDevices = () => {
  const [devices, setDevices] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const fetchData = async () => {
    try {
      const [devicesRes, metricsRes] = await Promise.all([
        edgeDeviceAPI.getAll(),
        edgeDeviceAPI.getMetrics()
      ]);
      setDevices(devicesRes.data);
      setMetrics(metricsRes.data);
    } catch (error) {
      console.error('Failed to fetch edge devices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
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
          <h1 className="text-3xl font-bold text-white">Edge Device Monitoring</h1>
          <p className="text-slate-400">Real-time monitoring of edge computing infrastructure</p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchData} className="text-slate-400">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Devices</p>
                  <p className="text-3xl font-bold text-white">{metrics.total_devices}</p>
                </div>
                <Server className="w-8 h-8 text-cyan-400" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-400">{metrics.online_devices} Online</Badge>
                <Badge className="bg-red-500/20 text-red-400">{metrics.offline_devices} Offline</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Avg CPU Usage</p>
                  <p className="text-3xl font-bold text-cyan-400">{metrics.avg_cpu_usage}%</p>
                </div>
                <Cpu className="w-8 h-8 text-cyan-400" />
              </div>
              <Progress value={metrics.avg_cpu_usage} className="mt-4 h-2 bg-slate-700" />
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Avg Memory</p>
                  <p className="text-3xl font-bold text-purple-400">{metrics.avg_memory_usage}%</p>
                </div>
                <HardDrive className="w-8 h-8 text-purple-400" />
              </div>
              <Progress value={metrics.avg_memory_usage} className="mt-4 h-2 bg-slate-700" />
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Threats Blocked</p>
                  <p className="text-3xl font-bold text-green-400">{metrics.block_rate}%</p>
                </div>
                <Shield className="w-8 h-8 text-green-400" />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {metrics.total_threats_blocked} / {metrics.total_threats_detected} blocked
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Device Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((device) => {
          const DeviceIcon = DEVICE_ICONS[device.device_type] || Server;
          const isOnline = device.status === 'online';
          
          return (
            <Card 
              key={device.id} 
              className={`bg-slate-800/50 border-slate-700 cursor-pointer transition-all hover:border-cyan-500/50 ${
                selectedDevice?.id === device.id ? 'border-cyan-500' : ''
              }`}
              onClick={() => setSelectedDevice(device)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isOnline ? 'bg-cyan-500/20' : 'bg-slate-700'
                    }`}>
                      <DeviceIcon className={`w-5 h-5 ${isOnline ? 'text-cyan-400' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-white text-sm">{device.name}</CardTitle>
                      <CardDescription className="text-xs">{device.ip_address}</CardDescription>
                    </div>
                  </div>
                  <Badge className={STATUS_COLORS[device.status]}>
                    {device.status === 'online' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : 
                     device.status === 'warning' ? <AlertTriangle className="w-3 h-3 mr-1" /> :
                     <XCircle className="w-3 h-3 mr-1" />}
                    {device.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> CPU
                    </span>
                    <span className="text-white">{device.cpu_usage}%</span>
                  </div>
                  <Progress value={device.cpu_usage} className="h-1.5 bg-slate-700" />
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-1">
                      <HardDrive className="w-3 h-3" /> Memory
                    </span>
                    <span className="text-white">{device.memory_usage}%</span>
                  </div>
                  <Progress value={device.memory_usage} className="h-1.5 bg-slate-700" />

                  <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-700">
                    <span className="text-slate-400">Latency</span>
                    <span className={`${device.network_latency < 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {device.network_latency}ms
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Threats Blocked</span>
                    <span className="text-green-400">{device.threats_blocked}</span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-500 pt-2">
                    <Clock className="w-3 h-3" />
                    <span>Location: {device.location}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Device Details */}
      {selectedDevice && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Device Details: {selectedDevice.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400">Device Type</p>
                <p className="text-white font-medium">{selectedDevice.device_type}</p>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400">Firmware</p>
                <p className="text-white font-medium">{selectedDevice.firmware_version}</p>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400">Threats Detected</p>
                <p className="text-orange-400 font-medium">{selectedDevice.threats_detected}</p>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400">Block Rate</p>
                <p className="text-green-400 font-medium">
                  {selectedDevice.threats_detected > 0 
                    ? Math.round(selectedDevice.threats_blocked / selectedDevice.threats_detected * 100)
                    : 100}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EdgeDevices;
