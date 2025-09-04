import React from 'react';
import { X, ArrowUpDown, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const FilterPanel = ({ show, onClose, sortConfig, onSortChange, onClearSort }) => {
  const sortFields = [
    { value: 'key_chord', label: 'Hợp âm' },
    { value: 'type_name', label: 'Thể loại' },
    { value: 'topic_name', label: 'Chủ đề' },
    { value: 'title', label: 'Tên bài hát' },
    { value: 'created_date', label: 'Ngày tạo' }
  ];

  const sortOrders = [
    { value: 'asc', label: 'A → Z' },
    { value: 'desc', label: 'Z → A' }
  ];

  const handlePrimarySortChange = (field, order) => {
    onSortChange(prev => ({
      ...prev,
      primary: { field, order }
    }));
  };

  const handleSecondarySortChange = (field, order) => {
    onSortChange(prev => ({
      ...prev,
      secondary: { field, order }
    }));
  };

  const quickSorts = [
    { label: 'Hợp âm A→Z', primary: { field: 'key_chord', order: 'asc' } },
    { label: 'Hợp âm Z→A', primary: { field: 'key_chord', order: 'desc' } },
    { label: 'Thể loại A→Z', primary: { field: 'type_name', order: 'asc' } },
    { label: 'Thể loại Z→A', primary: { field: 'type_name', order: 'desc' } },
    { label: 'Tên bài A→Z', primary: { field: 'title', order: 'asc' } },
    { label: 'Tên bài Z→A', primary: { field: 'title', order: 'desc' } }
  ];

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-end">
      <div className="w-full bg-white rounded-t-3xl shadow-2xl border-t border-blue-100 max-h-[80vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl text-gray-800">
                <ArrowUpDown className="h-5 w-5 text-blue-500" />
                Sắp xếp bài hát
              </CardTitle>
              <Button onClick={onClose} variant="ghost" size="sm" className="p-2">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Quick sort buttons */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Sắp xếp nhanh</h3>
              <div className="grid grid-cols-2 gap-2">
                {quickSorts.map((sort, index) => (
                  <Button
                    key={index}
                    onClick={() => onSortChange({ primary: sort.primary, secondary: { field: '', order: 'asc' } })}
                    variant="outline"
                    className="text-sm justify-start border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                  >
                    {sort.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom sort */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Sắp xếp tùy chỉnh</h3>
              
              {/* Primary sort */}
              <div className="space-y-3 mb-4">
                <label className="text-sm font-medium text-gray-600">Sắp xếp chính</label>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    value={sortConfig.primary.field}
                    onValueChange={(field) => handlePrimarySortChange(field, sortConfig.primary.order)}
                  >
                    <SelectTrigger className="border-blue-200">
                      <SelectValue placeholder="Chọn trường" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Không chọn --</SelectItem>
                      {sortFields.map(field => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={sortConfig.primary.order}
                    onValueChange={(order) => handlePrimarySortChange(sortConfig.primary.field, order)}
                    disabled={!sortConfig.primary.field}
                  >
                    <SelectTrigger className="border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOrders.map(order => (
                        <SelectItem key={order.value} value={order.value}>
                          {order.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Secondary sort */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-600">Sắp xếp phụ (tùy chọn)</label>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    value={sortConfig.secondary.field}
                    onValueChange={(field) => handleSecondarySortChange(field, sortConfig.secondary.order)}
                  >
                    <SelectTrigger className="border-blue-200">
                      <SelectValue placeholder="Chọn trường" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Không chọn --</SelectItem>
                      {sortFields.filter(field => field.value !== sortConfig.primary.field).map(field => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={sortConfig.secondary.order}
                    onValueChange={(order) => handleSecondarySortChange(sortConfig.secondary.field, order)}
                    disabled={!sortConfig.secondary.field}
                  >
                    <SelectTrigger className="border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOrders.map(order => (
                        <SelectItem key={order.value} value={order.value}>
                          {order.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button
                onClick={onClearSort}
                variant="outline"
                className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Xóa sắp xếp
              </Button>
              <Button
                onClick={onClose}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                Áp dụng
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FilterPanel;