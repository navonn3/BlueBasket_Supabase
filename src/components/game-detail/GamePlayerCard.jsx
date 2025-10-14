import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";

export default function GamePlayerCard({ player, isExpanded, onToggle, hasGameEnded, teamColors, leagueId }) {
  // שליפת היסטוריה מבפנים
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

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    try {
      let birth;
      if (birthDate.includes('/')) {
        const [year, month, day] = birthDate.split('/');
        birth = new Date(Number(year), Number(month) - 1, Number(day));
      } else if (birthDate.includes('-')) {
        const [year, month, day] = birthDate.split('-');
        birth = new Date(Number(year), Number(month) - 1, Number(day));
      } else {
        birth = new Date(birthDate);
      }
      if (isNaN(birth.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      const dayDiff = today.getDate() - birth.getDate();
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  };

  const age = calculateAge(player.date_of_birth);
  const gameStats = player.gameStats;
  const seasonStats = player.stats;
  const playerNumber = player.jersey_number ? parseInt(player.jersey_number) : null;

  const showGameStats = hasGameEnded && gameStats;
  const topGameStats = showGameStats ? [
    { label: 'נק׳', value: gameStats.pts },
    { label: 'ריב׳', value: gameStats.reb },
    { label: 'אס׳', value: gameStats.ast }
  ] : null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          return dateStr;
        }
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // עיבוד היסטוריה: סדר יורד לפי עונה
  const sortedHistory = seasonHistory
    ? [...seasonHistory]
        .filter((item) => item.season && item.team_name)
        .sort((a, b) => {
          const getYear = (season) => parseInt(season.split(/[-/]/)[0]);
          return getYear(b.season) - getYear(a.season);
        })
    : [];

  return (
    <Card
      className="border border-gray-200 hover:border-orange-300 transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={onToggle}
    >
      <CardContent className="p-0">
        <div className="p-2.5 hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-xs"
                style={{ backgroundColor: teamColors.bg }}
              >
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
                      {formatDate(player.date_of_birth)}
                    </Badge>
                  )}
                  {player.height && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-gray-300">
                      {typeof player.height === 'number'
                        ? player.height.toFixed(2)
                        : parseFloat(player.height).toFixed(2)}m
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showGameStats && topGameStats && (
                <div className="flex gap-1">
                  {topGameStats.map((stat, idx) => (
                    <div key={idx} className="text-center px-1.5 py-0.5 rounded bg-gray-100">
                      <div className="text-xs font-bold">{stat.value || 0}</div>
                      <div className="text-[9px] text-gray-600">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-gray-200"
            >
              <div className="p-3 bg-gradient-to-b from-gray-50 to-white space-y-3">
                {/* סטטיסטיקות המשחק */}
                {gameStats && (
                  <div>
                    <h5 className="text-[10px] font-semibold text-gray-600 mb-1.5">ביצועים במשחק</h5>
                    <div className="grid grid-cols-4 gap-1.5">
                      <StatBox label="נק׳" value={gameStats.pts} />
                      <StatBox label="ריב׳" value={gameStats.reb} />
                      <StatBox label="אס׳" value={gameStats.ast} />
                      <StatBox label="דק׳" value={gameStats.min} suffix="'" />
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                      <StatBox label="FG%" value={gameStats.fg_pct} suffix="%" />
                      <StatBox label="3PT%" value={gameStats['3pt_pct']} suffix="%" />
                      <StatBox label="FT%" value={gameStats.ft_pct} suffix="%" />
                      <StatBox label="חט׳" value={gameStats.stl} />
                    </div>
                  </div>
                )}

                {/* ממוצעי העונה */}
                {seasonStats && (
                  <div>
                    <h5 className="text-[10px] font-semibold text-gray-600 mb-1.5">ממוצעי העונה</h5>
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-1.5 border border-gray-100 text-center">
                        <div className="text-base font-bold text-purple-700 text-center">
                          {seasonStats.min ? Number(seasonStats.min).toFixed(1) : '0.0'}
                        </div>
                        <div className="text-[9px] text-gray-600 text-center">דק' (MIN)</div>
                      </div>
                
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-1.5 border border-gray-100 text-center">
                        <div className="text-base font-bold text-center" style={{ color: 'var(--accent)' }}>
                          {seasonStats.pts ? Number(seasonStats.pts).toFixed(1) : '0.0'}
                        </div>
                        <div className="text-[9px] text-gray-600 text-center">נק' (PTS)</div>
                        {seasonStats.pts_rank && (
                          <div className="text-[9px] text-orange-600 font-semibold flex items-center justify-center gap-0.5 mt-0.5">
                            <Trophy className="w-2.5 h-2.5" />
                            #{seasonStats.pts_rank}
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-1.5 border border-gray-100 text-center">
                        <div className="text-base font-bold text-blue-700 text-center">
                          {seasonStats.reb ? Number(seasonStats.reb).toFixed(1) : '0.0'}
                        </div>
                        <div className="text-[9px] text-gray-600 text-center">ריב' (REB)</div>
                        {seasonStats.reb_rank && (
                          <div className="text-[9px] text-blue-600 font-semibold flex items-center justify-center gap-0.5 mt-0.5">
                            <Trophy className="w-2.5 h-2.5" />
                            #{seasonStats.reb_rank}
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-1.5 border border-gray-100 text-center">
                        <div className="text-base font-bold text-green-700 text-center">
                          {seasonStats.ast ? Number(seasonStats.ast).toFixed(1) : '0.0'}
                        </div>
                        <div className="text-[9px] text-gray-600 text-center">אס' (AST)</div>
                        {seasonStats.ast_rank && (
                          <div className="text-[9px] text-green-600 font-semibold flex items-center justify-center gap-0.5 mt-0.5">
                            <Trophy className="w-2.5 h-2.5" />
                            #{seasonStats.ast_rank}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* היסטוריית קבוצות */}
                {sortedHistory.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-semibold text-gray-600 mb-1.5">היסטוריית קבוצות</h5>
                    <div className="space-y-1">
                      {sortedHistory.map((row, idx) => (
                        <div key={idx} className="flex items-start gap-4 py-1.5 border-b border-gray-100 last:border-0">
                          <span className="text-[9px] text-gray-500 font-medium flex-shrink-0 w-12">{row.season}</span>
                          <span className="text-[10px] font-semibold flex-1 text-right" style={{ color: 'var(--primary)' }}>
                            {row.team_name}   <span className="text-[9px] text-gray-500">({row.league_name || 'לא ידוע'})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

const StatBox = ({ label, value, rank, suffix }) => {
  return (
    <div className="bg-white rounded-lg p-1.5 border border-gray-100">
      <div className="text-sm font-bold text-gray-700 text-center">
        {value !== null && value !== undefined ? Number(value).toFixed(1) : '-'}
        {suffix && <span className="text-[10px] text-gray-500">{suffix}</span>}
      </div>
      <div className="text-[9px] text-gray-500 text-center">{label}</div>
      {rank && <div className="text-[9px] text-orange-600 text-center">#{rank}</div>}
    </div>
  );
};
