import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";

export default function UpcomingGamesPage() {
  const NATIONAL_LEAGUE_ID = 1;
  const [selectedGameId, setSelectedGameId] = useState(null);

  // Fetch upcoming games for National League only
  const { data: games, isLoading: gamesLoading } = useQuery({
    queryKey: ['upcoming-games-national'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('league_id', NATIONAL_LEAGUE_ID)
        .gte('date', today)
        .is('home_score', null) // Only games without scores (upcoming)
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(15);
      
      if (error) throw error;
      return data || [];
    },
    initialData: []
  });

  const formatGameDate = (dateStr) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "EEEE, d בMMMM yyyy", { locale: he });
    } catch (e) {
      return dateStr;
    }
  };

  const handleDownloadPDF = (gameId, type) => {
    window.open(createPageUrl("GameDayPDF") + `?id=${gameId}&type=${type}`, '_blank');
  };

  if (gamesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="text-center">
          <p className="text-lg">טוען משחקים קרובים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            משחקים קרובים - ליגה לאומית
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {games.length} משחקים קרובים
          </p>
        </div>

        {/* Games List */}
        {games.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p style={{ color: 'var(--muted-foreground)' }}>
                אין משחקים קרובים בליגה הלאומית
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {games.map((game, index) => (
              <Card 
                key={game.game_id}
                className={`transition-all cursor-pointer hover:shadow-lg ${
                  selectedGameId === game.game_id ? 'ring-2' : ''
                }`}
                style={{
                  borderColor: selectedGameId === game.game_id ? 'var(--accent)' : 'transparent'
                }}
                onClick={() => setSelectedGameId(game.game_id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Game Number */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                         style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                      {index + 1}
                    </div>

                    {/* Game Info */}
                    <div className="flex-grow">
                      {/* Teams */}
                      <div className="text-center mb-2">
                        <div className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
                          {game.home_team}
                          <span className="mx-2 text-sm font-normal" style={{ color: 'var(--muted-foreground)' }}>
                            נגד
                          </span>
                          {game.away_team}
                        </div>
                      </div>

                      {/* Date, Time, Venue */}
                      <div className="flex items-center justify-center gap-4 text-xs flex-wrap" 
                           style={{ color: 'var(--muted-foreground)' }}>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatGameDate(game.date)}</span>
                        </div>
                        
                        {game.time && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{game.time}</span>
                          </div>
                        )}
                        
                        {game.venue && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{game.venue}</span>
                          </div>
                        )}
                      </div>

                      {game.round && (
                        <div className="text-center mt-2">
                          <Badge variant="outline" className="text-xs">
                            {game.round}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* PDF Download Buttons */}
                    {selectedGameId === game.game_id && (
                      <div className="flex-shrink-0 flex gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPDF(game.game_id, 'basic');
                          }}
                          size="sm"
                          variant="outline"
                          className="text-xs"
                        >
                          <FileDown className="w-3 h-3 ml-1" />
                          PDF בסיסי
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPDF(game.game_id, 'extended');
                          }}
                          size="sm"
                          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                          className="text-xs"
                        >
                          <FileDown className="w-3 h-3 ml-1" />
                          PDF מורחב
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
          <p className="text-sm text-center">
            לחץ על משחק כדי לבחור אותו, ולאחר מכן בחר את סוג ה-PDF להורדה
          </p>
        </div>
      </div>
    </div>
  );
}
