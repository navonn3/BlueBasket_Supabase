import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search, Users } from "lucide-react";

import TeamCard from "../components/teams/TeamCard";

export default function TeamsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
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

  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return [];
      return base44.entities.Team.filter({ league_id: selectedLeague });
    },
    initialData: [],
    enabled: !!selectedLeague,
  });

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['players', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return [];
      return base44.entities.Player.filter({ league_id: selectedLeague });
    },
    initialData: [],
    enabled: !!selectedLeague,
  });

  const { data: games, isLoading: gamesLoading } = useQuery({
    queryKey: ['games', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return [];
      return base44.entities.Game.filter({ league_id: selectedLeague }, 'date');
    },
    initialData: [],
    enabled: !!selectedLeague,
  });

  const { data: teamAverages, isLoading: teamAvgLoading } = useQuery({
    queryKey: ['teamAverages', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return [];
      return base44.entities.TeamAverages.filter({ league_id: selectedLeague });
    },
    initialData: [],
    enabled: !!selectedLeague,
  });

  const { data: opponentAverages, isLoading: oppAvgLoading } = useQuery({
    queryKey: ['opponentAverages', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return [];
      return base44.entities.OpponentAverages.filter({ league_id: selectedLeague });
    },
    initialData: [],
    enabled: !!selectedLeague,
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: favorites, isLoading: favoritesLoading } = useQuery({
    queryKey: ['favorites', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Favorite.filter({ user_email: user.email, item_type: 'team' });
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ teamName, isFavorite }) => {
      if (isFavorite) {
        const fav = favorites.find(f => f.item_id === teamName);
        if (fav) await base44.entities.Favorite.delete(fav.id);
      } else {
        await base44.entities.Favorite.create({
          user_email: user.email,
          item_type: 'team',
          item_id: teamName,
          item_name: teamName
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['favorites']);
    }
  });

  const isLoading = teamsLoading || playersLoading || gamesLoading || teamAvgLoading || oppAvgLoading;

  if (!selectedLeague) {
    return (
      <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-7xl mx-auto text-center py-12">
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--primary)' }}>
            אנא בחר ליגה מהתפריט
          </h2>
        </div>
      </div>
    );
  }

  const filteredTeams = teams.filter(team => 
    !searchQuery || 
    team.team_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.short_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const teamsWithStats = filteredTeams.map(team => {
    // Count players by matching league_id AND current_team_id
    const teamPlayers = players.filter(p => 
      p.league_id === team.league_id && 
      p.current_team_id === team.team_id
    );
    
    const teamGames = games.filter(g => 
      g.home_team_id === team.team_id || g.away_team_id === team.team_id
    );
    
    const completedGames = teamGames.filter(g => 
      g.home_score !== null && g.home_score !== undefined
    );
    
    let wins = 0;
    let losses = 0;
    completedGames.forEach(game => {
      if (game.home_team_id === team.team_id) {
        if (game.home_score > game.away_score) wins++;
        else losses++;
      } else {
        if (game.away_score > game.home_score) wins++;
        else losses++;
      }
    });

    const teamAvg = teamAverages.find(avg => avg.team_id === team.team_id);
    const oppAvg = opponentAverages.find(avg => avg.team_id === team.team_id);
    const isFavorite = favorites.some(f => f.item_id === team.team_name);
    const winPercentage = completedGames.length > 0 ? (wins / completedGames.length) * 100 : 0;

    return {
      ...team,
      playersCount: teamPlayers.length,
      gamesPlayed: completedGames.length,
      wins,
      losses,
      winPercentage,
      averages: teamAvg,
      opponentAvg: oppAvg,
      isFavorite
    };
  }).sort((a, b) => b.winPercentage - a.winPercentage);

  return (
    <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <h1 className="text-lg md:text-2xl font-bold mb-1" style={{ color: 'var(--primary)' }}>
            קבוצות הליגה
          </h1>
          <p className="text-xs md:text-sm text-gray-600">צפה בכל הקבוצות והשחקנים שלהן</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 mb-0.5">סה"כ קבוצות</p>
                <p className="text-xl font-bold" style={{ color: 'var(--primary)' }}>{teams.length}</p>
              </div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)' }}>
                <Users className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 mb-0.5">סה"כ שחקנים</p>
                <p className="text-xl font-bold" style={{ color: 'var(--primary)' }}>{players.length}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 mb-0.5">ממוצע שחקנים לקבוצה</p>
                <p className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
                  {teams.length > 0 ? Math.round(players.length / teams.length) : 0}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-4">
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <Input
              placeholder="חיפוש קבוצה..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 h-9 text-xs border-gray-200 focus:border-orange-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : teamsWithStats.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <p className="text-gray-600">לא נמצאו קבוצות</p>
          </div>
        ) : (
          <div className="space-y-2">
            {teamsWithStats.map((team, index) => (
              <TeamCard
                key={team.id}
                team={team}
                players={players.filter(p => 
                  p.league_id === team.league_id && 
                  p.current_team_id === team.team_id
                )}
                rank={index + 1}
                onToggleFavorite={() => toggleFavoriteMutation.mutate({
                  teamName: team.team_name,
                  isFavorite: team.isFavorite
                })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}