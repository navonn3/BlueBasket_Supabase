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
import { base44 } from "@/api/base44Client";
import { findTeamByName } from "../shared/teamHelpers";

export default function GameCard({ game, onToggleFavorite, isFavorite }) {
  const navigate = useNavigate();
  const [showPDFMenu, setShowPDFMenu] = useState(false);
  const hasScore = game.home_score !== null && game.home_score !== undefined;
  
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
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
  
  const handleClick = () => {
    const gameIdentifier = game.gameid || game.id;
    navigate(createPageUrl("GameDetail") + `?id=${gameIdentifier}`);
  };

  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite();
  };

  const handlePDFAction = (e, type, action) => {
    e.stopPropagation();
    window.open(createPageUrl("GameDayPDF") + `?id=${game.id}&type=${type}&action=${action}`, '_blank');
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
        </div>
        
        {/* Right side: Round badge, PDF menu, Favorite button */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {game.round && (
            <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0 sm:py-0.5 h-4 sm:h-5 whitespace-nowrap">
              מחזור {game.round}
            </Badge>
          )}
          
          {/* PDF Menu - Only for upcoming games */}
          {!hasScore && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPDFMenu(!showPDFMenu);
                }}
                className="p-0.5 sm:p-1 hover:scale-110 transition-transform flex items-center gap-1 flex-shrink-0"
                title="אפשרויות PDF"
              >
                <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                <ChevronDown className="w-2.5 h-2.5 text-blue-600" />
              </button>
              
              <AnimatePresence>
                {showPDFMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 whitespace-nowrap"
                    style={{ minWidth: '200px' }}
                  >
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 border-b border-gray-100">
                      PDF בסיסי
                    </div>
                    <button
                      onClick={(e) => handlePDFAction(e, 'basic', 'preview')}
                      className="w-full text-right px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-[11px]"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      הצג PDF
                    </button>
                    <button
                      onClick={(e) => handlePDFAction(e, 'basic', 'print')}
                      className="w-full text-right px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-[11px]"
                    >
                      <Printer className="w-3.5 h-3.5 text-gray-600" />
                      הדפס PDF
                    </button>
                    
                    <div className="h-px bg-gray-200 my-1" />
                    
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 border-b border-gray-100">
                      PDF מורחב
                    </div>
                    <button
                      onClick={(e) => handlePDFAction(e, 'extended', 'preview')}
                      className="w-full text-right px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-[11px]"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      הצג PDF
                    </button>
                    <button
                      onClick={(e) => handlePDFAction(e, 'extended', 'print')}
                      className="w-full text-right px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-[11px]"
                    >
                      <Printer className="w-3.5 h-3.5 text-gray-600" />
                      הדפס PDF
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          
          {/* Favorite button - Always visible */}
          <button
            onClick={handleToggleFavorite}
            className="p-0.5 sm:p-1 hover:scale-110 transition-transform flex-shrink-0"
            title="הוסף למועדפים"
          >
            <Heart 
              className="w-3.5 h-3.5 sm:w-4 sm:h-4" 
              style={{ color: 'var(--accent)' }}
              fill={isFavorite ? 'var(--accent)' : 'none'}
            />
          </button>
        </div>
      </div>

      {/* Teams and Scores */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2 mb-2">
        {/* Home Team */}
        <div className="min-w-0">
          <div 
            className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-1 sm:py-1.5 rounded truncate text-center"
            style={{ 
              backgroundColor: homeColors.bg, 
              color: homeColors.text,
              fontWeight: hasScore && homeWon ? 'bold' : 'semibold',
            }}
          >
            {homeShortName}
          </div>
          {hasScore && (
            <div 
              className="text-base sm:text-lg font-bold text-center mt-0.5 sm:mt-1" 
              style={{ 
                color: homeWon ? 'var(--accent)' : 'inherit',
                fontSize: homeWon ? '1.125rem' : '1rem'
              }}
            >
              {game.home_score}
            </div>
          )}
        </div>
        
        {/* VS / Status */}
        <div className="text-center px-1 sm:px-2 flex-shrink-0">
          <div className="text-[10px] sm:text-xs font-bold text-gray-400 whitespace-nowrap">VS</div>
          {hasScore && (
            <Badge className="mt-0.5 sm:mt-1 text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0 sm:py-0.5 h-4 sm:h-5 whitespace-nowrap" style={{ backgroundColor: 'var(--accent)' }}>
              סיום
            </Badge>
          )}
        </div>

        {/* Away Team */}
        <div className="min-w-0">
          <div 
            className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-1 sm:py-1.5 rounded truncate text-center"
            style={{ 
              backgroundColor: awayColors.bg, 
              color: awayColors.text,
              fontWeight: hasScore && awayWon ? 'bold' : 'semibold',
            }}
          >
            {awayShortName}
          </div>
          {hasScore && (
            <div 
              className="text-base sm:text-lg font-bold text-center mt-0.5 sm:mt-1" 
              style={{ 
                color: awayWon ? 'var(--accent)' : 'inherit',
                fontSize: awayWon ? '1.125rem' : '1rem'
              }}
            >
              {game.away_score}
            </div>
          )}
        </div>
      </div>

      {/* Venue - Only for upcoming games */}
      {!hasScore && game.venue && (
        <div className="flex items-start gap-1 text-[9px] sm:text-[10px] text-gray-500 pt-1.5 sm:pt-2 border-t border-gray-100">
          <MapPin className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" />
          <span className="break-words line-clamp-2">{game.venue}</span>
        </div>
      )}
    </div>
  </CardContent>
</Card>
    </motion.div>
  );
}