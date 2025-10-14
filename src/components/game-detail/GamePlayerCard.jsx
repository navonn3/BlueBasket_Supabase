
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, User, Calendar, Ruler } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function GamePlayerCard({ player, isExpanded, onToggle, hasGameEnded }) {
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    try {
      let birth;
      
      // נסה לזהות את הפורמט ולהמיר
      if (birthDate.includes('/')) {
        // פורמט: yyyy/mm/dd או dd/mm/yyyy
        const parts = birthDate.split('/');
        if (parts.length !== 3) return null;
        
        // בדוק אם זה yyyy/mm/dd (השנה ראשונה)
        if (parts[0].length === 4) {
          birth = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
        } else {
          // פורמט dd/mm/yyyy
          birth = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      } else if (birthDate.includes('-')) {
        // פורמט ISO: yyyy-mm-dd
        birth = new Date(birthDate);
      } else {
        // נסה פשוט ליצור תאריך
        birth = new Date(birthDate);
      }
      
      // בדוק שהתאריך תקין
      if (isNaN(birth.getTime())) return null;
      
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
  const gameStats = player.gameStats;
  const seasonStats = player.stats;

  // Parse number as integer
  const playerNumber = player.number ? parseInt(player.number) : null;

  // For completed games, show game stats in main view
  const showGameStats = hasGameEnded && gameStats;
  
  // Get top 3 stats for completed game
  const topGameStats = showGameStats ? [
    { label: 'נק\'', value: gameStats.pts, color: 'bg-orange-500' },
    { label: 'ריב\'', value: gameStats.reb, color: 'bg-blue-500' },
    { label: 'בישו\'', value: gameStats.ast, color: 'bg-green-500' }
  ] : null;

  const seasons = [
    { key: 'season_2024_25', label: '2024-25' },
    { key: 'season_2023_24', label: '2023-24' },
    { key: 'season_2022_23', label: '2022-23' },
    { key: 'season_2021_22', label: '2021-22' },
    { key: 'season_2020_21', label: '2020-21' },
    { key: 'season_2019_20', label: '2019-20' },
    { key: 'season_2018_19', label: '2018-19' },
    { key: 'season_2017_18', label: '2017-18' },
    { key: 'season_2016_17', label: '2016-17' },
    { key: 'season_2015_16', label: '2015-16' },
    { key: 'season_2014_15', label: '2014-15' },
    { key: 'season_2013_14', label: '2013-14' }
  ].filter(s => player[s.key]);

  return (
    <Card 
      className="border border-gray-200 hover:border-orange-300 transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={onToggle}
    >
      <CardContent className="p-0">
        <div className="p-2.5 hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: 'var(--accent)' }}>
                {playerNumber || <User className="w-3 h-3" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs truncate" style={{ color: 'var(--primary)' }}>
                  {player.name}
                </h4>
                {!showGameStats && (
                  <div className="flex gap-1.5 mt-0.5 flex-wrap">
                    {player.height && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                        {player.height}
                      </Badge>
                    )}
                    {age && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                        גיל {age}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {showGameStats ? (
                <div className="flex gap-1">
                  {topGameStats.map((stat, idx) => (
                    <div key={idx} className="text-center px-1.5 py-0.5 rounded" style={{ backgroundColor: `${stat.color}20` }}>
                      <div className="text-xs font-bold" style={{ color: stat.color }}>{stat.value || 0}</div>
                      <div className="text-[9px] text-gray-600">{stat.label}</div>
                    </div>
                  ))}
                </div>
              ) : seasonStats?.points_avg && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                  {Number(seasonStats.points_avg).toFixed(1)} נק'
                </Badge>
              )}
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
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
              <div className="p-2.5 bg-gradient-to-b from-gray-50 to-white space-y-2.5">
                {showGameStats && (
                  <div>
                    <h5 className="text-[10px] font-semibold text-gray-600 mb-1.5">סטטיסטיקות המשחק</h5>
                    <div className="grid grid-cols-4 gap-1">
                      <StatBox label="נק'" value={gameStats.points} />
                      <StatBox label="ריב'" value={gameStats.rebounds} />
                      <StatBox label="בישו'" value={gameStats.assists} />
                      <StatBox label="דק'" value={gameStats.minutes} />
                      <StatBox label="חטף'" value={gameStats.steals} />
                      <StatBox label="בלוק" value={gameStats.blocks} />
                      <StatBox label="כד' ש'" value={gameStats.field_goals_made} suffix={`/${gameStats.field_goals_attempted}`} />
                      <StatBox label="3P" value={gameStats.three_pointers_made} suffix={`/${gameStats.three_pointers_attempted}`} />
                    </div>
                  </div>
                )}

                {seasonStats && (
                  <div>
                    <h5 className="text-[10px] font-semibold text-gray-600 mb-1.5">ממוצעי העונה</h5>
                    <div className="grid grid-cols-3 gap-1">
                      <StatBox label="נק'" value={seasonStats.points_avg?.toFixed(1)} rank={seasonStats.points_rank} />
                      <StatBox label="ריב'" value={seasonStats.rebounds_avg?.toFixed(1)} rank={seasonStats.rebounds_rank} />
                      <StatBox label="בישו'" value={seasonStats.assists_avg?.toFixed(1)} rank={seasonStats.assists_rank} />
                    </div>
                  </div>
                )}

                {!showGameStats && player.date_of_birth && (
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                    <Calendar className="w-3 h-3" />
                    <span>נולד: {format(new Date(player.date_of_birth), 'dd/MM/yyyy')}</span>
                  </div>
                )}

                {seasons.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-semibold text-gray-600 mb-1.5">היסטוריית קבוצות</h5>
                    <div className="grid grid-cols-2 gap-1">
                      {seasons.slice(0, 4).map(season => (
                        <div 
                          key={season.key} 
                          className="flex justify-between items-center p-1 bg-white rounded border border-gray-100 text-[10px]"
                        >
                          <span className="text-gray-500">{season.label}</span>
                          <span className="font-semibold truncate ml-1" style={{ color: 'var(--primary)' }}>
                            {player[season.key]}
                          </span>
                        </div>
                      ))}
                    </div>
                    {seasons.length > 4 && (
                      <p className="text-[10px] text-gray-500 mt-1">ועוד {seasons.length - 4} עונות...</p>
                    )}
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

function StatBox({ label, value, suffix, rank }) {
  return (
    <div className="bg-white rounded border border-gray-200 p-1 text-center">
      <div className="text-xs font-bold text-gray-700">
        {value !== undefined && value !== null ? value : '-'}
        {suffix && <span className="text-[10px] text-gray-500">{suffix}</span>}
      </div>
      <div className="text-[9px] text-gray-500">{label}</div>
      {rank && <div className="text-[9px] text-orange-600">#{rank}</div>}
    </div>
  );
}
