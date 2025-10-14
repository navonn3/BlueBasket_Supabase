
import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, Trophy, TrendingUp, Calendar, Target, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert"; // Import Alert components

import GameCard from "../components/games/GameCard";
import ExpandablePlayerCard from "../components/game-detail/ExpandablePlayerCard";

export default function TeamDetailPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const teamName = urlParams.get('name');

  const [expandedPlayer, setExpandedPlayer] = useState(null);

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const { data, error } = await supabase.from('players').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });
  
  const { data: games, isLoading: gamesLoading } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const { data, error } = await supabase.from('games').select('*').order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });
  
  const { data: teamAverages, isLoading: averagesLoading } = useQuery({
    queryKey: ['teamAverages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('team_averages').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });
  
  const { data: opponentAverages, isLoading: oppAvgLoading } = useQuery({
    queryKey: ['opponentAverages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('opponent_averages').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });
  
  const { data: playerAverages, isLoading: playerAvgLoading } = useQuery({
    queryKey: ['playerAverages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('player_averages').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });
  
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });


  const isLoading = playersLoading || gamesLoading || averagesLoading || oppAvgLoading || playerAvgLoading;

  // Find team by name (including variations)
  const findTeamByName = (name) => {
    return teams.find(t => {
      if (t.team_name === name || t.short_name === name) return true;
      
      if (t.name_variations) {
        const variations = t.name_variations.split('|').map(v => v.trim());
        return variations.some(v => v === name);
      }
      
      return false;
    });
  };

  const teamData = findTeamByName(teamName);

  if (isLoading) {
    return (
      <div className="min-h-screen p-3" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="h-32 bg-white rounded-lg animate-pulse mb-4" />
          <div className="space-y-3">
            <div className="h-48 bg-white rounded-lg animate-pulse" />
            <div className="h-48 bg-white rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Filter players and games for this team
  const teamPlayers = players.filter(p => {
    if (!teamData || p.league_id !== teamData.league_id) return false;
    return p.current_team_id === teamData.team_id;
  }).sort((a, b) => {
    const numA = parseInt(a.jersey_number) || 999;
    const numB = parseInt(b.jersey_number) || 999;
    return numA - numB;
  });

  const teamGames = games.filter(g => {
    // If the game's home or away team directly matches the teamName from URL
    if (g.home_team === teamName || g.away_team === teamName) return true;
    
    // If we have teamData, check if game team names match any of its variations
    if (teamData && teamData.name_variations) {
      const variations = teamData.name_variations.split('|').map(v => v.trim());
      return variations.some(v => g.home_team === v || g.away_team === v);
    }
    
    return false;
  });
  
  const completedGames = teamGames.filter(g => g.home_score !== null && g.home_score !== undefined);
  const upcomingGames = teamGames.filter(g => g.home_score === null || g.home_score === undefined);

  const teamStats = teamAverages.find(t => {
    if (!teamData) return false;
    return t.league_id === teamData.league_id && t.team_id === teamData.team_id;
  });
  
  const oppStats = opponentAverages.find(t => {
    if (!teamData) return false;
    return t.league_id === teamData.league_id && t.team_id === teamData.team_id;
  });

  // Merge players with their averages
  const playersWithStats = teamPlayers.map(player => {
    const stats = playerAverages.find(avg => {
      if (avg.player_name === player.name) return true;
      const normalize = (str) => str?.trim().toLowerCase().replace(/\s+/g, ' ');
      return normalize(avg.player_name) === normalize(player.name);
    });
    return { ...player, stats };
  });

  // Helper to check if a game team name corresponds to the current team being viewed
  const isCurrentTeamInGame = (gameTeamName, currentTeamData, initialTeamName) => {
    if (!currentTeamData) return gameTeamName === initialTeamName;
    if (gameTeamName === currentTeamData.team_name || gameTeamName === currentTeamData.short_name) return true;
    if (currentTeamData.name_variations) {
      const variations = currentTeamData.name_variations.split('|').map(v => v.trim());
      return variations.some(v => v === gameTeamName);
    }
    return false;
  };

  // Calculate team record
  let wins = 0;
  let losses = 0;
  completedGames.forEach(game => {
    const isHome = isCurrentTeamInGame(game.home_team, teamData, teamName);
    
    if (isHome) {
      if (game.home_score > game.away_score) wins++;
      else losses++;
    } else {
      if (game.away_score > game.home_score) wins++;
      else losses++;
    }
  });

  const displayName = teamData?.short_name || teamName;
  const bgColor = teamData?.bg_color || 'var(--primary)';
  const textColor = teamData?.text_color || '#FFFFFF';

  return (
    <div className="min-h-screen p-3" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-6xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl("Teams"))}
          className="mb-3"
          size="sm"
        >
          <ArrowLeft className="w-3 h-3 ml-2" />
          חזרה
        </Button>

        {/* Team Header */}
        <Card className="mb-4 border-none shadow-lg overflow-hidden">
          <div className="p-4" style={{ background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 100%)` }}>
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" 
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <Users className="w-8 h-8" style={{ color: textColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold mb-1" style={{ color: textColor }}>{displayName}</h1>
                <p className="text-sm" style={{ color: textColor, opacity: 0.9 }}>
                  {teamData?.team_name || teamName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold" style={{ color: textColor }}>{wins}-{losses}</div>
                <div className="text-xs" style={{ color: textColor, opacity: 0.8 }}>מאזן</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold" style={{ color: textColor }}>{teamPlayers.length}</div>
                <div className="text-xs" style={{ color: textColor, opacity: 0.8 }}>שחקנים</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold" style={{ color: textColor }}>{teamGames.length}</div>
                <div className="text-xs" style={{ color: textColor, opacity: 0.8 }}>משחקים</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Team Statistics */}
        {teamStats && (
          <Card className="mb-4 border-none shadow-md">
            <CardContent className="p-4">
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                <TrendingUp className="w-4 h-4" />
                סטטיסטיקות הקבוצה
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {teamStats.pts !== undefined && (
                  <StatCard
                    label="נק' (PTS)"
                    value={Number(teamStats.pts).toFixed(1)}
                    rank={teamStats.pts_rank}
                    color="orange"
                  />
                )}
                {teamStats.reb !== undefined && (
                  <StatCard
                    label="ריב' (REB)"
                    value={Number(teamStats.reb).toFixed(1)}
                    rank={teamStats.reb_rank}
                    color="blue"
                  />
                )}
                {teamStats.ast !== undefined && (
                  <StatCard
                    label="אס' (AST)"
                    value={Number(teamStats.ast).toFixed(1)}
                    rank={teamStats.ast_rank}
                    color="green"
                  />
                )}
                {teamStats.stl !== undefined && (
                  <StatCard
                    label="חט' (STL)"
                    value={Number(teamStats.stl).toFixed(1)}
                    rank={teamStats.stl_rank}
                    color="purple"
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {teamStats.fg_pct !== undefined && (
                  <PercentCard label="% מהשדה (FG%)" value={teamStats.fg_pct} rank={teamStats.fg_pct_rank} />
                )}
                {teamStats['3pt_pct'] !== undefined && (
                  <PercentCard label="% ל-3 (3P%)" value={teamStats['3pt_pct']} rank={teamStats['3pt_pct_rank']} />
                )}
                {teamStats.ft_pct !== undefined && (
                  <PercentCard label="% עונ' (FT%)" value={teamStats.ft_pct} rank={teamStats.ft_pct_rank} />
                )}
              </div>

              {oppStats && (
                <>
                  <h3 className="text-xs font-bold mb-2 flex items-center gap-1 text-gray-600">
                    <Shield className="w-3 h-3" />
                    הגנה
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {oppStats.opp_pts !== undefined && (
                      <SmallStatCard
                        label="נק' יריבים (OPP PTS)"
                        value={Number(oppStats.opp_pts).toFixed(1)}
                        rank={oppStats.opp_pts_rank}
                      />
                    )}
                    {oppStats.opp_fg_pct !== undefined && (
                      <SmallStatCard
                        label="FG% יריבים (OPP FG%)"
                        value={`${Number(oppStats.opp_fg_pct).toFixed(1)}%`}
                        rank={oppStats.opp_fg_pct_rank}
                      />
                    )}
                    {oppStats.opp_to !== undefined && (
                      <SmallStatCard
                        label="איב' יריבים (OPP TO)"
                        value={Number(oppStats.opp_to).toFixed(1)}
                        rank={oppStats.opp_to_rank}
                      />
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs for Roster and Games */}
        <Tabs defaultValue="roster" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="roster" className="text-xs">סגל ({teamPlayers.length})</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">משחקים שהתקיימו ({completedGames.length})</TabsTrigger>
            <TabsTrigger value="upcoming" className="text-xs">משחקים עתידיים ({upcomingGames.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="roster" className="space-y-2">
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--primary)' }}>
              סגל השחקנים ({teamPlayers.length})
            </h3>
            {teamPlayers.length === 0 ? (
              <Alert>
                <AlertDescription className="text-center text-sm text-gray-600">
                  לא נמצאו שחקנים עבור {displayName}
                </AlertDescription>
              </Alert>
            ) : (
              playersWithStats.map(player => (
                <ExpandablePlayerCard
                  key={player.id}
                  player={player}
                  isExpanded={expandedPlayer === player.id}
                  onToggle={() => setExpandedPlayer(expandedPlayer === player.id ? null : player.id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-2">
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--primary)' }}>
              משחקים שהתקיימו ({completedGames.length})
            </h3>
            {completedGames.length > 0 ? (
              completedGames.map(game => <GameCard key={game.id} game={game} />)
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                אין משחקים שהתקיימו
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-2">
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--primary)' }}>
              משחקים עתידיים ({upcomingGames.length})
            </h3>
            {upcomingGames.length > 0 ? (
              upcomingGames.map(game => <GameCard key={game.id} game={game} />)
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                אין משחקים עתידיים
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ label, value, rank, color }) {
  const colors = {
    orange: 'from-orange-50 to-orange-100 text-orange-700',
    blue: 'from-blue-50 to-blue-100 text-blue-700',
    green: 'from-green-50 to-green-100 text-green-700',
    purple: 'from-purple-50 to-purple-100 text-purple-700',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-lg p-3 text-center`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mb-1">{label}</div>
      {rank && (
        <Badge variant="outline" className="text-xs">
          <Trophy className="w-2.5 h-2.5 ml-1" />
          #{rank}
        </Badge>
      )}
    </div>
  );
}

function PercentCard({ label, value, rank }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200">
      <div className="text-lg font-bold text-gray-700">
        {value ? `${Number(value).toFixed(1)}%` : '-'}
      </div>
      <div className="text-[10px] text-gray-600 mb-1">{label}</div>
      {rank && <div className="text-[9px] text-gray-500">#{rank} בליגה</div>}
    </div>
  );
}

function SmallStatCard({ label, value, rank }) {
  return (
    <div className="bg-white rounded-lg p-2 text-center border border-gray-200">
      <div className="text-sm font-bold text-gray-700">{value}</div>
      <div className="text-[9px] text-gray-600 mb-0.5">{label}</div>
      {rank && <div className="text-[9px] text-gray-500">#{rank}</div>}
    </div>
  );
}
