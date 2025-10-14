import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Clock, MapPin, TrendingUp, Trophy, ChevronDown, ChevronUp, FileDown, Shield, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { findTeamByName, getContrastColor } from "../components/shared/teamHelpers";

export default function GameDetailPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('id');

  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [showPDFMenu, setShowPDFMenu] = useState(false);

  // --- GAMES ---
  const { data: games, isLoading: gamesLoading } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    initialData: []
  });

  
  const game = games.find((g) => g.game_id === gameId);
  // --- PLAYERS ---
  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['players', game?.league_id],
    queryFn: async () => {
      if (!game?.league_id) return [];
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('league_id', game.league_id);
      if (error) throw error;
      return data || [];
    },
    initialData: [],
    enabled: !!game?.league_id
  });

  // --- PLAYER AVERAGES ---
  const { data: playerAverages, isLoading: avgLoading } = useQuery({
    queryKey: ['playerAverages', game?.league_id],
    queryFn: async () => {
      if (!game?.league_id) return [];
      const { data, error } = await supabase
        .from('player_averages')
        .select('*')
        .eq('league_id', game.league_id);
      if (error) throw error;
      return data || [];
    },
    initialData: [],
    enabled: !!game?.league_id
  });

  // --- GAME PLAYER STATS ---
  const { data: gamePlayerStats, isLoading: gameStatsLoading } = useQuery({
    queryKey: ['gamePlayerStats', game?.game_id],
    queryFn: async () => {
      if (!game?.game_id) return [];
      const { data, error } = await supabase
        .from('game_player_stats')
        .select('*')
        .eq('game_id', game.game_id);
      if (error) throw error;
      return data || [];
    },
    initialData: [],
    enabled: !!game?.game_id
  });

  // --- GAME TEAM STATS ---
  const { data: gameTeamStats, isLoading: teamStatsLoading } = useQuery({
    queryKey: ['gameTeamStats', game?.game_id],
    queryFn: async () => {
      if (!game?.game_id) return [];
      const { data, error } = await supabase
        .from('game_team_stats')
        .select('*')
        .eq('game_id', game.game_id);
      if (error) throw error;
      return data || [];
    },
    initialData: [],
    enabled: !!game?.game_id
  });

  // --- TEAM AVERAGES ---
  const { data: teamAverages, isLoading: teamAvgLoading } = useQuery({
    queryKey: ['teamAverages', game?.league_id],
    queryFn: async () => {
      if (!game?.league_id) return [];
      const { data, error } = await supabase
        .from('team_averages')
        .select('*')
        .eq('league_id', game.league_id);
      if (error) throw error;
      return data || [];
    },
    initialData: [],
    enabled: !!game?.league_id
  });

  // --- OPPONENT AVERAGES ---
  const { data: opponentAverages, isLoading: oppAvgLoading } = useQuery({
    queryKey: ['opponentAverages', game?.league_id],
    queryFn: async () => {
      if (!game?.league_id) return [];
      const { data, error } = await supabase
        .from('opponent_averages')
        .select('*')
        .eq('league_id', game.league_id);
      if (error) throw error;
      return data || [];
    },
    initialData: [],
    enabled: !!game?.league_id
  });

  // --- GAME QUARTERS ---
  const { data: gameQuarters, isLoading: quartersLoading } = useQuery({
    queryKey: ['gameQuarters', game?.game_id],
    queryFn: async () => {
      if (!game?.game_id) return [];
      const { data, error } = await supabase
        .from('game_quarters')
        .select('*')
        .eq('game_id', game.game_id);
      if (error) throw error;
      return data || [];
    },
    initialData: [],
    enabled: !!game?.game_id
  });

  // --- TEAMS ---
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: []
  });

  const isLoading =
    gamesLoading ||
    playersLoading ||
    avgLoading ||
    gameStatsLoading ||
    teamStatsLoading ||
    teamAvgLoading ||
    oppAvgLoading ||
    quartersLoading;

  const formatGameDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return format(date, 'dd/MM/yyyy');
    } catch (error) {
      console.error('Error formatting date:', dateStr, error);
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-3" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="h-32 bg-white rounded-lg animate-pulse mb-4" />
          <div className="space-y-3">
            <div className="h-48 bg-white rounded-lg animate-pulse" />
            <div className="h-48 bg-white rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen p-3" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-4xl mx-auto text-center py-12">
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--primary)' }}>
            משחק לא נמצא
          </h2>
          <Button onClick={() => navigate(createPageUrl("Games"))} size="sm">
            <ArrowLeft className="w-3 h-3 ml-2" />
            חזרה ללוח משחקים
          </Button>
        </div>
      </div>
    );
  }


  const hasScore = game.home_score !== null && game.home_score !== undefined;

  const homeTeam = game.home_team_id 
    ? teams.find(t => t.team_id === game.home_team_id && t.league_id === game.league_id)
    : findTeamByName(teams, game.home_team, game.league_id);
  
  const awayTeam = game.away_team_id
    ? teams.find(t => t.team_id === game.away_team_id && t.league_id === game.league_id)
    : findTeamByName(teams, game.away_team, game.league_id);

  
  console.log('=== DEBUG GameDetail ===');
  console.log('Game:', {
    game_id: game.game_id,
    home_team: game.home_team,
    home_team_id: game.home_team_id,
    away_team: game.away_team,
    away_team_id: game.away_team_id,
    league_id: game.league_id
  });
  console.log('HomeTeam found:', homeTeam);
  console.log('AwayTeam found:', awayTeam);
  console.log('Total players loaded:', players.length);
  console.log('Players for this league:', players.filter(p => p.league_id === game.league_id).length);
  
  // בדוק את השחקנים לפי homeTeam
  if (homeTeam) {
    const homeTeamPlayersDebug = players.filter(p => 
      p.league_id === game.league_id && p.current_team_id === homeTeam.team_id
    );
    console.log(`Players for homeTeam (${homeTeam.team_name}):`, homeTeamPlayersDebug.length);
    console.log('Sample home player:', homeTeamPlayersDebug[0]);
  }
  
  // בדוק את השחקנים לפי awayTeam
  if (awayTeam) {
    const awayTeamPlayersDebug = players.filter(p => 
      p.league_id === game.league_id && p.current_team_id === awayTeam.team_id
    );
    console.log(`Players for awayTeam (${awayTeam.team_name}):`, awayTeamPlayersDebug.length);
    console.log('Sample away player:', awayTeamPlayersDebug[0]);
  }
  
  console.log('hasScore:', hasScore);
  if (hasScore) {
    console.log('gamePlayerStats count:', gamePlayerStats.length);
    console.log('Sample stat:', gamePlayerStats[0]);
  }
  console.log('=== END DEBUG ===');

  
  const homeColors = {
    bg: homeTeam?.bg_color || 'var(--primary)',
    text: homeTeam?.text_color || getContrastColor(homeTeam?.bg_color || 'var(--primary)')
  };

  const awayColors = {
    bg: awayTeam?.bg_color || 'var(--primary)',
    text: awayTeam?.text_color || getContrastColor(awayTeam?.bg_color || 'var(--primary)')
  };

  const homeTeamPlayers = players.filter((p) => {
    if (!homeTeam || p.league_id !== game.league_id) return false;
    if (p.current_team_id !== homeTeam.team_id) return false;

    if (hasScore) {
      const hasGameStats = gamePlayerStats.some((gs) => {
        if (gs.player_id === p.player_id) return true;
        if (gs.player_name === p.name) return true;
        const normalize = (str) => str?.trim().toLowerCase().replace(/\s+/g, ' ');
        return normalize(gs.player_name) === normalize(p.name);
      });
      return hasGameStats;
    }
    return true;
  }).sort((a, b) => {
    const numA = parseInt(a.jersey_number) || 999;
    const numB = parseInt(b.jersey_number) || 999;
    return numA - numB;
  });

  const awayTeamPlayers = players.filter((p) => {
    if (!awayTeam || p.league_id !== game.league_id) return false;
    if (p.current_team_id !== awayTeam.team_id) return false;

    if (hasScore) {
      const hasGameStats = gamePlayerStats.some((gs) => {
        if (gs.player_id === p.player_id) return true;
        if (gs.player_name === p.name) return true;
        const normalize = (str) => str?.trim().toLowerCase().replace(/\s+/g, ' ');
        return normalize(gs.player_name) === normalize(p.name);
      });
      return hasGameStats;
    }
    return true;
  }).sort((a, b) => {
    const numA = parseInt(a.jersey_number) || 999;
    const numB = parseInt(b.jersey_number) || 999;
    return numA - numB;
  });

  const homePlayersWithStats = homeTeamPlayers.map((player) => {
    const avgStats = playerAverages.find((avg) => {
      if (avg.player_id === player.player_id) return true;
      if (avg.player_name === player.name) return true;
      const normalize = (str) => str?.trim().toLowerCase().replace(/\s+/g, ' ');
      return normalize(avg.player_name) === normalize(player.name);
    });

    const gameStats = hasScore ? gamePlayerStats.find((gs) => {
      if (gs.player_id === player.player_id) return true;
      if (gs.player_name === player.name) return true;
      const normalize = (str) => str?.trim().toLowerCase().replace(/\s+/g, ' ');
      return normalize(gs.player_name) === normalize(player.name);
    }) : null;

    return { ...player, stats: avgStats, gameStats };
  });

  const awayPlayersWithStats = awayTeamPlayers.map((player) => {
    const avgStats = playerAverages.find((avg) => {
      if (avg.player_id === player.player_id) return true;
      if (avg.player_name === player.name) return true;
      const normalize = (str) => str?.trim().toLowerCase().replace(/\s+/g, ' ');
      return normalize(avg.player_name) === normalize(player.name);
    });

    const gameStats = hasScore ? gamePlayerStats.find((gs) => {
      if (gs.player_id === player.player_id) return true;
      if (gs.player_name === player.name) return true;
      const normalize = (str) => str?.trim().toLowerCase().replace(/\s+/g, ' ');
      return normalize(gs.player_name) === normalize(player.name);
    }) : null;

    return { ...player, stats: avgStats, gameStats };
  });

  const homeTeamGameStats = hasScore ? gameTeamStats.find((ts) => ts.team_id === homeTeam?.team_id) : null;
  const awayTeamGameStats = hasScore ? gameTeamStats.find((ts) => ts.team_id === awayTeam?.team_id) : null;

  const homeTeamAvg = teamAverages.find((t) => t.team_id === homeTeam?.team_id);
  const awayTeamAvg = teamAverages.find((t) => t.team_id === awayTeam?.team_id);

  const homeOppAvg = opponentAverages.find((t) => t.team_id === homeTeam?.team_id);
  const awayOppAvg = opponentAverages.find((t) => t.team_id === awayTeam?.team_id);

  const homeQuarters = gameQuarters.filter((q) => q.team_id === homeTeam?.team_id).sort((a, b) => a.quarter - b.quarter);
  const awayQuarters = gameQuarters.filter((q) => q.team_id === awayTeam?.team_id).sort((a, b) => a.quarter - b.quarter);

  const handleDownloadPDF = (e, type) => {
    e.preventDefault();
    window.open(createPageUrl("GameDayPDF") + `?id=${game.game_id}&type=${type}`, '_blank');
    setShowPDFMenu(false);
  };

  const formattedDate = formatGameDate(game.date);

  return (
    <div className="min-h-screen p-3" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Games"))}
            size="sm">

            <ArrowLeft className="w-3 h-3 ml-2" />
            חזרה
          </Button>
          
          {!hasScore &&
          <div className="relative">
              <Button
              onClick={() => setShowPDFMenu(!showPDFMenu)}
              className="text-white"
              style={{ backgroundColor: 'var(--accent)' }}
              size="sm">

                <FileDown className="w-3 h-3 ml-2" />
                הורד PDF
                <ChevronDown className="w-3 h-3 mr-1" />
              </Button>
              
              {showPDFMenu &&
            <div
              className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 whitespace-nowrap"
              style={{ minWidth: '150px' }}>

                  <button
                onClick={(e) => handleDownloadPDF(e, 'basic')}
                className="w-full text-right px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-[11px]">

                    <FileDown className="w-3.5 h-3.5 text-gray-600" />
                    PDF בסיסי
                  </button>
                  <button
                onClick={(e) => handleDownloadPDF(e, 'extended')}
                className="w-full text-right px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-[11px]">

                    <FileDown className="w-3.5 h-3.5 text-blue-600" />
                    PDF מורחב
                  </button>
                </div>
            }
            </div>
          }
        </div>

        <Card className="mb-4 border-none shadow-lg overflow-hidden">
          <div
            className="p-4 relative"
            style={{
              background: `linear-gradient(to left, ${homeColors.bg} 0%, ${homeColors.bg} 25%, ${awayColors.bg} 75%, ${awayColors.bg} 100%)`
            }}>

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {game.round &&
                <Badge className="text-xs bg-white/20 border-white/30 text-white">
                    מחזור {game.round}
                  </Badge>
                }
                {!hasScore &&
                <Badge variant="outline" className="text-xs bg-white/10 border-white/20 text-white">
                    טרם התקיים
                  </Badge>
                }
              </div>
              {hasScore &&
              <Badge className="text-xs bg-green-600">
                  הסתיים
                </Badge>
              }
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <h2
                  className="text-lg font-bold mb-1"
                  style={{ color: homeColors.text }}>

                  {homeTeam?.short_name || game.home_team}
                </h2>
                {hasScore &&
                <div
                  className="text-3xl font-bold"
                  style={{ color: homeColors.text }}>

                    {game.home_score}
                  </div>
                }
              </div>
              
              <div className="px-4 text-center">
                <div className="text-sm text-white font-bold bg-black/20 rounded-full px-3 py-1">
                  VS
                </div>
              </div>

              <div className="flex-1 text-center">
                <h2
                  className="text-lg font-bold mb-1"
                  style={{ color: awayColors.text }}>

                  {awayTeam?.short_name || game.away_team}
                </h2>
                {hasScore &&
                <div
                  className="text-3xl font-bold"
                  style={{ color: awayColors.text }}>

                    {game.away_score}
                  </div>
                }
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs">
              {formattedDate &&
              <div className="flex items-center gap-1 text-white bg-black/20 rounded-full px-2 py-1">
                  <Calendar className="w-3 h-3" />
                  {formattedDate}
                </div>
              }
              {game.time &&
              <div className="flex items-center gap-1 text-white bg-black/20 rounded-full px-2 py-1">
                  <Clock className="w-3 h-3" />
                  {game.time}
                </div>
              }
              {game.venue &&
              <div className="flex items-center gap-1 text-white bg-black/20 rounded-full px-2 py-1">
                  <MapPin className="w-3 h-3" />
                  {game.venue}
                </div>
              }
            </div>
          </div>
        </Card>

        {!hasScore && (homeTeamAvg || awayTeamAvg) &&
        <Card className="mb-4 border-none shadow-md">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                <Target className="w-4 h-4" />
                השוואה סטטיסטית
              </h3>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="border rounded-lg p-3 text-center" style={{ borderColor: homeColors.bg, borderWidth: '2px' }}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="w-3 h-3" style={{ color: homeColors.bg }} />
                    <span className="text-[10px] font-semibold text-gray-600">{homeTeam?.short_name || game.home_team}</span>
                  </div>
                  <div className="text-2xl font-bold mb-1" style={{ color: homeColors.bg }}>
                    {homeTeamAvg?.pts?.toFixed(1) || '-'}
                  </div>
                  <div className="text-[9px] text-gray-600 mb-1">נק׳ (PTS)</div>
                  {homeTeamAvg?.pts_rank &&
                <Badge variant="outline" className="text-[8px]">
                      <Trophy className="w-2 h-2 ml-1" />
                      #{homeTeamAvg.pts_rank}
                    </Badge>
                }
                </div>

                <div className="border rounded-lg p-3 text-center" style={{ borderColor: awayColors.bg, borderWidth: '2px' }}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="w-3 h-3" style={{ color: awayColors.bg }} />
                    <span className="text-[10px] font-semibold text-gray-600">{awayTeam?.short_name || game.away_team}</span>
                  </div>
                  <div className="text-2xl font-bold mb-1" style={{ color: awayColors.bg }}>
                    {awayTeamAvg?.pts?.toFixed(1) || '-'}
                  </div>
                  <div className="text-[9px] text-gray-600 mb-1">נק׳ (PTS)</div>
                  {awayTeamAvg?.pts_rank &&
                <Badge variant="outline" className="text-[8px]">
                      <Trophy className="w-2 h-2 ml-1" />
                      #{awayTeamAvg.pts_rank}
                    </Badge>
                }
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 text-center border border-blue-200">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Shield className="w-3 h-3 text-blue-600" />
                    <span className="text-[10px] font-semibold text-gray-600">הגנה</span>
                  </div>
                  <div className="text-xl font-bold text-blue-700 mb-1">
                    {homeOppAvg?.opp_pts?.toFixed(1) || '-'}
                  </div>
                  <div className="text-[9px] text-gray-600 mb-1">נק׳ יריבים</div>
                  {homeOppAvg?.opp_pts_rank &&
                <div className="text-[8px] text-gray-500">#{homeOppAvg.opp_pts_rank}</div>
                }
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 text-center border border-blue-200">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Shield className="w-3 h-3 text-blue-600" />
                    <span className="text-[10px] font-semibold text-gray-600">הגנה</span>
                  </div>
                  <div className="text-xl font-bold text-blue-700 mb-1">
                    {awayOppAvg?.opp_pts?.toFixed(1) || '-'}
                  </div>
                  <div className="text-[9px] text-gray-600 mb-1">נק׳ יריבים</div>
                  {awayOppAvg?.opp_pts_rank &&
                <div className="text-[8px] text-gray-500">#{awayOppAvg.opp_pts_rank}</div>
                }
                </div>
              </div>
            </CardContent>
          </Card>
        }

        {hasScore && homeQuarters.length > 0 && awayQuarters.length > 0 &&
        <Card className="mb-4 border-none shadow-md">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                <Trophy className="w-4 h-4" />
                ניקוד לפי רבעים
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right p-2">קבוצה</th>
                      <th className="text-center p-2">רבע 1</th>
                      <th className="text-center p-2">רבע 2</th>
                      <th className="text-center p-2">רבע 3</th>
                      <th className="text-center p-2">רבע 4</th>
                      <th className="text-center p-2 font-bold">סופי</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="p-2 font-medium">{homeTeam?.short_name || game.home_team}</td>
                      {[1, 2, 3, 4].map((q) => {
                      const quarter = homeQuarters.find((hq) => hq.quarter === q);
                      return <td key={q} className="text-center p-2">{quarter?.team_score || '-'}</td>;
                    })}
                      <td className="text-center p-2 font-bold" style={{ color: 'var(--accent)' }}>{game.home_score}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">{awayTeam?.short_name || game.away_team}</td>
                      {[1, 2, 3, 4].map((q) => {
                      const quarter = awayQuarters.find((aq) => aq.quarter === q);
                      return <td key={q} className="text-center p-2">{quarter?.team_score || '-'}</td>;
                    })}
                      <td className="text-center p-2 font-bold" style={{ color: 'var(--accent)' }}>{game.away_score}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        }

        {hasScore && (homeTeamGameStats || awayTeamGameStats) &&
        <Card className="mb-4 border-none shadow-md">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                <TrendingUp className="w-4 h-4" />
                סטטיסטיקות המשחק
              </h3>
              <div className="space-y-3">
                {homeTeamGameStats &&
              <TeamGameStatsCard team={homeTeam?.short_name || game.home_team} stats={homeTeamGameStats} />
              }
                {awayTeamGameStats &&
              <TeamGameStatsCard team={awayTeam?.short_name || game.away_team} stats={awayTeamGameStats} />
              }
              </div>
            </CardContent>
          </Card>
        }

        <div className="mb-4">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
            {homeTeam?.short_name || game.home_team}
          </h3>
          {homeTeamPlayers.length === 0 ?
          <Alert className="mb-4">
              <AlertDescription>
                לא נמצאו שחקנים עבור {homeTeam?.short_name || game.home_team}
              </AlertDescription>
            </Alert> :

          <div className="space-y-2">
              {homePlayersWithStats.map((player) =>
            <PlayerGameCard
              key={player.id}
              player={player}
              isExpanded={expandedPlayer === player.id}
              onToggle={() => setExpandedPlayer(expandedPlayer === player.id ? null : player.id)}
              hasGameEnded={hasScore}
              teamColors={homeColors}
              leagueId={game.league_id} />

            )}
            </div>
          }
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
            {awayTeam?.short_name || game.away_team}
          </h3>
          {awayTeamPlayers.length === 0 ?
          <Alert className="mb-4">
              <AlertDescription>
                לא נמצאו שחקנים עבור {awayTeam?.short_name || game.away_team}
              </AlertDescription>
            </Alert> :

          <div className="space-y-2">
              {awayPlayersWithStats.map((player) =>
            <PlayerGameCard
              key={player.id}
              player={player}
              isExpanded={expandedPlayer === player.id}
              onToggle={() => setExpandedPlayer(expandedPlayer === player.id ? null : player.id)}
              hasGameEnded={hasScore}
              teamColors={awayColors}
              leagueId={game.league_id} />

            )}
            </div>
          }
        </div>
      </div>
    </div>);

}

function TeamGameStatsCard({ team, stats }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      <h4 className="text-xs font-bold mb-2">{team}</h4>
      <div className="grid grid-cols-4 gap-2 mb-2">
        <StatItem label="נק׳ (PTS)" value={stats.pts} />
        <StatItem label="ריב׳ (REB)" value={stats.reb} />
        <StatItem label="אס׳ (AST)" value={stats.ast} />
        <StatItem label="חט׳ (STL)" value={stats.stl} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <PercentItem label="% מהשדה" value={`${Number(stats.fgm || 0)}-${Number(stats.fga || 0)}`} pct={stats.fg_pct} />
        <PercentItem label="% ל-3" value={`${Number(stats['3ptm'] || 0)}-${Number(stats['3pta'] || 0)}`} pct={stats['3pt_pct']} />
        <PercentItem label="% עונ׳" value={`${Number(stats.ftm || 0)}-${Number(stats.fta || 0)}`} pct={stats.ft_pct} />
      </div>
    </div>);

}

function StatItem({ label, value }) {
  return (
    <div className="bg-white rounded p-1.5 text-center">
      <div className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{value || 0}</div>
      <div className="text-[9px] text-gray-600">{label}</div>
    </div>);

}

function PercentItem({ label, value, pct }) {
  return (
    <div className="bg-white rounded p-1.5 text-center">
      <div className="text-xs font-bold text-gray-700">{pct ? `${Number(pct).toFixed(1)}%` : '-'}</div>
      <div className="text-[9px] text-gray-600 mb-0.5">{label}</div>
      <div className="text-[8px] text-gray-500">{value}</div>
    </div>);

}

function PlayerGameCard({ player, isExpanded, onToggle, hasGameEnded, teamColors, leagueId }) {
  const { data: seasonHistory } = useQuery({
    queryKey: ['seasonHistory', player.player_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_season_history')
        .select('*')
        .eq('player_id', player.player_id);
      if (error) throw error;
      return data || [];
    },
    initialData: [],
    enabled: isExpanded && !!player.player_id
  });

  // Group teams by season and sort
  const groupedHistory = seasonHistory.reduce((acc, history) => {
    if (!acc[history.season]) {
      acc[history.season] = [];
    }
    // Only add if team_name exists and is not already in the list for that season
    if (history.team_name && !acc[history.season].includes(history.team_name)) {
      acc[history.season].push(history.team_name);
    }
    return acc;
  }, {});

  const sortedHistory = Object.entries(groupedHistory)
    .sort((a, b) => {
      const parseYear = (season) => parseInt(season.split('-')[0]);
      return parseYear(b[0]) - parseYear(a[0]);
    })
    .map(([season, teams]) => ({
      season,
      teams: teams.join(', ')
    }));

  const playerNumber = player.jersey_number ? parseInt(player.jersey_number) : null;
  const gameStats = player.gameStats;
  const seasonStats = player.stats;

  const showGameStats = hasGameEnded && gameStats;

  const topGameStats = showGameStats ? [
  { label: 'נק׳', value: gameStats.pts },
  { label: 'ריב׳', value: gameStats.reb },
  { label: 'אס׳', value: gameStats.ast }] :
  null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return format(date, 'dd/MM/yyyy');
        }
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    try {
      // Assuming birthDate is in "dd/MM/yyyy" format
      const parts = birthDate.split('/');
      if (parts.length !== 3) return null;
      const birth = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // Convert to YYYY-MM-DD for Date object
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  };

  const age = calculateAge(player.date_of_birth);

  return (
    <Card
      className="border border-gray-200 hover:border-orange-300 transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={onToggle}>

      <CardContent className="p-0">
        <div className="p-2.5 hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-xs"
                style={{ backgroundColor: teamColors.bg }}>

                {playerNumber || '#'}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs truncate" style={{ color: 'var(--primary)' }}>
                  {player.name}
                </h4>
                <div className="flex gap-1.5 mt-0.5 flex-wrap">
                  {age && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-gray-300">
                      גיל {age}
                    </Badge>
                  )}
                  {player.date_of_birth && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-gray-300">
                      {player.date_of_birth}
                    </Badge>
                  )}
                  {player.height && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-gray-300">
                      {typeof player.height === 'number' ? player.height.toFixed(2) : parseFloat(player.height).toFixed(2)}m
                    </Badge>
                  )}
                  {seasonStats?.games_played && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-gray-300">
                      {seasonStats.games_played} משחקים
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {showGameStats &&
              <div className="flex gap-1">
                  {topGameStats.map((stat, idx) =>
                <div key={idx} className="text-center px-1.5 py-0.5 rounded bg-gray-100">
                      <div className="text-xs font-bold">{stat.value || 0}</div>
                      <div className="text-[9px] text-gray-600">{stat.label}</div>
                    </div>
                )}
                </div>
              }
              {isExpanded ?
              <ChevronUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> :

              <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              }
            </div>
          </div>
        </div>

        {isExpanded &&
        <div className="border-t border-gray-200 p-2.5 bg-gradient-to-b from-gray-50 to-white">
            {showGameStats &&
          <div className="mb-3">
                <h5 className="text-[10px] font-semibold text-gray-600 mb-1.5">סטטיסטיקות המשחק</h5>
                <div className="grid grid-cols-4 gap-1">
                  <SmallStat label="נק׳ (PTS)" value={gameStats.pts} />
                  <SmallStat label="ריב׳ (REB)" value={gameStats.reb} />
                  <SmallStat label="אס׳ (AST)" value={gameStats.ast} />
                  <SmallStat label="דק׳ (MIN)" value={gameStats.min} />
                  <SmallStat label="חט׳ (STL)" value={gameStats.stl} />
                  <SmallStat label="חס׳ (BLK)" value={gameStats.blk} />
                  <SmallStat label="FG" value={`${gameStats.fgm || 0}-${gameStats.fga || 0}`} />
                  <SmallStat label="3P" value={`${gameStats['3ptm'] || 0}-${gameStats['3pta'] || 0}`} />
                </div>
              </div>
          }

            {seasonStats &&
          <div className="mb-3">
                <h5 className="text-[10px] font-semibold text-gray-600 mb-1.5">ממוצעי העונה</h5>
                <div className="grid grid-cols-4 gap-1.5">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-1.5 text-center">
                    <div className="text-base font-bold text-purple-700">
                      {seasonStats.min ? Number(seasonStats.min).toFixed(1) : '0.0'}
                    </div>
                    <div className="text-[9px] text-gray-600">דק' (MIN)</div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-1.5 text-center">
                    <div className="text-base font-bold" style={{ color: 'var(--accent)' }}>
                      {seasonStats.pts ? Number(seasonStats.pts).toFixed(1) : '0.0'}
                    </div>
                    <div className="text-[9px] text-gray-600">נק' (PTS)</div>
                    {seasonStats.pts_rank &&
                <div className="text-[9px] text-orange-600 font-semibold flex items-center justify-center gap-0.5 mt-0.5">
                        <Trophy className="w-2.5 h-2.5" />
                        #{seasonStats.pts_rank}
                      </div>
                }
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-1.5 text-center">
                    <div className="text-base font-bold text-blue-700">
                      {seasonStats.reb ? Number(seasonStats.reb).toFixed(1) : '0.0'}
                    </div>
                    <div className="text-[9px] text-gray-600">ריב' (REB)</div>
                    {seasonStats.reb_rank &&
                <div className="text-[9px] text-blue-600 font-semibold flex items-center justify-center gap-0.5 mt-0.5">
                        <Trophy className="w-2.5 h-2.5" />
                        #{seasonStats.reb_rank}
                      </div>
                }
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-1.5 text-center">
                    <div className="text-base font-bold text-green-700">
                      {seasonStats.ast ? Number(seasonStats.ast).toFixed(1) : '0.0'}
                    </div>
                    <div className="text-[9px] text-gray-600">אס' (AST)</div>
                    {seasonStats.ast_rank &&
                <div className="text-[9px] text-green-600 font-semibold flex items-center justify-center gap-0.5 mt-0.5">
                        <Trophy className="w-2.5 h-2.5" />
                        #{seasonStats.ast_rank}
                      </div>
                }
                  </div>
                </div>
              </div>
          }

            {sortedHistory.length > 0 &&
          <div>
                <h5 className="text-[10px] font-semibold text-gray-600 mb-1.5">היסטוריית קבוצות</h5>
                <div className="space-y-1">
                  {sortedHistory.map((history, index) =>
              <div key={index} className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
                      <span className="text-[10px] font-semibold flex-1 text-right" style={{ color: 'var(--primary)' }}>
                        {history.teams}
                      </span>
                      <span className="text-[9px] text-gray-500 font-medium flex-shrink-0">{history.season}</span>
                    </div>
              )}
                </div>
              </div>
          }
          </div>
        }
      </CardContent>
    </Card>);

}

function SmallStat({ label, value, rank }) {
  return (
    <div className="bg-white rounded border border-gray-200 p-1 text-center">
      <div className="text-xs font-bold text-gray-700">{value || '-'}</div>
      <div className="text-[9px] text-gray-500">{label}</div>
      {rank && <div className="text-[9px] text-orange-600">#{rank}</div>}
    </div>);

}
