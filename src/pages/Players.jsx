import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { RangeSlider } from "@/components/ui/range-slider";

import PlayerCard from "../components/players/PlayerCard";
import StatsOverview from "../components/players/StatsOverview";
import EmptyState from "../components/players/EmptyState";

export default function PlayersPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [showFilters, setShowFilters] = useState(false);
  const [ageRange, setAgeRange] = useState([18, 40]);
  const [heightRange, setHeightRange] = useState([170, 220]);
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

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['players', selectedLeague],
    queryFn: () => base44.entities.Player.filter({ league_id: selectedLeague }),
    initialData: [],
  });

  const { data: playerAverages, isLoading: averagesLoading } = useQuery({
    queryKey: ['playerAverages', selectedLeague],
    queryFn: () => base44.entities.PlayerAverages.filter({ league_id: selectedLeague }),
    initialData: [],
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: favorites, isLoading: favoritesLoading } = useQuery({
    queryKey: ['favorites', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Favorite.filter({ user_email: user.email, item_type: 'player' });
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ playerId, playerName, isFavorite }) => {
      if (isFavorite) {
        const fav = favorites.find(f => f.item_id === playerId);
        if (fav) await base44.entities.Favorite.delete(fav.id);
      } else {
        await base44.entities.Favorite.create({
          user_email: user.email,
          item_type: 'player',
          item_id: playerId,
          item_name: playerName
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['favorites']);
    }
  });

  const isLoading = playersLoading || averagesLoading;

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const parseHeight = (heightValue) => {
    if (!heightValue) return null;
    
    // If it's already a number, convert to cm
    if (typeof heightValue === 'number') {
      // If it's less than 10, assume it's in meters
      if (heightValue < 10) {
        return heightValue * 100;
      }
      // Otherwise it's already in cm
      return heightValue;
    }
    
    // If it's a string, try to parse it
    if (typeof heightValue === 'string') {
      const match = heightValue.match(/(\d+\.?\d*)/);
      if (match) {
        const value = parseFloat(match[0]);
        // If it's less than 10, assume it's in meters
        if (value < 10) {
          return value * 100;
        }
        return value;
      }
    }
    
    return null;
  };

  const playersWithStats = players.map(player => {
    const stats = playerAverages.find(avg => {
      if (avg.player_name === player.name) return true;
      const normalize = (str) => str?.trim().toLowerCase().replace(/\s+/g, ' ');
      return normalize(avg.player_name) === normalize(player.name);
    });
    
    const age = calculateAge(player.date_of_birth);
    const heightCm = parseHeight(player.height);
    const isFavorite = favorites.some(f => f.item_id === player.id);
    
    return { ...player, stats, age, heightCm, isFavorite };
  });

  const teams = [...new Set(players.map(p => p.team).filter(Boolean))].sort();

  let filteredPlayers = playersWithStats.filter(player => {
    const matchesSearch = !searchQuery || 
      player.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.team?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = selectedTeam === "all" || player.team === selectedTeam;
    const matchesAge = !player.age || (player.age >= ageRange[0] && player.age <= ageRange[1]);
    const matchesHeight = !player.heightCm || (player.heightCm >= heightRange[0] && player.heightCm <= heightRange[1]);
    return matchesSearch && matchesTeam && matchesAge && matchesHeight;
  });

  if (sortBy === "name") {
    filteredPlayers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else if (sortBy === "pts_desc") {
    filteredPlayers.sort((a, b) => (b.stats?.pts || 0) - (a.stats?.pts || 0));
  } else if (sortBy === "reb_desc") {
    filteredPlayers.sort((a, b) => (b.stats?.reb || 0) - (a.stats?.reb || 0));
  } else if (sortBy === "ast_desc") {
    filteredPlayers.sort((a, b) => (b.stats?.ast || 0) - (a.stats?.ast || 0));
  } else if (sortBy === "age_asc") {
    filteredPlayers.sort((a, b) => (a.age || 999) - (b.age || 999));
  } else if (sortBy === "age_desc") {
    filteredPlayers.sort((a, b) => (b.age || 0) - (a.age || 0));
  } else if (sortBy === "height_asc") {
    filteredPlayers.sort((a, b) => (a.heightCm || 0) - (b.heightCm || 0));
  } else if (sortBy === "height_desc") {
    filteredPlayers.sort((a, b) => (b.heightCm || 0) - (a.heightCm || 0));
  }

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTeam("all");
    setSortBy("name");
    setAgeRange([18, 40]);
    setHeightRange([170, 220]);
  };

  const hasActiveFilters = searchQuery || selectedTeam !== "all" || sortBy !== "name" || 
    ageRange[0] !== 18 || ageRange[1] !== 40 || heightRange[0] !== 170 || heightRange[1] !== 220;

  return (
    <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <h1 className="text-lg md:text-2xl font-bold mb-1" style={{ color: 'var(--primary)' }}>
            שחקני הליגה
          </h1>
          <p className="text-xs md:text-sm text-gray-600">חפש וצפה במידע על שחקני הליגה</p>
        </div>

        <StatsOverview players={playersWithStats} isLoading={isLoading} />

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-4">
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <Input
                placeholder="חיפוש לפי שם שחקן או קבוצה..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 h-9 text-xs border-gray-200 focus:border-orange-500"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="flex-1 min-w-[120px] h-9 border-gray-200 text-xs">
                  <SelectValue placeholder="כל הקבוצות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הקבוצות</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team} value={team}>{team}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="flex-1 min-w-[120px] h-9 border-gray-200 text-xs">
                  <SelectValue placeholder="מיון" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">שם (א-ת)</SelectItem>
                  <SelectItem value="pts_desc">נקודות (גבוה-נמוך)</SelectItem>
                  <SelectItem value="reb_desc">ריבאונדים (גבוה-נמוך)</SelectItem>
                  <SelectItem value="ast_desc">אסיסטים (גבוה-נמוך)</SelectItem>
                  <SelectItem value="age_asc">גיל (צעיר-מבוגר)</SelectItem>
                  <SelectItem value="age_desc">גיל (מבוגר-צעיר)</SelectItem>
                  <SelectItem value="height_asc">גובה (נמוך-גבוה)</SelectItem>
                  <SelectItem value="height_desc">גובה (גבוה-נמוך)</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="h-9 text-xs px-3"
                size="sm"
              >
                <SlidersHorizontal className="w-3 h-3 ml-1" />
                {showFilters ? 'הסתר' : 'סינון מתקדם'}
              </Button>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="h-9 text-xs px-3"
                  size="sm"
                >
                  <X className="w-3 h-3 ml-1" />
                  נקה הכל
                </Button>
              )}
            </div>

            {showFilters && (
              <Card className="mt-2 border-gray-200">
                <CardContent className="p-4 space-y-4">
                  <RangeSlider
                    min={18}
                    max={40}
                    step={1}
                    value={ageRange}
                    onValueChange={setAgeRange}
                    label="טווח גיל"
                  />
                  <RangeSlider
                    min={170}
                    max={220}
                    step={1}
                    value={heightRange}
                    onValueChange={setHeightRange}
                    label="טווח גובה (ס״מ)"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-64 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredPlayers.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters} onClearFilters={clearFilters} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPlayers.map((player) => (
              <PlayerCard 
                key={player.id} 
                player={player}
                onToggleFavorite={() => toggleFavoriteMutation.mutate({
                  playerId: player.id,
                  playerName: player.name,
                  isFavorite: player.isFavorite
                })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}