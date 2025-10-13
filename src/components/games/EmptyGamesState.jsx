import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Upload, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EmptyGamesState({ hasFilters, onClearFilters }) {
  if (hasFilters) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)' }}>
          <Search className="w-10 h-10" style={{ color: 'var(--accent)' }} />
        </div>
        <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
          לא נמצאו משחקים
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          לא נמצאו משחקים התואמים את החיפוש. נסה לשנות את הסינון.
        </p>
        <Button
          onClick={onClearFilters}
          className="text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          נקה סינון
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)' }}>
        <Calendar className="w-10 h-10" style={{ color: 'var(--accent)' }} />
      </div>
      <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary)' }}>
        אין משחקים עדיין
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        התחל על ידי ייבוא לוח המשחקים מקובץ CSV.
      </p>
      <Link to={createPageUrl("Import")}>
        <Button className="text-white" style={{ backgroundColor: 'var(--accent)' }}>
          <Upload className="w-4 h-4 ml-2" />
          ייבא משחקים
        </Button>
      </Link>
    </div>
  );
}