import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function GamePlayerCard({ player, isExpanded, onToggle, hasGameEnded, teamColors, leagueId, seasonHistory }) {
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
  const playerNumber = player.number ? parseInt(player.number) : null;

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
                    <Badge key={idx} variant="outline" className="text-[9px] px-1.5 py-0.5">
                      {stat.value || 0} {stat.label}
                    </Badge>
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
                    <div className="grid grid-cols-4 gap-1.5 justify-items-center">
                      <StatBox label="נק׳" value={gameStats.pts} />
                      <StatBox label="ריב׳" value={gameStats.reb} />
                      <StatBox label="אס׳" value={gameStats.ast} />
                      <StatBox label="דק׳" value={gameStats.min} suffix="'" />
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mt-1.5 justify-items-center">
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
                    <div className="grid grid-cols-4 gap-1.5 justify-items-center">
                      <StatBox label="דק׳ (MIN)" value={seasonStats.min} suffix="'" gradient="from-purple-50 to-purple-100" textColor="text-purple-700" />
                      <StatBox label="נק' (PTS)" value={seasonStats.pts} rank={seasonStats.pts_rank} gradient="from-orange-50 to-orange-100" accentColor />
                      <StatBox label="ריב' (REB)" value={seasonStats.reb} rank={seasonStats.reb_rank} gradient="from-blue-50 to-blue-100" textColor="text-blue-700" />
                      <StatBox label="אס' (AST)" value={seasonStats.ast} rank={seasonStats.ast_rank} gradient="from-green-50 to-green-100" textColor="text-green-700" />
                    </div>
                  </div>
                )}

                {/* היסטוריית קבוצות */}
                {sortedHistory.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-semibold text-gray-600 mb-1.5">היסטוריית קבוצות</h5>
                    <div className="space-y-1">
                      {sortedHistory.map((row, idx) => (
                        <div key={idx} className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
                          <span className="text-[9px] text-gray-500 font-medium flex-shrink-0">{row.season}</span>
                          <span className="text-[10px] font-semibold flex-1 text-right" style={{ color: 'var(--primary)' }}>
                            {row.team_name} <span className="text-[9px] text-gray-500">({row.league_name || 'לא ידוע'})</span>
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

const StatBox = ({ label, value, rank, suffix, gradient, textColor, accentColor }) => {
  const bgClass = gradient ? `bg-gradient-to-br ${gradient}` : 'bg-white';
  const valueColorClass = accentColor ? '' : (textColor || 'text-gray-700');
  
  return (
    <div className={`${bgClass} rounded-lg p-1.5 border border-gray-100 flex flex-col items-center justify-center w-full`}>
      <div className={`text-base font-bold ${valueColorClass}`} style={accentColor ? { color: 'var(--accent)' } : {}}>
        {value !== null && value !== undefined ? Number(value).toFixed(1) : '-'}
        {suffix && <span className="text-[10px] text-gray-500">{suffix}</span>}
      </div>
      <div className="text-[9px] text-gray-600">{label}</div>
      {rank && (
        <div className={`text-[9px] font-semibold flex items-center justify-center gap-0.5 mt-0.5 ${accentColor ? 'text-orange-600' : textColor || 'text-gray-600'}`}>
          #{rank}
        </div>
      )}
    </div>
  );
};
