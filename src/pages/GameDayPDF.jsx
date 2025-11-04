import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function GameDayPDFPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('id');
  const pdfType = urlParams.get('type') || 'extended'; // ברירת מחדל: extended
  
  const [pdfHtml, setPdfHtml] = useState('');

  // Debug logging
  console.log('GameDayPDF - gameId from URL:', gameId);
  console.log('GameDayPDF - pdfType:', pdfType);

  // Fetch games
  const { data: games } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const { data, error } = await supabase.from('games').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });

  // Fetch players
  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const { data, error } = await supabase.from('players').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });

  // Fetch player averages
  const { data: playerAverages } = useQuery({
    queryKey: ['playerAverages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('player_averages').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });

  // Fetch game player stats
  const { data: gamePlayerStats } = useQuery({
    queryKey: ['gamePlayerStats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('game_player_stats').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });

  // Fetch team averages
  const { data: teamAverages } = useQuery({
    queryKey: ['teamAverages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('team_averages').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });

  // חיפוש המשחק - תמיכה גם ב-game_id וגם ב-code
  const game = games.find(g => {
    // התאמה מדויקת
    if (g.game_id === gameId) return true;
    if (g.code === gameId) return true;
    
    // התאמה לא case-sensitive
    if (g.game_id?.toLowerCase() === gameId?.toLowerCase()) return true;
    if (g.code?.toLowerCase() === gameId?.toLowerCase()) return true;
    
    return false;
  });

  // Debug logging
  console.log('GameDayPDF - Total games loaded:', games.length);
  console.log('GameDayPDF - Looking for game with id:', gameId);
  console.log('GameDayPDF - Found game:', game);
  if (games.length > 0) {
    console.log('GameDayPDF - Sample game_id format:', games[0].game_id);
    console.log('GameDayPDF - First few game IDs:', games.slice(0, 3).map(g => g.game_id));
  }

  // Fetch player season history - אחרי שיש game!
  const { data: playerSeasonHistory } = useQuery({
    queryKey: ['playerSeasonHistory', game?.league_id],
    queryFn: async () => {
      let query = supabase.from('player_season_history').select('*');
      
      // אם יש לנו league_id, נסנן לפי זה
      if (game?.league_id) {
        query = query.eq('league_id', game.league_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      console.log('playerSeasonHistory loaded:', data?.length || 0, 'records');
      if (data && data.length > 0) {
        console.log('Sample history record:', data[0]);
      }
      
      return data || [];
    },
    initialData: [],
    enabled: !!game, // טוען רק אחרי שיש משחק
  });

  const getTeamByName = (teamName) => {
    if (!teamName) return null;
    
    const normalize = (str) => {
      if (!str) return '';
      return str
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
    };
    
    const normalizedInput = normalize(teamName);
    
    // חיפוש ישיר
    const directMatch = teams.find(t => 
      normalize(t.team_name) === normalizedInput || 
      normalize(t.short_name) === normalizedInput
    );
    if (directMatch) return directMatch;
    
    // חיפוש חלקי
    const partialMatch = teams.find(t => {
      const normTeamName = normalize(t.team_name);
      const normShortName = normalize(t.short_name);
      
      return normTeamName.includes(normalizedInput) || 
             normalizedInput.includes(normTeamName) ||
             normShortName.includes(normalizedInput) || 
             normalizedInput.includes(normShortName);
    });
    
    return partialMatch;
  };

  const getTeamColors = (teamName) => {
    const team = getTeamByName(teamName);
    return {
      bg: team?.bg_color || '#1a1f3a',
      text: team?.text_color || '#FFFFFF'
    };
  };

  const generatePDF = async () => {
    if (!game) return;

    try {
      const homeTeam = getTeamByName(game.home_team);
      const awayTeam = getTeamByName(game.away_team);
      
      console.log('Original home team:', game.home_team, '-> Found:', homeTeam?.team_name);
      console.log('Original away team:', game.away_team, '-> Found:', awayTeam?.team_name);
      
      const homeColors = getTeamColors(game.home_team);
      const awayColors = getTeamColors(game.away_team);

      const getTeamPlayers = (teamName) => {
        console.log('Looking for players in team:', teamName);
        
        const team = getTeamByName(teamName);
        if (!team) {
          console.log('Team not found:', teamName);
          return [];
        }

        const teamPlayers = players.filter(p => 
          p.current_team_id === team.team_id && p.league_id === team.league_id
        );
        
        console.log(`Found ${teamPlayers.length} players for ${teamName}`);
        
        return teamPlayers.map(player => {
            const stats = playerAverages.find(avg => 
              avg.player_id === player.player_id && avg.league_id === player.league_id
            );

            const calculateAge = (birthDate) => {
              if (!birthDate) return null;
              try {
                // תמיכה בפורמטים שונים של תאריך
                let birth;
                if (birthDate.includes('-')) {
                  birth = new Date(birthDate);
                } else if (birthDate.includes('/')) {
                  const parts = birthDate.split('/');
                  if (parts[2].length === 4) {
                    birth = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                  } else {
                    birth = new Date(`20${parts[2]}-${parts[1]}-${parts[0]}`);
                  }
                } else {
                  return null;
                }
                const today = new Date();
                let age = today.getFullYear() - birth.getFullYear();
                const monthDiff = today.getMonth() - birth.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                  age--;
                }
                return age;
              } catch (error) {
                console.error('Error calculating age for:', birthDate, error);
                return null;
              }
            };

            const formatBirthDate = (birthDate) => {
              if (!birthDate) return '';
              try {
                const date = new Date(birthDate);
                if (isNaN(date.getTime())) return '';
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear();
                return `${day}-${month}-${year}`;
              } catch {
                return '';
              }
            };

            const getPlayerHistory = (playerId) => {
              const history = playerSeasonHistory.filter(h => h.player_id === playerId);
              
              if (history.length === 0) return '';
              
              history.sort((a, b) => {
                const seasonA = a.season || '';
                const seasonB = b.season || '';
                return seasonB.localeCompare(seasonA);
              });
              
              const teamsByLeague = new Map();
              
              history.forEach(h => {
                const leagueKey = h.league_id;
                if (!teamsByLeague.has(leagueKey)) {
                  teamsByLeague.set(leagueKey, {
                    leagueId: h.league_id,
                    leagueName: h.league_name || '',
                    teams: []
                  });
                }
                
                const leagueData = teamsByLeague.get(leagueKey);
                if (!leagueData.teams.some(t => t.name === h.team_name && t.season === h.season)) {
                  leagueData.teams.push({
                    name: h.team_name,
                    season: h.season
                  });
                }
              });
              
              const currentLeagueId = game.league_id;
              const historyParts = [];
              
              teamsByLeague.forEach((leagueData, leagueId) => {
                if (leagueId === currentLeagueId) {
                  const teams = leagueData.teams
                    .filter(t => t.name !== team.team_name)
                    .map(t => `${t.name} (${t.season})`)
                    .join(' | ');
                  if (teams) {
                    historyParts.push(teams);
                  }
                } else {
                  const teams = leagueData.teams.map(t => `${t.name} (${t.season})`).join(' | ');
                  if (teams) {
                    historyParts.push(`${leagueData.leagueName}: ${teams}`);
                  }
                }
              });
              
              return historyParts.join(' || ');
            };

            const getLastGameSummary = (playerId) => {
              const playerGames = gamePlayerStats.filter(gs => 
                gs.player_id === playerId && gs.league_id === game.league_id
              );
              
              if (playerGames.length === 0) return '';
              
              const sortedGames = [...playerGames].sort((a, b) => {
                if (!a.date || !b.date) return 0;
                return new Date(b.date) - new Date(a.date);
              });
              
              const lastGame = sortedGames[0];
              if (!lastGame) return '';
              
              const parts = [];
              if (lastGame.pts) parts.push(`${lastGame.pts} נק'`);
              if (lastGame.reb) parts.push(`${lastGame.reb} ריב'`);
              if (lastGame.ast) parts.push(`${lastGame.ast} אס'`);
              if (lastGame.stl) parts.push(`${lastGame.stl} חט'`);
              if (lastGame.fg_pct) {
                const fgPct = Math.round(lastGame.fg_pct);
                parts.push(`${fgPct}% FG`);
              }
              
              return parts.join(', ');
            };

            const formatStat = (val) => val ? Number(val).toFixed(1) : '-';
            const formatPercentage = (val) => val ? Math.round(Number(val)) : '-';

            const age = calculateAge(player.date_of_birth);
            const previousTeams = getPlayerHistory(player.player_id);
            const lastGameSummary = getLastGameSummary(player.player_id);

            return {
              name: player.name,
              number: player.shirt_number || '',
              height: player.height || '-',
              age: age || '-',
              birthDate: formatBirthDate(player.date_of_birth),
              gp: formatStat(stats?.gp),
              mpg: formatStat(stats?.mpg),
              ppg: formatStat(stats?.ppg),
              fgm: formatStat(stats?.fgm),
              fga: formatStat(stats?.fga),
              fg_pct: formatPercentage(stats?.fg_pct),
              '2ptm': formatStat(stats?.['2ptm']),
              '2pta': formatStat(stats?.['2pta']),
              '2pt_pct': formatPercentage(stats?.['2pt_pct']),
              '3ptm': formatStat(stats?.['3ptm']),
              '3pta': formatStat(stats?.['3pta']),
              '3pt_pct': formatPercentage(stats?.['3pt_pct']),
              ftm: formatStat(stats?.ftm),
              fta: formatStat(stats?.fta),
              ft_pct: formatPercentage(stats?.ft_pct),
              dreb: formatStat(stats?.def),
              oreb: formatStat(stats?.off),
              reb: formatStat(stats?.reb),
              ast: formatStat(stats?.ast),
              stl: formatStat(stats?.stl),
              blk: formatStat(stats?.blk),
              to: formatStat(stats?.to),
              eff: formatStat(stats?.rate),
              lastGameSummary,
              previousTeams,
              _stats: stats
            };
          })
          .sort((a, b) => {
            if (a.number === '' && b.number === '') return 0;
            if (a.number === '') return 1;
            if (b.number === '') return -1;
            return a.number - b.number;
          });
      };

      const homePlayers = getTeamPlayers(game.home_team);
      const awayPlayers = getTeamPlayers(game.away_team);

      console.log('Home players:', homePlayers.length);
      console.log('Away players:', awayPlayers.length);

      // בחירת סוג ה-PDF
      let htmlContent;
      if (pdfType === 'basic') {
        htmlContent = generateBasicPDF(game, homePlayers, awayPlayers);
      } else {
        htmlContent = generateExtendedPDF(game, homePlayers, awayPlayers);
      }

      setPdfHtml(htmlContent);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const generateBasicPDF = (game, homePlayers, awayPlayers) => {
    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>${game.home_team} נגד ${game.away_team}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 8mm; }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-print { display: none !important; }
      html, body { overflow: hidden !important; }
    }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 8.5pt; 
      direction: rtl; 
      color: #000;
      background: #fff;
      overflow: hidden;
    }
    .header { 
      text-align: center; 
      margin-bottom: 3mm; 
      padding: 1.5mm;
      background: #e0e0e0;
      border: 1px solid #000;
    }
    .header h1 { 
      font-size: 14pt; 
      margin-bottom: 0.8mm;
      font-weight: bold;
    }
    .header p { 
      font-size: 9pt;
      color: #333;
    }
    .team-section {
      margin-bottom: 2mm;
    }
    .team-name {
      background: #d0d0d0;
      padding: 1mm 2mm;
      font-weight: bold;
      font-size: 9.5pt;
      border: 1px solid #000;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
    }
    th {
      background: #b0b0b0;
      color: #000;
      padding: 1mm 0.5mm;
      text-align: center;
      font-weight: bold;
      border: 1px solid #000;
      font-size: 7.5pt;
    }
    td {
      padding: 0.8mm 0.5mm;
      text-align: center;
      border: 1px solid #808080;
    }
    tr:nth-child(even) {
      background: #fafafa;
    }
    tr:nth-child(odd) {
      background: #fff;
    }
    .number-col { width: 20px; font-weight: bold; }
    .name-col { width: 80px; text-align: right; padding-right: 2mm; font-weight: 500; }
    .height-col { width: 35px; }
    .age-col { width: 28px; }
    .birth-col { width: 55px; }
    .history-col { text-align: right; padding-right: 1.5mm; font-size: 6.5pt; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${game.home_team} נגד ${game.away_team}</h1>
    <p>${game.date ? new Date(game.date).toLocaleDateString('he-IL') : ''} | ${game.time || ''} | ${game.venue || game.arena || ''}</p>
  </div>

  <div class="team-section">
    <div class="team-name">${game.home_team} (בית)</div>
    <table>
      <thead>
        <tr>
          <th class="number-col">#</th>
          <th class="name-col">שם</th>
          <th class="height-col">גובה</th>
          <th class="age-col">גיל</th>
          <th class="birth-col">תאריך לידה</th>
          <th class="history-col">היסטוריה</th>
        </tr>
      </thead>
      <tbody>
        ${homePlayers.map(p => `
          <tr>
            <td class="number-col">${p.number || ''}</td>
            <td class="name-col">${p.name}</td>
            <td class="height-col">${p.height}</td>
            <td class="age-col">${p.age}</td>
            <td class="birth-col">${p.birthDate}</td>
            <td class="history-col">${p.previousTeams}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="team-section">
    <div class="team-name">${game.away_team} (חוץ)</div>
    <table>
      <thead>
        <tr>
          <th class="number-col">#</th>
          <th class="name-col">שם</th>
          <th class="height-col">גובה</th>
          <th class="age-col">גיל</th>
          <th class="birth-col">תאריך לידה</th>
          <th class="history-col">היסטוריה</th>
        </tr>
      </thead>
      <tbody>
        ${awayPlayers.map(p => `
          <tr>
            <td class="number-col">${p.number || ''}</td>
            <td class="name-col">${p.name}</td>
            <td class="height-col">${p.height}</td>
            <td class="age-col">${p.age}</td>
            <td class="birth-col">${p.birthDate}</td>
            <td class="history-col">${p.previousTeams}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>
    `;
  };

  const generateExtendedPDF = (game, homePlayers, awayPlayers) => {
    const generateTeamPage = (teamName, players, isHome) => {
        const getTop3Rankings = (players, stat) => {
          const validPlayers = players
            .filter(p => {
              const value = p[stat];
              return value !== '-' && value !== null && value !== undefined && value !== 0;
            })
            .sort((a, b) => {
              const aVal = parseFloat(a[stat]);
              const bVal = parseFloat(b[stat]);
              return bVal - aVal;
            });

          const rankMap = new Map();
          validPlayers.slice(0, 3).forEach((p, index) => {
            rankMap.set(p.name, index + 1);
          });
          return rankMap;
        };

        const rankings = {
          gp: getTop3Rankings(players, 'gp'),
          min: getTop3Rankings(players, 'mpg'),
          pts: getTop3Rankings(players, 'ppg'),
          fg_pct: getTop3Rankings(players, 'fg_pct'),
          '2pt_pct': getTop3Rankings(players, '2pt_pct'),
          '3pt_pct': getTop3Rankings(players, '3pt_pct'),
          ft_pct: getTop3Rankings(players, 'ft_pct'),
          dreb: getTop3Rankings(players, 'dreb'),
          oreb: getTop3Rankings(players, 'oreb'),
          reb: getTop3Rankings(players, 'reb'),
          ast: getTop3Rankings(players, 'ast'),
          stl: getTop3Rankings(players, 'stl'),
          blk: getTop3Rankings(players, 'blk'),
          to: getTop3Rankings(players, 'to'),
          rate: getTop3Rankings(players, 'eff')
        };

        const getRankStyle = (rank) => {
          if (rank === 1) return 'background: #e0e0e0; font-weight: bold;';
          if (rank === 2) return 'background: #ececec; font-weight: bold;';
          if (rank === 3) return 'background: #f5f5f5; font-weight: bold;';
          return '';
        };

        return `
<div class="page">
  <div class="header">
    <h1>${teamName} (${isHome ? 'בית' : 'חוץ'})</h1>
    <p>${game.date ? new Date(game.date).toLocaleDateString('he-IL') : ''} | ${game.time || ''} | ${game.venue || game.arena || ''}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th class="name">שם</th>
        <th class="h">גובה</th>
        <th class="age">גיל</th>
        <th class="st">מש'</th>
        <th class="st">דק'</th>
        <th class="st">נק'</th>
        <th class="st">מהשדה</th>
        <th class="st">% מהשדה</th>
        <th class="st">ל-2</th>
        <th class="st">% ל-2</th>
        <th class="st">ל-3</th>
        <th class="st">% ל-3</th>
        <th class="st">מהקו</th>
        <th class="st">% מהקו</th>
        <th class="st">ריב' הג'</th>
        <th class="st">ריב' התק'</th>
        <th class="st">סה"כ ריב'</th>
        <th class="st">אס'</th>
        <th class="st">חט'</th>
        <th class="st">חס'</th>
        <th class="st">איב'</th>
        <th class="st">מדד</th>
        <th class="last">משחק קודם</th>
      </tr>
    </thead>
    <tbody>
      ${players.map(p => `
        <tr>
          <td class="num">${p.number}</td>
          <td class="name">${p.name}</td>
          <td>${p.height}</td>
          <td>${p.age}</td>
          <td style="${getRankStyle(rankings.gp.get(p.name))}">${p.gp}</td>
          <td style="${getRankStyle(rankings.min.get(p.name))}">${p.mpg}</td>
          <td style="${getRankStyle(rankings.pts.get(p.name))}">${p.ppg}</td>
          <td>${p.fgm}/${p.fga}</td>
          <td style="${getRankStyle(rankings.fg_pct.get(p.name))}">${p.fg_pct !== '-' ? p.fg_pct + '%' : '-'}</td>
          <td>${p['2ptm']}/${p['2pta']}</td>
          <td style="${getRankStyle(rankings['2pt_pct'].get(p.name))}">${p['2pt_pct'] !== '-' ? p['2pt_pct'] + '%' : '-'}</td>
          <td>${p['3ptm']}/${p['3pta']}</td>
          <td style="${getRankStyle(rankings['3pt_pct'].get(p.name))}">${p['3pt_pct'] !== '-' ? p['3pt_pct'] + '%' : '-'}</td>
          <td>${p.ftm}/${p.fta}</td>
          <td style="${getRankStyle(rankings.ft_pct.get(p.name))}">${p.ft_pct !== '-' ? p.ft_pct + '%' : '-'}</td>
          <td style="${getRankStyle(rankings.dreb.get(p.name))}">${p.dreb}</td>
          <td style="${getRankStyle(rankings.oreb.get(p.name))}">${p.oreb}</td>
          <td style="${getRankStyle(rankings.reb.get(p.name))}">${p.reb}</td>
          <td style="${getRankStyle(rankings.ast.get(p.name))}">${p.ast}</td>
          <td style="${getRankStyle(rankings.stl.get(p.name))}">${p.stl}</td>
          <td style="${getRankStyle(rankings.blk.get(p.name))}">${p.blk}</td>
          <td style="${getRankStyle(rankings.to.get(p.name))}">${p.to}</td>
          <td style="${getRankStyle(rankings.rate.get(p.name))}">${p.eff}</td>
          <td class="last">${p.lastGameSummary}</td>
        </tr>
      `).join('')}
      
      ${(() => {
        // מציאת הממוצעים הקבוצתיים
        const team = teams.find(t => t.team_name === teamName && t.league_id === game.league_id);
        const teamAvg = teamAverages.find(ta => ta.team_id === team?.team_id && ta.league_id === game.league_id);
        
        if (!teamAvg) return '';
        
        const formatStat = (val) => val ? Number(val).toFixed(1) : '-';
        const formatPct = (val) => val ? Math.round(Number(val)) : '-';
        const formatRank = (rank) => rank ? `#${rank}` : '-';
        
        // חישוב נקודות חמישייה (סך כל שלשות * 3)
        const threePts = teamAvg['3ptm'] ? Number(teamAvg['3ptm']) * 3 : 0;
        
        return `
        <tr>
          <td colspan="24" style="padding: 0;">
            <div style="margin-top: 3mm; padding: 2mm; background: #f0f0f0; border: 1px solid #999; border-top: 2px solid #000;">
              <div style="font-size: 8pt; line-height: 2.0; text-align: right; padding-right: 3mm;">
                <strong style="font-size: 9pt; display: block; margin-bottom: 2mm;">ממוצע קבוצה:</strong>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm;">
                  <span>• נק' ספיגה: <strong>${formatStat(teamAvg.pts_allowed)}</strong> (${formatRank(teamAvg.pts_allowed_rank)})</span>
                  <span>• נק' מהזדמנות שנייה: <strong>${formatStat(teamAvg.second_chance_pts)}</strong></span>
                  <span>• נק' מאיבודים: <strong>${formatStat(teamAvg.pts_off_turnovers)}</strong></span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; margin-top: 1mm;">
                  <span>• נק' ממתפרצות: <strong>${formatStat(teamAvg.fast_break_pts)}</strong></span>
                  <span>• נק' בצבע: <strong>${formatStat(teamAvg.points_in_paint)}</strong></span>
                  <span>• נק' חמישייה: <strong>${threePts.toFixed(1)}</strong></span>
                </div>
                <div style="margin-top: 1mm;">
                  <span>• נק' ספסל: <strong>${formatStat(teamAvg.bench_pts)}</strong></span>
                </div>
              </div>
            </div>
          </td>
        </tr>
        `;
      })()}
    </tbody>
  </table>
</div>
        `;
      };

      return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>${game.home_team} נגד ${game.away_team} - מורחב</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 landscape; margin: 8mm; }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-print { display: none !important; }
      html, body { overflow: hidden !important; }
    }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 9pt; 
      direction: rtl; 
      color: #000;
      background: #fff;
      overflow: hidden;
    }
    .page {
      height: 100vh;
      page-break-after: always;
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
    }
    .page:last-child {
      page-break-after: auto;
    }
    .header { 
      text-align: center; 
      margin-bottom: 4mm; 
      padding: 3mm;
      border: 1px solid #000;
      background: #e0e0e0;
      flex-shrink: 0;
    }
    .header h1 { 
      font-size: 16pt; 
      margin-bottom: 2mm;
      font-weight: bold;
    }
    .header p { 
      font-size: 10pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      flex-grow: 1;
    }
    th {
      background: #b0b0b0;
      color: #000;
      padding: 2mm 1mm;
      text-align: center;
      font-weight: bold;
      border: 1px solid #000;
      font-size: 9pt;
    }
    td {
      padding: 1.5mm 1mm;
      text-align: center;
      border: 1px solid #808080;
      vertical-align: middle;
      line-height: 1.4;
      font-size: 8.5pt;
    }
    tr:nth-child(even) {
      background: #fafafa;
    }
    tr:nth-child(odd) {
      background: #fff;
    }
    .num { width: 28px; font-weight: bold; font-size: 9pt; }
    .name { width: 90px; text-align: right; padding-right: 3mm; font-weight: 500; font-size: 9pt; }
    .h { width: 40px; }
    .age { width: 32px; }
    .st { width: 38px; }
    .last { width: 110px; text-align: right; padding-right: 2mm; font-size: 7.5pt; }
  </style>
</head>
<body>
  ${generateTeamPage(game.home_team, homePlayers, true)}
  ${generateTeamPage(game.away_team, awayPlayers, false)}
</body>
</html>
      `;
    };

  useEffect(() => {
    console.log('useEffect triggered - game:', !!game, 'players:', players.length, 'teams:', teams.length, 'playerAverages:', playerAverages.length, 'playerSeasonHistory:', playerSeasonHistory.length, 'gamePlayerStats:', gamePlayerStats.length, 'pdfHtml:', !!pdfHtml);
    
    // ממתינים שכל הנתונים ייטענו לפני יצירת ה-PDF
    const allDataLoaded = game && 
                          players.length > 0 && 
                          teams.length > 0 && 
                          playerAverages.length > 0 && 
                          gamePlayerStats.length > 0 &&
                          playerSeasonHistory.length > 0;
    
    if (allDataLoaded && !pdfHtml) {
      console.log('✅ All data loaded! Calling generatePDF...');
      generatePDF();
    } else if (!pdfHtml) {
      console.log('⏳ Waiting for data...', {
        game: !!game,
        players: players.length,
        teams: teams.length,
        playerAverages: playerAverages.length,
        gamePlayerStats: gamePlayerStats.length,
        playerSeasonHistory: playerSeasonHistory.length
      });
    }
  }, [game, players, teams, playerAverages, playerSeasonHistory, gamePlayerStats, pdfType, pdfHtml, gameId]);

  if (!game && games.length > 0) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-red-600 font-bold">משחק לא נמצא</p>
          <p className="mb-2 text-sm text-gray-600">מחפש משחק עם ID: {gameId}</p>
          <p className="mb-4 text-xs text-gray-500">
            {games.length > 0 && `טעונים ${games.length} משחקים במערכת`}
          </p>
          <Button onClick={() => navigate(createPageUrl("Games"))}>
            <ArrowLeft className="w-4 h-4 ml-2" />
            חזרה למשחקים
          </Button>
        </div>
      </div>
    );
  }

  if (!game && games.length === 0) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">טוען נתוני משחקים...</p>
        </div>
      </div>
    );
  }

  if (!pdfHtml) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>טוען PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflow: 'hidden' }}>
      <div className="no-print" style={{ position: 'fixed', top: '10px', left: '10px', zIndex: 1000, background: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', gap: '10px' }}>
        <Button onClick={() => navigate(-1)} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 ml-2" />
          חזרה
        </Button>
        <Button onClick={() => window.print()} size="sm" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
          <Printer className="w-4 h-4 ml-2" />
          הדפס
        </Button>
      </div>
      <div dangerouslySetInnerHTML={{ __html: pdfHtml }} />
    </div>
  );
}
