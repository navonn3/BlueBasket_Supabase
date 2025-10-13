
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Trophy, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlayerComparisonPage() {
  const [selectedPlayers, setSelectedPlayers] = useState([null, null]);
  const [searchTerm1, setSearchTerm1] = useState("");
  const [searchTerm2, setSearchTerm2] = useState("");
  const [showResults1, setShowResults1] = useState(false);
  const [showResults2, setShowResults2] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState(() => {
    const stored = localStorage.getItem('selectedLeague');
    return stored ? parseInt(stored) : null;
  });

  useEffect(() => {
    const handleLeagueChange = (e) => {
      setSelectedLeague(e.detail);
      // Clear selections when league changes
      setSelectedPlayers([null, null]);
      setSearchTerm1("");
      setSearchTerm2("");
    };
    window.addEventListener('leagueChanged', handleLeagueChange);
    return () => window.removeEventListener('leagueChanged', handleLeagueChange);
  }, []);

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['players', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return [];
      return base44.entities.Player.filter({ league_id: selectedLeague });
    },
    initialData: [],
    enabled: !!selectedLeague,
  });

  const { data: playerAverages, isLoading: avgLoading } = useQuery({
    queryKey: ['playerAverages', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return [];
      return base44.entities.PlayerAverages.filter({ league_id: selectedLeague });
    },
    initialData: [],
    enabled: !!selectedLeague,
  });

  const { data: teams } = useQuery({
    queryKey: ['teams', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return [];
      return base44.entities.Team.filter({ league_id: selectedLeague });
    },
    initialData: [],
    enabled: !!selectedLeague,
  });

  const isLoading = playersLoading || avgLoading;

  if (!selectedLeague) {
    return (
      <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-7xl mx-auto text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--primary)' }}>
            אנא בחר ליגה מהתפריט
          </h2>
          <p className="text-sm text-gray-600">כדי להשוות שחקנים, עליך לבחור ליגה תחילה</p>
        </div>
      </div>
    );
  }

  const filterPlayers = (term, excludeId) => {
    if (!term || term.length < 2) return [];
    
    const lowerTerm = term.toLowerCase();
    return players
      .filter(p => p.id !== excludeId)
      .filter(p => {
        const playerTeam = teams.find(t => t.team_id === p.current_team_id);
        return p.name?.toLowerCase().includes(lowerTerm) ||
               playerTeam?.team_name?.toLowerCase().includes(lowerTerm) ||
               playerTeam?.short_name?.toLowerCase().includes(lowerTerm);
      })
      .slice(0, 5);
  };

  const handlePlayerSelect = (index, player) => {
    const newSelected = [...selectedPlayers];
    newSelected[index] = player.id;
    setSelectedPlayers(newSelected);
    
    if (index === 0) {
      setSearchTerm1(player.name);
      setShowResults1(false);
    } else {
      setSearchTerm2(player.name);
      setShowResults2(false);
    }
  };

  const clearPlayer = (index) => {
    const newSelected = [...selectedPlayers];
    newSelected[index] = null;
    setSelectedPlayers(newSelected);
    
    if (index === 0) {
      setSearchTerm1("");
    } else {
      setSearchTerm2("");
    }
  };

  const getPlayerData = (playerId) => {
    if (!playerId) return null;
    const player = players.find(p => p.id === playerId);
    if (!player) return null;

    const stats = playerAverages.find(avg => {
      if (avg.player_name === player.name) return true;
      const normalize = (str) => str?.trim().toLowerCase().replace(/\s+/g, ' ');
      return normalize(avg.player_name) === normalize(player.name);
    });

    const playerTeam = teams.find(t => t.team_id === player.current_team_id);

    return {
      ...player,
      stats,
      bgColor: playerTeam?.bg_color || 'var(--primary)',
      textColor: playerTeam?.text_color || '#FFFFFF'
    };
  };

  const compareStats = [
    { key: 'pts', label: 'נק\' (PTS)' },
    { key: 'reb', label: 'ריב\' (REB)' },
    { key: 'ast', label: 'אס\' (AST)' },
    { key: 'stl', label: 'חט\' (STL)' },
    { key: 'blk', label: 'חס\' (BLK)' },
    { key: 'to', label: 'איב\' (TO)', lowerIsBetter: true },
    { key: 'fg_pct', label: '% מהשדה (FG%)', isPercent: true },
    { key: '3pt_pct', label: '% ל-3 (3P%)', isPercent: true },
    { key: 'ft_pct', label: '% עונ\' (FT%)', isPercent: true },
    { key: 'min', label: 'דק\' (MIN)' },
    { key: 'rate', label: 'יעי\' (EFF)' },
  ];

  const player1Data = getPlayerData(selectedPlayers[0]);
  const player2Data = getPlayerData(selectedPlayers[1]);

  const filteredResults1 = filterPlayers(searchTerm1, selectedPlayers[0]);
  const filteredResults2 = filterPlayers(searchTerm2, selectedPlayers[1]);

  return (
    <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
            <Users className="w-6 h-6" />
            השוואת שחקנים
          </h1>
          <p className="text-sm text-gray-600">בחר 2 שחקנים להשוואה</p>
        </div>

        {/* Player Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Player 1 Search */}
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-4">
              <div className="relative">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="חפש שחקן ראשון..."
                    value={searchTerm1}
                    onChange={(e) => {
                      setSearchTerm1(e.target.value);
                      setShowResults1(true);
                    }}
                    onFocus={() => setShowResults1(true)}
                    className="pr-10"
                  />
                  {selectedPlayers[0] && (
                    <button
                      onClick={() => clearPlayer(0)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {showResults1 && filteredResults1.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredResults1.map(player => {
                      const playerTeam = teams.find(t => t.team_id === player.current_team_id);
                      return (
                        <div
                          key={player.id}
                          onClick={() => handlePlayerSelect(0, player)}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-semibold text-sm">{player.name}</div>
                          <div className="text-xs text-gray-500">{playerTeam?.short_name || playerTeam?.team_name || 'ללא קבוצה'}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Player 2 Search */}
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-4">
              <div className="relative">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="חפש שחקן שני..."
                    value={searchTerm2}
                    onChange={(e) => {
                      setSearchTerm2(e.target.value);
                      setShowResults2(true);
                    }}
                    onFocus={() => setShowResults2(true)}
                    className="pr-10"
                  />
                  {selectedPlayers[1] && (
                    <button
                      onClick={() => clearPlayer(1)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {showResults2 && filteredResults2.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredResults2.map(player => {
                      const playerTeam = teams.find(t => t.team_id === player.current_team_id);
                      return (
                        <div
                          key={player.id}
                          onClick={() => handlePlayerSelect(1, player)}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-semibold text-sm">{player.name}</div>
                          <div className="text-xs text-gray-500">{playerTeam?.short_name || playerTeam?.team_name || 'ללא קבוצה'}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {!player1Data || !player2Data ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-bold text-gray-600 mb-2">בחר שחקנים להשוואה</h3>
              <p className="text-gray-500">חפש ובחר 2 שחקנים כדי להתחיל את ההשוואה</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Horizontal Player Cards */}
            <Card className="mb-6">
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                  {[player1Data, player2Data].map((player, idx) => {
                    const playerTeam = teams.find(t => t.team_id === player.current_team_id);
                    return (
                      <div key={player.id} className={`p-6 ${idx === 1 ? 'md:border-r-0' : ''}`}>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: player.bgColor }}>
                            <span className="text-2xl font-bold" style={{ color: player.textColor }}>
                              {player.jersey_number ? `#${player.jersey_number}` : '#'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold" style={{ color: 'var(--primary)' }}>
                              {player.name}
                            </h3>
                            <p className="text-sm text-gray-600">{playerTeam?.short_name || playerTeam?.team_name || 'ללא קבוצה'}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {player.height && (
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <div className="text-xs text-gray-500">גובה</div>
                              <div className="font-semibold">{player.height}</div>
                            </div>
                          )}
                          {player.date_of_birth && (
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <div className="text-xs text-gray-500">תאריך לידה</div>
                              <div className="font-semibold text-xs">{player.date_of_birth}</div>
                            </div>
                          )}
                          {player.stats?.games_played && (
                            <div className="text-center p-2 bg-gray-50 rounded col-span-2">
                              <div className="text-xs text-gray-500">משחקים</div>
                              <div className="font-semibold">{player.stats.games_played}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Horizontal Stats Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  השוואת סטטיסטיקות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {compareStats.map((stat) => {
                    const val1 = player1Data.stats?.[stat.key];
                    const val2 = player2Data.stats?.[stat.key];
                    
                    if (val1 === undefined || val2 === undefined) return null;
                    
                    const value1 = Number(val1) || 0;
                    const value2 = Number(val2) || 0;
                    const maxValue = Math.max(value1, value2, 1);
                    
                    const isBetter1 = stat.lowerIsBetter ? value1 < value2 : value1 > value2;
                    const isBetter2 = stat.lowerIsBetter ? value2 < value1 : value2 > value1;

                    return (
                      <div key={stat.key}>
                        <div className="text-sm font-semibold text-gray-700 mb-2 text-center">
                          {stat.label}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-right">
                            <div className={`text-xl font-bold mb-1 ${isBetter1 ? 'text-green-600' : 'text-gray-700'}`}>
                              {stat.isPercent ? `${value1.toFixed(1)}%` : value1.toFixed(1)}
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${isBetter1 ? 'bg-green-500' : 'bg-gray-400'} transition-all`}
                                style={{ width: `${(value1 / maxValue) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-left">
                            <div className={`text-xl font-bold mb-1 ${isBetter2 ? 'text-green-600' : 'text-gray-700'}`}>
                              {stat.isPercent ? `${value2.toFixed(1)}%` : value2.toFixed(1)}
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${isBetter2 ? 'bg-green-500' : 'bg-gray-400'} transition-all`}
                                style={{ width: `${(value2 / maxValue) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
