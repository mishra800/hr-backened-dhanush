export default function DetailModal({ isOpen, onClose, title, data, children }) {
  if (!isOpen) return null;

  const renderData = () => {
    if (children) return children;
    
    if (!data) return <p className="text-gray-500">No data available</p>;

    if (Array.isArray(data)) {
      return (
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              {Object.entries(item).map(([key, value]) => (
                <div key={key} className="flex justify-between py-1">
                  <span className="font-medium text-gray-700 capitalize">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <span className="text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    if (typeof data === 'object') {
      return (
        <div className="space-y-2">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex justify-between py-2 border-b border-gray-100">
              <span className="font-medium text-gray-700 capitalize">
                {key.replace(/_/g, ' ')}:
              </span>
              <span className="text-gray-900">
                {typeof value === 'object' ? JSON.stringify(value) : value}
              </span>
            </div>
          ))}
        </div>
      );
    }

    return <pre className="text-sm text-gray-700">{JSON.stringify(data, null, 2)}</pre>;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 max-h-96 overflow-y-auto">
            {renderData()}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
