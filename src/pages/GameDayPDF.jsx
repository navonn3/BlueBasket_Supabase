
import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Loader } from "lucide-react";

export default function GameDayPDFPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('id');
  const pdfType = urlParams.get('type') || 'basic';
  
  const [generating, setGenerating] = useState(false);

  const { data: games } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const { data, error } = await supabase.from('games').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });
  
  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const { data, error } = await supabase.from('players').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });
  
  const { data: playerAverages } = useQuery({
    queryKey: ['playerAverages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('player_averages').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });
  
  const { data: gamePlayerStats } = useQuery({
    queryKey: ['gamePlayerStats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('game_player_stats').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });
  
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });


  const game = games.find(g => g.id === gameId || g.gameid === gameId || g.code === gameId);

  const generatePDF = async () => {
    if (!game) return;
    setGenerating(true);

    try {
      const getTeamPlayers = (teamId) => {
        // Filter players by league_id and current_team_id
        return players
          .filter(p => p.league_id === game.league_id && p.current_team_id === teamId)
          .map(player => {
            const stats = playerAverages.find(avg => {
              if (avg.player_id === player.player_id) return true;
              if (avg.player_name === player.name) return true; // Fallback for cases where player_id might not be perfectly matched
              const normalize = (str) => str?.trim().toLowerCase().replace(/\s+/g, ' ');
              return normalize(avg.player_name) === normalize(player.name);
            });

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

            const age = calculateAge(player.date_of_birth);

            const playerGameHistory = gamePlayerStats
              .filter(gs => {
                if (gs.player_id === player.player_id) return true;
                if (gs.player_name === player.name) return true; // Fallback
                const normalize = (str) => str?.trim().toLowerCase().replace(/\s+/g, ' ');
                return normalize(gs.player_name) === normalize(player.name);
              })
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

            // Get player history from PlayerSeasonHistory entity
            const historyText = '-'; // Simplified for now

            return {
              number: parseInt(player.jersey_number) || 999,
              name: player.name,
              height: player.height || '',
              age: age || '',
              gp: stats?.games_played || '-',
              mpg: stats?.min ? Number(stats.min).toFixed(1) : '-',
              ppg: stats?.pts ? Number(stats.pts).toFixed(1) : '-',
              fgm: stats?.fgm ? Number(stats.fgm).toFixed(1) : '-',
              fga: stats?.fga ? Number(stats.fga).toFixed(1) : '-',
              fg_pct: stats?.fg_pct ? Number(stats.fg_pct).toFixed(1) : '-',
              '2ptm': stats?.['2ptm'] ? Number(stats['2ptm']).toFixed(1) : '-',
              '2pta': stats?.['2pta'] ? Number(stats['2pta']).toFixed(1) : '-',
              '2pt_pct': stats?.['2pt_pct'] ? Number(stats['2pt_pct']).toFixed(1) : '-',
              '3ptm': stats?.['3ptm'] ? Number(stats['3ptm']).toFixed(1) : '-',
              '3pta': stats?.['3pta'] ? Number(stats['3pta']).toFixed(1) : '-',
              '3pt_pct': stats?.['3pt_pct'] ? Number(stats['3pt_pct']).toFixed(1) : '-',
              ftm: stats?.ftm ? Number(stats.ftm).toFixed(1) : '-',
              fta: stats?.fta ? Number(stats.fta).toFixed(1) : '-',
              ft_pct: stats?.ft_pct ? Number(stats.ft_pct).toFixed(1) : '-',
              dreb: stats?.dreb ? Number(stats.dreb).toFixed(1) : '-',
              oreb: stats?.oreb ? Number(stats.oreb).toFixed(1) : '-',
              reb: stats?.reb ? Number(stats.reb).toFixed(1) : '-',
              ast: stats?.ast ? Number(stats.ast).toFixed(1) : '-',
              stl: stats?.stl ? Number(stats.stl).toFixed(1) : '-',
              blk: stats?.blk ? Number(stats.blk).toFixed(1) : '-',
              to: stats?.to ? Number(stats.to).toFixed(1) : '-',
              eff: stats?.rate ? Number(stats.rate).toFixed(1) : '-',
              history: historyText,
              lastGameSummary,
              // Store original stats for ranking
              _stats: stats
            };
          })
          .sort((a, b) => a.number - b.number);
      };

      const homePlayers = getTeamPlayers(game.home_team_id);
      const awayPlayers = getTeamPlayers(game.away_team_id);

      if (pdfType === 'basic') {
        generateBasicPDF(game, homePlayers, awayPlayers);
      } else {
        generateExtendedPDF(game, homePlayers, awayPlayers);
      }

    } catch (error) {
      console.error('Error generating PDF:', error);
      setGenerating(false);
    }
  };

  const generateBasicPDF = (game, homePlayers, awayPlayers) => {
    // Get team names from teams table for display
    const homeTeam = teams.find(t => t.team_id === game.home_team_id);
    const awayTeam = teams.find(t => t.team_id === game.away_team_id);
    const homeTeamName = homeTeam?.short_name || game.home_team;
    const awayTeamName = awayTeam?.short_name || game.away_team;

    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>${homeTeamName} נגד ${awayTeamName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 6mm; }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 7pt; 
      direction: rtl; 
      color: #000;
      background: #fff;
    }
    .header { 
      text-align: center; 
      margin-bottom: 3mm; 
      padding: 2mm;
      background: #e5e7eb;
      border: 1px solid #000;
    }
    .header h1 { 
      font-size: 12pt; 
      margin-bottom: 1mm;
      font-weight: bold;
    }
    .header p { 
      font-size: 8pt;
      color: #374151;
    }
    .team-section {
      margin-bottom: 3mm;
      page-break-inside: avoid;
    }
    .team-title {
      font-size: 10pt;
      font-weight: bold;
      background: #d1d5db;
      padding: 1.5mm;
      margin-bottom: 1mm;
      border: 1px solid #000;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2mm;
    }
    th {
      background: #9ca3af;
      padding: 1mm;
      text-align: center;
      font-weight: bold;
      border: 1px solid #000;
      font-size: 7pt;
    }
    td {
      padding: 0.8mm 1mm;
      text-align: center;
      border: 1px solid #6b7280;
      font-size: 6pt;
      vertical-align: top;
      line-height: 1.2;
    }
    tr:nth-child(even) {
      background: #f3f4f6;
    }
    tr:nth-child(odd) {
      background: #fff;
    }
    .number-col { width: 25px; font-weight: bold; }
    .name-col { width: 70px; text-align: right; padding-right: 2mm; }
    .height-col { width: 35px; }
    .age-col { width: 25px; }
    .history-col { width: auto; text-align: right; padding-right: 1.5mm; font-size: 5.5pt; line-height: 1.3; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${homeTeamName} נגד ${awayTeamName}</h1>
    <p>${game.date ? new Date(game.date).toLocaleDateString('he-IL') : ''} | ${game.time || ''} | ${game.venue || ''}</p>
  </div>

  <div class="team-section">
    <div class="team-title">${homeTeamName} (בית)</div>
    <table>
      <thead>
        <tr>
          <th class="number-col">#</th>
          <th class="name-col">שם</th>
          <th class="height-col">גובה</th>
          <th class="age-col">גיל</th>
          <th class="history-col">היסטוריה</th>
        </tr>
      </thead>
      <tbody>
        ${homePlayers.map(p => `
          <tr>
            <td class="number-col">${p.number !== 999 ? p.number : ''}</td>
            <td class="name-col">${p.name}</td>
            <td class="height-col">${p.height}</td>
            <td class="age-col">${p.age}</td>
            <td class="history-col">${p.history}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="team-section">
    <div class="team-title">${awayTeamName} (חוץ)</div>
    <table>
      <thead>
        <tr>
          <th class="number-col">#</th>
          <th class="name-col">שם</th>
          <th class="height-col">גובה</th>
          <th class="age-col">גיל</th>
          <th class="history-col">היסטוריה</th>
        </tr>
      </thead>
      <tbody>
        ${awayPlayers.map(p => `
          <tr>
            <td class="number-col">${p.number !== 999 ? p.number : ''}</td>
            <td class="name-col">${p.name}</td>
            <td class="height-col">${p.height}</td>
            <td class="age-col">${p.age}</td>
            <td class="history-col">${p.history}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>
    `;

    openPDF(htmlContent);
  };

  const generateExtendedPDF = (game, homePlayers, awayPlayers) => {
    // Get team names from teams table for display
    const homeTeam = teams.find(t => t.team_id === game.home_team_id);
    const awayTeam = teams.find(t => t.team_id === game.away_team_id);
    const homeTeamName = homeTeam?.short_name || game.home_team;
    const awayTeamName = awayTeam?.short_name || game.away_team;

    // Get top 3 players for each stat
    const getTop3Rankings = (players, statKey) => {
      const rankings = new Map();
      const validPlayers = players
        .filter(p => p._stats && p._stats[statKey] !== null && p._stats[statKey] !== undefined && p._stats[statKey] !== '-')
        .sort((a, b) => Number(b._stats[statKey]) - Number(a._stats[statKey]));
      
      validPlayers.forEach((player, index) => {
        if (index < 3) {
          rankings.set(player.name, index + 1); // 1, 2, or 3
        }
      });
      
      return rankings;
    };

    const generateTeamPage = (teamName, players, isHome) => {
      // Get rankings for each stat
      const rankings = {
        gp: getTop3Rankings(players, 'games_played'),
        min: getTop3Rankings(players, 'min'),
        pts: getTop3Rankings(players, 'pts'),
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
        rate: getTop3Rankings(players, 'rate')
      };

      const getRankStyle = (rank) => {
        if (rank === 1) return 'background: #FFF9C4; font-weight: bold;';
        if (rank === 2) return 'background: #E3F2FD; font-weight: bold;';
        if (rank === 3) return 'background: #F5F5F5; font-weight: bold;';
        return '';
      };

      return `
<div class="page" style="page-break-after: ${isHome ? 'always' : 'auto'};">
  <div class="header">
    <h1>${teamName} (${isHome ? 'בית' : 'חוץ'})</h1>
    <p>${game.date ? new Date(game.date).toLocaleDateString('he-IL') : ''} | ${game.time || ''} | ${game.venue || ''}</p>
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
        <th class="st">%FG</th>
        <th class="st">ל-2</th>
        <th class="st">%2P</th>
        <th class="st">ל-3</th>
        <th class="st">%3P</th>
        <th class="st">מהקו</th>
        <th class="st">%FT</th>
        <th class="st">ריב'הג'</th>
        <th class="st">ריב'התק'</th>
        <th class="st">סה"כריב'</th>
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
          <td class="num">${p.number !== 999 ? p.number : ''}</td>
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
    </tbody>
  </table>
</div>
      `;
    };

    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>${homeTeamName} נגד ${awayTeamName} - מורחב</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 landscape; margin: 6mm; }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .page { page-break-after: always; }
    }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 6pt; 
      direction: rtl; 
      color: #000;
      background: #fff;
    }
    .page {
      min-height: 100vh;
    }
    .header { 
      text-align: center; 
      margin-bottom: 3mm; 
      padding: 2mm;
      background: #e5e7eb;
      border: 1px solid #000;
    }
    .header h1 { 
      font-size: 12pt; 
      margin-bottom: 1mm;
      font-weight: bold;
    }
    .header p { 
      font-size: 8pt;
      color: #374151;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 5.5pt;
    }
    th {
      background: #9ca3af;
      color: #000;
      padding: 1mm;
      text-align: center;
      font-weight: bold;
      border: 1px solid #000;
    }
    td {
      padding: 0.8mm 0.5mm;
      text-align: center;
      border: 1px solid #6b7280;
      vertical-align: middle;
      line-height: 1.2;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    tr:nth-child(odd) {
      background: #fff;
    }
    .num { width: 20px; font-weight: bold; }
    .name { width: 60px; text-align: right; padding-right: 2mm; }
    .h { width: 30px; }
    .age { width: 25px; }
    .st { width: 32px; }
    .last { width: 80px; text-align: right; padding-right: 1.5mm; font-size: 5pt; }
  </style>
</head>
<body>
  ${generateTeamPage(homeTeamName, homePlayers, true)}
  ${generateTeamPage(awayTeamName, awayPlayers, false)}
</body>
</html>
    `;

    openPDF(htmlContent);
  };

  const openPDF = (htmlContent) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setGenerating(false);
  };

  React.useEffect(() => {
    if (game && players.length > 0 && teams.length > 0 && !generating) {
      generatePDF();
    }
  }, [game, players, teams, pdfType]);

  if (!game) {
    return <div className="p-6">משחק לא נמצא</div>;
  }

  return (
    <div className="p-6 flex items-center justify-center min-h-screen">
      {generating && (
        <div className="flex items-center gap-3">
          <Loader className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
          <span>מייצר PDF...</span>
        </div>
      )}
    </div>
  );
}
