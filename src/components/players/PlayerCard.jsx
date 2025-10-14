
import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, User, Trophy, ChevronDown, ChevronUp, Heart, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";

export default function PlayerCard({ player, onToggleFavorite }) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });
  
  const { data: gamePlayerStats } = useQuery({
    queryKey: ['gamePlayerStats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('game_player_stats').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
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
  const stats = player.stats;

  // Find team using league_id and current_team_id
  const playerTeam = teams.find(t => 
    t.league_id === player.league_id && 
    t.team_id === player.current_team_id
  );
  
  // Debug logging
  console.log('Player:', player.name, {
    league_id: player.league_id,
    current_team_id: player.current_team_id,
    found_team: playerTeam?.team_name,
    available_teams_in_league: teams.filter(t => t.league_id === player.league_id).map(t => ({ id: t.team_id, name: t.team_name }))
  });
  
  const teamShortName = playerTeam?.short_name || playerTeam?.team_name || 'ללא קבוצה';
  const bgColor = playerTeam?.bg_color || 'var(--primary)';
  const textColor = playerTeam?.text_color || '#FFFFFF';

  const playerNumber = player.jersey_number ? parseInt(player.jersey_number) : null;

  // Get last game stats
  const playerGames = gamePlayerStats
    .filter(gs => {
      if (gs.player_name === player.name) return true;
      const normalize = (str) => str?.trim().toLowerCase().replace(/\s+/g, ' ');
      return normalize(gs.player_name) === normalize(player.name);
    })
    .sort((a, b) => {
      if (!a.game_date || !b.game_date) return 0;
      return new Date(b.game_date) - new Date(a.game_date);
    });
  
  const lastGame = playerGames[0];

  const handleCardClick = (e) => {
    if (e.target.closest('button')) return;
    setIsExpanded(!isExpanded);
  };

  const handleViewProfile = (e) => {
    e.stopPropagation();
    navigate(createPageUrl("PlayerDetail") + `?id=${player.id}`);
  };

  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={handleCardClick}
      className="cursor-pointer"
    >
      <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-300 rounded-xl h-full">
        <CardHeader 
          className="p-3 border-b border-gray-100" 
          style={{ backgroundColor: bgColor }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div 
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" 
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <User className="w-5 h-5" style={{ color: textColor }} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm truncate" style={{ color: textColor }}>
                  {player.name}
                </h3>
                <p className="text-xs truncate" style={{ color: textColor, opacity: 0.9 }}>
                  {teamShortName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleToggleFavorite}
                className="p-1 hover:scale-110 transition-transform"
              >
                <Heart 
                  className="w-4 h-4" 
                  style={{ color: textColor }}
                  fill={player.isFavorite ? textColor : 'none'}
                />
              </button>
              {playerNumber && (
                <div className="text-xl font-bold" style={{ color: textColor, opacity: 0.5 }}>
                  #{playerNumber}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 space-y-2">
          <div className="flex gap-1.5 flex-wrap">
            {age && (
              <Badge variant="outline" className="border-gray-300 text-[10px] px-1.5 py-0">
                גיל {age}
              </Badge>
            )}
            {player.date_of_birth && (
              <Badge variant="outline" className="border-gray-300 text-[10px] px-1.5 py-0">
                {player.date_of_birth}
              </Badge>
            )}
            {player.height && (
              <Badge variant="outline" className="border-gray-300 text-[10px] px-1.5 py-0">
                {typeof player.height === 'number' ? player.height.toFixed(2) : parseFloat(player.height).toFixed(2)}m
              </Badge>
            )}
            {stats?.games_played && (
              <Badge variant="outline" className="border-gray-300 text-[10px] px-1.5 py-0">
                {stats.games_played} משחקים
              </Badge>
            )}
          </div>

          {stats && (
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-semibold text-gray-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  ממוצעים העונה
                </h4>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-1.5 text-center flex flex-col items-center justify-center">
                  <div className="text-base font-bold" style={{ color: 'var(--accent)' }}>
                    {stats.pts ? Number(stats.pts).toFixed(1) : '0.0'}
                  </div>
                  <div className="text-[9px] text-gray-600">נק' (PTS)</div>
                  {stats.pts_rank && (
                    <div className="text-[9px] text-orange-600 font-semibold flex items-center justify-center gap-0.5 mt-0.5">
                      <Trophy className="w-2.5 h-2.5" />
                      #{stats.pts_rank}
                    </div>
                  )}
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-1.5 text-center flex flex-col items-center justify-center">
                  <div className="text-base font-bold text-blue-700">
                    {stats.reb ? Number(stats.reb).toFixed(1) : '0.0'}
                  </div>
                  <div className="text-[9px] text-gray-600">ריב' (REB)</div>
                  {stats.reb_rank && (
                    <div className="text-[9px] text-blue-600 font-semibold flex items-center justify-center gap-0.5 mt-0.5">
                      <Trophy className="w-2.5 h-2.5" />
                      #{stats.reb_rank}
                    </div>
                  )}
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-1.5 text-center flex flex-col items-center justify-center">
                  <div className="text-base font-bold text-green-700">
                    {stats.ast ? Number(stats.ast).toFixed(1) : '0.0'}
                  </div>
                  <div className="text-[9px] text-gray-600">אס' (AST)</div>
                  {stats.ast_rank && (
                    <div className="text-[9px] text-green-600 font-semibold flex items-center justify-center gap-0.5 mt-0.5">
                      <Trophy className="w-2.5 h-2.5" />
                      #{stats.ast_rank}
                    </div>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <div className="grid grid-cols-4 gap-1.5">
                      <StatBox label="דק' (MIN)" value={stats.min?.toFixed(1)} />
                      <StatBox label="% מהשדה" value={stats.fg_pct ? `${stats.fg_pct.toFixed(1)}%` : '-'} 
                        subValue={stats.fgm && stats.fga ? `${stats.fgm.toFixed(1)}/${stats.fga.toFixed(1)}` : ''} />
                      <StatBox label="% ל-3" value={stats['3pt_pct'] ? `${stats['3pt_pct'].toFixed(1)}%` : '-'} 
                        subValue={stats['3ptm'] && stats['3pta'] ? `${stats['3ptm'].toFixed(1)}/${stats['3pta'].toFixed(1)}` : ''} />
                      <StatBox label="יעי' (EFF)" value={stats.rate?.toFixed(1)} />
                    </div>

                    {lastGame && (
                      <div className="pt-2 border-t border-gray-100">
                        <h5 className="text-[10px] font-semibold text-gray-600 mb-1.5">משחק אחרון</h5>
                        <div className="grid grid-cols-4 gap-1.5">
                          <StatBox label="דק' (MIN)" value={lastGame.min} />
                          <StatBox label="נק' (PTS)" value={lastGame.pts} />
                          <StatBox label="ריב' (REB)" value={lastGame.reb} />
                          <StatBox label="אס' (AST)" value={lastGame.ast} />
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handleViewProfile}
                      className="w-full text-white text-xs h-8"
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      <Eye className="w-3 h-3 ml-1" />
                      צפה בפרופיל מלא
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatBox({ label, value, subValue }) {
  return (
    <div className="bg-gray-50 rounded p-1.5 text-center border border-gray-200">
      <div className="text-xs font-bold text-gray-700 text-center">{value || '-'}</div>
      {subValue && <div className="text-[8px] text-gray-500 text-center">{subValue}</div>}
      <div className="text-[9px] text-gray-600 text-center">{label}</div>
    </div>
  );
}
