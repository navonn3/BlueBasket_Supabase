// הקומפוננטה הזו שייכת אך ורק לשחקן בדף קבוצה. לשחקן בדף משחק, לך ל GamePlayerCard

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, User, Calendar, Ruler, TrendingUp, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function ExpandablePlayerCard({ player, isExpanded, onToggle }) {

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    try {
      let birth;
  
      // ✅ ידוע שהפורמט תמיד YYYY/MM/DD
      if (birthDate.includes('/')) {
        const [year, month, day] = birthDate.split('/');
        birth = new Date(Number(year), Number(month) - 1, Number(day));
      } else if (birthDate.includes('-')) {
        // פורמט ISO YYYY-MM-DD
        const [year, month, day] = birthDate.split('-');
        birth = new Date(Number(year), Number(month) - 1, Number(day));
      } else {
        birth = new Date(birthDate);
      }
  
      // בדוק שהתאריך תקין
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
  const stats = player.stats;
  const gameStats = player.gameStats;

  // Parse number as integer
  const playerNumber = player.number ? parseInt(player.number) : null;

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
        <div className="p-3 hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" 
                style={{ backgroundColor: 'var(--accent)', opacity: 0.9 }}
              >
                {playerNumber ? (
                  <span className="text-white font-bold text-sm">#{playerNumber}</span>
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm truncate" style={{ color: 'var(--primary)' }}>
                  {player.name}
                </h4>
                <div className="flex gap-2 mt-0.5 flex-wrap">
                  {player.height && (
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      <Ruler className="w-2 h-2 ml-1" />
                      {typeof player.height === 'number' ?
                        player.height.toFixed(2) : parseFloat(player.height).toFixed(2)}
                    </Badge>
                  )}
                  {age && (
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      גיל {age}
                    </Badge>
                  )}
                  {player.date_of_birth && (
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      <Calendar className="w-2 h-2 ml-1" />
                      {formatDate(player.date_of_birth)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {stats && (
                <div className="flex gap-1 text-xs">
                  {stats.points_avg && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      {Number(stats.points_avg).toFixed(1)} נק'
                    </Badge>
                  )}
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
              {gameStats && (
                <div>
                  <h5 className="text-xs font-semibold text-gray-600 mb-2 flex items-center justify-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    ביצועים במשחק
                  </h5>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    {gameStats.points !== undefined && (
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-1.5 text-center">
                        <div className="text-base font-bold" style={{ color: 'var(--accent)' }}>
                          {gameStats.points}
                        </div>
                        <div className="text-xs text-gray-600">נק'</div>
                      </div>
                    )}
                    {gameStats.rebounds !== undefined && (
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-1.5 text-center">
                        <div className="text-base font-bold text-blue-700">
                          {gameStats.rebounds}
                        </div>
                        <div className="text-xs text-gray-600">ריב'</div>
                      </div>
                    )}
                    {gameStats.assists !== undefined && (
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-1.5 text-center">
                        <div className="text-base font-bold text-green-700">
                          {gameStats.assists}
                        </div>
                        <div className="text-xs text-gray-600">אס'</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {stats && (
                <div>
                  <h5 className="text-xs font-semibold text-gray-600 mb-2 flex items-center justify-center gap-1">
                    <Target className="w-3 h-3" />
                    ממוצעי עונה
                  </h5>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    {stats.points_avg !== undefined && (
                      <div className="bg-white rounded-lg p-2 flex flex-col items-center justify-center border border-gray-200">
                        <div className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                          {Number(stats.points_avg).toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-600">נק׳ למשחק</div>
                        {stats.points_rank && (
                          <div className="text-[10px] text-gray-500 mt-0.5">#{stats.points_rank}</div>
                        )}
                      </div>
                    )}
                    {stats.rebounds_avg !== undefined && (
                      <div className="bg-white rounded-lg p-2 flex flex-col items-center justify-center border border-gray-200">
                        <div className="text-sm font-bold text-blue-700">
                          {Number(stats.rebounds_avg).toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-600">ריב׳ למשחק</div>
                        {stats.rebounds_rank && (
                          <div className="text-[10px] text-gray-500 mt-0.5">#{stats.rebounds_rank}</div>
                        )}
                      </div>
                    )}
                    {stats.assists_avg !== undefined && (
                      <div className="bg-white rounded-lg p-2 flex flex-col items-center justify-center border border-gray-200">
                        <div className="text-sm font-bold text-green-700">
                          {Number(stats.assists_avg).toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-600">אס׳ למשחק</div>
                        {stats.assists_rank && (
                          <div className="text-[10px] text-gray-500 mt-0.5">#{stats.assists_rank}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* טבלת ההיסטוריה המעודכנת */}
              {seasons.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-gray-600 mb-2 flex items-center justify-center gap-1">
                    <Calendar className="w-3 h-3" />
                    היסטוריית קבוצות
                  </h5>
                  <div className="grid grid-cols-1 gap-1.5">
                    {seasons.map(season => (
                      <div 
                        key={season.key} 
                        className="flex justify-between items-center p-1.5 bg-white rounded-lg border border-gray-100"
                      >
                        {/* שנה - מצד ימין */}
                        <span className="text-xs text-gray-500">{season.label}</span>
              
                        {/* קבוצה וליגה מצד שמאל */}
                        <div className="flex flex-col items-end text-right">
                          <span className="text-xs font-semibold truncate" style={{ color: 'var(--primary)' }}>
                            {player[season.key]}
                          </span>
                          {player[`${season.key}_league_name`] && (
                            <span className="text-[10px] text-gray-500">
                              ({player[`${season.key}_league_name`]})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}


                {(!gameStats && !stats && seasons.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    אין מידע נוסף זמין עבור שחקן זה.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
