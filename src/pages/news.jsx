import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newspaper, ExternalLink, Calendar, Loader } from "lucide-react";

const News = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const WORDPRESS_URL = 'https://ibasketball.co.il';
  const PER_PAGE = 10;

  useEffect(() => {
    fetchPosts(page);
  }, [page]);

  const fetchPosts = async (pageNum) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${WORDPRESS_URL}/wp-json/wp/v2/posts?_embed&per_page=${PER_PAGE}&page=${pageNum}`
      );
      
      if (!response.ok) {
        throw new Error('שגיאה בטעינת הכתבות');
      }
      
      const data = await response.json();
      
      // Check if there are more pages
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages'));
      setHasMore(pageNum < totalPages);
      
      if (pageNum === 1) {
        setPosts(data);
      } else {
        setPosts(prev => [...prev, ...data]);
      }
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const getFeaturedImage = (post) => {
    if (post._embedded && post._embedded['wp:featuredmedia']) {
      const media = post._embedded['wp:featuredmedia'][0];
      return media.media_details?.sizes?.medium?.source_url || media.source_url;
    }
    return null;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  if (loading && page === 1) {
    return (
      <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: 'var(--primary)' }} />
              <p className="text-gray-600">טוען כתבות...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
        <div className="max-w-6xl mx-auto">
          <Card className="border-red-200">
            <CardContent className="p-6">
              <p className="text-red-600 text-center">שגיאה: {error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 md:p-6" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Newspaper className="w-7 h-7" style={{ color: 'var(--primary)' }} />
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--primary)' }}>
              חדשות כדורסל
            </h1>
          </div>
          <p className="text-sm text-gray-600">
            עדכוני ליגות, סיכומי משחקים וכל החדשות מעולם הכדורסל הישראלי
          </p>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {posts.map((post) => {
            const featuredImage = getFeaturedImage(post);
            const excerpt = stripHtml(post.excerpt.rendered);
            
            return (
              <Card 
                key={post.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              >
                {/* Featured Image */}
                {featuredImage && (
                  <div className="relative h-48 md:h-56 overflow-hidden">
                    <img 
                      src={featuredImage} 
                      alt={stripHtml(post.title.rendered)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  </div>
                )}
                
                <CardContent className="p-4 md:p-5">
                  {/* Date */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(post.date)}</span>
                  </div>
                  
                  {/* Title */}
                  <h2 className="text-lg md:text-xl font-bold mb-3 line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
                    {stripHtml(post.title.rendered)}
                  </h2>
                  
                  {/* Excerpt */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {excerpt}
                  </p>
                  
                  {/* Read More Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full group-hover:bg-[var(--accent)] group-hover:text-white transition-colors"
                    onClick={() => window.open(post.link, '_blank')}
                  >
                    <span>קרא עוד</span>
                    <ExternalLink className="w-4 h-4 mr-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="mt-8 text-center">
            <Button
              onClick={loadMore}
              disabled={loading}
              size="lg"
              style={{ backgroundColor: 'var(--accent)' }}
              className="px-8"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 ml-2 animate-spin" />
                  טוען...
                </>
              ) : (
                'טען עוד כתבות'
              )}
            </Button>
          </div>
        )}

        {/* End Message */}
        {!hasMore && posts.length > 0 && (
          <p className="text-center text-gray-500 mt-8 text-sm">
            זהו, הגעת לסוף הכתבות 🏀
          </p>
        )}
      </div>
    </div>
  );
};

export default News;
