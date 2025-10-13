import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, Target, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsOverview({ players, isLoading }) {
  const totalPlayers = players.length;
  const totalTeams = new Set(players.map(p => p.team).filter(Boolean)).size;
  
  const playersWithAge = players.filter(p => p.date_of_birth);
  const avgAge = playersWithAge.length > 0
    ? Math.round(playersWithAge.reduce((sum, p) => {
        const birth = new Date(p.date_of_birth);
        const age = new Date().getFullYear() - birth.getFullYear();
        return sum + age;
      }, 0) / playersWithAge.length)
    : 0;

  const playersWithStats = players.filter(p => p.stats?.pts);
  const avgPoints = playersWithStats.length > 0
    ? (playersWithStats.reduce((sum, p) => sum + (Number(p.stats.pts) || 0), 0) / playersWithStats.length).toFixed(1)
    : "0.0";

  const stats = [
    { label: "סה\"כ שחקנים", value: totalPlayers, icon: Users, color: "bg-blue-500" },
    { label: "קבוצות", value: totalTeams, icon: Trophy, color: "bg-purple-500" },
    { label: "גיל ממוצע", value: avgAge || "N/A", icon: Target, color: "bg-orange-500" },
    { label: "ממוצע נקודות", value: avgPoints, icon: TrendingUp, color: "bg-green-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4">
      {stats.map((stat, idx) => (
        <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
          <CardContent className="p-3">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-2 w-16" />
                <Skeleton className="h-5 w-10" />
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 mb-0.5">{stat.label}</p>
                  <h3 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
                    {stat.value}
                  </h3>
                </div>
                <div className={`w-8 h-8 rounded-lg ${stat.color} bg-opacity-10 flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}