import React from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, Calendar, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function FavoritesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch favorites
  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favorites', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_email', user.email);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.email,
    initialData: [],
  });

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['favorites']);
    }
  });

  const playerFavorites = favorites.filter(f => f.item_type === 'player');
  const teamFavorites = favorites.filter(f => f.item_type === 'team');
  const gameFavorites = favorites.filter(f => f.item_type === 'game');

  const handleNavigate = (fav) => {
    if (fav.item_type === 'player') {
      navigate(createPageUrl("PlayerDetail") + `?id=${fav.item_id}`);
    } else if (fav.item_type === 'team') {
      navigate(createPageUrl("TeamDetail") + `?name=${encodeURIComponent(fav.item_id)}`);
    } else if (fav.item_type === 'game') {
      navigate(createPageUrl("GameDetail") + `?id=${fav.item_id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-3" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-3">
            <div className="h-32 bg-white rounded-lg" />
            <div className="h-32 bg-white rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <h1 className="text-lg md:text-2xl font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
            <Heart className="w-6 h-6" style={{ color: 'var(--accent)' }} fill="var(--accent)" />
            המועדפים שלי
          </h1>
          <p className="text-xs md:text-sm text-gray-600">
            שחקנים, קבוצות ומשחקים שסימנת כמועדפים
          </p>
        </div>

        {favorites.length === 0 ? (
          <Card className="border-none shadow-md">
            <CardContent className="p-12 text-center">
              <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--primary)' }}>
                אין מועדפים עדיין
              </h3>
              <p className="text-sm text-gray-600">
                לחץ על אייקון הלב ליד שחקנים, קבוצות או משחקים כדי להוסיף אותם למועדפים
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {playerFavorites.length > 0 && (
              <div>
                <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                  <User className="w-4 h-4" />
                  שחקנים מועדפים ({playerFavorites.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {playerFavorites.map(fav => (
                    <Card key={fav.id} className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => handleNavigate(fav)}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)' }}>
                            <User className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                          </div>
                          <span className="font-medium text-sm">{fav.item_name}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFavoriteMutation.mutate(fav.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {teamFavorites.length > 0 && (
              <div>
                <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                  <Users className="w-4 h-4" />
                  קבוצות מועדפות ({teamFavorites.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {teamFavorites.map(fav => (
                    <Card key={fav.id} className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => handleNavigate(fav)}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)' }}>
                            <Users className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                          </div>
                          <span className="font-medium text-sm">{fav.item_name}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFavoriteMutation.mutate(fav.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {gameFavorites.length > 0 && (
              <div>
                <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                  <Calendar className="w-4 h-4" />
                  משחקים מועדפים ({gameFavorites.length})
                </h2>
                <div className="grid grid-cols-1 gap-2">
                  {gameFavorites.map(fav => (
                    <Card key={fav.id} className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => handleNavigate(fav)}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)' }}>
                            <Calendar className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                          </div>
                          <span className="font-medium text-sm">{fav.item_name}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFavoriteMutation.mutate(fav.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
