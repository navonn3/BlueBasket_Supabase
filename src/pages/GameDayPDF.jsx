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
                if (birthDate.includes('/')) {
                  const parts = birthDate.split('/');
                  birth = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                } else {
                  birth = new Date(birthDate);
                }
                
                const today = new Date();
                let age = today.getFullYear() - birth.getFullYear();
                const monthDiff = today.getMonth() - birth.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                  age--;
                }
                return age;
              } catch {
                return null;
              }
            };

            const age = calculateAge(player.date_of_birth);

            const playerGameHistory = gamePlayerStats
              .filter(gs => gs.player_id === player.player_id)
              .sort((a, b) => {
                if (!a.game_date || !b.game_date) return 0;
                return new Date(b.game_date) - new Date(a.game_date);
              });

            const lastGame = playerGameHistory[0];
            let lastGameSummary = '';
            
            if (lastGame) {
              if (!lastGame.min || lastGame.min < 5) {
                lastGameSummary = lastGame.min === 0 ? 'לא שיחק' : 'דקות מעטות';
              } else {
                const parts = [];
                const pts = lastGame.pts || 0;
                parts.push(`${pts} נק'`);
                
                if (lastGame.reb >= 4) parts.push(`${lastGame.reb} ריב'`);
                if (lastGame.ast >= 3) parts.push(`${lastGame.ast} אס'`);
                if (lastGame.stl >= 2) parts.push(`${lastGame.stl} חט'`);
                if (lastGame.blk >= 2) parts.push(`${lastGame.blk} בלו'`);
                
                if (pts >= 12 && lastGame.fga >= 5 && lastGame.fg_pct) {
                  parts.push(`${Math.round(lastGame.fg_pct)}% FG`);
                }
                
                lastGameSummary = parts.join(', ');
              }
            } else {
              lastGameSummary = 'לא שיחק';
            }

            // Debug: בדיקת playerSeasonHistory
            console.log('=== DEBUG HISTORY FOR:', player.name, '===');
            console.log('Player ID:', player.player_id);
            console.log('Total playerSeasonHistory records in DB:', playerSeasonHistory.length);
            
            const teamHistory = playerSeasonHistory
              .filter(sh => {
                const match = sh.player_id === player.player_id;
                if (match) {
                  console.log('Found history match:', sh);
                }
                return match;
              })
              .map(sh => ({ 
                season: sh.season, 
                team: sh.team_name,
                league: sh.league_name 
              }));

            console.log(`Player ${player.name} (${player.player_id}) - Found ${teamHistory.length} history records:`, teamHistory);

            // יצירת רשימת ההיסטוריה - מציג את כל העונות שיש לנו
            let previousTeams;
            if (teamHistory.length > 0) {
              // מיון לפי עונה (מהחדש לישן)
              const sortedHistory = teamHistory.sort((a, b) => {
                // המרת "2024-25" ל-2024 להשוואה
                const yearA = parseInt(a.season.split('-')[0]);
                const yearB = parseInt(b.season.split('-')[0]);
                return yearB - yearA;
              });

              // הגבלה ל-5 העונות האחרונות
              previousTeams = sortedHistory
                .slice(0, 5)
                .map(h => `${h.season}: ${h.team}`)
                .join(' | ');
            } else {
              previousTeams = 'אין היסטוריה';
            }

            const formatStat = (value, decimals = 1) => {
              if (value === null || value === undefined) return '-';
              return Number(value).toFixed(decimals);
            };

            const formatPercentage = (value) => {
              if (value === null || value === undefined || value === 0) return '-';
              return Math.round(Number(value));
            };

            const formatHeight = (height) => {
              if (!height) return '-';
              const h = Number(height);
              if (isNaN(h)) return '-';
              return h.toFixed(2);
            };

            return {
              number: player.jersey_number !== 999 ? player.jersey_number : '',
              name: player.name,
              height: formatHeight(player.height),
              age: age || '-',
              birthDate: player.date_of_birth || '-',
              gp: stats?.games_played || 0,
              mpg: formatStat(stats?.min),
              ppg: formatStat(stats?.pts),
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
    }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 8pt; 
      direction: rtl; 
      color: #000;
      background: #fff;
    }
    .header { 
      text-align: center; 
      margin-bottom: 3mm; 
      padding: 1.5mm;
      background: #e0e0e0;
      border: 1px solid #000;
    }
    .header h1 { 
      font-size: 12pt; 
      margin-bottom: 0.5mm;
      font-weight: bold;
    }
    .header p { 
      font-size: 8pt;
      color: #333;
    }
    .team-section {
      margin-bottom: 2mm;
      page-break-inside: avoid;
    }
    .team-title {
      font-size: 10pt;
      font-weight: bold;
      padding: 1.5mm;
      margin-bottom: 1mm;
      border: 1px solid #000;
      background: #d0d0d0;
      color: #000;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1mm;
    }
    th {
      background: #b0b0b0;
      padding: 1.2mm 0.8mm;
      text-align: center;
      font-weight: bold;
      border: 1px solid #000;
      font-size: 7.5pt;
    }
    td {
      padding: 1mm 0.8mm;
      text-align: center;
      border: 1px solid #808080;
      font-size: 7pt;
      vertical-align: top;
      line-height: 1.3;
    }
    tr:nth-child(even) {
      background: #f5f5f5;
    }
    tr:nth-child(odd) {
      background: #fff;
    }
    .number-col { width: 30px; font-weight: bold; }
    .name-col { width: 90px; text-align: right; padding-right: 2mm; }
    .height-col { width: 40px; }
    .age-col { width: 30px; }
    .birth-col { width: 80px; }
    .history-col { text-align: right; padding-right: 1.5mm; font-size: 5.5pt; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${game.home_team} נגד ${game.away_team}</h1>
    <p>${game.date ? new Date(game.date).toLocaleDateString('he-IL') : ''} | ${game.time || ''} | ${game.venue || game.arena || ''}</p>
  </div>

  <div class="team-section">
    <div class="team-title">${game.home_team} (בית)</div>
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
    <div class="team-title">${game.away_team} (חוץ)</div>
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
<div class="page" style="page-break-after: ${isHome ? 'always' : 'auto'};">
  <div class="header">
    <h1>${teamName} (${isHome ? 'בית' : 'חוץ'})</h1>
    <p>${game.date ? new Date(game.date).toLocaleDateString('he-IL') : ''} | ${game.time || ''} | ${game.venue || game.arena || ''}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th class="last">משחק קודם</th>
        <th class="st">מדד</th>
        <th class="st">איב'</th>
        <th class="st">חס'</th>
        <th class="st">חט'</th>
        <th class="st">אס'</th>
        <th class="st">סה"כ ריב'</th>
        <th class="st">ריב' התק'</th>
        <th class="st">ריב' הג'</th>
        <th class="st">% מהקו</th>
        <th class="st">מהקו</th>
        <th class="st">% ל-3</th>
        <th class="st">ל-3</th>
        <th class="st">% ל-2</th>
        <th class="st">ל-2</th>
        <th class="st">% מהשדה</th>
        <th class="st">מהשדה</th>
        <th class="st">נק'</th>
        <th class="st">דק'</th>
        <th class="st">מש'</th>
        <th class="age">גיל</th>
        <th class="h">גובה</th>
        <th class="name">שם</th>
        <th class="num">#</th>
      </tr>
    </thead>
    <tbody>
      ${players.map(p => `
        <tr>
          <td class="last">${p.lastGameSummary}</td>
          <td style="${getRankStyle(rankings.rate.get(p.name))}">${p.eff}</td>
          <td style="${getRankStyle(rankings.to.get(p.name))}">${p.to}</td>
          <td style="${getRankStyle(rankings.blk.get(p.name))}">${p.blk}</td>
          <td style="${getRankStyle(rankings.stl.get(p.name))}">${p.stl}</td>
          <td style="${getRankStyle(rankings.ast.get(p.name))}">${p.ast}</td>
          <td style="${getRankStyle(rankings.reb.get(p.name))}">${p.reb}</td>
          <td style="${getRankStyle(rankings.oreb.get(p.name))}">${p.oreb}</td>
          <td style="${getRankStyle(rankings.dreb.get(p.name))}">${p.dreb}</td>
          <td style="${getRankStyle(rankings.ft_pct.get(p.name))}">${p.ft_pct !== '-' ? p.ft_pct + '%' : '-'}</td>
          <td>${p.ftm}/${p.fta}</td>
          <td style="${getRankStyle(rankings['3pt_pct'].get(p.name))}">${p['3pt_pct'] !== '-' ? p['3pt_pct'] + '%' : '-'}</td>
          <td>${p['3ptm']}/${p['3pta']}</td>
          <td style="${getRankStyle(rankings['2pt_pct'].get(p.name))}">${p['2pt_pct'] !== '-' ? p['2pt_pct'] + '%' : '-'}</td>
          <td>${p['2ptm']}/${p['2pta']}</td>
          <td style="${getRankStyle(rankings.fg_pct.get(p.name))}">${p.fg_pct !== '-' ? p.fg_pct + '%' : '-'}</td>
          <td>${p.fgm}/${p.fga}</td>
          <td style="${getRankStyle(rankings.pts.get(p.name))}">${p.ppg}</td>
          <td style="${getRankStyle(rankings.min.get(p.name))}">${p.mpg}</td>
          <td style="${getRankStyle(rankings.gp.get(p.name))}">${p.gp}</td>
          <td>${p.age}</td>
          <td>${p.height}</td>
          <td class="name">${p.name}</td>
          <td class="num">${p.number}</td>
        </tr>
      `).join('')}
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
    @page { size: A4 landscape; margin: 6mm; }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-print { display: none !important; }
    }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 5pt; 
      direction: rtl; 
      color: #000;
      background: #fff;
    }
    .page {
      min-height: 100vh;
    }
    .header { 
      text-align: center; 
      margin-bottom: 2mm; 
      padding: 1.5mm;
      border: 1px solid #000;
      background: #e0e0e0;
    }
    .header h1 { 
      font-size: 10pt; 
      margin-bottom: 0.5mm;
      font-weight: bold;
    }
    .header p { 
      font-size: 6pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 5pt;
    }
    th {
      background: #b0b0b0;
      color: #000;
      padding: 0.8mm 0.5mm;
      text-align: center;
      font-weight: bold;
      border: 1px solid #000;
      font-size: 5pt;
    }
    td {
      padding: 0.6mm 0.4mm;
      text-align: center;
      border: 1px solid #808080;
      vertical-align: middle;
      line-height: 1.2;
    }
    tr:nth-child(even) {
      background: #fafafa;
    }
    tr:nth-child(odd) {
      background: #fff;
    }
    .num { width: 18px; font-weight: bold; }
    .name { width: 55px; text-align: right; padding-right: 1.5mm; font-weight: 500; }
    .h { width: 28px; }
    .age { width: 22px; }
    .st { width: 28px; }
    .last { width: 70px; text-align: right; padding-right: 1mm; font-size: 4.5pt; }
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
    console.log('useEffect triggered - game:', !!game, 'players:', players.length, 'teams:', teams.length, 'playerAverages:', playerAverages.length, 'playerSeasonHistory:', playerSeasonHistory.length, 'pdfHtml:', !!pdfHtml);
    if (game && players.length > 0 && teams.length > 0 && playerAverages.length > 0 && !pdfHtml) {
      console.log('Calling generatePDF...');
      generatePDF();
    }
  }, [game, players, teams, playerAverages, playerSeasonHistory, pdfType, pdfHtml, gameId]);

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
    <div>
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
