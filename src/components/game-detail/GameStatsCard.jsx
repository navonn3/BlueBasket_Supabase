
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";

export default function GameStatsCard({ team, stats }) {
  const { data: teamMappings } = useQuery({
    queryKey: ['teamMappings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('team_name_mapping').select('*');
      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });

  // Get short name for display
  const mapping = teamMappings.find(m => 
    m.player_details_name === team || 
    m.normalized_name === team ||
    m.schedule_team_name === team
  );
  const teamShortName = mapping?.short_name || team;

  return (
    <Card className="border-none shadow-sm rounded-lg">
      <CardContent className="p-3">
        <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5 truncate" style={{ color: 'var(--primary)' }}>
          <TrendingUp className="w-3 h-3" />
          {teamShortName} - סטטיסטיקות המשחק
        </h4>
        
        {/* Main Stats */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {stats.pts !== undefined && (
            <StatItem label="נק'" value={stats.pts} color="orange" large />
          )}
          {stats.reb !== undefined && (
            <StatItem label="ריב'" value={stats.reb} color="blue" large />
          )}
          {stats.ast !== undefined && (
            <StatItem label="בישו'" value={stats.ast} color="green" large />
          )}
        </div>

        {/* Shooting Stats */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {stats.fg_pct !== undefined && (
            <PercentItem 
              label="FG%" 
              value={`${Number(stats.fg_pct).toFixed(1)}%`}
              subValue={`${stats.fgm}/${stats.fga}`}
            />
          )}
          {stats['3pt_pct'] !== undefined && (
            <PercentItem 
              label="3P%" 
              value={`${Number(stats['3pt_pct']).toFixed(1)}%`}
              subValue={`${stats['3ptm']}/${stats['3pta']}`}
            />
          )}
          {stats.ft_pct !== undefined && (
            <PercentItem 
              label="FT%" 
              value={`${Number(stats.ft_pct).toFixed(1)}%`}
              subValue={`${stats.ftm}/${stats.fta}`}
            />
          )}
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-4 gap-1">
          {stats.stl !== undefined && <SmallStatItem label="חטף'" value={stats.stl} />}
          {stats.blk !== undefined && <SmallStatItem label="בלוק" value={stats.blk} />}
          {stats.to !== undefined && <SmallStatItem label="כד' ש'" value={stats.to} />}
          {stats.pf !== undefined && <SmallStatItem label="עבר'" value={stats.pf} />}
        </div>

        {/* Advanced Stats */}
        {(stats.fast_break_pts || stats.bench_pts || stats.second_chance_pts) && (
          <div className="grid grid-cols-3 gap-1 mt-2">
            {stats.fast_break_pts !== undefined && (
              <SmallStatItem label="פריצות" value={stats.fast_break_pts} />
            )}
            {stats.bench_pts !== undefined && (
              <SmallStatItem label="ספסל" value={stats.bench_pts} />
            )}
            {stats.second_chance_pts !== undefined && (
              <SmallStatItem label="הזדמ' 2" value={stats.second_chance_pts} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatItem({ label, value, color, large }) {
  const colors = {
    orange: 'from-orange-50 to-orange-100 text-orange-700',
    blue: 'from-blue-50 to-blue-100 text-blue-700',
    green: 'from-green-50 to-green-100 text-green-700',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-lg p-1.5 text-center`}>
      <div className={`${large ? 'text-xl' : 'text-base'} font-bold`}>{value}</div>
      <div className="text-[10px]">{label}</div>
    </div>
  );
}

function PercentItem({ label, value, subValue }) {
  return (
    <div className="bg-gray-50 rounded-lg p-1.5 text-center border border-gray-200">
      <div className="text-sm font-bold text-gray-700">{value}</div>
      <div className="text-[9px] text-gray-600 font-medium">{label}</div>
      {subValue && <div className="text-[8px] text-gray-500">{subValue}</div>}
    </div>
  );
}

function SmallStatItem({ label, value }) {
  return (
    <div className="bg-white rounded p-1 text-center border border-gray-200">
      <div className="text-xs font-bold text-gray-700">{value}</div>
      <div className="text-[8px] text-gray-600">{label}</div>
    </div>
  );
}
