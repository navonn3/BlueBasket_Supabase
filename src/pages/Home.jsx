import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, TrendingUp, Calendar, Users, BarChart3,
  Target, Heart, GitCompare, Shield, ChevronLeft,
  CheckCircle, Circle
} from "lucide-react";
import { format } from "date-fns";

export default function HomePage() {
  const navigate = useNavigate();
  const [selectedLeague, setSelectedLeague] = useState(() => {
    const stored = localStorage.getItem('selectedLeague');
    return stored ? parseInt(stored) : null;
  });

  useEffect(() => {
    const handleLeagueChange = (e) => {
      setSelectedLeague(e.detail);
    };
    window.addEventListener('leagueChanged', handleLeagueChange);
    return () => window.removeEventListener('leagueChanged', handleLeagueChange);
  }, []);

  // Fetch games
  const { data: games } = useQuery({
    queryKey: ['games', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return [];
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('league_id', selectedLeague)
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    initialData: [],
    enabled: !!selectedLeague,
  });

  // Fetch teams
  const { data: teams, isLoading: isLoadingTeams } = useQuery({
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

  // Fetch players
  const { data: players } = useQuery({
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

  // Fetch player averages
  const { data: playerAverages } = useQuery({
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

  // Fetch team averages
  const { data: teamAverages } = useQuery({
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

  // Fetch game player stats
  const { data: gamePlayerStats } = useQuery({
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

  // Fetch leagues
  const { data: leagues } = useQuery({
    queryKey: ['leagues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leagues')
        .select('*');
      
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });

  const currentLeague = leagues.find(l => l.league_id === selectedLeague);

  // Get next game
  const today = new Date();
  const upcomingGames = games.filter(g => 
    (!g.home_score && !g.away_score) &&
    new Date(g.date) >= today
  ).sort((a, b) => new Date(a.date) - new Date(b.date));
  const nextGame = upcomingGames[0];

  // Get last game
  const completedGames = games.filter(g => 
    g.home_score !== null && g.home_score !== undefined
  ).sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastGame = completedGames[0];

  // Get this week's games
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const thisWeekGames = games.filter(g => {
    const gameDate = new Date(g.date);
    return gameDate >= today && gameDate <= weekEnd;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Top 5 standings
  const standings = teamAverages.map(ta => {
    const team = teams.find(t => t.team_id === ta.team_id);
    const teamGames = games.filter(g => 
      (g.home_team_id === ta.team_id || g.away_team_id === ta.team_id) &&
      g.home_score !== null
    );
    
    let wins = 0;
    teamGames.forEach(game => {
      if (game.home_team_id === ta.team_id && game.home_score > game.away_score) wins++;
      if (game.away_team_id === ta.team_id && game.away_score > game.home_score) wins++;
    });
    
    const winPct = teamGames.length > 0 ? (wins / teamGames.length * 100) : 0;
    
    return {
      ...ta,
      team,
      wins,
      losses: teamGames.length - wins,
      winPct
    };
  }).sort((a, b) => b.winPct - a.winPct).slice(0, 5);

  // Top 3 leaders
  const topScorers = playerAverages
    .filter(p => (p.games_played || 0) >= 5)
    .sort((a, b) => (b.pts || 0) - (a.pts || 0))
    .slice(0, 3);

  const topRebounders = playerAverages
    .filter(p => (p.games_played || 0) >= 5)
    .sort((a, b) => (b.reb || 0) - (a.reb || 0))
    .slice(0, 3);

  const topAssisters = playerAverages
    .filter(p => (p.games_played || 0) >= 5)
    .sort((a, b) => (b.ast || 0) - (a.ast || 0))
    .slice(0, 3);

  // Season records
  const ptsRecord = gamePlayerStats.reduce((max, stat) => 
    (stat.pts || 0) > (max.pts || 0) ? stat : max
  , {});

  const rebRecord = gamePlayerStats.reduce((max, stat) => 
    (stat.reb || 0) > (max.reb || 0) ? stat : max
  , {});

  const astRecord = gamePlayerStats.reduce((max, stat) => 
    (stat.ast || 0) > (max.ast || 0) ? stat : max
  , {});

  // General stats
  const totalGames = games.length;
  const completedGamesCount = completedGames.length;
  const totalTeams = teams.length;
  const totalPlayers = players.length;

  const getTeamInfo = (teamId) => {
    // Debug log
    console.log('Looking for team with ID:', teamId);
    console.log('Available teams:', teams.length, teams.map(t => ({ id: t.team_id, name: t.short_name || t.team_name })));
    
    if (!teamId) {
      console.warn('No teamId provided');
      return {
        name: 'לא זמין',
        bgColor: 'var(--primary)',
        textColor: '#FFFFFF'
      };
    }
    
    if (!teams || teams.length === 0) {
      console.warn('Teams not loaded yet');
      return {
        name: 'טוען...',
        bgColor: 'var(--primary)',
        textColor: '#FFFFFF'
      };
    }
    
    const team = teams.find(t => t.team_id === teamId);
    
    if (!team) {
      console.warn('Team not found for ID:', teamId);
      return {
        name: 'קבוצה לא נמצאה',
        bgColor: 'var(--primary)',
        textColor: '#FFFFFF'
      };
    }
    
    const teamName = team.short_name || team.team_name || 'ללא שם';
    console.log('Found team:', teamName, 'for ID:', teamId);
    
    return {
      name: teamName,
      bgColor: team.bg_color || 'var(--primary)',
      textColor: team.text_color || '#FFFFFF'
    };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  const getDayName = (dateStr) => {
    if (!dateStr) return '';
    try {
      const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
      return days[new Date(dateStr).getDay()];
    } catch {
      return '';
    }
  };

  if (!selectedLeague) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-md mx-auto text-center py-12">
          <h2 className="text-xl font-bold mb-4">אנא בחר ליגה מהתפריט</h2>
        </div>
      </div>
    );
  }
  
  // Don't render game sections if teams haven't loaded yet
  const showGames = !isLoadingTeams && teams.length > 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header removed from here. The page will display the content without the sticky header. */}
      <div className="p-4 space-y-6 max-w-md mx-auto">
        {/* Hero Section - Both Next and Last Games */}
        {showGames && (nextGame || lastGame) && (
          <div className="space-y-4">
            {/* Next Game */}
            {nextGame && (
              <Card className="border-none shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Circle className="w-5 h-5 text-blue-500" />
                    <h2 className="text-lg font-bold text-center">המשחק הבא</h2>
                  </div>
                  <div className="text-center text-sm text-gray-600 mb-4">
                    {formatDate(nextGame.date)} | {nextGame.time?.substring(0, 5)}
                  </div>
                  
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-4">
                    {(() => {
                      const homeTeam = getTeamInfo(nextGame.home_team_id);
                      const awayTeam = getTeamInfo(nextGame.away_team_id);
                      const homeAvg = teamAverages.find(t => t.team_id === nextGame.home_team_id);
                      const awayAvg = teamAverages.find(t => t.team_id === nextGame.away_team_id);
                      
                      return (
                        <>
                          <div className="text-center">
                            <div 
                              className="text-sm font-bold p-2 rounded mb-1 text-center"
                              style={{ backgroundColor: homeTeam.bgColor, color: homeTeam.textColor }}
                            >
                              {homeTeam.name}
                            </div>
                            <div className="text-xl font-bold text-gray-700 text-center">
                              {homeAvg?.pts?.toFixed(1) || '-'}
                            </div>
                            <div className="text-xs text-gray-500 text-center">ממוצע</div>
                          </div>
                          
                          <div className="text-center px-2">
                            <div className="text-2xl font-bold text-gray-400 text-center">VS</div>
                          </div>
                          
                          <div className="text-center">
                            <div 
                              className="text-sm font-bold p-2 rounded mb-1 text-center"
                              style={{ backgroundColor: awayTeam.bgColor, color: awayTeam.textColor }}
                            >
                              {awayTeam.name}
                            </div>
                            <div className="text-xl font-bold text-gray-700 text-center">
                              {awayAvg?.pts?.toFixed(1) || '-'}
                            </div>
                            <div className="text-xs text-gray-500 text-center">ממוצע</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => navigate(createPageUrl("GameDetail") + `?id=${nextGame.gameid || nextGame.id}`)}
                  >
                    פרטי המשחק
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Last Game */}
            {lastGame && (
              <Card className="border-none shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h2 className="text-lg font-bold text-center">המשחק האחרון</h2>
                  </div>
                  <div className="text-center text-sm text-gray-600 mb-4">
                    {formatDate(lastGame.date)}
                  </div>
                  
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-4">
                    {(() => {
                      const homeTeam = getTeamInfo(lastGame.home_team_id);
                      const awayTeam = getTeamInfo(lastGame.away_team_id);
                      
                      return (
                        <>
                          <div className="text-center">
                            <div 
                              className="text-sm font-bold p-2 rounded mb-1 text-center"
                              style={{ backgroundColor: homeTeam.bgColor, color: homeTeam.textColor }}
                            >
                              {homeTeam.name}
                            </div>
                            <div className="text-2xl font-bold text-center" style={{ color: 'var(--accent)' }}>
                              {lastGame.home_score}
                            </div>
                          </div>
                          
                          <div className="text-center px-2">
                            <div className="text-xl font-bold text-gray-400 text-center">:</div>
                          </div>
                          
                          <div className="text-center">
                            <div 
                              className="text-sm font-bold p-2 rounded mb-1 text-center"
                              style={{ backgroundColor: awayTeam.bgColor, color: awayTeam.textColor }}
                            >
                              {awayTeam.name}
                            </div>
                            <div className="text-2xl font-bold text-center" style={{ color: 'var(--accent)' }}>
                              {lastGame.away_score}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => navigate(createPageUrl("GameDetail") + `?id=${lastGame.gameid || lastGame.id}`)}
                  >
                    תוצאות מלאות
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Standings Top 5 */}
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              טבלת העמדות
            </h2>
            
            <div className="space-y-2">
              {standings.map((team, index) => (
                <div 
                  key={team.team_id}
                  className="flex items-center gap-3 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => navigate(createPageUrl("TeamDetail") + `?id=${team.team?.id}`)}
                >
                  <div 
                    className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: team.team?.bg_color, color: team.team?.text_color }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{team.team?.short_name || team.team?.team_name}</div>
                    <div className="text-xs text-gray-500">{team.wins}-{team.losses}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">{team.winPct.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              className="w-full mt-3"
              onClick={() => navigate(createPageUrl("Standings"))}
            >
              טבלה מלאה
              <ChevronLeft className="w-4 h-4 mr-2" />
            </Button>
          </CardContent>
        </Card>

        {/* League Leaders */}
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              מובילי הליגה
            </h2>
            
            <div className="space-y-4">
              {/* Points */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-orange-500 text-xl">🟠</span>
                  <span className="font-semibold text-sm">נקודות (ממוצע)</span>
                </div>
                {topScorers.map((player, index) => (
                  <div 
                    key={player.player_id} 
                    className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2"
                    onClick={() => {
                      const p = players.find(pl => pl.player_id === player.player_id);
                      if (p) navigate(createPageUrl("PlayerDetail") + `?id=${p.id}`);
                    }}
                  >
                    <span className="text-gray-500 text-sm w-4">{index + 1}.</span>
                    <span className="flex-1 text-sm">{player.player_name}</span>
                    <Badge variant="outline" className="text-xs">{player.team}</Badge>
                    <span className="font-bold text-sm text-orange-600">{player.pts?.toFixed(1)}</span>
                  </div>
                ))}
              </div>

              {/* Rebounds */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-500 text-xl">🔵</span>
                  <span className="font-semibold text-sm">ריבאונדים (ממוצע)</span>
                </div>
                {topRebounders.map((player, index) => (
                  <div 
                    key={player.player_id} 
                    className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2"
                    onClick={() => {
                      const p = players.find(pl => pl.player_id === player.player_id);
                      if (p) navigate(createPageUrl("PlayerDetail") + `?id=${p.id}`);
                    }}
                  >
                    <span className="text-gray-500 text-sm w-4">{index + 1}.</span>
                    <span className="flex-1 text-sm">{player.player_name}</span>
                    <Badge variant="outline" className="text-xs">{player.team}</Badge>
                    <span className="font-bold text-sm text-blue-600">{player.reb?.toFixed(1)}</span>
                  </div>
                ))}
              </div>

              {/* Assists */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-500 text-xl">🟢</span>
                  <span className="font-semibold text-sm">אסיסטים (ממוצע)</span>
                </div>
                {topAssisters.map((player, index) => (
                  <div 
                    key={player.player_id} 
                    className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2"
                    onClick={() => {
                      const p = players.find(pl => pl.player_id === player.player_id);
                      if (p) navigate(createPageUrl("PlayerDetail") + `?id=${p.id}`);
                    }}
                  >
                    <span className="text-gray-500 text-sm w-4">{index + 1}.</span>
                    <span className="flex-1 text-sm">{player.player_name}</span>
                    <Badge variant="outline" className="text-xs">{player.team}</Badge>
                    <span className="font-bold text-sm text-green-600">{player.ast?.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full mt-3"
              onClick={() => navigate(createPageUrl("LeagueLeaders"))}
            >
              כל המובילים
              <ChevronLeft className="w-4 h-4 mr-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Season Records */}
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span className="text-xl">🔥</span>
              שיאי העונה (מקסימום במשחק)
            </h2>
            
            <div className="space-y-3">
              {ptsRecord.pts && (
                <div className="p-2 bg-orange-50 rounded">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-bold text-orange-600">{ptsRecord.pts}</span>
                    <span className="text-sm font-semibold">נקודות</span>
                    <span className="text-sm">-</span>
                    <span className="text-sm font-medium">{ptsRecord.player_name}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {ptsRecord.team} | {formatDate(ptsRecord.game_date)}
                  </div>
                </div>
              )}

              {rebRecord.reb && (
                <div className="p-2 bg-blue-50 rounded">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-bold text-blue-600">{rebRecord.reb}</span>
                    <span className="text-sm font-semibold">ריבאונדים</span>
                    <span className="text-sm">-</span>
                    <span className="text-sm font-medium">{rebRecord.player_name}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {rebRecord.team} | {formatDate(rebRecord.game_date)}
                  </div>
                </div>
              )}

              {astRecord.ast && (
                <div className="p-2 bg-green-50 rounded">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-bold text-green-600">{astRecord.ast}</span>
                    <span className="text-sm font-semibold">אסיסטים</span>
                    <span className="text-sm">-</span>
                    <span className="text-sm font-medium">{astRecord.player_name}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {astRecord.team} | {formatDate(astRecord.game_date)}
                  </div>
                </div>
              )}
            </div>
            
            <Button 
              variant="outline" 
              className="w-full mt-3"
              onClick={() => navigate(createPageUrl("SeasonHighs"))}
            >
              כל השיאים
              <ChevronLeft className="w-4 h-4 mr-2" />
            </Button>
          </CardContent>
        </Card>

        {/* This Week's Games */}
        {thisWeekGames.length > 0 && (
          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                משחקי השבוע
              </h2>
              
              <div className="space-y-2">
                {thisWeekGames.slice(0, 5).map((game) => {
                  const hasScore = game.home_score !== null && game.home_score !== undefined;
                  const homeTeam = getTeamInfo(game.home_team_id);
                  const awayTeam = getTeamInfo(game.away_team_id);
                  
                  return (
                    <div 
                      key={game.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => navigate(createPageUrl("GameDetail") + `?id=${game.gameid || game.id}`)}
                    >
                      <div className="w-12 text-xs text-gray-600 text-center">
                        {getDayName(game.date)}
                      </div>
                      
                      {hasScore ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0 text-sm">
                            <span className="font-medium">{homeTeam.name}</span>
                            <span className="mx-1 font-bold">{game.home_score}</span>
                            <span className="text-gray-400">-</span>
                            <span className="mx-1 font-bold">{game.away_score}</span>
                            <span className="font-medium">{awayTeam.name}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0 text-sm">
                            <span className="font-medium">{homeTeam.name}</span>
                            <span className="mx-1">vs</span>
                            <span className="font-medium">{awayTeam.name}</span>
                            <span className="text-gray-500 mr-2">{game.time?.substring(0, 5)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <Button 
                variant="outline" 
                className="w-full mt-3"
                onClick={() => navigate(createPageUrl("Games"))}
              >
                לוח משחקים מלא
                <ChevronLeft className="w-4 h-4 mr-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span className="text-xl">🔗</span>
              גישה מהירה
            </h2>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                className="h-16 flex-col"
                onClick={() => navigate(createPageUrl("Players"))}
              >
                <Users className="w-5 h-5 mb-1" />
                <span className="text-xs">כל השחקנים</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex-col"
                onClick={() => navigate(createPageUrl("Teams"))}
              >
                <Shield className="w-5 h-5 mb-1" />
                <span className="text-xs">כל הקבוצות</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex-col"
                onClick={() => navigate(createPageUrl("TeamStats"))}
              >
                <BarChart3 className="w-5 h-5 mb-1" />
                <span className="text-xs">סטטיסטיקה</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex-col"
                onClick={() => navigate(createPageUrl("Games"))}
              >
                <Calendar className="w-5 h-5 mb-1" />
                <span className="text-xs">לוח משחקים</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex-col"
                onClick={() => navigate(createPageUrl("LeagueLeaders"))}
              >
                <Trophy className="w-5 h-5 mb-1" />
                <span className="text-xs">מובילים</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex-col"
                onClick={() => navigate(createPageUrl("SeasonHighs"))}
              >
                <Target className="w-5 h-5 mb-1" />
                <span className="text-xs">שיאים</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex-col"
                onClick={() => navigate(createPageUrl("PlayerComparison"))}
              >
                <GitCompare className="w-5 h-5 mb-1" />
                <span className="text-xs">השוואות</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex-col"
                onClick={() => navigate(createPageUrl("Favorites"))}
              >
                <Heart className="w-5 h-5 mb-1" />
                <span className="text-xs">מועדפים</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer - General Info */}
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span className="text-xl">ℹ️</span>
              מידע כללי
            </h2>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">קבוצות בליגה</span>
                <span className="font-bold">{totalTeams}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">שחקנים רשומים</span>
                <span className="font-bold">{totalPlayers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">משחקים בעונה</span>
                <span className="font-bold">{totalGames}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">משחקים הסתיימו</span>
                <span className="font-bold">{completedGamesCount}</span>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t text-xs text-gray-500 text-center">
              עדכון אחרון: {format(new Date(), 'dd/MM/yyyy HH:mm')}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
