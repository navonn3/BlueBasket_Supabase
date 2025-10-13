
import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, User, Calendar, Ruler, TrendingUp, Trophy, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function PlayerDetailPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const playerId = urlParams.get('id');

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const { data: playerAverages, isLoading: avgLoading } = useQuery({
    queryKey: ['playerAverages'],
    queryFn: () => base44.entities.PlayerAverages.list(),
    initialData: [],
  });

  const { data: gamePlayerStats, isLoading: gameStatsLoading } = useQuery({
    queryKey: ['gamePlayerStats'],
    queryFn: () => base44.entities.GamePlayerStats.list(),
    initialData: [],
  });

  const { data: games, isLoading: gamesLoading } = useQuery({
    queryKey: ['games'],
    queryFn: () => base44.entities.Game.list('-date'),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    initialData: [],
  });

  const { data: seasonHistory } = useQuery({
    queryKey: ['seasonHistory', playerId],
    queryFn: () => base44.entities.PlayerSeasonHistory.filter({ player_id: playerId }),
    initialData: [],
    enabled: !!playerId,
  });

  const player = players.find(p => p.id === playerId);
  const isLoading = playersLoading || avgLoading || gameStatsLoading || gamesLoading;

  const getContrastColor = (bgColor) => {
    if (!bgColor || bgColor === 'var(--primary)') return '#FFFFFF';
    
    if (bgColor.startsWith('var(')) {
        return '#FFFFFF';
    }

    const hex = bgColor.replace('#', '');
    if (hex.length === 3) {
      const r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
      const g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
      const b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#000000' : '#FFFFFF';
    } else if (hex.length === 6) {
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }

    return '#FFFFFF';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-3" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="h-48 bg-white rounded-lg animate-pulse mb-4" />
          <div className="space-y-3">
            <div className="h-32 bg-white rounded-lg animate-pulse" />
            <div className="h-32 bg-white rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen p-3" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-4xl mx-auto text-center py-12">
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--primary)' }}>
            שחקן לא נמצא
          </h2>
          <Button onClick={() => navigate(createPageUrl("Players"))} size="sm">
            <ArrowLeft className="w-3 h-3 ml-2" />
            חזרה לשחקנים
          </Button>
        </div>
      </div>
    );
  }

  const stats = playerAverages.find(avg => {
    if (avg.player_name === player.name) return true;
    const normalize = (str) => str?.trim().toLowerCase().replace(/\s+/g, ' ');
    return normalize(avg.player_name) === normalize(player.name);
  });

  const playerGameStats = gamePlayerStats.filter(gs => {
    if (gs.player_name === player.name) return true;
    const normalize = (str) => str?.trim().toLowerCase().replace(/\s+/g, ' ');
    return normalize(gs.player_name) === normalize(player.name);
  });

  const playerGames = playerGameStats.map(gameStat => {
    const game = games.find(g => g.code === gameStat.game_id || g.id === gameStat.game_id);
    return { ...gameStat, game };
  }).filter(pg => pg.game).sort((a, b) => {
    if (!a.game?.date || !b.game?.date) return 0;
    return new Date(b.game.date).getTime() - new Date(a.game.date).getTime();
  });

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    try {
      const parts = birthDate.split('/');
      if (parts.length !== 3) return null;
      const birth = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
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
  const playerNumber = player.jersey_number ? parseInt(player.jersey_number) : null;

  // Find team colors using new Team entity
  const playerTeam = teams.find(t => 
    t.league_id === player.league_id && 
    t.team_id === player.current_team_id
  );
  
  const bgColor = playerTeam?.bg_color || 'var(--primary)';
  const textColor = getContrastColor(bgColor);

  // Sort season history by season (most recent first)
  const sortedHistory = [...seasonHistory].sort((a, b) => {
    const parseYear = (season) => parseInt(season.split('-')[0]);
    return parseYear(b.season) - parseYear(a.season);
  });

  return (
    <div className="min-h-screen p-3" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-4xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl("Players"))}
          className="mb-3"
          size="sm"
        >
          <ArrowLeft className="w-3 h-3 ml-2" />
          חזרה
        </Button>

        <Card className="mb-4 border-none shadow-lg overflow-hidden">
          <div className="p-4" style={{ backgroundColor: bgColor }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
                  <User className="w-8 h-8" style={{ color: textColor }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold mb-1" style={{ color: textColor }}>{player.name}</h1>
                  <p className="text-sm" style={{ color: textColor, opacity: 0.9 }}>
                    {playerTeam?.short_name || playerTeam?.team_name || 'ללא קבוצה'}
                  </p>
                </div>
              </div>
              {playerNumber && (
                <div className="text-4xl font-bold" style={{ color: textColor, opacity: 0.3 }}>
                  #{playerNumber}
                </div>
              )}
            </div>
          </div>
          
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {age && (
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <Calendar className="w-4 h-4 mx-auto mb-1 text-gray-600" />
                  <div className="text-lg font-bold text-center" style={{ color: 'var(--primary)' }}>{age}</div>
                  <div className="text-xs text-gray-500 text-center">גיל</div>
                </div>
              )}
              {player.height && (
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <Ruler className="w-4 h-4 mx-auto mb-1 text-gray-600" />
                  <div className="text-lg font-bold text-center" style={{ color: 'var(--primary)' }}>
                    {typeof player.height === 'number' ? player.height.toFixed(2) : player.height}m
                  </div>
                  <div className="text-xs text-gray-500 text-center">גובה</div>
                </div>
              )}
              {stats?.games_played && (
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <Target className="w-4 h-4 mx-auto mb-1 text-gray-600" />
                  <div className="text-lg font-bold text-center" style={{ color: 'var(--primary)' }}>{stats.games_played}</div>
                  <div className="text-xs text-gray-500 text-center">משחקים</div>
                </div>
              )}
              {player.date_of_birth && (
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <Calendar className="w-4 h-4 mx-auto mb-1 text-gray-600" />
                  <div className="text-lg font-bold text-center" style={{ color: 'var(--primary)' }}>
                    {player.date_of_birth}
                  </div>
                  <div className="text-xs text-gray-500 text-center">תאריך לידה</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Season Stats */}
        {stats && (
          <Card className="mb-4 border-none shadow-md">
            <CardContent className="p-4">
              <h2 className="text-sm font-bold mb-3 flex items-center justify-center gap-2" style={{ color: 'var(--primary)' }}>
                <TrendingUp className="w-4 h-4" />
                ממוצעים העונה
              </h2>
              
              <div className="grid grid-cols-3 gap-2 mb-4">
                {stats.pts !== undefined && stats.pts !== null && (
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-center" style={{ color: 'var(--accent)' }}>
                      {Number(stats.pts).toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-600 mb-1 text-center">נק' (PTS)</div>
                    {stats.pts_rank && (
                      <div className="flex justify-center">
                        <Badge variant="outline" className="text-xs">
                          <Trophy className="w-2.5 h-2.5 ml-1" />
                          #{stats.pts_rank} בליגה
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
                {stats.reb !== undefined && stats.reb !== null && (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-700 text-center">
                      {Number(stats.reb).toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-600 mb-1 text-center">ריב' (REB)</div>
                    {stats.reb_rank && (
                      <div className="flex justify-center">
                        <Badge variant="outline" className="text-xs">
                          <Trophy className="w-2.5 h-2.5 ml-1" />
                          #{stats.reb_rank} בליגה
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
                {stats.ast !== undefined && stats.ast !== null && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-700 text-center">
                      {Number(stats.ast).toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-600 mb-1 text-center">אס' (AST)</div>
                    {stats.ast_rank && (
                      <div className="flex justify-center">
                        <Badge variant="outline" className="text-xs">
                          <Trophy className="w-2.5 h-2.5 ml-1" />
                          #{stats.ast_rank} בליגה
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {stats.fg_pct !== undefined && stats.fg_pct !== null && (
                  <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200">
                    <div className="text-lg font-bold text-gray-800 text-center">
                      {`${Number(stats.fg_pct).toFixed(1)}%`}
                    </div>
                    <div className="text-[10px] text-gray-500 text-center mt-0.5">
                      {`${Number(stats.fgm || 0).toFixed(1)}/${Number(stats.fga || 0).toFixed(1)}`}
                    </div>
                    <div className="text-[10px] text-gray-600 text-center mt-1">% מהשדה (FG%)</div>
                  </div>
                )}
                {stats['3pt_pct'] !== undefined && stats['3pt_pct'] !== null && (
                  <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200">
                    <div className="text-lg font-bold text-gray-800 text-center">
                      {`${Number(stats['3pt_pct']).toFixed(1)}%`}
                    </div>
                    <div className="text-[10px] text-gray-500 text-center mt-0.5">
                      {`${Number(stats['3ptm'] || 0).toFixed(1)}/${Number(stats['3pta'] || 0).toFixed(1)}`}
                    </div>
                    <div className="text-[10px] text-gray-600 text-center mt-1">% ל-3 (3P%)</div>
                  </div>
                )}
                {stats.ft_pct !== undefined && stats.ft_pct !== null && (
                  <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200">
                    <div className="text-lg font-bold text-gray-800 text-center">
                      {`${Number(stats.ft_pct).toFixed(1)}%`}
                    </div>
                    <div className="text-[10px] text-gray-500 text-center mt-0.5">
                      {`${Number(stats.ftm || 0).toFixed(1)}/${Number(stats.fta || 0).toFixed(1)}`}
                    </div>
                    <div className="text-[10px] text-gray-600 text-center mt-1">% עונ' (FT%)</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {stats.min !== undefined && stats.min !== null && (
                  <div className="bg-gray-50 rounded p-1.5 text-center border border-gray-200">
                    <div className="text-xs font-bold text-gray-700 text-center">{Number(stats.min).toFixed(1)}</div>
                    <div className="text-[9px] text-gray-600 text-center">דק' (MIN)</div>
                  </div>
                )}
                {stats.stl !== undefined && stats.stl !== null && (
                  <div className="bg-gray-50 rounded p-1.5 text-center border border-gray-200">
                    <div className="text-xs font-bold text-gray-700 text-center">{Number(stats.stl).toFixed(1)}</div>
                    <div className="text-[9px] text-gray-600 text-center">חט' (STL)</div>
                  </div>
                )}
                {stats.blk !== undefined && stats.blk !== null && (
                  <div className="bg-gray-50 rounded p-1.5 text-center border border-gray-200">
                    <div className="text-xs font-bold text-gray-700 text-center">{Number(stats.blk).toFixed(1)}</div>
                    <div className="text-[9px] text-gray-600 text-center">חס' (BLK)</div>
                  </div>
                )}
                {stats.to !== undefined && stats.to !== null && (
                  <div className="bg-gray-50 rounded p-1.5 text-center border border-gray-200">
                    <div className="text-xs font-bold text-gray-700 text-center">{Number(stats.to).toFixed(1)}</div>
                    <div className="text-[9px] text-gray-600 text-center">איב' (TO)</div>
                  </div>
                )}
                {stats.pf !== undefined && stats.pf !== null && (
                  <div className="bg-gray-50 rounded p-1.5 text-center border border-gray-200">
                    <div className="text-xs font-bold text-gray-700 text-center">{Number(stats.pf).toFixed(1)}</div>
                    <div className="text-[9px] text-gray-600 text-center">עב' (PF)</div>
                  </div>
                )}
                {stats.rate !== undefined && stats.rate !== null && (
                  <div className="bg-gray-50 rounded p-1.5 text-center border border-gray-200">
                    <div className="text-xs font-bold text-gray-700 text-center">{Number(stats.rate).toFixed(1)}</div>
                    <div className="text-[9px] text-gray-600 text-center">יעי' (EFF)</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>


        )}

        {/* Recent Games */}
        {playerGames.length > 0 && (
          <Card className="mb-4 border-none shadow-md">
            <CardContent className="p-4">
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                <Trophy className="w-4 h-4" />
                משחקים אחרונים ({playerGames.length})
              </h2>
              
              <div className="space-y-2">
                {playerGames.slice(0, 10).map((gameStat, idx) => (
                  <div 
                    key={idx}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-orange-300 transition-colors cursor-pointer"
                    onClick={() => gameStat.game_id && navigate(createPageUrl("GameDetail") + `?id=${gameStat.game_id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-gray-600">
                        {gameStat.game?.date && gameStat.game.date}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {gameStat.team} vs {gameStat.opponent}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-2">
                      <div className="bg-white rounded p-1.5 text-center">
                        <div className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{gameStat.pts || 0}</div>
                        <div className="text-[9px] text-gray-600">נק' (PTS)</div>
                      </div>
                      <div className="bg-white rounded p-1.5 text-center">
                        <div className="text-lg font-bold text-blue-700">{gameStat.reb || 0}</div>
                        <div className="text-[9px] text-gray-600">ריב' (REB)</div>
                      </div>
                      <div className="bg-white rounded p-1.5 text-center">
                        <div className="text-lg font-bold text-green-700">{gameStat.ast || 0}</div>
                        <div className="text-[9px] text-gray-600">אס' (AST)</div>
                      </div>
                      <div className="bg-white rounded p-1.5 text-center">
                        <div className="text-sm font-bold text-gray-700">{gameStat.min || 0}'</div>
                        <div className="text-[9px] text-gray-600">דק' (MIN)</div>
                      </div>
                      <div className="bg-white rounded p-1.5 text-center">
                        <div className="text-sm font-bold text-gray-700">
                          {gameStat.fg_pct ? `${Number(gameStat.fg_pct).toFixed(0)}%` : '-'}
                        </div>
                        <div className="text-[9px] text-gray-600">FG%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Career History from PlayerSeasonHistory */}
        {sortedHistory.length > 0 && (
          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                <Calendar className="w-4 h-4" />
                היסטוריית קבוצות
              </h2>
              <div className="space-y-2">
                {sortedHistory.map((history, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-xs text-gray-500 font-medium w-20">{history.season}</span>
                      <div className="h-px flex-1 bg-gray-200 mx-3" />
                      <span className="text-sm font-semibold text-right flex-1" style={{ color: 'var(--primary)' }}>
                        {history.team_name} ({history.league_name})
                      </span>
                    </div>
                    {index < sortedHistory.length - 1 && (
                      <div className="h-px bg-gray-100" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, subLabel }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200">
      <div className="text-sm font-bold text-gray-700">{value}</div>
      <div className="text-[10px] text-gray-600 font-medium">{label}</div>
      {subLabel && <div className="text-[9px] text-gray-500">{subLabel}</div>}
    </div>
  );
}

function SmallStatBox({ label, value }) {
  return (
    <div className="bg-white rounded-lg p-2 text-center border border-gray-200">
      <div className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{value}</div>
      <div className="text-[9px] text-gray-600">{label}</div>
    </div>
  );
}
