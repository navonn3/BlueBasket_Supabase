

import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Calendar, Shield, BarChart3, Settings, AlertTriangle, Heart, GitCompare, Trophy, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger } from
"@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";

const navigationItems = [
{
  title: "דף הבית",
  url: createPageUrl("Home"),
  icon: BarChart3
},
{
  title: "שחקנים",
  url: createPageUrl("Players"),
  icon: Users
},
{
  title: "קבוצות",
  url: createPageUrl("Teams"),
  icon: Shield
},
{
  title: "טבלה",
  url: createPageUrl("Standings"),
  icon: BarChart3
},
{
  title: "סטטיסטיקה קבוצתית",
  url: createPageUrl("TeamStats"),
  icon: BarChart3
},
{
  title: "לוח משחקים",
  url: createPageUrl("Games"),
  icon: Calendar
},
{
  title: "מובילי הליגה",
  url: createPageUrl("LeagueLeaders"),
  icon: Trophy
},
{
  title: "שיאי העונה",
  url: createPageUrl("SeasonHighs"),
  icon: TrendingUp
},
{
  title: "מועדפים",
  url: createPageUrl("Favorites"),
  icon: Heart
},
{
  title: "השוואת שחקנים",
  url: createPageUrl("PlayerComparison"),
  icon: GitCompare
},
{
  title: "השוואת קבוצות",
  url: createPageUrl("TeamComparison"),
  icon: GitCompare
},

{
  title: "הגדרות",
  url: createPageUrl("Settings"),
  icon: Settings
}];


export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize from localStorage
  const [selectedLeague, setSelectedLeague] = useState(() => {
    const stored = localStorage.getItem('selectedLeague');
    return stored ? parseInt(stored) : null;
  });

  // Track previous league to detect actual changes
  const prevLeagueRef = React.useRef(selectedLeague);

  const { data: leagues } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => base44.entities.League.list(),
    initialData: []
  });

  const activeLeagues = leagues.filter((l) => l.is_active);
  const currentLeague = leagues.find((l) => l.league_id === selectedLeague);

  // Update localStorage when league changes
  useEffect(() => {
    if (selectedLeague !== null) {
      localStorage.setItem('selectedLeague', selectedLeague.toString());
      window.dispatchEvent(new CustomEvent('leagueChanged', { detail: selectedLeague }));

      // Redirect to home page ONLY when league actually changed (not on initial load)
      if (prevLeagueRef.current !== null && prevLeagueRef.current !== selectedLeague) {
        navigate(createPageUrl("Home"));
      }
      
      // Update the ref to current league
      prevLeagueRef.current = selectedLeague;
    }
  }, [selectedLeague, navigate]);

  // Set default league if none selected
  useEffect(() => {
    if (selectedLeague === null && activeLeagues.length > 0) {
      const firstLeague = activeLeagues[0].league_id;
      setSelectedLeague(firstLeague);
    }
  }, [activeLeagues, selectedLeague]);

  // Redirect to home if on root path
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '') {
      navigate(createPageUrl("Home"));
    }
  }, [location.pathname, navigate]);

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --primary: #1a1f3a;
          --primary-dark: #0f1220;
          --accent: #ff6b35;
          --accent-hover: #ff5722;
          --background: #f8f9fa;
          --card-bg: #ffffff;
          --sidebar-bg: #1a1f3a;
          --sidebar-text: #9ca3af;
          --sidebar-text-hover: #e5e7eb;
          --sidebar-active-bg: #ff6b35;
        }
        * {
          direction: rtl;
          text-align: right;
        }
      `}</style>
      <div className="min-h-screen flex w-full" style={{ backgroundColor: 'var(--background)' }}>
        <Sidebar className="border-l border-gray-700" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
          <SidebarHeader className="border-b border-gray-700 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #ff8a5b 100%)' }}>
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-white text-base">Basketball Stats</h2>
                <p className="text-xs" style={{ color: 'var(--sidebar-text)' }}>מאגר שחקנים ומשחקים</p>
              </div>
            </div>
            
            {activeLeagues.length > 0 &&
            <Select
              value={selectedLeague?.toString() || ''}
              onValueChange={(val) => setSelectedLeague(parseInt(val))}>

                <SelectTrigger className="bg-background text-slate-500 px-3 py-2 text-sm rounded-md flex items-center justify-between border ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 w-full h-9 border-gray-600" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--sidebar-text-hover)', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                  <SelectValue placeholder="בחר ליגה" />
                </SelectTrigger>
                <SelectContent>
                  {activeLeagues.map((league) =>
                <SelectItem key={league.league_id} value={league.league_id.toString()}>
                      {league.name}
                    </SelectItem>
                )}
                </SelectContent>
              </Select>
            }
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider px-3 py-2" style={{ color: 'rgba(229, 231, 235, 0.6)' }}>
                תפריט
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) =>
                  <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                      asChild
                      className={`transition-all duration-200 rounded-lg mb-1 ${
                      location.pathname === item.url ?
                      'text-white' :
                      'hover:bg-white/10'}`
                      }
                      style={{
                        backgroundColor: location.pathname === item.url ? 'var(--sidebar-active-bg)' : 'transparent',
                        color: location.pathname === item.url ? '#ffffff' : 'var(--sidebar-text)'
                      }}>

                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                          <span className="font-medium text-sm">{item.title}</span>
                          <item.icon className="w-4 h-4" />
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          {/* Fixed Header for Mobile - Always Visible */}
          <header className="bg-orange-500 px-6 py-3 md:hidden fixed top-0 left-0 right-0 z-[100] shadow-md">
            <div className="flex items-center justify-center gap-4 relative">
              <h1 className="text-lg font-bold text-white text-center">
                {currentLeague?.name || 'Basketball Stats'}
              </h1>
              <SidebarTrigger className="absolute left-0 hover:bg-white/20 p-2 rounded-lg transition-colors duration-200 text-white" />
            </div>
          </header>

          {/* Page Content - With padding to account for fixed header */}
          <div className="flex-1 overflow-auto pt-[60px] md:pt-0">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

