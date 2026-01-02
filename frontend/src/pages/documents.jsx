import { useState } from 'react';

export default function Documents() {
  const [documents] = useState([
    { id: 1, name: 'Employee Handbook.pdf', type: 'Policy', date: '2024-01-15', size: '2.5 MB' },
    { id: 2, name: 'Offer Letter.pdf', type: 'Contract', date: '2024-02-20', size: '156 KB' },
    { id: 3, name: 'Tax Form W-4.pdf', type: 'Tax', date: '2024-01-10', size: '89 KB' },
    { id: 4, name: 'Benefits Guide.pdf', type: 'Benefits', date: '2024-01-15', size: '1.8 MB' },
  ]);

  const [filter, setFilter] = useState('all');

  const filteredDocs = filter === 'all' 
    ? documents 
    : documents.filter(doc => doc.type.toLowerCase() === filter.toLowerCase());

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Documents</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Upload Document
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('policy')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'policy' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Policies
          </button>
          <button
            onClick={() => setFilter('contract')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'contract' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Contracts
          </button>
          <button
            onClick={() => setFilter('tax')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'tax' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Tax Forms
          </button>
        </div>

        <div className="space-y-3">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{doc.name}</h3>
                  <p className="text-sm text-gray-500">
                    {doc.type} • {doc.date} • {doc.size}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded">
                  View
                </button>
                <button className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded">
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredDocs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No documents found
          </div>
        )}
      </div>
    </div>
  );
}
