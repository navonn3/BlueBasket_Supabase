import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Calendar as CalendarIcon, MapPin, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import GameCard from "../components/games/GameCard";
import EmptyGamesState from "../components/games/EmptyGamesState";

export default function GamesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedRound, setSelectedRound] = useState("all");
  const [gameFilter, setGameFilter] = useState("all");
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
  
  const { data: games, isLoading } = useQuery({
    queryKey: ['games', selectedLeague],
    queryFn: async () => {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('league_id', selectedLeague)
        .order('date', { ascending: true }); // שינוי כאן: מהישן לחדש
      return data || [];
    },
    initialData: [],
  });
  
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });
  
  const { data: favorites, isLoading: favoritesLoading } = useQuery({
    queryKey: ['favorites', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_email', user.email)
        .eq('item_type', 'game');
      return data || [];
    },
    enabled: !!user?.email,
    initialData: [],
  });
  
  const gamesWithDetails = games.map(game => {
    // id הוא ה-primary key האמיתי של הטבלה
    const gameIdentifier = game.id;
    const isFavorite = favorites.some(f => f.item_id === gameIdentifier);

    return {
      ...game,
      isFavorite
    };
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ gameId, gameName, isFavorite }) => {
      if (isFavorite) {
        const fav = favorites.find(f => f.item_id === gameId);
        if (fav) {
          await supabase.from('favorites').delete().eq('id', fav.id);
        }
      } else {
        await supabase.from('favorites').insert({
          user_email: user.email,
          item_type: 'game',
          item_id: gameId,
          item_name: gameName
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['favorites']);
    }
  });

  const teams = [...new Set([
    ...games.map(g => g.home_team),
    ...games.map(g => g.away_team)
  ].filter(Boolean))].sort();

  const rounds = [...new Set(games.map(g => g.round).filter(Boolean))].sort((a, b) => {
    const numA = parseInt(a) || 0;
    const numB = parseInt(b) || 0;
    return numB - numA;
  });

  const completedGames = gamesWithDetails.filter(g => g.home_score !== null && g.home_score !== undefined);
  const upcomingGames = gamesWithDetails.filter(g => g.home_score === null || g.home_score === undefined);

  const getFilteredGames = () => {
    let gamesToFilter = gamesWithDetails;
    if (gameFilter === "completed") gamesToFilter = completedGames;
    if (gameFilter === "upcoming") gamesToFilter = upcomingGames;

    return gamesToFilter.filter(game => {
      const matchesSearch = !searchQuery ||
        game.home_team?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.away_team?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.venue?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTeam = selectedTeam === "all" ||
        game.home_team === selectedTeam ||
        game.away_team === selectedTeam;
      const matchesRound = selectedRound === "all" || game.round === selectedRound;
      return matchesSearch && matchesTeam && matchesRound;
    });
  };

  const filteredGames = getFilteredGames();

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTeam("all");
    setSelectedRound("all");
  };

  const hasActiveFilters = searchQuery || selectedTeam !== "all" || selectedRound !== "all";

  return (
    <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <h1 className="text-lg md:text-2xl font-bold mb-1" style={{ color: 'var(--primary)' }}>
            לוח משחקים
          </h1>
          <p className="text-xs md:text-sm text-gray-600">צפה בכל משחקי העונה ותוצאות</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 mb-0.5">סה"כ משחקים</p>
                <p className="text-xl font-bold" style={{ color: 'var(--primary)' }}>{games.length}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 mb-0.5">הושלמו</p>
                <p className="text-xl font-bold text-green-600">{completedGames.length}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <CalendarIcon className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 mb-0.5">עתידיים</p>
                <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{upcomingGames.length}</p>
              </div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)' }}>
                <CalendarIcon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-4">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <Input
                placeholder="חיפוש לפי קבוצה..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 h-9 text-xs border-gray-200 focus:border-orange-500"
              />
            </div>

            <div className="flex gap-2">
              <Select value={selectedRound} onValueChange={setSelectedRound}>
                <SelectTrigger className="flex-1 h-9 border-gray-200 text-xs">
                  <SelectValue placeholder="כל המחזורים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המחזורים</SelectItem>
                  {rounds
                    .sort((a, b) => Number(a) - Number(b))
                    .map(round => (
                      <SelectItem key={round} value={round}>מחזור {round}</SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="flex-1 h-9 border-gray-200 text-xs">
                  <SelectValue placeholder="כל הקבוצות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הקבוצות</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team} value={team}>{team}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="h-9 text-xs px-3" size="sm">
                  <X className="w-3 h-3 ml-1" />
                  נקה
                </Button>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredGames.length === 0 ? (
          <EmptyGamesState hasFilters={hasActiveFilters} onClearFilters={clearFilters} />
        ) : (
          <div className="space-y-2">
            {filteredGames.map((game) => {
              // תיקון: מעבירים את כל האובייקט game
              const gameIdentifier = game.gameid || game.id;
              const gameName = `${game.home_team} vs ${game.away_team}`;
              
              return (
                <GameCard
                  key={game.id}
                  game={game}
                  isFavorite={game.isFavorite}
                  onToggleFavorite={() => toggleFavoriteMutation.mutate({
                    gameId: gameIdentifier,
                    gameName: gameName,
                    isFavorite: game.isFavorite
                  })}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
