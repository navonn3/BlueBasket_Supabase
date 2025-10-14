import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Heart, FileDown, Eye, Printer, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { findTeamByName } from "../shared/teamHelpers";

export default function GameCard({ game, onToggleFavorite, isFavorite }) {
  const navigate = useNavigate();
  const [showPDFMenu, setShowPDFMenu] = useState(false);
  const hasScore = game.home_score !== null && game.home_score !== undefined;
  
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });

  const homeTeam = findTeamByName(teams, game.home_team, game.league_id);
  const awayTeam = findTeamByName(teams, game.away_team, game.league_id);
  
  const homeShortName = homeTeam?.short_name || homeTeam?.team_name || game.home_team;
  const awayShortName = awayTeam?.short_name || awayTeam?.team_name || game.away_team;
  
  const homeColors = {
    bg: homeTeam?.bg_color || 'var(--primary)',
    text: homeTeam?.text_color || '#FFFFFF'
  };
  
  const awayColors = {
    bg: awayTeam?.bg_color || 'var(--primary)',
    text: awayTeam?.text_color || '#FFFFFF'
  };
  
  const homeWon = hasScore && game.home_score > game.away_score;
  const awayWon = hasScore && game.away_score > game.home_score;
  
  const handleClick = (e) => {
    // מונע נווט אם לחצו על כפתור
    if (e.target.closest('button')) return;
    
    // תיקון: משתמשים ב-id שהוא ה-primary key האמיתי
    // gameid הוא שדה נפרד שאולי ריק, id הוא התמיד קיים
    const gameIdentifier = game.game_id;
    console.log('Navigating to game:', gameIdentifier, 'Full game object:', game);
    navigate(`/gamedetail?id=${gameIdentifier}`);
  };

  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite();
  };

  const handlePDFAction = (e, type, action) => {
    e.stopPropagation();
    const gameIdentifier = game.game_id;
    window.open(`/gamedaypdf?id=${gameIdentifier}&type=${type}&action=${action}`, '_blank');
    setShowPDFMenu(false);
  };

  const formatGameDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return format(date, 'dd/MM');
    } catch (error) {
      console.error('Error formatting date:', dateStr, error);
      return null;
    }
  };

  const formattedDate = formatGameDate(game.date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className="cursor-pointer w-full relative"
    >
      <Card className="border-none shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden w-full">
        <CardContent className="p-0">
          <div className="p-2 sm:p-3">
            {/* Header: Date, Time, Round, Actions */}
            <div className="flex items-center justify-between mb-2 gap-2">
              {/* Left side: Date & Time */}
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                {formattedDate && (
                  <div className="flex items-center gap-0.5 text-[9px] sm:text-[10px] text-gray-600 whitespace-nowrap">
                    <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="truncate">{formattedDate}</span>
                  </div>
                )}
                {game.time && (
                  <div className="flex items-center gap-0.5 text-[9px] sm:text-[10px] text-gray-600 whitespace-nowrap">
                    <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="truncate">{game.time.substring(0, 5)}</span>
                  </div>
                )}
                {game.venue && (
                  <div className="flex items-center gap-0.5 text-[9px] sm:text-[10px] text-gray-600 whitespace-nowrap">
                    <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="truncate max-w-[60px] sm:max-w-none">{game.venue}</span>
                  </div>
                )}
              </div>

              {/* Right side: Round & Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {game.round && (
                  <Badge 
                    variant="outline" 
                    className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 h-4 sm:h-5 whitespace-nowrap"
                    style={{ 
                      borderColor: 'var(--primary)',
                      color: 'var(--primary)'
                    }}
                  >
                    מחזור {game.round}
                  </Badge>
                )}

                <div className="flex gap-0.5 sm:gap-1">
                  {hasScore && (
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPDFMenu(!showPDFMenu);
                        }}
                      >
                        <FileDown className="w-3 h-3 text-gray-600" />
                      </Button>

                      <AnimatePresence>
                        {showPDFMenu && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]"
                          >
                            <button
                              onClick={(e) => handlePDFAction(e, 'basic', 'print')}
                              className="w-full px-3 py-1.5 text-right text-xs hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Printer className="w-3 h-3" />
                              הדפס בסיסי
                            </button>
                            <button
                              onClick={(e) => handlePDFAction(e, 'basic', 'download')}
                              className="w-full px-3 py-1.5 text-right text-xs hover:bg-gray-100 flex items-center gap-2"
                            >
                              <FileDown className="w-3 h-3" />
                              הורד בסיסי
                            </button>
                            <button
                              onClick={(e) => handlePDFAction(e, 'extended', 'print')}
                              className="w-full px-3 py-1.5 text-right text-xs hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Printer className="w-3 h-3" />
                              הדפס מורחב
                            </button>
                            <button
                              onClick={(e) => handlePDFAction(e, 'extended', 'download')}
                              className="w-full px-3 py-1.5 text-right text-xs hover:bg-gray-100 flex items-center gap-2"
                            >
                              <FileDown className="w-3 h-3" />
                              הורד מורחב
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleToggleFavorite}
                  >
                    <Heart 
                      className={`w-3 h-3 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                    />
                  </Button>
                </div>
              </div>
            </div>

            {/* Teams & Score */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 sm:gap-2 items-center">
              {/* Home Team */}
              <div className="text-center min-w-0">
                <div 
                  className="text-[10px] sm:text-xs font-bold py-1 px-1.5 sm:px-2 rounded mb-1 truncate text-center"
                  style={{ 
                    backgroundColor: homeColors.bg, 
                    color: homeColors.text 
                  }}
                >
                  {homeShortName}
                </div>
                {hasScore && (
                  <div 
                    className={`text-base sm:text-xl font-bold text-center ${homeWon ? 'text-green-600' : 'text-gray-500'}`}
                  >
                    {game.home_score}
                  </div>
                )}
              </div>

              {/* VS / Score Separator */}
              <div className="text-center px-1 sm:px-2 flex-shrink-0">
                {hasScore ? (
                  <div className="text-lg sm:text-2xl font-bold text-gray-400 text-center">-</div>
                ) : (
                  <div className="text-xs sm:text-sm font-semibold text-gray-400 text-center">VS</div>
                )}
              </div>

              {/* Away Team */}
              <div className="text-center min-w-0">
                <div 
                  className="text-[10px] sm:text-xs font-bold py-1 px-1.5 sm:px-2 rounded mb-1 truncate text-center"
                  style={{ 
                    backgroundColor: awayColors.bg, 
                    color: awayColors.text 
                  }}
                >
                  {awayShortName}
                </div>
                {hasScore && (
                  <div 
                    className={`text-base sm:text-xl font-bold text-center ${awayWon ? 'text-green-600' : 'text-gray-500'}`}
                  >
                    {game.away_score}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
