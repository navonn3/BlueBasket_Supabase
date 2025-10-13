
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, XCircle, Loader, AlertCircle, Database, FileUp, Trash2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.warn(`Rate limit hit, retrying in ${delay * (2 ** i)}ms... Attempt ${i + 1}/${retries}`);
      } else {
        console.error(`Error during API call: ${error.message}. Attempt ${i + 1}/${retries}`);
      }
      if (i < retries - 1) {
        await sleep(delay * (2 ** i));
      } else {
        throw error;
      }
    }
  }
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [importStatus, setImportStatus] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [globalFiles, setGlobalFiles] = useState({});

  const { data: leagues } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => base44.entities.League.list(),
    initialData: [],
  });

  const toggleLeagueMutation = useMutation({
    mutationFn: async ({ leagueId, isActive }) => {
      const league = leagues.find(l => l.league_id === leagueId);
      if (league) {
        await base44.entities.League.update(league.id, { is_active: isActive });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leagues']);
    }
  });

  const handleMultipleFileSelect = (event) => {
    const newFiles = Array.from(event.target.files);
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleGlobalFileSelect = (fileType, event) => {
    const file = event.target.files[0];
    if (file) {
      setGlobalFiles(prev => ({
        ...prev,
        [fileType]: file
      }));
    }
  };

  const detectFileType = (filename) => {
    const lower = filename.toLowerCase();
    
    if (lower.includes('player_details') || lower.includes('player-details')) return 'player_details';
    if (lower.includes('player_history') || lower.includes('player-history')) return 'player_history';
    if (lower.includes('player_averages') || lower.includes('player-averages')) return 'player_averages';
    if (lower.includes('team_averages') || lower.includes('team-averages')) return 'team_averages';
    if (lower.includes('opponent_averages') || lower.includes('opponent-averages')) return 'opponent_averages';
    if (lower.includes('games_schedule') || lower.includes('schedule')) return 'games_schedule';
    if (lower.includes('game_player_stats') || lower.includes('player_stats')) return 'game_player_stats';
    if (lower.includes('game_quarters') || lower.includes('quarters')) return 'game_quarters';
    if (lower.includes('game_team_stats') || lower.includes('team_stats')) return 'game_team_stats';
    
    return 'unknown';
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim() || '';
      });
      rows.push(row);
    }
    
    return rows;
  };

  const handleImportGlobalFiles = async () => {
    setLoading(true);
    setImportStatus({});

    try {
      // Import leagues
      if (globalFiles.leagues) {
        setImportStatus(prev => ({ ...prev, leagues: 'loading' }));
        const text = await globalFiles.leagues.text();
        const rows = parseCSV(text);
        
        const existingLeagues = await retry(() => base44.entities.League.list());
        const existingMap = {};
        existingLeagues.forEach(l => {
          existingMap[l.league_id] = l;
        });
        
        const toCreate = [];
        const toUpdate = [];
        
        for (const row of rows) {
          const parsedLeagueId = parseInt(row.league_id || row.League_ID);
          if (isNaN(parsedLeagueId) || parsedLeagueId === 0 || !row.name) {
            console.warn('Skipping league row - invalid league_id or missing name:', row);
            continue;
          }
          
          const leagueData = {
            league_id: parsedLeagueId,
            name: row.name || row.Name,
            name_en: row.name_en || row.Name_EN || '',
            country: row.country || row.Country || '',
            season: row.season || row.Season || '',
            url: row.url || row.URL || '',
            is_active: false,
          };
          
          if (existingMap[leagueData.league_id]) {
            toUpdate.push({ id: existingMap[leagueData.league_id].id, data: leagueData });
          } else {
            toCreate.push(leagueData);
          }
        }
        
        if (toCreate.length > 0) {
          for (let i = 0; i < toCreate.length; i += 50) {
            const batch = toCreate.slice(i, i + 50);
            await retry(() => base44.entities.League.bulkCreate(batch));
            await sleep(500);
          }
        }
        
        for (let i = 0; i < toUpdate.length; i++) {
          await retry(() => base44.entities.League.update(toUpdate[i].id, toUpdate[i].data));
          if (i % 3 === 0) await sleep(500);
        }
        
        setImportStatus(prev => ({ ...prev, leagues: 'success' }));
      }

      await sleep(2000);

      // Import teams with new structure
      if (globalFiles.teams) {
        setImportStatus(prev => ({ ...prev, teams: 'loading' }));
        const text = await globalFiles.teams.text();
        const rows = parseCSV(text);
        
        const existingTeams = await retry(() => base44.entities.Team.list());
        const existingMap = {};
        existingTeams.forEach(t => {
          const key = `${t.league_id}_${t.team_id}`;
          existingMap[key] = t;
        });
        
        const toCreate = [];
        const toUpdate = [];
        
        for (const row of rows) {
          // Parse team_id and league_id with validation
          const teamId = parseInt(row.Team_ID || row.team_id);
          const leagueId = parseInt(row.League_ID || row.league_id);
          
          if (isNaN(teamId) || teamId === 0 || isNaN(leagueId) || leagueId === 0) {
            console.warn('Skipping team row - invalid team_id or league_id:', row);
            continue;
          }
          
          const teamData = {
            team_id: teamId,
            league_id: leagueId,
            team_name: row.Team_Name || row.team_name || '',
            short_name: row.short_name || row.Short_Name || '',
            bg_color: row.bg_color || row.BG_Color || '#1a1f3a',
            text_color: row.text_color || row.Text_Color || '#FFFFFF',
            name_variations: row.name_variations || row.Name_Variations || '',
          };
          
          const key = `${teamData.league_id}_${teamData.team_id}`;
          if (existingMap[key]) {
            toUpdate.push({ id: existingMap[key].id, data: teamData });
          } else {
            toCreate.push(teamData);
          }
        }
        
        if (toCreate.length > 0) {
          for (let i = 0; i < toCreate.length; i += 50) {
            const batch = toCreate.slice(i, i + 50);
            await retry(() => base44.entities.Team.bulkCreate(batch));
            await sleep(500);
          }
        }
        
        for (let i = 0; i < toUpdate.length; i++) {
          await retry(() => base44.entities.Team.update(toUpdate[i].id, toUpdate[i].data));
          if (i % 3 === 0) await sleep(500);
        }
        
        setImportStatus(prev => ({ ...prev, teams: 'success' }));
      }

      await sleep(2000);

      // Import players
      if (globalFiles.players) {
        setImportStatus(prev => ({ ...prev, players: 'loading' }));
        const text = await globalFiles.players.text();
        const rows = parseCSV(text);
        
        const existingPlayers = await retry(() => base44.entities.Player.list());
        const existingMap = {};
        existingPlayers.forEach(p => {
          existingMap[p.player_id] = p;
        });
        
        const toCreate = [];
        const toUpdate = [];
        
        for (const row of rows) {
          if (!row.player_id || !row.name) {
            console.warn('Skipping player row - missing player_id or name:', row);
            continue;
          }
          
          // Parse numeric fields with validation
          const parsedLeagueId = parseInt(row.league_id);
          const leagueId = isNaN(parsedLeagueId) || parsedLeagueId === 0 ? null : parsedLeagueId;

          const parsedCurrentTeamId = parseInt(row.current_team_id);
          const currentTeamId = isNaN(parsedCurrentTeamId) ? null : parsedCurrentTeamId;
          
          const parsedHeight = parseFloat(row.height);
          const height = isNaN(parsedHeight) ? null : parsedHeight;
          
          const parsedJerseyNumber = parseFloat(row.jersey_number);
          const jerseyNumber = isNaN(parsedJerseyNumber) ? null : parsedJerseyNumber;
          
          if (leagueId === null) {
            console.warn('Skipping player row - invalid league_id:', row);
            continue;
          }
          
          const playerData = {
            player_id: row.player_id,
            name: row.name,
            current_team_id: currentTeamId,
            league_id: leagueId,
            date_of_birth: row.date_of_birth || '',
            height: height,
            jersey_number: jerseyNumber,
          };
          
          if (existingMap[playerData.player_id]) {
            toUpdate.push({ id: existingMap[playerData.player_id].id, data: playerData });
          } else {
            toCreate.push(playerData);
          }
        }
        
        if (toCreate.length > 0) {
          for (let i = 0; i < toCreate.length; i += 50) {
            const batch = toCreate.slice(i, i + 50);
            await retry(() => base44.entities.Player.bulkCreate(batch));
            await sleep(500);
          }
        }
        
        for (let i = 0; i < toUpdate.length; i++) {
          await retry(() => base44.entities.Player.update(toUpdate[i].id, toUpdate[i].data));
          if (i % 3 === 0) await sleep(500);
        }
        
        setImportStatus(prev => ({ ...prev, players: 'success' }));
      }

      alert("ייבוא קבצים כלליים הושלם בהצלחה!");
      queryClient.invalidateQueries();
      setGlobalFiles({});
      
    } catch (error) {
      console.error("Error importing global files:", error);
      setImportStatus(prev => ({ ...prev, error: error.message }));
      alert("שגיאה בייבוא הקבצים: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportData = async () => {
    if (!selectedLeague) {
      alert("נא לבחור ליגה");
      return;
    }

    if (uploadedFiles.length === 0) {
      alert("נא להעלות לפחות קובץ אחד");
      return;
    }

    const league = leagues.find(l => l.league_id === parseInt(selectedLeague));
    if (!league) return;

    setLoading(true);
    setImportStatus({});

    try {
      const filesByType = {};
      for (const file of uploadedFiles) {
        const fileType = detectFileType(file.name);
        if (fileType !== 'unknown') {
          filesByType[fileType] = file;
        }
      }

      const filesCount = Object.keys(filesByType).length;
      if (filesCount === 0) {
        alert("לא זוהו קבצים תקינים. וודא ששמות הקבצים נכונים");
        setLoading(false);
        return;
      }

      // Import player_details FIRST with better team_id matching
      if (filesByType.player_details) {
        setImportStatus(prev => ({ ...prev, player_details: 'loading' }));
        const text = await filesByType.player_details.text();
        const rows = parseCSV(text);
        
        // Get all teams for this league
        const leagueTeams = await retry(() => base44.entities.Team.filter({ league_id: parseInt(selectedLeague) }));
        const teamMap = {};
        leagueTeams.forEach(t => {
          // Map by team_name
          if (t.team_name) teamMap[t.team_name.toLowerCase()] = t.team_id;
          // Map by short_name if exists
          if (t.short_name) teamMap[t.short_name.toLowerCase()] = t.team_id;
          // Map by all variations
          if (t.name_variations) {
            const variations = t.name_variations.split('|').map(v => v.trim().toLowerCase());
            variations.forEach(v => {
              if (v) teamMap[v] = t.team_id;
            });
          }
        });

        console.log('Team mapping for league', selectedLeague, ':', teamMap);
        
        const existingPlayers = await retry(() => base44.entities.Player.filter({ league_id: parseInt(selectedLeague) }));
        const existingMap = {};
        existingPlayers.forEach(p => {
          if (p.player_id) existingMap[p.player_id] = p;
        });
        
        const toCreate = [];
        const toUpdate = [];
        
        for (const row of rows) {
          const playerId = row.Player_ID || row.player_id || '';
          const playerName = row.Name || row.name || row['שם'] || '';
          const teamNameRaw = row.Team || row.team || row['קבוצה'] || '';
          const teamNameLower = teamNameRaw ? teamNameRaw.toLowerCase() : '';
          
          // Find team_id for this team
          let teamId = null;
          if (teamNameLower) {
            teamId = teamMap[teamNameLower];
          }
          
          if (!playerId) {
            console.warn('Skipping player row - missing player_id:', row);
            continue;
          }

          if (!teamId && teamNameRaw) { // Warn if team name exists but no ID found
            console.warn(`Could not find team_id for team: "${teamNameRaw}" (player: ${playerName}) in league ${selectedLeague}. Row:`, row);
          }
          
          const heightVal = parseFloat(row.Height || row.height || '');
          const height = isNaN(heightVal) ? null : heightVal;
          
          const jerseyNumberVal = parseInt(row.Number || row.number || row.jersey_number || '');
          const jerseyNumber = isNaN(jerseyNumberVal) ? null : jerseyNumberVal;
          
          const playerData = {
            player_id: playerId,
            name: playerName,
            current_team_id: teamId || null,
            league_id: parseInt(selectedLeague),
            date_of_birth: row.Date_of_Birth || row.date_of_birth || row['תאריך לידה'] || '',
            height: height,
            jersey_number: jerseyNumber,
          };
          
          console.log('Processing player:', {
            player_id: playerId,
            name: playerName,
            team_name_from_csv: teamNameRaw,
            resolved_team_id: teamId,
            player_data_final: playerData
          });
          
          if (existingMap[playerData.player_id]) {
            toUpdate.push({ id: existingMap[playerData.player_id].id, data: playerData });
          } else {
            toCreate.push(playerData);
          }
        }
        
        if (toCreate.length > 0) {
          for (let i = 0; i < toCreate.length; i += 50) {
            const batch = toCreate.slice(i, i + 50);
            await retry(() => base44.entities.Player.bulkCreate(batch));
            await sleep(500);
          }
        }
        
        for (let i = 0; i < toUpdate.length; i++) {
          await retry(() => base44.entities.Player.update(toUpdate[i].id, toUpdate[i].data));
          if (i % 3 === 0) await sleep(500);
        }
        
        setImportStatus(prev => ({ ...prev, player_details: 'success' }));
        await sleep(2000);
      }

      // Import player history into PlayerSeasonHistory
      if (filesByType.player_history) {
        setImportStatus(prev => ({ ...prev, player_history: 'loading' }));
        const text = await filesByType.player_history.text();
        const rows = parseCSV(text);
        
        // Delete existing history for this league
        const existingHistory = await retry(() => base44.entities.PlayerSeasonHistory.filter({ league_id: parseInt(selectedLeague) }));
        for (const hist of existingHistory) {
          await retry(() => base44.entities.PlayerSeasonHistory.delete(hist.id));
          await sleep(100);
        }
        
        const historyRecords = [];
        
        for (const row of rows) {
          const playerId = row.player_id;
          if (!playerId) {
            console.warn('Skipping player history row - missing player_id:', row);
            continue;
          }
          
          // Find all season columns (format: YYYY-YY)
          Object.keys(row).forEach(key => {
            if (key.match(/^\d{4}-\d{2}$/)) {
              const teamLeagueStr = row[key];
              if (teamLeagueStr && teamLeagueStr.trim()) {
                // Parse "Team Name (League Name)"
                const match = teamLeagueStr.match(/^(.+?)\s*\((.+?)\)$/);
                if (match) {
                  historyRecords.push({
                    player_id: playerId,
                    season: key,
                    team_name: match[1].trim(),
                    league_name: match[2].trim(),
                    league_id: parseInt(selectedLeague),
                  });
                }
              }
            }
          });
        }
        
        // Bulk create history records
        if (historyRecords.length > 0) {
          for (let i = 0; i < historyRecords.length; i += 100) {
            const batch = historyRecords.slice(i, i + 100);
            await retry(() => base44.entities.PlayerSeasonHistory.bulkCreate(batch));
            await sleep(500);
          }
        }
        
        setImportStatus(prev => ({ ...prev, player_history: 'success' }));
        await sleep(2000);
      }

      // Import player averages
      if (filesByType.player_averages) {
        setImportStatus(prev => ({ ...prev, player_averages: 'loading' }));
        const text = await filesByType.player_averages.text();
        const rows = parseCSV(text);
        
        const existingAvgs = await retry(() => base44.entities.PlayerAverages.filter({ league_id: parseInt(selectedLeague) }));
        const existingMap = {};
        existingAvgs.forEach(a => {
          existingMap[a.player_id] = a;
        });
        
        const toCreate = [];
        const toUpdate = [];
        
        for (const row of rows) {
          if (!row.player_id) {
            console.warn('Skipping player averages row - missing player_id:', row);
            continue;
          }
          
          // Parse team_id with validation
          const parsedTeamId = parseInt(row.team_id);
          const teamId = isNaN(parsedTeamId) ? null : parsedTeamId;
          
          const avgData = {
            league_id: parseInt(selectedLeague),
            player_id: row.player_id,
            player_name: row.player_name,
            team: row.team,
            team_id: teamId,
            games_played: parseFloat(row.games_played) || 0,
            games_started: parseFloat(row.games_started) || 0,
            min: parseFloat(row.min) || 0,
            pts: parseFloat(row.pts) || 0,
            fgm: parseFloat(row.fgm) || 0,
            fga: parseFloat(row.fga) || 0,
            fg_pct: parseFloat(row.fg_pct) || 0,
            '2ptm': parseFloat(row['2ptm']) || 0,
            '2pta': parseFloat(row['2pta']) || 0,
            '2pt_pct': parseFloat(row['2pt_pct']) || 0,
            '3ptm': parseFloat(row['3ptm']) || 0,
            '3pta': parseFloat(row['3pta']) || 0,
            '3pt_pct': parseFloat(row['3pt_pct']) || 0,
            ftm: parseFloat(row.ftm) || 0,
            fta: parseFloat(row.fta) || 0,
            ft_pct: parseFloat(row.ft_pct) || 0,
            oreb: parseFloat(row.off || row.oreb) || 0,
            dreb: parseFloat(row.def || row.dreb) || 0,
            reb: parseFloat(row.reb) || 0,
            ast: parseFloat(row.ast) || 0,
            stl: parseFloat(row.stl) || 0,
            blk: parseFloat(row.blk) || 0,
            blka: parseFloat(row.blka) || 0,
            to: parseFloat(row.to) || 0,
            pf: parseFloat(row.pf) || 0,
            pfa: parseFloat(row.pfa) || 0,
            rate: parseFloat(row.rate) || 0,
            pts_rank: parseInt(row.pts_rank) || null,
            reb_rank: parseInt(row.reb_rank) || null,
            ast_rank: parseInt(row.ast_rank) || null,
            stl_rank: parseInt(row.stl_rank) || null,
            blk_rank: parseInt(row.blk_rank) || null,
          };
          
          if (existingMap[avgData.player_id]) {
            toUpdate.push({ id: existingMap[avgData.player_id].id, data: avgData });
          } else {
            toCreate.push(avgData);
          }
        }
        
        if (toCreate.length > 0) {
          for (let i = 0; i < toCreate.length; i += 50) {
            const batch = toCreate.slice(i, i + 50);
            await retry(() => base44.entities.PlayerAverages.bulkCreate(batch));
            await sleep(500);
          }
        }
        
        for (let i = 0; i < toUpdate.length; i++) {
          await retry(() => base44.entities.PlayerAverages.update(toUpdate[i].id, toUpdate[i].data));
          if (i % 3 === 0) await sleep(500);
        }
        
        setImportStatus(prev => ({ ...prev, player_averages: 'success' }));
        await sleep(2000);
      }

      // Import team averages
      if (filesByType.team_averages) {
        setImportStatus(prev => ({ ...prev, team_averages: 'loading' }));
        const text = await filesByType.team_averages.text();
        const rows = parseCSV(text);
        
        const existingTeamAvgs = await retry(() => base44.entities.TeamAverages.filter({ league_id: parseInt(selectedLeague) }));
        const existingMap = {};
        existingTeamAvgs.forEach(t => {
          if (t.team_id) existingMap[t.team_id] = t;
        });
        
        const toCreate = [];
        const toUpdate = [];
        
        for (const row of rows) {
          const parsedTeamId = parseInt(row.team_id);
          const teamId = isNaN(parsedTeamId) || parsedTeamId === 0 ? null : parsedTeamId;
          
          if (teamId === null) {
            console.warn('Skipping team averages row - invalid team_id:', row);
            continue;
          }
          
          const teamData = {
            league_id: parseInt(selectedLeague),
            team: row.team,
            team_id: teamId,
            games_played: parseFloat(row.games_played) || 0,
            min: parseFloat(row.min) || 0,
            pts: parseFloat(row.pts) || 0,
            fgm: parseFloat(row.fgm) || 0,
            fga: parseFloat(row.fga) || 0,
            fg_pct: parseFloat(row.fg_pct) || 0,
            '2ptm': parseFloat(row['2ptm']) || 0,
            '2pta': parseFloat(row['2pta']) || 0,
            '2pt_pct': parseFloat(row['2pt_pct']) || 0,
            '3ptm': parseFloat(row['3ptm']) || 0,
            '3pta': parseFloat(row['3pta']) || 0,
            '3pt_pct': parseFloat(row['3pt_pct']) || 0,
            ftm: parseFloat(row.ftm) || 0,
            fta: parseFloat(row.fta) || 0,
            ft_pct: parseFloat(row.ft_pct) || 0,
            oreb: parseFloat(row.off || row.oreb) || 0,
            dreb: parseFloat(row.def || row.dreb) || 0,
            reb: parseFloat(row.reb) || 0,
            ast: parseFloat(row.ast) || 0,
            stl: parseFloat(row.stl) || 0,
            blk: parseFloat(row.blk) || 0,
            blka: parseFloat(row.blka) || 0,
            to: parseFloat(row.to) || 0,
            pf: parseFloat(row.pf) || 0,
            pfa: parseFloat(row.pfa) || 0,
            rate: parseFloat(row.rate) || 0,
            pts_allowed: parseFloat(row.pts_allowed) || 0,
            second_chance_pts: parseFloat(row.second_chance_pts) || 0,
            fast_break_pts: parseFloat(row.fast_break_pts) || 0,
            pts_rank: parseInt(row.pts_rank) || null,
            reb_rank: parseInt(row.reb_rank) || null,
            ast_rank: parseInt(row.ast_rank) || null,
            stl_rank: parseInt(row.stl_rank) || null,
            blk_rank: parseInt(row.blk_rank) || null,
            fg_pct_rank: parseInt(row.fg_pct_rank) || null,
            '3pt_pct_rank': parseInt(row['3pt_pct_rank']) || null,
          };
          
          if (existingMap[teamData.team_id]) {
            toUpdate.push({ id: existingMap[teamData.team_id].id, data: teamData });
          } else {
            toCreate.push(teamData);
          }
        }
        
        if (toCreate.length > 0) {
          for (let i = 0; i < toCreate.length; i += 30) {
            const batch = toCreate.slice(i, i + 30);
            await retry(() => base44.entities.TeamAverages.bulkCreate(batch));
            await sleep(500);
          }
        }
        
        for (let i = 0; i < toUpdate.length; i++) {
          await retry(() => base44.entities.TeamAverages.update(toUpdate[i].id, toUpdate[i].data));
          await sleep(500);
        }
        
        setImportStatus(prev => ({ ...prev, team_averages: 'success' }));
        await sleep(2000);
      }

      // Import opponent averages
      if (filesByType.opponent_averages) {
        setImportStatus(prev => ({ ...prev, opponent_averages: 'loading' }));
        const text = await filesByType.opponent_averages.text();
        const rows = parseCSV(text);
        
        const existingOppAvgs = await retry(() => base44.entities.OpponentAverages.filter({ league_id: parseInt(selectedLeague) }));
        const existingMap = {};
        existingOppAvgs.forEach(o => {
          if (o.team_id) existingMap[o.team_id] = o;
        });
        
        const toCreate = [];
        const toUpdate = [];
        
        for (const row of rows) {
          const parsedTeamId = parseInt(row.team_id);
          const teamId = isNaN(parsedTeamId) || parsedTeamId === 0 ? null : parsedTeamId;
          
          if (teamId === null) {
            console.warn('Skipping opponent averages row - invalid team_id:', row);
            continue;
          }
          
          const oppData = {
            league_id: parseInt(selectedLeague),
            team: row.team,
            team_id: teamId,
            games_played: parseFloat(row.games_played) || 0,
            opp_pts: parseFloat(row.opp_pts) || 0,
            opp_fgm: parseFloat(row.opp_fgm) || 0,
            opp_fga: parseFloat(row.opp_fga) || 0,
            opp_fg_pct: parseFloat(row.opp_fg_pct) || 0,
            opp_2ptm: parseFloat(row['opp_2ptm']) || 0,
            opp_2pta: parseFloat(row['opp_2pta']) || 0,
            opp_2pt_pct: parseFloat(row['opp_2pt_pct']) || 0,
            opp_3ptm: parseFloat(row.opp_3ptm) || 0,
            opp_3pta: parseFloat(row.opp_3pta) || 0,
            opp_3pt_pct: parseFloat(row.opp_3pt_pct) || 0,
            opp_ftm: parseFloat(row.opp_ftm) || 0,
            opp_fta: parseFloat(row.opp_fta) || 0,
            opp_ft_pct: parseFloat(row.opp_ft_pct) || 0,
            opp_oreb: parseFloat(row.opp_off || row.opp_oreb) || 0,
            opp_dreb: parseFloat(row.opp_def || row.opp_dreb) || 0,
            opp_reb: parseFloat(row.opp_reb) || 0,
            opp_ast: parseFloat(row.opp_ast) || 0,
            opp_stl: parseFloat(row.opp_stl) || 0,
            opp_blk: parseFloat(row.opp_blk) || 0,
            opp_blka: parseFloat(row.opp_blka) || 0,
            opp_to: parseFloat(row.opp_to) || 0,
            opp_pf: parseFloat(row.opp_pf) || 0,
            opp_pfa: parseFloat(row.opp_pfa) || 0,
            opp_rate: parseFloat(row.opp_rate) || 0,
            opp_pts_rank: parseInt(row.opp_pts_rank) || null,
            opp_fg_pct_rank: parseInt(row.opp_fg_pct_rank) || null,
            opp_to_rank: parseInt(row.opp_to_rank) || null,
          };
          
          if (existingMap[oppData.team_id]) {
            toUpdate.push({ id: existingMap[oppData.team_id].id, data: oppData });
          } else {
            toCreate.push(oppData);
          }
        }
        
        if (toCreate.length > 0) {
          for (let i = 0; i < toCreate.length; i += 30) {
            const batch = toCreate.slice(i, i + 30);
            await retry(() => base44.entities.OpponentAverages.bulkCreate(batch));
            await sleep(500);
          }
        }
        
        for (let i = 0; i < toUpdate.length; i++) {
          await retry(() => base44.entities.OpponentAverages.update(toUpdate[i].id, toUpdate[i].data));
          await sleep(500);
        }
        
        setImportStatus(prev => ({ ...prev, opponent_averages: 'success' }));
        await sleep(2000);
      }

      // Import games with Hebrew column names support AND NEW gameid field
      if (filesByType.games_schedule) {
        setImportStatus(prev => ({ ...prev, games_schedule: 'loading' }));
        const text = await filesByType.games_schedule.text();
        const rows = parseCSV(text);
        
        const existingGames = await retry(() => base44.entities.Game.filter({ league_id: parseInt(selectedLeague) }));
        const existingMap = {};
        existingGames.forEach(g => {
          if (g.gameid) existingMap[g.gameid] = g;
        });
        
        const toCreate = [];
        const toUpdate = [];
        
        const convertDate = (dateStr) => {
          if (!dateStr) return '';
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
          return dateStr;
        };
        
        for (const row of rows) {
          // Parse team IDs with validation
          const parsedHomeTeamId = parseInt(row.home_team_id || row['Home Team ID']);
          const homeTeamId = isNaN(parsedHomeTeamId) ? null : parsedHomeTeamId;

          const parsedAwayTeamId = parseInt(row.away_team_id || row['Away Team ID']);
          const awayTeamId = isNaN(parsedAwayTeamId) ? null : parsedAwayTeamId;
          
          const gameData = {
            league_id: parseInt(selectedLeague),
            gameid: row.gameid || row.GameID || row.game_id || '', // Added gameid field
            league: row['ליגה'] || row.league || row.League || '',
            code: row.Code || row.code || '',
            week_day: row['Week Day'] || row.week_day || row.WeekDay || '',
            date: convertDate(row['תאריך'] || row.date || row.Date),
            round: row['מחזור'] || row.round || row.Round || '',
            time: row.Time || row.time || '',
            home_team: row['Home Team'] || row.home_team || row.HomeTeam || '',
            home_team_code: row['Home Team Code'] || row.home_team_code || row.HomeTeamCode || '',
            home_team_id: homeTeamId,
            away_team: row['Away Team'] || row.away_team || row.AwayTeam || '',
            away_team_code: row['Away Team Code'] || row.away_team_code || row.AwayTeamCode || '',
            away_team_id: awayTeamId,
            venue: row.Venue || row.venue || '',
            home_score: parseFloat(row['Home Score'] || row.home_score || row.HomeScore) || null,
            away_score: parseFloat(row['Away Score'] || row.away_score || row.AwayScore) || null,
            arena: row.Arena || row.arena || '',
            status: row.Status || row.status || (row['Home Score'] || row.home_score || row.HomeScore ? 'completed' : 'scheduled'),
          };
          
          if (gameData.gameid && existingMap[gameData.gameid]) { // Updated condition to use gameid
            toUpdate.push({ id: existingMap[gameData.gameid].id, data: gameData });
          } else {
            toCreate.push(gameData);
          }
        }
        
        if (toCreate.length > 0) {
          for (let i = 0; i < toCreate.length; i += 100) {
            const batch = toCreate.slice(i, i + 100);
            await retry(() => base44.entities.Game.bulkCreate(batch));
            await sleep(300);
          }
        }
        
        for (let i = 0; i < toUpdate.length; i++) {
          await retry(() => base44.entities.Game.update(toUpdate[i].id, toUpdate[i].data));
          if (i % 5 === 0) await sleep(200);
        }
        
        setImportStatus(prev => ({ ...prev, games_schedule: 'success' }));
        await sleep(2000);
      }

      // Import game player stats
      if (filesByType.game_player_stats) {
        setImportStatus(prev => ({ ...prev, game_player_stats: 'loading' }));
        const text = await filesByType.game_player_stats.text();
        const rows = parseCSV(text);
        
        const statsData = rows.map(row => {
          // Parse team_id with validation
          const parsedTeamId = parseInt(row.team_id);
          const teamId = isNaN(parsedTeamId) ? null : parsedTeamId;
          
          return {
            league_id: parseInt(selectedLeague),
            game_id: row.game_id,
            player_id: row.player_id,
            player_name: row.player_name,
            team: row.team,
            team_id: teamId,
            opponent: row.opponent,
            game_date: row.game_date,
            number: parseFloat(row.number) || null,
            starter: parseInt(row.starter) || 0,
            min: parseFloat(row.min) || 0,
            pts: parseFloat(row.pts) || 0,
            '2ptm': parseFloat(row['2ptm']) || 0,
            '2pta': parseFloat(row['2pta']) || 0,
            '2pt_pct': parseFloat(row['2pt_pct']) || 0,
            '3ptm': parseFloat(row['3ptm']) || 0,
            '3pta': parseFloat(row['3pta']) || 0,
            '3pt_pct': parseFloat(row['3pt_pct']) || 0,
            fgm: parseFloat(row.fgm) || 0,
            fga: parseFloat(row.fga) || 0,
            fg_pct: parseFloat(row.fg_pct) || 0,
            ftm: parseFloat(row.ftm) || 0,
            fta: parseFloat(row.fta) || 0,
            ft_pct: parseFloat(row.ft_pct) || 0,
            dreb: parseFloat(row.def || row.dreb) || 0,
            oreb: parseFloat(row.off || row.oreb) || 0,
            reb: parseFloat(row.reb) || 0,
            ast: parseFloat(row.ast) || 0,
            stl: parseFloat(row.stl) || 0,
            blk: parseFloat(row.blk) || 0,
            blka: parseFloat(row.blka) || 0,
            to: parseFloat(row.to) || 0,
            pf: parseFloat(row.pf) || 0,
            pfa: parseFloat(row.pfa) || 0,
            rate: parseFloat(row.rate) || 0,
          };
        });
        
        for (let i = 0; i < statsData.length; i += 50) {
          const batch = statsData.slice(i, i + 50);
          await retry(() => base44.entities.GamePlayerStats.bulkCreate(batch));
          await sleep(500);
        }
        
        setImportStatus(prev => ({ ...prev, game_player_stats: 'success' }));
        await sleep(2000);
      }

      // Import game quarters
      if (filesByType.game_quarters) {
        setImportStatus(prev => ({ ...prev, game_quarters: 'loading' }));
        const text = await filesByType.game_quarters.text();
        const rows = parseCSV(text);
        
        const quartersData = rows.map(row => {
          // Parse team_id and opponent_id with validation
          const parsedTeamId = parseInt(row.team_id);
          const teamId = isNaN(parsedTeamId) ? null : parsedTeamId;

          const parsedOpponentId = parseInt(row.opponent_id);
          const opponentId = isNaN(parsedOpponentId) ? null : parsedOpponentId;
          
          return {
            league_id: parseInt(selectedLeague),
            game_id: row.game_id,
            team: row.team,
            team_id: teamId,
            opponent: row.opponent,
            opponent_id: opponentId,
            game_date: row.game_date,
            quarter: parseInt(row.quarter?.replace('Q', '')) || 0,
            team_score: parseFloat(row.score || row.team_score) || 0,
            opponent_score: parseFloat(row.score_against || row.opponent_score) || 0,
          };
        });
        
        for (let i = 0; i < quartersData.length; i += 50) {
          const batch = quartersData.slice(i, i + 50);
          await retry(() => base44.entities.GameQuarters.bulkCreate(batch));
          await sleep(500);
        }
        
        setImportStatus(prev => ({ ...prev, game_quarters: 'success' }));
        await sleep(2000);
      }

      // Import game team stats
      if (filesByType.game_team_stats) {
        setImportStatus(prev => ({ ...prev, game_team_stats: 'loading' }));
        const text = await filesByType.game_team_stats.text();
        const rows = parseCSV(text);
        
        const teamStatsData = rows.map(row => {
          // Parse team_id and opponent_id with validation
          const parsedTeamId = parseInt(row.team_id);
          const teamId = isNaN(parsedTeamId) ? null : parsedTeamId;

          const parsedOpponentId = parseInt(row.opponent_id);
          const opponentId = isNaN(parsedOpponentId) ? null : parsedOpponentId;
          
          return {
            league_id: parseInt(selectedLeague),
            game_id: row.game_id,
            team: row.team,
            team_id: teamId,
            opponent: row.opponent,
            opponent_id: opponentId,
            game_date: row.game_date,
            pts: parseFloat(row.pts) || 0,
            fgm: parseFloat(row.fgm) || 0,
            fga: parseFloat(row.fga) || 0,
            fg_pct: parseFloat(row.fg_pct) || 0,
            '2ptm': parseFloat(row['2ptm']) || 0,
            '2pta': parseFloat(row['2pta']) || 0,
            '2pt_pct': parseFloat(row['2pt_pct']) || 0,
            '3ptm': parseFloat(row['3ptm']) || 0,
            '3pta': parseFloat(row['3pta']) || 0,
            '3pt_pct': parseFloat(row['3pt_pct']) || 0,
            ftm: parseFloat(row.ftm) || 0,
            fta: parseFloat(row.fta) || 0,
            ft_pct: parseFloat(row.ft_pct) || 0,
            oreb: parseFloat(row.off || row.oreb) || 0,
            dreb: parseFloat(row.def || row.dreb) || 0,
            reb: parseFloat(row.reb) || 0,
            ast: parseFloat(row.ast) || 0,
            stl: parseFloat(row.stl) || 0,
            blk: parseFloat(row.blk) || 0,
            blka: parseFloat(row.blka) || 0,
            to: parseFloat(row.to) || 0,
            pf: parseFloat(row.pf) || 0,
            pfa: parseFloat(row.pfa) || 0,
            rate: parseFloat(row.rate) || 0,
            fast_break_pts: parseFloat(row.fast_break_pts) || 0,
            bench_pts: parseFloat(row.bench_pts) || 0,
            second_chance_pts: parseFloat(row.second_chance_pts) || 0,
            points_in_paint: parseFloat(row.points_in_paint) || 0,
            pts_off_turnovers: parseFloat(row.pts_off_turnovers) || 0,
          };
        });
        
        for (let i = 0; i < teamStatsData.length; i += 50) {
          const batch = teamStatsData.slice(i, i + 50);
          await retry(() => base44.entities.GameTeamStats.bulkCreate(batch));
          await sleep(500);
        }
        
        setImportStatus(prev => ({ ...prev, game_team_stats: 'success' }));
      }

      alert("ייבוא נתונים הושלם בהצלחה!");
      queryClient.invalidateQueries();
      setUploadedFiles([]);
      
    } catch (error) {
      console.error("Error importing data:", error);
      setImportStatus(prev => ({ ...prev, error: error.message }));
      alert("שגיאה בייבוא הנתונים: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--primary)' }}>
            הגדרות מערכת
          </h1>
          <p className="text-sm text-gray-600">ייבוא נתוני ליגות וניהול מערכת</p>
        </div>

        <Tabs defaultValue="league" className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="global">קבצים כלליים</TabsTrigger>
            <TabsTrigger value="league">נתוני ליגה</TabsTrigger>
            <TabsTrigger value="manage">ניהול ליגות</TabsTrigger>
          </TabsList>

          <TabsContent value="global">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  ייבוא קבצים כלליים
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    העלה את הקבצים הכלליים: leagues.csv, teams.csv, players.csv
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="leagues-file" className="text-sm font-medium mb-2 block">leagues.csv</label>
                    <Input
                      id="leagues-file"
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleGlobalFileSelect('leagues', e)}
                      className="cursor-pointer"
                    />
                    {globalFiles.leagues && (
                      <div className="mt-1 text-xs text-green-600">✓ {globalFiles.leagues.name}</div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="teams-file" className="text-sm font-medium mb-2 block">teams.csv</label>
                    <Input
                      id="teams-file"
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleGlobalFileSelect('teams', e)}
                      className="cursor-pointer"
                    />
                    {globalFiles.teams && (
                      <div className="mt-1 text-xs text-green-600">✓ {globalFiles.teams.name}</div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="players-file" className="text-sm font-medium mb-2 block">players.csv</label>
                    <Input
                      id="players-file"
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleGlobalFileSelect('players', e)}
                      className="cursor-pointer"
                    />
                    {globalFiles.players && (
                      <div className="mt-1 text-xs text-green-600">✓ {globalFiles.players.name}</div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleImportGlobalFiles}
                  disabled={loading || Object.keys(globalFiles).length === 0}
                  className="w-full"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 ml-2 animate-spin" />
                      מייבא קבצים...
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4 ml-2" />
                      ייבא קבצים כלליים
                    </>
                  )}
                </Button>

                {Object.keys(importStatus).length > 0 && (
                  <div className="mt-4 space-y-2">
                    {Object.entries(importStatus).map(([key, status]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{key}</span>
                        {status === 'loading' && <Loader className="w-4 h-4 animate-spin text-blue-500" />}
                        {status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="league">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  ייבוא נתוני ליגה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="select-league" className="text-sm font-medium mb-2 block">בחר ליגה לייבוא</label>
                  <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                    <SelectTrigger id="select-league">
                      <SelectValue placeholder="בחר ליגה..." />
                    </SelectTrigger>
                    <SelectContent>
                      {leagues.map(league => (
                        <SelectItem key={league.league_id} value={league.league_id.toString()}>
                          {league.name} (ID: {league.league_id}) {league.is_active && <Badge className="mr-2">פעיל</Badge>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedLeague && (
                  <>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        העלה את קבצי ה-CSV. אין חובה להעלות את כל הקבצים. המערכת תייבא רק את הקבצים שהועלו.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <label className="flex-1">
                          <div className="text-sm font-medium mb-2">
                            בחר קבצים להעלאה
                          </div>
                          <Input
                            type="file"
                            accept=".csv"
                            multiple
                            onChange={handleMultipleFileSelect}
                            className="cursor-pointer"
                          />
                        </label>
                        <Button
                          variant="outline"
                          onClick={() => document.querySelector('input[type="file"][multiple]').click()}
                          className="mt-7"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      {uploadedFiles.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">קבצים שנבחרו ({uploadedFiles.length})</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setUploadedFiles([])}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="space-y-1">
                            {uploadedFiles.map((file, idx) => {
                              const fileType = detectFileType(file.name);
                              return (
                                <div key={idx} className="flex items-center justify-between text-xs p-2 bg-white rounded border">
                                  <span className="font-mono">{file.name}</span>
                                  <Badge variant={fileType === 'unknown' ? 'destructive' : 'secondary'}>
                                    {fileType}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Button
                  onClick={handleImportData}
                  disabled={loading || !selectedLeague || uploadedFiles.length === 0}
                  className="w-full"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 ml-2 animate-spin" />
                      מייבא נתונים...
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4 ml-2" />
                      ייבא {uploadedFiles.length} קבצים
                    </>
                  )}
                </Button>

                {Object.keys(importStatus).length > 0 && (
                  <div className="mt-4 space-y-2">
                    {Object.entries(importStatus).map(([key, status]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{key}</span>
                        {status === 'loading' && <Loader className="w-4 h-4 animate-spin text-blue-500" />}
                        {status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage">
            <Card>
              <CardHeader>
                <CardTitle>ניהול ליגות</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leagues.length === 0 ? (
                    <Alert>
                      <AlertDescription>
                        לא נמצאו ליגות. העלה את קובץ leagues.csv תחילה.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    leagues.map(league => (
                      <div key={league.league_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{league.name} (ID: {league.league_id})</div>
                          {league.name_en && <div className="text-xs text-gray-500">{league.name_en}</div>}
                          {league.season && <div className="text-xs text-gray-500">עונה: {league.season}</div>}
                        </div>
                        <Button
                          variant={league.is_active ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleLeagueMutation.mutate({
                            leagueId: league.league_id,
                            isActive: !league.is_active
                          })}
                          style={league.is_active ? { backgroundColor: 'var(--accent)', color: 'white' } : {}}
                          disabled={toggleLeagueMutation.isLoading}
                        >
                          {league.is_active ? "פעיל" : "לא פעיל"}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
