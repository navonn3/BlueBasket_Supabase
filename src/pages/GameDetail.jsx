// בשורה 36, שנה מ:
const game = games.find((g) => g.gameid === gameId || g.id === gameId);

// ל:
const game = games.find((g) => String(g.id) === String(gameId));

// זה יבטיח שהחיפוש יתבסס רק על id (ה-primary key האמיתי)
// ולא על gameid שעלול להיות ריק

// בנוסף, צריך לשנות את כל הקריאות שמשתמשות ב-game.gameid
// לשימוש ב-game.id במקום:

// שורה 70 - GAME PLAYER STATS:
const { data: gamePlayerStats, isLoading: gameStatsLoading } = useQuery({
  queryKey: ['gamePlayerStats', game?.id],  // שינוי כאן
  queryFn: async () => {
    if (!game?.id) return [];  // שינוי כאן
    const { data, error } = await supabase
      .from('game_player_stats')
      .select('*')
      .eq('game_id', game.gameid || game.id);  // נשאיר את שניהם כי game_id בטבלה עשוי להיות gameid או id
    if (error) throw error;
    return data || [];
  },
  initialData: [],
  enabled: !!game?.id  // שינוי כאן
});

// שורה 84 - GAME TEAM STATS:
const { data: gameTeamStats, isLoading: teamStatsLoading } = useQuery({
  queryKey: ['gameTeamStats', game?.id],  // שינוי כאן
  queryFn: async () => {
    if (!game?.id) return [];  // שינוי כאן
    const { data, error } = await supabase
      .from('game_team_stats')
      .select('*')
      .eq('game_id', game.gameid || game.id);  // נשאיר את שניהם
    if (error) throw error;
    return data || [];
  },
  initialData: [],
  enabled: !!game?.id  // שינוי כאן
});

// שורה 130 - GAME QUARTERS:
const { data: gameQuarters, isLoading: quartersLoading } = useQuery({
  queryKey: ['gameQuarters', game?.id],  // שינוי כאן
  queryFn: async () => {
    if (!game?.id) return [];  // שינוי כאן
    const { data, error } = await supabase
      .from('game_quarters')
      .select('*')
      .eq('game_id', game.gameid || game.id);  // נשאיר את שניהם
    if (error) throw error;
    return data || [];
  },
  initialData: [],
  enabled: !!game?.id  // שינוי כאן
});
