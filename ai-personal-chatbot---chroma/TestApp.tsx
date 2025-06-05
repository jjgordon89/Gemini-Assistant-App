// Test Application for Enhanced Features
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import EnhancedFeaturesDemo from './components/EnhancedFeaturesDemo';

const TestApp: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">
            Chroma AI - Enhanced Features Test
          </h1>
        </nav>
        
        <main>
          <Routes>
            <Route path="/" element={<EnhancedFeaturesDemo />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default TestApp;
