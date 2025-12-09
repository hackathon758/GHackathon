import React, { useState, useEffect, memo } from 'react';
import { geoAPI } from '../lib/api';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup
} from 'react-simple-maps';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  MapPin,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e'
};

const TREND_ICONS = {
  increasing: { icon: TrendingUp, color: 'text-red-400' },
  decreasing: { icon: TrendingDown, color: 'text-green-400' },
  stable: { icon: Minus, color: 'text-slate-400' }
};

const ThreatMap = () => {
  const [geoThreats, setGeoThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [position, setPosition] = useState({ coordinates: [0, 20], zoom: 1 });

  const fetchGeoData = async () => {
    try {
      const response = await geoAPI.getThreats();
      setGeoThreats(response.data);
    } catch (error) {
      console.error('Failed to fetch geo threats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeoData();
    const interval = setInterval(fetchGeoData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleZoomIn = () => {
    if (position.zoom >= 4) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }));
  };

  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }));
  };

  const handleMoveEnd = (position) => {
    setPosition(position);
  };

  const getMarkerSize = (threatCount) => {
    if (threatCount > 400) return 20;
    if (threatCount > 200) return 15;
    if (threatCount > 100) return 10;
    return 6;
  };

  const getMarkerColor = (riskScore) => {
    if (riskScore > 75) return '#ef4444';
    if (riskScore > 50) return '#f97316';
    if (riskScore > 25) return '#eab308';
    return '#22c55e';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  const totalThreats = geoThreats.reduce((sum, g) => sum + g.threat_count, 0);
  const topCountries = [...geoThreats].sort((a, b) => b.threat_count - a.threat_count).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Geographic Threat Map</h1>
          <p className="text-slate-400">Global threat distribution and intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomIn} className="border-slate-700">
            <ZoomIn className="w-4 h-4 text-slate-400" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomOut} className="border-slate-700">
            <ZoomOut className="w-4 h-4 text-slate-400" />
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchGeoData} className="text-slate-400">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Global Threats</p>
                <p className="text-2xl font-bold text-white">{totalThreats.toLocaleString()}</p>
              </div>
              <Globe className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Countries Affected</p>
                <p className="text-2xl font-bold text-orange-400">{geoThreats.length}</p>
              </div>
              <MapPin className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">High Risk Regions</p>
                <p className="text-2xl font-bold text-red-400">
                  {geoThreats.filter(g => g.risk_score > 70).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Avg Risk Score</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {Math.round(geoThreats.reduce((sum, g) => sum + g.risk_score, 0) / geoThreats.length)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* World Map */}
        <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700">
          <CardContent className="p-0">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{
                scale: 120
              }}
              style={{ width: '100%', height: '500px' }}
            >
              <ZoomableGroup
                zoom={position.zoom}
                center={position.coordinates}
                onMoveEnd={handleMoveEnd}
              >
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="#1e293b"
                        stroke="#334155"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: 'none' },
                          hover: { fill: '#334155', outline: 'none' },
                          pressed: { fill: '#475569', outline: 'none' }
                        }}
                      />
                    ))
                  }
                </Geographies>

                {/* Threat Markers */}
                {geoThreats.map((threat) => (
                  <Marker
                    key={threat.id}
                    coordinates={[threat.longitude, threat.latitude]}
                    onClick={() => setSelectedCountry(threat)}
                  >
                    <circle
                      r={getMarkerSize(threat.threat_count)}
                      fill={getMarkerColor(threat.risk_score)}
                      fillOpacity={0.7}
                      stroke="#fff"
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                    />
                    <circle
                      r={getMarkerSize(threat.threat_count) + 5}
                      fill={getMarkerColor(threat.risk_score)}
                      fillOpacity={0.2}
                    >
                      <animate
                        attributeName="r"
                        from={getMarkerSize(threat.threat_count)}
                        to={getMarkerSize(threat.threat_count) + 10}
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        from="0.6"
                        to="0"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </Marker>
                ))}
              </ZoomableGroup>
            </ComposableMap>
          </CardContent>
        </Card>

        {/* Top Countries / Details Panel */}
        <div className="space-y-4">
          {selectedCountry ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">{selectedCountry.country_name}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCountry(null)} className="text-slate-400">
                    Close
                  </Button>
                </div>
                <CardDescription className="text-slate-400">
                  Country Code: {selectedCountry.country_code}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-700/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-400">{selectedCountry.threat_count}</p>
                    <p className="text-xs text-slate-400">Total Threats</p>
                  </div>
                  <div className="p-3 bg-slate-700/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-orange-400">{selectedCountry.risk_score}</p>
                    <p className="text-xs text-slate-400">Risk Score</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-2">Severity Breakdown</p>
                  <div className="space-y-2">
                    {Object.entries(selectedCountry.severity_breakdown).map(([severity, count]) => (
                      <div key={severity} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[severity] }}></div>
                          <span className="text-sm text-slate-300 capitalize">{severity}</span>
                        </div>
                        <span className="text-sm text-white font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-2">Top Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCountry.top_categories.map((cat, i) => (
                      <Badge key={i} className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 capitalize">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
                  {React.createElement(
                    TREND_ICONS[selectedCountry.trend]?.icon || Minus,
                    { className: `w-4 h-4 ${TREND_ICONS[selectedCountry.trend]?.color}` }
                  )}
                  <span className="text-sm text-slate-400 capitalize">Trend: {selectedCountry.trend}</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Top Threat Sources</CardTitle>
                <CardDescription className="text-slate-400">Countries by threat volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topCountries.map((country, index) => {
                    const TrendIcon = TREND_ICONS[country.trend]?.icon || Minus;
                    const trendColor = TREND_ICONS[country.trend]?.color || 'text-slate-400';
                    
                    return (
                      <div
                        key={country.id}
                        className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors"
                        onClick={() => setSelectedCountry(country)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-slate-300">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{country.country_name}</p>
                            <p className="text-xs text-slate-400">{country.country_code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-400">{country.threat_count}</p>
                            <p className="text-xs text-slate-400">threats</p>
                          </div>
                          <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Legend */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Risk Level Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <span className="text-sm text-slate-400">Critical (75+)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                  <span className="text-sm text-slate-400">High (50-75)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                  <span className="text-sm text-slate-400">Medium (25-50)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-sm text-slate-400">Low (0-25)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ThreatMap;
