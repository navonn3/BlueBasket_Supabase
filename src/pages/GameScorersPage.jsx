// ===========================================
// 📄 GameScorersPage.jsx
// ===========================================

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, FileText, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { findTeamByName } from "../components/shared/teamHelpers";

export default function GameScorersPage() {
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [generatedText, setGeneratedText] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState(() => {
    const stored = localStorage.getItem("selectedLeague");
    return stored ? parseInt(stored) : null;
  });

  // 🔄 מאזין לשינוי ליגה
  useEffect(() => {
    const handleLeagueChange = (e) => {
      setSelectedLeague(e.detail);
      setSelectedGameId(null);
      setGeneratedText("");
    };

    window.addEventListener("leagueChanged", handleLeagueChange);
    return () => window.removeEventListener("leagueChanged", handleLeagueChange);
  }, []);

  // 🎮 שליפת משחקים
  const { data: games = [] } = useQuery({
    queryKey: ["games", selectedLeague],
    enabled: !!selectedLeague,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("league_id", selectedLeague)
        .order("date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // 🏀 שליפת קבוצות
  const { data: teams = [] } = useQuery({
    queryKey: ["teams", selectedLeague],
    enabled: !!selectedLeague,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("league_id", selectedLeague);
      if (error) throw error;
      return data || [];
    },
  });

  // 👤 שליפת סטטיסטיקות שחקנים
  const { data: gamePlayerStats = [] } = useQuery({
    queryKey: ["game_player_stats", selectedLeague],
    enabled: !!selectedLeague,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_player_stats")
        .select("*")
        .eq("league_id", selectedLeague);
      if (error) throw error;
      return data || [];
    },
  });

  // רק משחקים שהסתיימו
  const completedGames = games.filter(
    (g) => g.home_score !== null && g.home_score !== undefined
  );

  // ✍️ יצירת טקסט קלעים
  const generateScorersText = () => {
    if (!selectedGameId) return;

    const game = games.find((g) => g.game_id === selectedGameId);
    if (!game) {
      console.warn("Game not found:", selectedGameId);
      return;
    }

    const homeTeam = findTeamByName(teams, game.home_team, selectedLeague);
    const awayTeam = findTeamByName(teams, game.away_team, selectedLeague);

    const homePlayerStats = gamePlayerStats
      .filter((ps) => {
        if (ps.game_id !== game.game_id) return false;
        if (homeTeam?.team_id && ps.team_id) return ps.team_id === homeTeam.team_id;
        return ps.team === game.home_team;
      })
      .sort((a, b) => (b.pts || 0) - (a.pts || 0));

    const awayPlayerStats = gamePlayerStats
      .filter((ps) => {
        if (ps.game_id !== game.game_id) return false;
        if (awayTeam?.team_id && ps.team_id) return ps.team_id === awayTeam.team_id;
        return ps.team === game.away_team;
      })
      .sort((a, b) => (b.pts || 0) - (a.pts || 0));

    const formatTeamScorers = (teamStats, team, teamName) => {
      const displayName = team?.short_name || team?.team_name || teamName || "קבוצה לא ידועה";
      const scorers = teamStats.filter((ps) => (ps.pts || 0) > 0);
      const nonScorers = teamStats.filter((ps) => (ps.pts || 0) === 0 && (ps.min || 0) > 0);

      let text = `${displayName}:\n`;

      if (scorers.length === 0 && nonScorers.length === 0) {
        text += "אין נתוני שחקנים זמינים";
        return text;
      }

      // קיבוץ לפי נקודות
      const groupedScorers = {};
      scorers.forEach((ps) => {
        const pts = ps.pts || 0;
        if (!groupedScorers[pts]) groupedScorers[pts] = [];
        groupedScorers[pts].push(ps);
      });

      const sortedPoints = Object.keys(groupedScorers)
        .map(Number)
        .sort((a, b) => b - a);

      const scorerLines = [];
      sortedPoints.forEach((pts) => {
        const players = groupedScorers[pts];
        if (players.length === 1) {
          const ps = players[0];
          const lastName = ps.player_name.split(" ").pop();
          const stats = [];

          if (ps["2ptm"] && ps["2pta"] >= 3) stats.push(`${ps["2ptm"]}/${ps["2pta"]} ל-2`);
          if (ps["3ptm"] && ps["3pta"] >= 2) stats.push(`${ps["3ptm"]}/${ps["3pta"]} ל-3`);
          if (ps.ftm && ps.fta >= 3) stats.push(`${ps.ftm}/${ps.fta} מהקו`);
          if (ps.reb >= 5) stats.push(`${ps.reb} ריבאונדים`);
          if (ps.ast >= 5) stats.push(`${ps.ast} אסיסטים`);

          const statsText = stats.length > 0 ? ` (${stats.join(", ")})` : "";
          scorerLines.push(`${lastName}${statsText} ${pts}`);
        } else {
          const names = players.map((ps) => ps.player_name.split(" ").pop()).join(" ו");
          scorerLines.push(`${names} ${pts} כ"א`);
        }
      });

      if (scorerLines.length > 0) text += scorerLines.join(", ") + ".";
      if (nonScorers.length > 0) {
        const names = nonScorers.map((ps) => ps.player_name.split(" ").pop());
        text += ` כן שותף: ${names.join(", ")}.`;
      }

      return text;
    };

    let output = "";
    output += formatTeamScorers(homePlayerStats, homeTeam, game.home_team) + "\n\n";
    output += formatTeamScorers(awayPlayerStats, awayTeam, game.away_team);
    setGeneratedText(output);
  };

  // 📋 העתקת טקסט
  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!selectedLeague) {
    return (
      <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: "var(--background)" }}>
        <div className="max-w-4xl mx-auto text-center py-12">
          <h2 className="text-lg font-bold mb-3" style={{ color: "var(--primary)" }}>
            אנא בחר ליגה מהתפריט
          </h2>
        </div>
      </div>
    );
  }

  // 🎨 עיצוב ותצוגה
  return (
    <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: "var(--background)" }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold mb-2 flex items-center gap-2" style={{ color: "var(--primary)" }}>
            <FileText className="w-6 h-6" />
            רשימת קלעים למשחק
          </h1>
          <p className="text-sm text-gray-600">בחר משחק וקבל רשימת קלעים בפורמט מסודר</p>
        </div>

        <Card className="mb-6 border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">בחירת משחק</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedGameId || ""} onValueChange={setSelectedGameId}>
              <SelectTrigger>
                <SelectValue placeholder="בחר משחק..." />
              </SelectTrigger>
              <SelectContent>
                {completedGames.map((game) => {
                  const homeTeam = findTeamByName(teams, game.home_team, selectedLeague);
                  const awayTeam = findTeamByName(teams, game.away_team, selectedLeague);
                  const homeShortName = homeTeam?.short_name || homeTeam?.team_name || game.home_team;
                  const awayShortName = awayTeam?.short_name || awayTeam?.team_name || game.away_team;
                  const dateStr = game.date ? format(new Date(game.date), "dd/MM/yyyy") : "";

                  return (
                    <SelectItem key={game.game_id} value={game.game_id}>
                      {`${homeShortName} ${game.home_score} : ${game.away_score} ${awayShortName} - ${dateStr}`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Button
              onClick={generateScorersText}
              disabled={!selectedGameId}
              className="w-full text-white"
              style={{ backgroundColor: "var(--accent)" }}
            >
              צור רשימת קלעים
            </Button>
          </CardContent>
        </Card>

        {generatedText && (
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">רשימת הקלעים</CardTitle>
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    הועתק!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    העתק
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <Textarea
                value={generatedText}
                readOnly
                className="min-h-[200px] font-mono text-sm"
                style={{ direction: "rtl" }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

