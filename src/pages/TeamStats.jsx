import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, Trophy, Target, SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const ALL_STATS = [
  { key: 'pts', label: 'נק\' (PTS)', isOpponent: false },
  { key: 'reb', label: 'ריב\' (REB)', isOpponent: false },
  { key: 'ast', label: 'אס\' (AST)', isOpponent: false },
  { key: 'stl', label: 'חט\' (STL)', isOpponent: false },
  { key: 'blk', label: 'חס\' (BLK)', isOpponent: false },
  { key: 'to', label: 'איב\' (TO)', isOpponent: false },
  { key: 'pf', label: 'עב\' (PF)', isOpponent: false },
  { key: 'fg_pct', label: '% מהשדה (FG%)', isOpponent: false, isPercent: true },
  { key: '3pt_pct', label: '% ל-3 (3P%)', isOpponent: false, isPercent: true },
  { key: 'ft_pct', label: '% עונ\' (FT%)', isOpponent: false, isPercent: true },
  { key: 'opp_pts', label: 'נק\' יריבים', isOpponent: true },
  { key: 'opp_fg_pct', label: '% יריבים מהשדה', isOpponent: true, isPercent: true },
  { key: 'opp_to', label: 'איב\' יריבים', isOpponent: true },
];

export default function TeamStatsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("pts");
  const [selectedStats, setSelectedStats] = useState(['pts', 'reb', 'ast']);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState(() => {
    return localStorage.getItem('selectedLeague') || 'leumit';
  });

  useEffect(() => {
    const handleLeagueChange = (e) => {
      setSelectedLeague(e.detail);
    };
    window.addEventListener('leagueChanged', handleLeagueChange);
    return () => window.removeEventListener('leagueChanged', handleLeagueChange);
  }, []);

  const { data: teamAverages, isLoading: teamAvgLoading } = useQuery({
    queryKey: ['teamAverages', selectedLeague],
    queryFn: () => base44.entities.TeamAverages.filter({ league_id: selectedLeague }),
    initialData: [],
  });

  const { data: opponentAverages, isLoading: oppAvgLoading } = useQuery({
    queryKey: ['opponentAverages', selectedLeague],
    queryFn: () => base44.entities.OpponentAverages.filter({ league_id: selectedLeague }),
    initialData: [],
  });

  const { data: games } = useQuery({
    queryKey: ['games', selectedLeague],
    queryFn: () => base44.entities.Game.filter({ league_id: selectedLeague }),
    initialData: [],
  });

  const { data: teamColors } = useQuery({
    queryKey: ['teamColors'],
    queryFn: () => base44.entities.TeamColors.list(),
    initialData: [],
  });

  const isLoading = teamAvgLoading || oppAvgLoading;

  const teamsWithAllStats = teamAverages.map(team => {
    const oppData = opponentAverages.find(opp => opp.team === team.team);
    const teamGames = games.filter(g => g.home_team === team.team || g.away_team === team.team);
    const completedGames = teamGames.filter(g => g.home_score !== null && g.home_score !== undefined);
    
    let wins = 0;
    completedGames.forEach(game => {
      if (game.home_team === team.team) {
        if (game.home_score > game.away_score) wins++;
      } else {
        if (game.away_score > game.home_score) wins++;
      }
    });

    const colors = teamColors.find(c => c.team_name === team.team);

    return {
      ...team,
      ...oppData,
      wins,
      losses: completedGames.length - wins,
      bgColor: colors?.bg_color || 'var(--primary)',
      textColor: colors?.text_color || '#FFFFFF'
    };
  });

  const filteredTeams = teamsWithAllStats.filter(team => 
    !searchQuery || team.team?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedTeams = [...filteredTeams].sort((a, b) => {
    const statDef = ALL_STATS.find(s => s.key === sortBy);
    if (!statDef) return 0;
    
    const aVal = a[sortBy] || 0;
    const bVal = b[sortBy] || 0;
    
    if (statDef.isOpponent) {
      return aVal - bVal;
    }
    return bVal - aVal;
  });

  const handleStatToggle = (statKey) => {
    if (selectedStats.includes(statKey)) {
      if (selectedStats.length > 1) {
        setSelectedStats(selectedStats.filter(s => s !== statKey));
      }
    } else {
      if (selectedStats.length < 3) {
        setSelectedStats([...selectedStats, statKey]);
      }
    }
  };

  return (
    <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <h1 className="text-lg md:text-xl font-bold mb-1" style={{ color: 'var(--primary)' }}>
            סטטיסטיקה קבוצתית
          </h1>
          <p className="text-xs md:text-sm text-gray-600">ממוצעי כל הקבוצות בליגה</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 mb-4">
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <Input
                placeholder="חיפוש קבוצה..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 h-9 text-xs border-gray-200"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="flex-1 min-w-[150px] h-9 border-gray-200 text-xs">
                  <SelectValue placeholder="מיון לפי" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_STATS.map(stat => (
                    <SelectItem key={stat.key} value={stat.key}>{stat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Dialog open={isDialogOpen} onValueChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 text-xs">
                    <SlidersHorizontal className="w-3 h-3 ml-1" />
                    בחר סטטיסטיקות ({selectedStats.length}/3)
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>בחר עד 3 סטטיסטיקות להצגה</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3 py-4">
                    <div className="font-semibold text-sm">סטטיסטיקות קבוצה</div>
                    {ALL_STATS.filter(s => !s.isOpponent).map(stat => (
                      <div key={stat.key} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          checked={selectedStats.includes(stat.key)}
                          onCheckedChange={() => handleStatToggle(stat.key)}
                          disabled={!selectedStats.includes(stat.key) && selectedStats.length >= 3}
                        />
                        <label className="text-sm cursor-pointer" onClick={() => handleStatToggle(stat.key)}>{stat.label}</label>
                      </div>
                    ))}
                    
                    <div className="font-semibold text-sm mt-2">סטטיסטיקות יריבים</div>
                    {ALL_STATS.filter(s => s.isOpponent).map(stat => (
                      <div key={stat.key} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          checked={selectedStats.includes(stat.key)}
                          onCheckedChange={() => handleStatToggle(stat.key)}
                          disabled={!selectedStats.includes(stat.key) && selectedStats.length >= 3}
                        />
                        <label className="text-sm cursor-pointer" onClick={() => handleStatToggle(stat.key)}>{stat.label}</label>
                      </div>
                    ))}
                  </div>
                  <Button onClick={() => setIsDialogOpen(false)}>סגור</Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-32 bg-white rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedTeams.map((team, idx) => {
              const sortedStat = ALL_STATS.find(s => s.key === sortBy);
              const sortedValue = team[sortBy];

              return (
                <Card key={team.id || idx} className="border-none shadow-sm hover:shadow-md transition-all duration-200">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: team.bgColor }}>
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold truncate" style={{ color: 'var(--primary)' }}>
                            {team.team}
                          </h3>
                          <p className="text-[10px] text-gray-500">
                            {team.wins}-{team.losses}
                          </p>
                        </div>
                      </div>
                      {sortedValue !== undefined && sortedValue !== null && (
                        <Badge className="text-xs flex-shrink-0" style={{ backgroundColor: 'var(--accent)' }}>
                          {sortedStat.isPercent ? `${Number(sortedValue).toFixed(1)}%` : Number(sortedValue).toFixed(1)}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {selectedStats.map(statKey => {
                        const statDef = ALL_STATS.find(s => s.key === statKey);
                        const value = team[statKey];
                        if (!statDef || value === undefined || value === null) return null;

                        return (
                          <TeamStatBox
                            key={statKey}
                            label={statDef.label}
                            value={statDef.isPercent ? `${Number(value).toFixed(1)}%` : Number(value).toFixed(1)}
                          />
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamStatBox({ label, value }) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2 text-center border border-gray-200">
      <div className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{value}</div>
      <div className="text-[9px] text-gray-600">{label}</div>
    </div>
  );
}