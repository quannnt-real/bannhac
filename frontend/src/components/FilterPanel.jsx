import React from 'react';
import { X, ArrowUpDown } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const FilterPanel = ({ show, onClose, sortConfig, onSortChange, types, topics, chords = [], filters, onFilterChange, showSort = true }) => {
  const sortFields = [
    { value: 'key_chord', label: 'Hợp âm' },
    { value: 'type_name', label: 'Thể loại' },
    { value: 'topic_name', label: 'Chủ đề' },
    { value: 'title', label: 'Tên bài hát' },
    { value: 'created_date', label: 'Ngày tạo' }
  ];

  const handleQuickSort = (field) => {
    const existingSorts = [...sortConfig.sorts];
    const existingIndex = existingSorts.findIndex(sort => sort.field === field);
    
    if (existingIndex !== -1) {
      // Nếu field đã tồn tại, đổi order
      existingSorts[existingIndex] = {
        ...existingSorts[existingIndex],
        order: existingSorts[existingIndex].order === 'asc' ? 'desc' : 'asc'
      };
    } else {
      // Nếu field chưa tồn tại, thêm vào cuối với order 'asc'
      existingSorts.push({ field, order: 'asc' });
    }
    
    onSortChange({ sorts: existingSorts });
  };

  const removeSort = (field) => {
    onSortChange({
      sorts: sortConfig.sorts.filter(sort => sort.field !== field)
    });
  };

  const getSortStatus = (field) => {
    const sort = sortConfig.sorts.find(s => s.field === field);
    if (!sort) return null;
    
    const index = sortConfig.sorts.findIndex(s => s.field === field);
    return {
      order: sort.order,
      priority: index + 1
    };
  };

  const quickSortButtons = [
    { field: 'key_chord', label: 'Hợp âm' },
    { field: 'title', label: 'Tên bài hát' },
    { field: 'type_name', label: 'Thể loại' },
    { field: 'topic_name', label: 'Chủ đề' }
  ];

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-end">
      <div className="w-full bg-white rounded-t-3xl shadow-2xl border-t border-blue-100 max-h-[80vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <CardTitle className="flex items-center gap-2 text-xl text-gray-800">
                <ArrowUpDown className="h-5 w-5 text-blue-500" />
                Sắp xếp bài hát
              </CardTitle>
              <Button onClick={onClose} variant="ghost" size="sm" className="p-2 mt-0 -mr-2">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Filters Section */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Bộ lọc</h3>
              
              {/* Type Filter */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-600 mb-2 block">Thể loại</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {types.map((type) => (
                    <label key={type.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.type_ids.includes(type.id)}
                        onChange={(e) => {
                          const newTypeIds = e.target.checked
                            ? [...filters.type_ids, type.id]
                            : filters.type_ids.filter(id => id !== type.id);
                          onFilterChange({ ...filters, type_ids: newTypeIds });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{type.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Topic Filter */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-600 mb-2 block">Chủ đề</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {topics.map((topic) => (
                    <label key={topic.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.topic_ids.includes(topic.id)}
                        onChange={(e) => {
                          const newTopicIds = e.target.checked
                            ? [...filters.topic_ids, topic.id]
                            : filters.topic_ids.filter(id => id !== topic.id);
                          onFilterChange({ ...filters, topic_ids: newTopicIds });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{topic.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Chord Filter */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-600 mb-2 block">Hợp âm</label>
                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {chords.map((chord) => (
                    <label key={chord} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.key_chords?.includes(chord) || false}
                        onChange={(e) => {
                          const newKeyChords = e.target.checked
                            ? [...(filters.key_chords || []), chord]
                            : (filters.key_chords || []).filter(c => c !== chord);
                          onFilterChange({ ...filters, key_chords: newKeyChords });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 font-mono">{chord}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear filters */}
              {(filters.type_ids.length > 0 || filters.topic_ids.length > 0 || (filters.key_chords && filters.key_chords.length > 0)) && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => onFilterChange({ type_ids: [], topic_ids: [], key_chords: [] })}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Xóa bộ lọc
                  </Button>
                </div>
              )}
            </div>

            {/* Sort Section - only show if showSort is true */}
            {showSort && (
              <>
                {/* Quick sort buttons */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Sắp xếp nhanh</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {quickSortButtons.map(({ field, label }) => {
                      const sortStatus = getSortStatus(field);
                      const isActive = sortStatus !== null;
                      
                      return (
                        <button
                          key={field}
                          onClick={() => handleQuickSort(field)}
                          className={`
                            px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative text-left
                            ${isActive 
                              ? 'bg-blue-100 text-blue-800 border-2 border-blue-200' 
                              : 'bg-gray-50 text-gray-600 border border-gray-300 hover:bg-gray-100'
                            }
                          `}
                        >
                          {label}
                          {isActive && (
                            <>
                              <span className="ml-2">
                                {sortStatus.order === 'asc' ? '↑ A-Z' : '↓ Z-A'}
                              </span>
                              {sortStatus.priority > 1 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                  {sortStatus.priority}
                                </span>
                              )}
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active sorts display */}
                {sortConfig.sorts.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-700">Sắp xếp hiện tại</h3>
                      <Button
                        onClick={() => onSortChange({ sorts: [] })}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50 h-8"
                      >
                        Xóa tất cả
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {sortConfig.sorts.map((sort, index) => {
                        const fieldLabels = {
                          key_chord: 'Hợp âm',
                          title: 'Tên bài hát', 
                          type_name: 'Thể loại',
                          topic_name: 'Chủ đề'
                        };
                        return (
                          <div key={sort.field} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                            <div className="flex-1">
                              <span className="font-medium text-gray-700">
                                {index + 1}. {fieldLabels[sort.field]}
                              </span>
                              <span className="ml-2 text-sm text-gray-500">
                                ({sort.order === 'asc' ? 'A → Z' : 'Z → A'})
                              </span>
                            </div>
                            <Button
                              onClick={() => removeSort(sort.field)}
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2 flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FilterPanel;