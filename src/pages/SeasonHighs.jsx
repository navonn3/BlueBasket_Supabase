import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingUp, Users, Ruler, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// --- CONSTANTS ---
const STAT_CATEGORIES = [
  { key: 'pts', label: 'נקודות במשחק', icon: Trophy, color: 'from-orange-500 to-red-500' },
  { key: 'reb', label: 'ריבאונדים במשחק', icon: TrendingUp, color: 'from-blue-500 to-indigo-500' },
  { key: 'ast', label: 'אסיסטים במשחק', icon: Users, color: 'from-green-500 to-emerald-500' },
  { key: 'stl', label: 'חטיפות במשחק', icon: TrendingUp, color: 'from-purple-500 to-pink-500' },
  { key: 'blk', label: 'חסימות במשחק', icon: TrendingUp, color: 'from-red-500 to-orange-500' },
  { key: 'rate', label: 'מדד (EFF) במשחק', icon: Trophy, color: 'from-yellow-500 to-amber-500' },
  { key: 'min', label: 'דקות במשחק', icon: TrendingUp, color: 'from-cyan-500 to-blue-500' },
  { key: '3ptm', label: 'שלשות במשחק', icon: Trophy, color: 'from-indigo-500 to-purple-500' },
];

const PLAYER_CATEGORIES = [
  { key: 'oldest', label: 'השחקן המבוגר בליגה', icon: Calendar, color: 'from-gray-500 to-slate-500' },
  { key: 'youngest', label: 'השחקן הצעיר בליגה', icon: Calendar, color: 'from-teal-500 to-cyan-500' },
  { key: 'tallest', label: 'השחקן הגבוה בליגה', icon: Ruler, color: 'from-green-600 to-emerald-600' },
  { key: 'shortest', label: 'השחקן הנמוך בליגה', icon: Ruler, color: 'from-pink-600 to-rose-600' },
];

export default function SeasonHighsPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('pts');
  const [selectedLeague, setSelectedLeague] = useState(() => {
    const stored = localStorage.getItem('selectedLeague');
    return stored ? parseInt(stored) : null;
  });

  useEffect(() => {
    const handleLeagueChange = (e) => setSelectedLeague(e.detail);
    window.addEventListener('leagueChanged', handleLeagueChange);
    return () => window.removeEventListener('leagueChanged', handleLeagueChange);
  }, []);

  // --- SUPABASE QUERIES ---
  const { data: gamePlayerStats, isLoading: statsLoading } = useQuery({
    queryKey: ['gamePlayerStats', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return [];
      const { data, error } = await supabase
        .from('game_player_stats')
        .select('*')
        .eq('league_id', selectedLeague);
      if (error) throw error;
      return data || [];
    },
    initialData: [],
    enabled: !!selectedLeague,
  });

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['players', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return [];
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('league_id', selectedLeague);
      if (error) throw error;
      return data || [];
    },
    initialData: [],
    enabled: !!selectedLeague,
  });

  const { data: teams } = useQuery({
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

  const { data: games } = useQuery({
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

  // --- LOADING STATE ---
  const isLoading = statsLoading || playersLoading;

  // --- HELPERS ---
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    try {
      const parts = birthDate.split('/');
      if (parts.length !== 3) return null;
      const birth = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
      return age;
    } catch {
      return null;
    }
  };

  const parseHeight = (heightValue) => {
    if (!heightValue) return null;
    if (typeof heightValue === 'number') return heightValue < 10 ? heightValue * 100 : heightValue;
    const match = heightValue.match(/(\d+\.?\d*)/);
    if (match) {
      const value = parseFloat(match[0]);
      return value < 10 ? value * 100 : value;
    }
    return null;
  };

  // --- CORE LOGIC (unchanged) ---
  const getTopPerformances = () => {
    const isPlayerCategory = PLAYER_CATEGORIES.some(c => c.key === selectedCategory);

    if (isPlayerCategory) {
      const playersWithData = players.map(p => {
        const team = teams.find(t => t.team_id === p.current_team_id);
        return {
          ...p,
          age: calculateAge(p.date_of_birth),
          heightCm: parseHeight(p.height),
          teamName: team?.short_name || team?.team_name || 'ללא קבוצה',
          bgColor: team?.bg_color || 'var(--primary)',
          textColor: team?.text_color || '#FFFFFF'
        };
      }).filter(p => {
        if (['oldest', 'youngest'].includes(selectedCategory)) return p.age !== null;
        if (['tallest', 'shortest'].includes(selectedCategory)) return p.heightCm !== null;
        return true;
      });

      if (selectedCategory === 'oldest') return playersWithData.sort((a, b) => b.age - a.age).slice(0, 10);
      if (selectedCategory === 'youngest') return playersWithData.sort((a, b) => a.age - b.age).slice(0, 10);
      if (selectedCategory === 'tallest') return playersWithData.sort((a, b) => b.heightCm - a.heightCm).slice(0, 10);
      if (selectedCategory === 'shortest') return playersWithData.sort((a, b) => a.heightCm - b.heightCm).slice(0, 10);
    } else {
      const validStats = gamePlayerStats
        .filter(stat => stat[selectedCategory] !== null && stat[selectedCategory] !== undefined)
        .map(stat => {
          const player = players.find(p => p.player_id === stat.player_id || p.name === stat.player_name);
          const team = teams.find(t => t.team_id === stat.team_id);
          const game = games.find(g => g.gameid === stat.game_id || g.id === stat.game_id);

          const homeTeam = teams.find(t => t.team_id === game?.home_team_id);
          const awayTeam = teams.find(t => t.team_id === game?.away_team_id);

          return {
            ...stat,
            player,
            teamName: team?.short_name || team?.team_name || stat.team,
            homeTeamName: homeTeam?.short_name || homeTeam?.team_name || game?.home_team,
            awayTeamName: awayTeam?.short_name || awayTeam?.team_name || game?.away_team,
            round: stat.round || game?.round,
            bgColor: team?.bg_color || 'var(--primary)',
            textColor: team?.text_color || '#FFFFFF'
          };
        })
        .sort((a, b) => Number(b[selectedCategory]) - Number(a[selectedCategory]))
        .slice(0, 10);

      return validStats;
    }
    return [];
  };

  const topPerformances = getTopPerformances();
  const currentCategory = [...STAT_CATEGORIES, ...PLAYER_CATEGORIES].find(c => c.key === selectedCategory);

  if (!selectedLeague) {
    return (
      <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-5xl mx-auto text-center py-12">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--primary)' }}>
            אנא בחר ליגה מהתפריט
          </h2>
          <p className="text-sm text-gray-600">כדי לצפות בשיאי העונה, עליך לבחור ליגה תחילה</p>
        </div>
      </div>
    );
  }

  const isPlayerCategory = PLAYER_CATEGORIES.some(c => c.key === selectedCategory);

  return (
    <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
            <Trophy className="w-6 h-6" />
            שיאי העונה
          </h1>
          <p className="text-sm text-gray-600">הביצועים הגבוהים ביותר והשיאים של העונה</p>
        </div>

        {/* Category Selector */}
        <Card className="mb-6 border-none shadow-md">
          <CardContent className="p-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="בחר קטגוריה" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">סטטיסטיקות משחק</div>
                {STAT_CATEGORIES.map(cat => (
                  <SelectItem key={cat.key} value={cat.key}>
                    {cat.label}
                  </SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 mt-2">תכונות שחקנים</div>
                {PLAYER_CATEGORIES.map(cat => (
                  <SelectItem key={cat.key} value={cat.key}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-20 bg-white rounded-lg animate-pulse" />
            ))}
          </div>
        ) : topPerformances.length === 0 ? (
          <Card className="border-none shadow-md">
            <CardContent className="p-12 text-center">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-bold text-gray-600 mb-2">אין נתונים זמינים</h3>
              <p className="text-gray-500">לא נמצאו ביצועים עבור קטגוריה זו</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {topPerformances.map((item, index) => {
              const IconComponent = currentCategory.icon;
              
              return (
                <Card 
                  key={index}
                  className="border-none shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
                  onClick={() => {
                    if (isPlayerCategory) {
                      navigate(createPageUrl("PlayerDetail") + `?id=${item.id}`);
                    } else if (item.player) {
                      navigate(createPageUrl("PlayerDetail") + `?id=${item.player.id}`);
                    }
                  }}
                >
                  <CardContent 
                    className="p-0"
                    style={{ backgroundColor: item.bgColor }}
                  >
                    <div className="flex items-center gap-3 p-3">
                      {/* Rank Badge */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${currentCategory.color}`}>
                        <span className="text-white font-bold text-base">#{index + 1}</span>
                      </div>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <h3 
                          className="font-bold text-sm truncate" 
                          style={{ color: item.textColor }}
                        >
                          {isPlayerCategory ? item.name : item.player_name}
                        </h3>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {!isPlayerCategory ? (
                            <Badge 
                              variant="outline" 
                              className="text-xs border-white/30"
                              style={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                                color: item.textColor,
                                borderColor: 'rgba(255, 255, 255, 0.5)'
                              }}
                            >
                              {item.homeTeamName && item.awayTeamName 
                                ? `${item.homeTeamName} מול ${item.awayTeamName}${item.round ? ` - מחזור ${item.round}` : ''}`
                                : 'לא ידוע'
                              }
                            </Badge>
                          ) : (
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                              style={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                                color: item.textColor,
                                borderColor: 'rgba(255, 255, 255, 0.5)'
                              }}
                            >
                              {item.teamName}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Stat Value */}
                      <div className="text-left flex-shrink-0">
                        <div 
                          className="text-2xl font-bold"
                          style={{ color: item.textColor }}
                        >
                          {isPlayerCategory ? (
                            selectedCategory === 'oldest' || selectedCategory === 'youngest' ? (
                              `${item.age}`
                            ) : selectedCategory === 'tallest' || selectedCategory === 'shortest' ? (
                              `${(item.heightCm / 100).toFixed(2)}m`
                            ) : '-'
                          ) : (
                            Number(item[selectedCategory]).toFixed(0)
                          )}
                        </div>
                        <div 
                          className="text-[10px] mt-0.5"
                          style={{ color: item.textColor, opacity: 0.8 }}
                        >
                          {isPlayerCategory ? (
                            selectedCategory === 'oldest' || selectedCategory === 'youngest' ? 'שנים' :
                            selectedCategory === 'tallest' || selectedCategory === 'shortest' ? 'גובה' : ''
                          ) : currentCategory.label.split(' ')[0]}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
