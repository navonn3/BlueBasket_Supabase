// Helper function to find a team by name and league
export const findTeamByName = (teams, teamName, leagueId) => {
  if (!teams || !teamName || !leagueId) return null;
  
  return teams.find(t => {
    // Must match league first
    if (t.league_id !== leagueId) return false;
    
    // Check exact match on team_name or short_name
    if (t.team_name === teamName || t.short_name === teamName) return true;
    
    // Check name variations
    if (t.name_variations) {
      const variations = t.name_variations.split('|').map(v => v.trim());
      return variations.some(v => v === teamName);
    }
    
    return false;
  });
};

// Helper to get contrast color for background
export const getContrastColor = (bgColor) => {
  if (!bgColor || bgColor === 'var(--primary)') return '#FFFFFF';
  
  if (bgColor.startsWith('var(')) return '#FFFFFF';
  
  const hex = bgColor.replace('#', '');
  if (hex.length !== 6) return '#FFFFFF';
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};