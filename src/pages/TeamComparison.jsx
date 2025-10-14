
import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, Trophy, Target, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TeamComparisonPage() {
  const [team1, setTeam1] = useState(null);
  const [team2, setTeam2] = useState(null);
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
      setTeam1(null);
      setTeam2(null);
      setSearchTerm1("");
      setSearchTerm2("");
    };
    window.addEventListener('leagueChanged', handleLeagueChange);
    return () => window.removeEventListener('leagueChanged', handleLeagueChange);
  }, []);

  // Teams
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return [];
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('league_id', selectedLeague);
      if (error) throw error;
      return data || [];
    },
    initialData: [],
    enabled: !!selectedLeague,
  });
  
  // TeamAverages
  const { data: teamAverages, isLoading: teamAvgLoading } = useQuery({
    queryKey: ['teamAverages', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return [];
      const { data, error } = await supabase
        .from('team_averages')
        .select('*')
        .eq('league_id', selectedLeague);
      if (error) throw error;
      return data || [];
    },
    initialData: [],
    enabled: !!selectedLeague,
  });
  
  // OpponentAverages
  const { data: opponentAverages, isLoading: oppAvgLoading } = useQuery({
    queryKey: ['opponentAverages', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return [];
      const { data, error } = await supabase
        .from('opponent_averages')
        .select('*')
        .eq('league_id', selectedLeague);
      if (error) throw error;
      return data || [];
    },
    initialData: [],
    enabled: !!selectedLeague,
  });
  
  // Games
  const { data: games, isLoading: gamesLoading } = useQuery({
    queryKey: ['games', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return [];
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('league_id', selectedLeague);
      if (error) throw error;
      return data || [];
    },
    initialData: [],
    enabled: !!selectedLeague,
  });


  // teamColors query is removed as colors are now part of the Team entity

  const isLoading = teamsLoading || teamAvgLoading || oppAvgLoading || gamesLoading;

  if (!selectedLeague) {
    return (
      <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-7xl mx-auto text-center py-12">
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--primary)' }}>
            אנא בחר ליגה מהתפריט
          </h2>
          <p className="text-sm text-gray-600">כדי להשוות קבוצות, עליך לבחור ליגה תחילה</p>
        </div>
      </div>
    );
  }

  const filterTeams = (term, excludeTeamId) => {
    if (!term || term.length < 2) return [];
    
    const lowerTerm = term.toLowerCase();
    return teams
      .filter(t => t.team_id !== excludeTeamId)
      .filter(t => 
        t.team_name?.toLowerCase().includes(lowerTerm) ||
        t.short_name?.toLowerCase().includes(lowerTerm)
      )
      .sort((a, b) => (a.team_name || '').localeCompare(b.team_name || ''))
      .slice(0, 5);
  };

  const handleTeamSelect = (index, team) => {
    if (index === 1) {
      setTeam1(team.team_id);
      setSearchTerm1(team.short_name || team.team_name);
      setShowResults1(false);
    } else {
      setTeam2(team.team_id);
      setSearchTerm2(team.short_name || team.team_name);
      setShowResults2(false);
    }
  };

  const clearTeam = (index) => {
    if (index === 1) {
      setTeam1(null);
      setSearchTerm1("");
    } else {
      setTeam2(null);
      setSearchTerm2("");
    }
  };

  const getTeamData = (teamId) => {
    if (!teamId) return null;
    
    const team = teams.find(t => t.team_id === teamId);
    if (!team) return null;

    const avgStats = teamAverages.find(t => t.team_id === teamId);
    const oppStats = opponentAverages.find(t => t.team_id === teamId);
    
    const teamGames = games.filter(g => g.home_team_id === teamId || g.away_team_id === teamId);
    const completedGames = teamGames.filter(g => g.home_score !== null && g.home_score !== undefined);
    
    let wins = 0;
    completedGames.forEach(game => {
      if (game.home_team_id === teamId) {
        if (game.home_score > game.away_score) wins++;
      } else {
        if (game.away_score > game.home_score) wins++;
      }
    });

    return {
      ...team,
      stats: avgStats,
      oppStats: oppStats,
      wins,
      losses: completedGames.length - wins,
      winPercentage: completedGames.length > 0 ? (wins / completedGames.length) * 100 : 0,
      bgColor: team.bg_color || 'var(--primary)',
      textColor: team.text_color || '#FFFFFF'
    };
  };

  const team1Data = getTeamData(team1);
  const team2Data = getTeamData(team2);

  const filteredResults1 = filterTeams(searchTerm1, team1);
  const filteredResults2 = filterTeams(searchTerm2, team2);

  const offensiveStats = [
    { key: 'pts', label: 'נק\' (PTS)' },
    { key: 'reb', label: 'ריב\' (REB)' },
    { key: 'ast', label: 'אס\' (AST)' },
    { key: 'stl', label: 'חט\' (STL)' },
    { key: 'blk', label: 'חס\' (BLK)' },
    { key: 'to', label: 'איב\' (TO)', lowerIsBetter: true },
    { key: 'fg_pct', label: '% מהשדה (FG%)', isPercent: true },
    { key: '3pt_pct', label: '% ל-3 (3P%)', isPercent: true },
    { key: 'ft_pct', label: '% עונ\' (FT%)', isPercent: true },
  ];

  const defensiveStats = [
    { key: 'opp_pts', label: 'נק\' יריבים', lowerIsBetter: true },
    { key: 'opp_fg_pct', label: '% יריבים מהשדה', isPercent: true, lowerIsBetter: true },
    { key: 'opp_3pt_pct', label: '% יריבים ל-3', isPercent: true, lowerIsBetter: true },
    { key: 'opp_to', label: 'איב\' יריבים' },
  ];

  return (
    <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
            <Shield className="w-6 h-6" />
            השוואת קבוצות
          </h1>
          <p className="text-sm text-gray-600">בחר שתי קבוצות להשוואה מקיפה</p>
        </div>

        {/* Team Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Team 1 Search */}
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-4">
              <div className="relative">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="חפש קבוצה ראשונה..."
                    value={searchTerm1}
                    onChange={(e) => {
                      setSearchTerm1(e.target.value);
                      setShowResults1(true);
                    }}
                    onFocus={() => setShowResults1(true)}
                    className="pr-10"
                  />
                  {team1 && (
                    <button
                      onClick={() => clearTeam(1)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {showResults1 && filteredResults1.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredResults1.map(team => (
                      <div
                        key={team.team_id}
                        onClick={() => handleTeamSelect(1, team)}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-semibold text-sm">{team.short_name || team.team_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Team 2 Search */}
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-4">
              <div className="relative">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="חפש קבוצה שנייה..."
                    value={searchTerm2}
                    onChange={(e) => {
                      setSearchTerm2(e.target.value);
                      setShowResults2(true);
                    }}
                    onFocus={() => setShowResults2(true)}
                    className="pr-10"
                  />
                  {team2 && (
                    <button
                      onClick={() => clearTeam(2)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {showResults2 && filteredResults2.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredResults2.map(team => (
                      <div
                        key={team.team_id}
                        onClick={() => handleTeamSelect(2, team)}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-semibold text-sm">{team.short_name || team.team_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {!team1Data || !team2Data ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-12 text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-bold text-gray-600 mb-2">בחר קבוצות להשוואה</h3>
              <p className="text-gray-500">חפש ובחר 2 קבוצות כדי להתחיל את ההשוואה</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Horizontal Team Headers */}
            <Card className="mb-6">
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                  {[team1Data, team2Data].map((team, idx) => (
                    <div key={team.team_id} className={`p-6 ${idx === 1 ? 'md:border-r-0' : ''}`} style={{ backgroundColor: team.bgColor }}>
                      <h2 className="text-xl font-bold mb-3" style={{ color: team.textColor }}>
                        {team.short_name || team.team_name}
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-2xl font-bold" style={{ color: team.textColor }}>
                            {team.wins}-{team.losses}
                          </div>
                          <div className="text-sm" style={{ color: team.textColor, opacity: 0.9 }}>
                            מאזן
                          </div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold" style={{ color: team.textColor }}>
                            {team.winPercentage.toFixed(1)}%
                          </div>
                          <div className="text-sm" style={{ color: team.textColor, opacity: 0.9 }}>
                            אחוז ניצחונות
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Horizontal Offensive Stats */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  סטטיסטיקות התקפה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {offensiveStats.map((stat) => {
                    const val1 = team1Data.stats?.[stat.key];
                    const val2 = team2Data.stats?.[stat.key];
                    
                    if (val1 === undefined || val2 === undefined) return null;
                    
                    const value1 = Number(val1);
                    const value2 = Number(val2);
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

            {/* Horizontal Defensive Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  סטטיסטיקות הגנה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {defensiveStats.map((stat) => {
                    const val1 = team1Data.oppStats?.[stat.key];
                    const val2 = team2Data.oppStats?.[stat.key];
                    
                    if (val1 === undefined || val2 === undefined) return null;
                    
                    const value1 = Number(val1);
                    const value2 = Number(val2);
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
                            <div className={`text-xl font-bold mb-1 ${isBetter1 ? 'text-blue-600' : 'text-gray-700'}`}>
                              {stat.isPercent ? `${value1.toFixed(1)}%` : value1.toFixed(1)}
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${isBetter1 ? 'bg-blue-500' : 'bg-gray-400'} transition-all`}
                                style={{ width: `${(value1 / maxValue) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-left">
                            <div className={`text-xl font-bold mb-1 ${isBetter2 ? 'text-blue-600' : 'text-gray-700'}`}>
                              {stat.isPercent ? `${value2.toFixed(1)}%` : value2.toFixed(1)}
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${isBetter2 ? 'bg-blue-500' : 'bg-gray-400'} transition-all`}
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
