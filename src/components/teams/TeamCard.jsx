import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Users, Trophy, ChevronDown, ChevronUp, Heart, Eye, TrendingUp, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TeamCard({ team, players, rank, onToggleFavorite }) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = (e) => {
    if (e.target.closest('button')) return;
    setIsExpanded(!isExpanded);
  };

  const handleViewTeam = (e) => {
    e.stopPropagation();
    navigate(createPageUrl("TeamDetail") + `?id=${team.id}`);
  };

  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite();
  };

  const displayName = team.short_name || team.team_name;
  const bgColor = team.bg_color || 'var(--accent)';
  const textColor = team.text_color || '#FFFFFF';

  const teamAvg = team.averages;
  const oppAvg = team.opponentAvg;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className="cursor-pointer"
    >
      <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" 
                style={{ backgroundColor: bgColor }}
              >
                <Users className="w-6 h-6" style={{ color: textColor }} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold truncate" style={{ color: 'var(--primary)' }}>
                  {displayName}
                </h3>
                <div className="flex gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-500">
                    {team.playersCount} שחקנים
                  </span>
                  {team.gamesPlayed > 0 && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-500">
                        {team.wins}-{team.losses}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleFavorite}
                className="p-2 hover:scale-110 transition-transform"
              >
                <Heart 
                  className="w-5 h-5" 
                  style={{ color: 'var(--accent)' }}
                  fill={team.isFavorite ? 'var(--accent)' : 'none'}
                />
              </button>

              <div className="text-center">
                <div className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                  Win% {team.winPercentage.toFixed(1)}%
                </div>
                <Badge className="text-xs mt-1" style={{ backgroundColor: bgColor, color: textColor }}>
                  <Trophy className="w-2.5 h-2.5 ml-1" />
                  #{rank}
                </Badge>
              </div>
              
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && teamAvg && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 pt-4 border-t border-gray-100 space-y-3 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 text-center border border-orange-200">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="w-3 h-3 text-orange-600" />
                      <span className="text-[10px] font-semibold text-gray-600">נק' למשחק</span>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                      {teamAvg.pts?.toFixed(1) || '-'}
                    </div>
                    {teamAvg.pts_rank && (
                      <div className="text-xs text-gray-600 mt-1">#{teamAvg.pts_rank} בליגה</div>
                    )}
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 text-center border border-blue-200">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Shield className="w-3 h-3 text-blue-600" />
                      <span className="text-[10px] font-semibold text-gray-600">נק' יריבים</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-700">
                      {oppAvg?.opp_pts?.toFixed(1) || '-'}
                    </div>
                    {oppAvg?.opp_pts_rank && (
                      <div className="text-xs text-gray-600 mt-1">#{oppAvg.opp_pts_rank} בליגה</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <StatBox 
                    label="% מהשדה (FG%)" 
                    value={teamAvg.fg_pct ? `${teamAvg.fg_pct.toFixed(1)}%` : '-'} 
                    subValue={teamAvg.fgm && teamAvg.fga ? `${teamAvg.fgm.toFixed(0)}/${teamAvg.fga.toFixed(0)}` : ''}
                  />
                  <StatBox 
                    label="% ל-3 (3P%)" 
                    value={teamAvg['3pt_pct'] ? `${teamAvg['3pt_pct'].toFixed(1)}%` : '-'} 
                    subValue={teamAvg['3ptm'] && teamAvg['3pta'] ? `${teamAvg['3ptm'].toFixed(0)}/${teamAvg['3pta'].toFixed(0)}` : ''}
                  />
                  <StatBox 
                    label="% עונ' (FT%)" 
                    value={teamAvg.ft_pct ? `${teamAvg.ft_pct.toFixed(1)}%` : '-'} 
                    subValue={teamAvg.ftm && teamAvg.fta ? `${teamAvg.ftm.toFixed(0)}/${teamAvg.fta.toFixed(0)}` : ''}
                  />
                </div>

                <Button
                  onClick={handleViewTeam}
                  className="w-full text-white text-xs h-8"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  <Eye className="w-3 h-3 ml-1" />
                  צפה בדף הקבוצה המלא
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatBox({ label, value, subValue }) {
  return (
    <div className="bg-white rounded-lg p-2 text-center border border-gray-200">
      <div className="text-sm font-bold text-gray-700">{value}</div>
      {subValue && <div className="text-[9px] text-gray-500 mb-1">{subValue}</div>}
      <div className="text-[9px] text-gray-600">{label}</div>
    </div>
  );
}