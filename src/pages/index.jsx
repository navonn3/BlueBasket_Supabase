import Layout from "./Layout.jsx";

import Players from "./Players";

import Games from "./Games";

import Teams from "./Teams";

import GameDetail from "./GameDetail";

import TeamStats from "./TeamStats";

import PlayerDetail from "./PlayerDetail";

import TeamDetail from "./TeamDetail";

import TeamNamesValidation from "./TeamNamesValidation";

import Favorites from "./Favorites";

import GameDayPDF from "./GameDayPDF";

import PlayerComparison from "./PlayerComparison";

import TeamComparison from "./TeamComparison";

import SeasonHighs from "./SeasonHighs";

import LeagueLeaders from "./LeagueLeaders";

import Standings from "./Standings";

import Home from "./Home";

import GameScorersPage from "./GameScorersPage";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Players: Players,
    
    Games: Games,
    
    Teams: Teams,
    
    GameDetail: GameDetail,
    
    TeamStats: TeamStats,
    
    PlayerDetail: PlayerDetail,
    
    TeamDetail: TeamDetail,
     
    TeamNamesValidation: TeamNamesValidation,
    
    Favorites: Favorites,
    
    GameDayPDF: GameDayPDF,
    
    PlayerComparison: PlayerComparison,
    
    TeamComparison: TeamComparison,
    
    SeasonHighs: SeasonHighs,
    
    LeagueLeaders: LeagueLeaders,
    
    Standings: Standings,
    
    Home: Home,

    GameScorersPage: GameScorersPage,

    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Players />} />
                
                
                <Route path="/Players" element={<Players />} />
                
                <Route path="/Games" element={<Games />} />
                
                <Route path="/Teams" element={<Teams />} />
                
                <Route path="/GameDetail" element={<GameDetail />} />
                
                <Route path="/TeamStats" element={<TeamStats />} />

                <Route path="/GameScorersPage" element={<GameScorersPage />} />
                
                <Route path="/PlayerDetail" element={<PlayerDetail />} />
                
                <Route path="/TeamDetail" element={<TeamDetail />} />
                               
                <Route path="/TeamNamesValidation" element={<TeamNamesValidation />} />
                
                <Route path="/Favorites" element={<Favorites />} />
                
                <Route path="/GameDayPDF" element={<GameDayPDF />} />
                
                <Route path="/PlayerComparison" element={<PlayerComparison />} />
                
                <Route path="/TeamComparison" element={<TeamComparison />} />
                
                <Route path="/SeasonHighs" element={<SeasonHighs />} />
                
                <Route path="/LeagueLeaders" element={<LeagueLeaders />} />
                
                <Route path="/Standings" element={<Standings />} />
                
                <Route path="/Home" element={<Home />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <PagesContent />
    );
}
