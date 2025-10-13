import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Plus, Edit, Trash2, Save, X } from "lucide-react";

export default function TeamNamesValidationPage() {
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);
  const [issues, setIssues] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [newTeam, setNewTeam] = useState(null);

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const { data: games, isLoading: gamesLoading } = useQuery({
    queryKey: ['games'],
    queryFn: () => base44.entities.Game.list(),
    initialData: [],
  });

  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    initialData: [],
  });

  const { data: playerAverages, isLoading: avgLoading } = useQuery({
    queryKey: ['playerAverages'],
    queryFn: () => base44.entities.PlayerAverages.list(),
    initialData: [],
  });

  const { data: teamAverages, isLoading: teamAvgLoading } = useQuery({
    queryKey: ['teamAverages'],
    queryFn: () => base44.entities.TeamAverages.list(),
    initialData: [],
  });

  const isLoading = playersLoading || gamesLoading || teamsLoading || avgLoading || teamAvgLoading;

  // Mutations for teams
  const createTeamMutation = useMutation({
    mutationFn: (data) => base44.entities.Team.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
      setNewTeam(null);
      analyzeTeamNames();
    }
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Team.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
      setEditingTeam(null);
      analyzeTeamNames();
    }
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id) => base44.entities.Team.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
      analyzeTeamNames();
    }
  });

  const analyzeTeamNames = () => {
    setAnalyzing(true);

    // Collect all team names from various sources
    const gameHomeTeams = [...new Set(games.map(g => g.home_team).filter(Boolean))];
    const gameAwayTeams = [...new Set(games.map(g => g.away_team).filter(Boolean))];
    const avgTeams = [...new Set(playerAverages.map(a => a.team).filter(Boolean))];
    const teamAvgTeams = [...new Set(teamAverages.map(t => t.team).filter(Boolean))];

    const allTeamNames = [...new Set([
      ...gameHomeTeams,
      ...gameAwayTeams,
      ...avgTeams,
      ...teamAvgTeams
    ])].sort();

    // Check which team names are covered by the Team entity
    const coveredNames = [];
    const uncoveredNames = [];
    
    allTeamNames.forEach(name => {
      const isCovered = teams.some(t => {
        if (t.team_name === name || t.short_name === name) return true;
        
        if (t.name_variations) {
          const variations = t.name_variations.split('|').map(v => v.trim());
          return variations.some(v => v === name);
        }
        
        return false;
      });
      
      if (isCovered) {
        coveredNames.push(name);
      } else {
        uncoveredNames.push(name);
      }
    });

    // Find teams without colors or short names
    const teamsWithoutColors = teams.filter(t => !t.bg_color || !t.text_color);
    const teamsWithoutShortName = teams.filter(t => !t.short_name);

    // Find potential duplicates
    const potentialDuplicates = [];
    for (let i = 0; i < allTeamNames.length; i++) {
      for (let j = i + 1; j < allTeamNames.length; j++) {
        const name1 = allTeamNames[i].toLowerCase().trim();
        const name2 = allTeamNames[j].toLowerCase().trim();
        
        if (
          name1.includes(name2) || 
          name2.includes(name1) ||
          name1.replace(/\s+/g, '') === name2.replace(/\s+/g, '')
        ) {
          potentialDuplicates.push([allTeamNames[i], allTeamNames[j]]);
        }
      }
    }

    const distribution = {
      games: [...new Set([...gameHomeTeams, ...gameAwayTeams])].length,
      averages: avgTeams.length,
      teamAverages: teamAvgTeams.length,
      teams: teams.length
    };

    setIssues({
      allTeamNames,
      coveredNames,
      uncoveredNames,
      teamsWithoutColors,
      teamsWithoutShortName,
      potentialDuplicates,
      distribution
    });

    setAnalyzing(false);
  };

  const startAddTeam = (teamName = '') => {
    setNewTeam({
      team_id: Math.floor(Math.random() * 10000),
      league_id: 1,
      team_name: teamName,
      short_name: '',
      bg_color: '#1a1f3a',
      text_color: '#FFFFFF',
      name_variations: teamName
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-32 bg-white rounded-lg mb-4" />
            <div className="h-64 bg-white rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--primary)' }}>
            בדיקת שמות קבוצות
          </h1>
          <p className="text-sm text-gray-600">זיהוי ותיקון בעיות שמות קבוצות</p>
        </div>

        <Card className="border-none shadow-lg mb-6">
          <CardHeader>
            <CardTitle>סריקת שמות קבוצות</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={analyzeTeamNames}
              disabled={analyzing}
              className="w-full text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                  מנתח...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 ml-2" />
                  בדוק שמות קבוצות
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {issues && (
          <>
            {/* Summary */}
            <Card className="border-none shadow-lg mb-6">
              <CardHeader>
                <CardTitle>סיכום</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <StatCard label="סה״כ שמות בשימוש" value={issues.allTeamNames.length} />
                  <StatCard label="מכוסים" value={issues.coveredNames.length} color="green" />
                  <StatCard label="לא מכוסים" value={issues.uncoveredNames.length} color="red" />
                  <StatCard label="ללא צבעים" value={issues.teamsWithoutColors.length} color="orange" />
                  <StatCard label="ללא שם קצר" value={issues.teamsWithoutShortName.length} color="yellow" />
                  <StatCard label="כפילויות אפשריות" value={issues.potentialDuplicates.length} color="purple" />
                </div>
              </CardContent>
            </Card>

            {/* Distribution */}
            <Card className="border-none shadow-lg mb-6">
              <CardHeader>
                <CardTitle>התפלגות קבוצות במקורות שונים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <DistRow label="משחקים (Game.home_team/away_team)" value={issues.distribution.games} />
                  <DistRow label="ממוצעי שחקנים (PlayerAverages.team)" value={issues.distribution.averages} />
                  <DistRow label="ממוצעי קבוצות (TeamAverages.team)" value={issues.distribution.teamAverages} />
                  <DistRow label="טבלת קבוצות (Team)" value={issues.distribution.teams} />
                </div>
              </CardContent>
            </Card>

            {/* Uncovered Names */}
            {issues.uncoveredNames.length > 0 && (
              <Card className="border-none shadow-lg mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-red-600">
                      <XCircle className="w-5 h-5" />
                      שמות לא מכוסים ({issues.uncoveredNames.length})
                    </span>
                    <Button
                      size="sm"
                      onClick={() => startAddTeam()}
                      style={{ backgroundColor: 'var(--accent)' }}
                      className="text-white"
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      הוסף קבוצה
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      השמות הבאים מופיעים בנתונים אבל לא מכוסים באנטית Team:
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2 mb-4">
                    {issues.uncoveredNames.map((team, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                        <span className="font-medium">{team}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startAddTeam(team)}
                        >
                          <Plus className="w-3 h-3 ml-1" />
                          הוסף
                        </Button>
                      </div>
                    ))}
                  </div>

                  {newTeam && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                      <h4 className="font-bold text-sm">קבוצה חדשה</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          placeholder="Team ID"
                          type="number"
                          value={newTeam.team_id}
                          onChange={(e) => setNewTeam({...newTeam, team_id: parseInt(e.target.value)})}
                        />
                        <Input
                          placeholder="League ID"
                          type="number"
                          value={newTeam.league_id}
                          onChange={(e) => setNewTeam({...newTeam, league_id: parseInt(e.target.value)})}
                        />
                        <Input
                          placeholder="שם קבוצה מלא"
                          value={newTeam.team_name}
                          onChange={(e) => setNewTeam({...newTeam, team_name: e.target.value})}
                        />
                        <Input
                          placeholder="שם קצר"
                          value={newTeam.short_name}
                          onChange={(e) => setNewTeam({...newTeam, short_name: e.target.value})}
                        />
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">צבע רקע</label>
                          <Input
                            type="color"
                            value={newTeam.bg_color}
                            onChange={(e) => setNewTeam({...newTeam, bg_color: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">צבע טקסט</label>
                          <Input
                            type="color"
                            value={newTeam.text_color}
                            onChange={(e) => setNewTeam({...newTeam, text_color: e.target.value})}
                          />
                        </div>
                        <Input
                          placeholder="וריאציות שמות (מופרד ב-|)"
                          value={newTeam.name_variations}
                          onChange={(e) => setNewTeam({...newTeam, name_variations: e.target.value})}
                          className="col-span-2"
                        />
                      </div>
                      <div 
                        className="p-3 rounded text-center font-bold"
                        style={{ backgroundColor: newTeam.bg_color, color: newTeam.text_color }}
                      >
                        {newTeam.short_name || newTeam.team_name || 'תצוגה מקדימה'}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => createTeamMutation.mutate(newTeam)}
                          style={{ backgroundColor: 'var(--accent)' }}
                          className="text-white"
                        >
                          <Save className="w-3 h-3 ml-1" />
                          שמור
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setNewTeam(null)}
                        >
                          <X className="w-3 h-3 ml-1" />
                          ביטול
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Teams without colors/short names */}
            {(issues.teamsWithoutColors.length > 0 || issues.teamsWithoutShortName.length > 0) && (
              <Card className="border-none shadow-lg mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <AlertTriangle className="w-5 h-5" />
                    קבוצות עם מידע חסר
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {teams.filter(t => !t.bg_color || !t.text_color || !t.short_name).map((team) => (
                      <div key={team.id}>
                        {editingTeam?.id === team.id ? (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Input
                                placeholder="Team ID"
                                type="number"
                                value={editingTeam.team_id}
                                onChange={(e) => setEditingTeam({...editingTeam, team_id: parseInt(e.target.value)})}
                              />
                              <Input
                                placeholder="League ID"
                                type="number"
                                value={editingTeam.league_id}
                                onChange={(e) => setEditingTeam({...editingTeam, league_id: parseInt(e.target.value)})}
                              />
                              <Input
                                placeholder="שם קבוצה מלא"
                                value={editingTeam.team_name}
                                onChange={(e) => setEditingTeam({...editingTeam, team_name: e.target.value})}
                              />
                              <Input
                                placeholder="שם קצר"
                                value={editingTeam.short_name}
                                onChange={(e) => setEditingTeam({...editingTeam, short_name: e.target.value})}
                              />
                              <div>
                                <label className="text-xs text-gray-600 block mb-1">צבע רקע</label>
                                <Input
                                  type="color"
                                  value={editingTeam.bg_color}
                                  onChange={(e) => setEditingTeam({...editingTeam, bg_color: e.target.value})}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 block mb-1">צבע טקסט</label>
                                <Input
                                  type="color"
                                  value={editingTeam.text_color}
                                  onChange={(e) => setEditingTeam({...editingTeam, text_color: e.target.value})}
                                />
                              </div>
                              <Input
                                placeholder="וריאציות שמות (מופרד ב-|)"
                                value={editingTeam.name_variations || ''}
                                onChange={(e) => setEditingTeam({...editingTeam, name_variations: e.target.value})}
                                className="col-span-2"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => updateTeamMutation.mutate({ id: team.id, data: editingTeam })}
                                style={{ backgroundColor: 'var(--accent)' }}
                                className="text-white"
                              >
                                <Save className="w-3 h-3 ml-1" />
                                שמור
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingTeam(null)}
                              >
                                <X className="w-3 h-3 ml-1" />
                                ביטול
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{team.team_name}</div>
                              <div className="text-xs text-gray-600 mt-1 space-x-2 space-x-reverse">
                                {!team.short_name && <Badge variant="outline" className="text-xs">ללא שם קצר</Badge>}
                                {!team.bg_color && <Badge variant="outline" className="text-xs">ללא צבע רקע</Badge>}
                                {!team.text_color && <Badge variant="outline" className="text-xs">ללא צבע טקסט</Badge>}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingTeam(team)}
                              >
                                <Edit className="w-3 h-3 ml-1" />
                                ערוך
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteTeamMutation.mutate(team.id)}
                              >
                                <Trash2 className="w-3 h-3 ml-1 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Potential Duplicates */}
            {issues.potentialDuplicates.length > 0 && (
              <Card className="border-none shadow-lg mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-600">
                    <AlertTriangle className="w-5 h-5" />
                    כפילויות אפשריות ({issues.potentialDuplicates.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-4">
                    <AlertDescription>
                      השמות הבאים דומים - בדוק אם מדובר באותה קבוצה:
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    {issues.potentialDuplicates.map((pair, idx) => (
                      <div key={idx} className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-sm">{pair[0]}</Badge>
                          <span className="text-gray-400">↔</span>
                          <Badge variant="outline" className="text-sm">{pair[1]}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {issues.uncoveredNames.length === 0 && issues.teamsWithoutColors.length === 0 && issues.teamsWithoutShortName.length === 0 && issues.potentialDuplicates.length === 0 && (
              <Alert className="mt-6">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  ✅ נהדר! כל שמות הקבוצות מכוסים ויש להם את כל המידע הנדרש
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'blue' }) {
  const colors = {
    blue: 'from-blue-50 to-blue-100 text-blue-700',
    green: 'from-green-50 to-green-100 text-green-700',
    red: 'from-red-50 to-red-100 text-red-700',
    orange: 'from-orange-50 to-orange-100 text-orange-700',
    yellow: 'from-yellow-50 to-yellow-100 text-yellow-700',
    purple: 'from-purple-50 to-purple-100 text-purple-700'
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-lg p-3 text-center`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1">{label}</div>
    </div>
  );
}

function DistRow({ label, value }) {
  return (
    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
      <span className="text-sm text-gray-700">{label}</span>
      <Badge variant="outline">{value}</Badge>
    </div>
  );
}