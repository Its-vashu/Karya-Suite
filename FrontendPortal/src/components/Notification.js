import React, { useState } from 'react';

const Notification = ({ notifications, onDismiss, onDismissAll }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!notifications || notifications.length === 0 || !isVisible) {
    return null;
  }

  const handleDismiss = (id) => {
    if (onDismiss) {
      onDismiss(id);
    }
  };

  const handleDismissAll = () => {
    if (onDismissAll) {
      onDismissAll();
    }
    setIsVisible(false);
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      {/* Notification Header */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 flex justify-between items-center">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            🔔 Notifications
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleDismissAll}
              className="text-xs px-2 py-1 bg-white/20 rounded hover:bg-white/30 transition-colors"
            >
              Dismiss All
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="text-white hover:text-gray-300 text-lg"
            >
              ×
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`px-4 py-3 border-b border-gray-100 last:border-b-0 ${
                notification.type === 'error' ? 'bg-red-50 border-l-4 border-l-red-500' :
                notification.type === 'warning' ? 'bg-yellow-50 border-l-4 border-l-yellow-500' :
                notification.type === 'success' ? 'bg-green-50 border-l-4 border-l-green-500' :
                'bg-blue-50 border-l-4 border-l-blue-500'
              }`}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">
                      {notification.type === 'error' ? '❌' :
                       notification.type === 'warning' ? '⚠️' :
                       notification.type === 'success' ? '✅' :
                       '💭'}
                    </span>
                    <h4 className="font-medium text-sm text-gray-800">
                      {notification.title}
                    </h4>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {notification.message}
                  </p>
                  {notification.timestamp && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                  {notification.actionButton && (
                    <button
                      onClick={notification.actionButton.onClick}
                      className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                    >
                      {notification.actionButton.text}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleDismiss(notification.id)}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Notification;
