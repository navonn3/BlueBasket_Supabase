import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function StandingsPage() {
  const [selectedLeague, setSelectedLeague] = useState(() => {
    const stored = localStorage.getItem('selectedLeague');
    return stored ? parseInt(stored) : null;
  });

  useEffect(() => {
    const handleLeagueChange = (e) => {
      setSelectedLeague(e.detail);
    };
    window.addEventListener('leagueChanged', handleLeagueChange);
    return () => window.removeEventListener('leagueChanged', handleLeagueChange);
  }, []);

  // Fetch games
  const { data: games, isLoading: gamesLoading } = useQuery({
    queryKey: ['games', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return [];
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('league_id', selectedLeague);
      
      if (error) throw error;
      return data || [];
    },
    initialData: [],
    enabled: !!selectedLeague,
  });

  // Fetch teams
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return [];
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('league_id', selectedLeague);
      
      if (error) throw error;
      return data || [];
    },
    initialData: [],
    enabled: !!selectedLeague,
  });

  const isLoading = gamesLoading || teamsLoading;

  // Calculate standings
  const calculateStandings = () => {
    const teamStats = {};

    // Initialize stats for all teams
    teams.forEach(team => {
      teamStats[team.team_id] = {
        team_id: team.team_id,
        team_name: team.short_name || team.team_name,
        bgColor: team.bg_color || 'var(--primary)',
        textColor: team.text_color || '#FFFFFF',
        games: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointsDiff: 0,
      };
    });

    // Calculate stats from completed games
    const completedGames = games.filter(g => 
      g.home_score !== null && 
      g.home_score !== undefined && 
      g.away_score !== null && 
      g.away_score !== undefined
    );

    completedGames.forEach(game => {
      const homeTeamId = game.home_team_id;
      const awayTeamId = game.away_team_id;
      const homeScore = Number(game.home_score);
      const awayScore = Number(game.away_score);

      if (teamStats[homeTeamId]) {
        teamStats[homeTeamId].games++;
        teamStats[homeTeamId].pointsFor += homeScore;
        teamStats[homeTeamId].pointsAgainst += awayScore;
        teamStats[homeTeamId].pointsDiff += (homeScore - awayScore);
        
        if (homeScore > awayScore) {
          teamStats[homeTeamId].wins++;
        } else {
          teamStats[homeTeamId].losses++;
        }
      }

      if (teamStats[awayTeamId]) {
        teamStats[awayTeamId].games++;
        teamStats[awayTeamId].pointsFor += awayScore;
        teamStats[awayTeamId].pointsAgainst += homeScore;
        teamStats[awayTeamId].pointsDiff += (awayScore - homeScore);
        
        if (awayScore > homeScore) {
          teamStats[awayTeamId].wins++;
        } else {
          teamStats[awayTeamId].losses++;
        }
      }
    });

    // Convert to array and calculate win percentage
    const standings = Object.values(teamStats).map(team => ({
      ...team,
      winPct: team.games > 0 ? (team.wins / team.games * 100) : 0,
    }));

    // Sort by wins (descending), then by point differential (descending)
    standings.sort((a, b) => {
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }
      return b.pointsDiff - a.pointsDiff;
    });

    return standings;
  };

  const standings = calculateStandings();

  if (!selectedLeague) {
    return (
      <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-5xl mx-auto text-center py-12">
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--primary)' }}>
            אנא בחר ליגה מהתפריט
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <h1 className="text-lg md:text-2xl font-bold mb-1" style={{ color: 'var(--primary)' }}>
            טבלת הליגה
          </h1>
          <p className="text-xs md:text-sm text-gray-600">דירוג הקבוצות לפי תוצאות המשחקים</p>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : standings.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">אין נתונים זמינים</p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[40px_1fr_60px_60px_60px_80px_70px] gap-2 p-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600">
              <div className="text-center">#</div>
              <div>קבוצה</div>
              <div className="text-center">משחקים</div>
              <div className="text-center">ניצחונות</div>
              <div className="text-center">הפסדים</div>
              <div className="text-center">הפרש סלים</div>
              <div className="text-center">אחוזים</div>
            </div>

            {/* Rows */}
            {standings.map((team, index) => (
              <div
                key={team.team_id}
                className="grid grid-cols-[40px_1fr_60px_60px_60px_80px_70px] gap-2 p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors items-center"
              >
                {/* Rank */}
                <div className="flex items-center justify-center">
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ 
                      backgroundColor: team.bgColor,
                      color: team.textColor
                    }}
                  >
                    {index + 1}
                  </div>
                </div>

                {/* Team Name */}
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm" style={{ color: 'var(--primary)' }}>
                    {team.team_name}
                  </span>
                  {index === 0 && (
                    <Trophy className="w-4 h-4 text-yellow-500" />
                  )}
                </div>

                {/* Games */}
                <div className="text-center text-sm font-medium">
                  {team.games}
                </div>

                {/* Wins */}
                <div className="text-center">
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    {team.wins}
                  </Badge>
                </div>

                {/* Losses */}
                <div className="text-center">
                  <Badge className="bg-red-100 text-red-700 text-xs">
                    {team.losses}
                  </Badge>
                </div>

                {/* Point Differential */}
                <div className="text-center">
                  <div className={`flex items-center justify-center gap-1 text-sm font-bold ${
                    team.pointsDiff > 0 ? 'text-green-600' : 
                    team.pointsDiff < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {team.pointsDiff > 0 && <TrendingUp className="w-3 h-3" />}
                    {team.pointsDiff < 0 && <TrendingDown className="w-3 h-3" />}
                    {team.pointsDiff === 0 && <Minus className="w-3 h-3" />}
                    {team.pointsDiff > 0 ? '+' : ''}{team.pointsDiff}
                  </div>
                </div>

                {/* Win Percentage */}
                <div className="text-center">
                  <div className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                    {team.winPct.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {standings.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-none shadow-sm">
              <CardContent className="p-3">
                <div className="text-xs text-gray-500 mb-1">סה"כ משחקים</div>
                <div className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
                  {standings.reduce((sum, team) => sum + team.games, 0) / 2}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardContent className="p-3">
                <div className="text-xs text-gray-500 mb-1">מוביל</div>
                <div className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                  {standings[0]?.team_name}
                </div>
                <div className="text-xs text-gray-500">
                  {standings[0]?.wins}-{standings[0]?.losses}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardContent className="p-3">
                <div className="text-xs text-gray-500 mb-1">ניצחון גדול</div>
                <div className="text-xl font-bold text-green-600">
                  {Math.max(...standings.map(t => t.wins))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardContent className="p-3">
                <div className="text-xs text-gray-500 mb-1">הפרש גדול</div>
                <div className="text-xl font-bold text-blue-600">
                  +{Math.max(...standings.map(t => t.pointsDiff))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
