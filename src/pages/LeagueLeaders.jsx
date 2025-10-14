
import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingUp, Target, Award, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const LEADER_CATEGORIES = [
  { 
    key: 'pts', 
    label: 'נקודות למשחק', 
    icon: Trophy, 
    color: 'from-orange-500 to-red-500',
    suffix: ''
  },
  { 
    key: 'reb', 
    label: 'ריבאונדים למשחק', 
    icon: TrendingUp, 
    color: 'from-blue-500 to-indigo-500',
    suffix: ''
  },
  { 
    key: 'ast', 
    label: 'אסיסטים למשחק', 
    icon: Target, 
    color: 'from-green-500 to-emerald-500',
    suffix: ''
  },
  { 
    key: 'stl', 
    label: 'חטיפות למשחק', 
    icon: Award, 
    color: 'from-purple-500 to-pink-500',
    suffix: ''
  },
  { 
    key: 'blk', 
    label: 'חסימות למשחק', 
    icon: Award, 
    color: 'from-red-500 to-orange-500',
    suffix: ''
  },
  { 
    key: 'fg_pct', 
    label: 'אחוז קליעה מהשדה', 
    icon: Target, 
    color: 'from-yellow-500 to-amber-500',
    suffix: '%',
    isPercentage: true, // New property to identify percentages
    minAttempts: 8,
    attemptsKey: 'fga'
  },
  { 
    key: '3pt_pct', 
    label: 'אחוז קליעה לשלוש', 
    icon: Target, 
    color: 'from-indigo-500 to-purple-500',
    suffix: '%',
    isPercentage: true, // New property
    minAttempts: 5,
    attemptsKey: '3pta'
  },
  { 
    key: 'ft_pct', 
    label: 'אחוז עונשין', 
    icon: Target, 
    color: 'from-cyan-500 to-blue-500',
    suffix: '%',
    isPercentage: true, // New property
    minAttempts: 4,
    attemptsKey: 'fta'
  },
  { 
    key: 'rate', 
    label: 'מדד יעילות (EFF)', 
    icon: Trophy, 
    color: 'from-pink-500 to-rose-500',
    suffix: ''
  },
  { 
    key: 'min', 
    label: 'דקות למשחק', 
    icon: TrendingUp, 
    color: 'from-teal-500 to-cyan-500',
    suffix: ''
  },
];

export default function LeagueLeadersPage() {
  const navigate = useNavigate();
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedLeague, setSelectedLeague] = useState(() => {
    const stored = localStorage.getItem('selectedLeague');
    return stored ? parseInt(stored) : null;
  });

  useEffect(() => {
    const handleLeagueChange = (e) => {
      setSelectedLeague(e.detail);
      setExpandedCategories({});
    };
    window.addEventListener('leagueChanged', handleLeagueChange);
    return () => window.removeEventListener('leagueChanged', handleLeagueChange);
  }, []);

  const { data: playerAverages, isLoading: avgLoading } = useQuery({
    queryKey: ['playerAverages', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return [];
      const { data, error } = await supabase
        .from('player_averages')
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


  const isLoading = avgLoading || playersLoading;

  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  const getTopPlayersForCategory = (category) => {
    const validAverages = playerAverages
      .filter(avg => {
        const value = avg[category.key];
        // Ensure value is not null, undefined, or exactly 0 (unless it's a valid 0 average like 0.0 assists)
        // For percentages, a 0 value can be valid. For other stats, usually we expect > 0 for a leader.
        const hasValue = value !== null && value !== undefined && (value !== 0 || category.isPercentage);
        const hasMinGames = (avg.games_played || 0) >= 1;
        
        // Check minimum attempts for percentage stats
        if (category.minAttempts && category.attemptsKey) {
          const attempts = avg[category.attemptsKey] || 0;
          if (attempts < category.minAttempts) {
            return false;
          }
        }
        
        return hasValue && hasMinGames;
      })
      .map(avg => {
        const player = players.find(p => 
          p.player_id === avg.player_id || 
          p.name === avg.player_name
        );
        
        const team = teams.find(t => t.team_id === avg.team_id);
        
        return {
          ...avg,
          player,
          teamName: team?.short_name || team?.team_name || avg.team || 'לא ידוע',
          bgColor: team?.bg_color || 'var(--primary)',
          textColor: team?.text_color || '#FFFFFF'
        };
      })
      .sort((a, b) => Number(b[category.key]) - Number(a[category.key]))
      .slice(0, 10);

    return validAverages;
  };

  // Helper function for consistent number formatting
  const formatStatValue = (value, category) => {
    let numValue = Number(value);
    if (isNaN(numValue)) return ''; // Handle non-numeric values gracefully

    if (category.isPercentage) {
      // For percentages, the values are already in percentage format (e.g., 45.5 means 45.5%)
      // So we just format to 1 decimal place and add the % suffix
      return numValue.toFixed(1) + category.suffix;
    } else {
      // For other stats, format to 1 decimal place
      return numValue.toFixed(1) + category.suffix;
    }
  };


  if (!selectedLeague) {
    return (
      <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-7xl mx-auto text-center py-12">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--primary)' }}>
            אנא בחר ליגה מהתפריט
          </h2>
          <p className="text-sm text-gray-600">כדי לצפות במובילי הליגה, עליך לבחור ליגה תחילה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
            <Trophy className="w-6 h-6" />
            מובילי הליגה
          </h1>
          <p className="text-sm text-gray-600">10 השחקנים המובילים בכל קטגוריה סטטיסטית (ממוצעים)</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LEADER_CATEGORIES.map(category => {
              const leaders = getTopPlayersForCategory(category);
              const IconComponent = category.icon;
              const isExpanded = expandedCategories[category.key];
              const displayedLeaders = isExpanded ? leaders : leaders.slice(0, 1);

              return (
                <Card key={category.key} className="border-none shadow-md hover:shadow-lg transition-all duration-200 rounded-xl overflow-hidden">
                  <CardHeader 
                    className={`bg-gradient-to-br ${category.color} text-white p-4 cursor-pointer`}
                    onClick={() => toggleCategory(category.key)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <IconComponent className="w-5 h-5" />
                        {category.label}
                      </CardTitle>
                      {leaders.length > 1 && (
                        isExpanded ? 
                          <ChevronUp className="w-5 h-5" /> : 
                          <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {leaders.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        אין נתונים זמינים
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {displayedLeaders.map((leader, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (leader.player) navigate(createPageUrl("PlayerDetail") + `?id=${leader.player.id}`);
                            }}
                          >
                            {/* Rank */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                              index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                              index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              <span className="font-bold text-sm">{index + 1}</span>
                            </div>

                            {/* Player Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate" style={{ color: 'var(--primary)' }}>
                                {leader.player_name}
                              </h4>
                              <div className="flex gap-1.5 mt-0.5">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {leader.teamName}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {leader.games_played} משחקים
                                </Badge>
                              </div>
                            </div>

                            {/* Stat Value */}
                            <div className={`text-right flex-shrink-0 px-3 py-1 rounded-lg bg-gradient-to-br ${category.color} bg-opacity-10`}>
                              <div className="text-lg font-bold" style={{ color: 'var(--primary)' }}>
                                {formatStatValue(leader[category.key], category)}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {!isExpanded && leaders.length > 1}
                      </div>
                    )}
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
