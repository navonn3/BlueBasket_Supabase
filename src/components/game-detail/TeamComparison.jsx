import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Target, Shield } from "lucide-react";

export default function TeamComparison({ homeTeam, awayTeam, homeStats, awayStats, homeOppStats, awayOppStats }) {
  const compareStats = [
    { label: "נקודות למשחק", key: "pts", icon: TrendingUp, color: "orange" },
    { label: "ריבאונדים", key: "reb", icon: Trophy, color: "blue" },
    { label: "בישולים", key: "ast", icon: Target, color: "green" },
    { label: "אחוז קליעה", key: "fg_pct", icon: Target, color: "purple", isPercent: true },
    { label: "שלוש נקודות %", key: "3pt_pct", icon: Target, color: "indigo", isPercent: true },
    { label: "חטיפות", key: "stl", icon: Shield, color: "teal" },
    { label: "כדורים אבודים", key: "to", icon: Shield, color: "red", lowerIsBetter: true },
  ];

  const compareDefense = [
    { label: "נקודות יריבים", key: "opp_pts", isPercent: false },
    { label: "אחוז קליעה יריבים", key: "opp_fg_pct", isPercent: true },
  ];

  return (
    <Card className="mb-4 border-none shadow-md">
      <CardContent className="p-4">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
          <TrendingUp className="w-4 h-4" />
          השוואה סטטיסטית
        </h3>

        <div className="space-y-3">
          {/* Offensive Stats */}
          {compareStats.map((stat) => {
            const homeValue = homeStats?.[stat.key];
            const awayValue = awayStats?.[stat.key];
            const homeRank = homeStats?.[`${stat.key}_rank`];
            const awayRank = awayStats?.[`${stat.key}_rank`];

            if (homeValue === undefined && awayValue === undefined) return null;

            const homeNum = Number(homeValue) || 0;
            const awayNum = Number(awayValue) || 0;
            const homeBetter = stat.lowerIsBetter ? homeNum < awayNum : homeNum > awayNum;
            const awayBetter = stat.lowerIsBetter ? awayNum < homeNum : awayNum > homeNum;

            return (
              <div key={stat.key} className="bg-gray-50 rounded-lg p-2">
                <div className="text-[10px] text-gray-600 mb-1 text-center font-medium">{stat.label}</div>
                <div className="flex items-center justify-between gap-2">
                  <div className={`flex-1 text-center p-2 rounded ${homeBetter ? 'bg-green-100' : 'bg-white'}`}>
                    <div className={`text-sm font-bold ${homeBetter ? 'text-green-700' : 'text-gray-700'}`}>
                      {homeNum.toFixed(1)}{stat.isPercent ? '%' : ''}
                    </div>
                    {homeRank && (
                      <div className="text-[9px] text-gray-500">#{homeRank} בליגה</div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-400">vs</div>

                  <div className={`flex-1 text-center p-2 rounded ${awayBetter ? 'bg-green-100' : 'bg-white'}`}>
                    <div className={`text-sm font-bold ${awayBetter ? 'text-green-700' : 'text-gray-700'}`}>
                      {awayNum.toFixed(1)}{stat.isPercent ? '%' : ''}
                    </div>
                    {awayRank && (
                      <div className="text-[9px] text-gray-500">#{awayRank} בליגה</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Defensive Stats */}
          {homeOppStats && awayOppStats && (
            <>
              <div className="text-[10px] font-bold text-gray-600 mt-4 mb-2 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                הגנה
              </div>
              {compareDefense.map((stat) => {
                const homeValue = homeOppStats?.[stat.key];
                const awayValue = awayOppStats?.[stat.key];

                if (homeValue === undefined && awayValue === undefined) return null;

                const homeNum = Number(homeValue) || 0;
                const awayNum = Number(awayValue) || 0;
                const homeBetter = homeNum < awayNum; // Lower is better for defense
                const awayBetter = awayNum < homeNum;

                return (
                  <div key={stat.key} className="bg-gray-50 rounded-lg p-2">
                    <div className="text-[10px] text-gray-600 mb-1 text-center font-medium">{stat.label}</div>
                    <div className="flex items-center justify-between gap-2">
                      <div className={`flex-1 text-center p-2 rounded ${homeBetter ? 'bg-green-100' : 'bg-white'}`}>
                        <div className={`text-sm font-bold ${homeBetter ? 'text-green-700' : 'text-gray-700'}`}>
                          {homeNum.toFixed(1)}{stat.isPercent ? '%' : ''}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-400">vs</div>

                      <div className={`flex-1 text-center p-2 rounded ${awayBetter ? 'bg-green-100' : 'bg-white'}`}>
                        <div className={`text-sm font-bold ${awayBetter ? 'text-green-700' : 'text-gray-700'}`}>
                          {awayNum.toFixed(1)}{stat.isPercent ? '%' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}