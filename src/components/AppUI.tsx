'use client';

import { useState, useEffect } from 'react';
import { Exercise, MelData, Inject } from '@/types';
import { Settings, Download, FileText, Eye, EyeOff, Edit3, Save, RotateCcw, Edit, Check, X } from 'lucide-react';

interface AppUIProps {
  exercise: Exercise | null;
  onExerciseUpdate?: (exercise: Exercise | null) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  prompt?: string;
  onPromptChange?: (prompt: string) => void;
  melData?: MelData | null;
  onMelUpdate?: (injects: Inject[]) => void;
}

export const AppUI = ({ exercise, apiKey, onApiKeyChange, prompt, onPromptChange, melData, onMelUpdate }: AppUIProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(prompt || '');
  const [hasPromptChanges, setHasPromptChanges] = useState(false);
  const [editingInjects, setEditingInjects] = useState<{[key: string]: boolean}>({});
  const [editedValues, setEditedValues] = useState<{[key: string]: Inject}>({});

  // Use MEL data if available, otherwise fall back to exercise data
  const displayInjects = melData?.injects || exercise?.injects || [];
  const hasInjects = displayInjects.length > 0;

  // Initialize editing prompt when prompt prop changes
  useEffect(() => {
    if (prompt) {
      setEditingPrompt(prompt);
    }
  }, [prompt]);

  const handlePromptChange = (newPrompt: string) => {
    setEditingPrompt(newPrompt);
    setHasPromptChanges(newPrompt !== prompt);
  };

  const savePrompt = () => {
    if (onPromptChange) {
      onPromptChange(editingPrompt);
      setHasPromptChanges(false);
    }
  };

  const resetPrompt = () => {
    setEditingPrompt(prompt || '');
    setHasPromptChanges(false);
  };

  // Inject editing functions
  const startEditingInject = (injectId: string, inject: Inject) => {
    setEditingInjects(prev => ({ ...prev, [injectId]: true }));
    setEditedValues(prev => ({ ...prev, [injectId]: { ...inject } }));
  };

  const cancelEditingInject = (injectId: string) => {
    setEditingInjects(prev => {
      const newState = { ...prev };
      delete newState[injectId];
      return newState;
    });
    setEditedValues(prev => {
      const newState = { ...prev };
      delete newState[injectId];
      return newState;
    });
  };

  const saveInjectEdit = (injectId: string) => {
    if (!editedValues[injectId] || !onMelUpdate) return;

    const updatedInjects = displayInjects.map(inject => 
      inject.id === injectId ? editedValues[injectId] : inject
    );

    onMelUpdate(updatedInjects);
    
    setEditingInjects(prev => {
      const newState = { ...prev };
      delete newState[injectId];
      return newState;
    });
    setEditedValues(prev => {
      const newState = { ...prev };
      delete newState[injectId];
      return newState;
    });
  };

  const updateEditedValue = (injectId: string, field: string, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [injectId]: {
        ...prev[injectId],
        [field]: value
      }
    }));
  };

  const downloadExercise = () => {
    const dataToDownload = melData?.injects || exercise?.injects;
    if (!dataToDownload) return;
    
    const dataStr = JSON.stringify(dataToDownload, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const fileName = melData 
      ? `MEL_v${melData.version}_${melData.melId.slice(0, 8)}.json`
      : `${exercise?.title.replace(/\s+/g, '_')}_exercise.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', fileName);
    linkElement.click();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Exercise Editor</h1>
          {melData && (
            <p className="text-sm text-gray-600">
              MEL v{melData.version} • {melData.totalInjects} injects • ID: {melData.melId.slice(0, 8)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPromptEditor(!showPromptEditor)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
            title="Edit Lisa's Prompt"
          >
            <Edit3 size={20} />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings size={20} />
          </button>
          {(exercise || melData) && (
            <button
              onClick={downloadExercise}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
              title="Download Exercise JSON"
            >
              <Download size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-green-50 border-b border-green-200">
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <label className="block text-sm font-medium text-gray-700">
                OpenAI API Key Status
              </label>
            </div>
            <p className="text-sm text-green-700 mb-3">
              ✅ API Key configured in environment (.env.local)
            </p>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder="Optional: Override with custom API key..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              The API key is already configured. You can optionally override it here.
            </p>
          </div>
        </div>
      )}

      {/* Prompt Editor Panel */}
      {showPromptEditor && (
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-800">Lisa&apos;s Prompt Editor</h3>
              <div className="flex items-center gap-2">
                {hasPromptChanges && (
                  <span className="text-sm text-blue-600 font-medium">• Unsaved changes</span>
                )}
                <button
                  onClick={resetPrompt}
                  disabled={!hasPromptChanges}
                  className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Reset to current prompt"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  onClick={savePrompt}
                  disabled={!hasPromptChanges}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  title="Save prompt changes"
                >
                  <Save size={16} className="inline mr-1" />
                  Save
                </button>
              </div>
            </div>
            <textarea
              value={editingPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder="Enter Lisa's system prompt..."
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-mono text-sm"
              style={{ minHeight: '200px' }}
            />
            <p className="text-xs text-gray-500 mt-2">
              This prompt defines Lisa&apos;s behavior, workflow, and response format. Changes take effect immediately after saving.
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-auto">
        {(exercise || hasInjects) ? (
          <div className="space-y-6">
            {/* Exercise Info */}
            {exercise && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">{exercise.title}</h2>
                <p className="text-gray-600 mb-2"><strong>Scenario:</strong> {exercise.scenario}</p>
                <p className="text-gray-600 mb-2"><strong>Job Function:</strong> {exercise.jobFunction}</p>
                <p className="text-gray-600"><strong>Organisation:</strong> {exercise.organisation}</p>
              </div>
            )}

            {/* MEL Events Overview */}
            {melData && melData.events.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Events Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {melData.events.map((event) => (
                    <div key={event.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                      <h4 className="font-medium text-gray-800 mb-2">{event.name}</h4>
                      <p className="text-sm text-gray-600">{event.injectCount} injects</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Events Overview (legacy) */}
            {exercise?.events && exercise.events.length > 0 && !melData && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Events Overview</h3>
                <div className="space-y-4">
                  {exercise.events.map((event, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-2">{event.name}</h4>
                      <p className="text-gray-600 mb-3">{event.description}</p>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-gray-700 mb-2">Consequences:</h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {event.consequences.map((consequence, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                                {consequence}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-gray-700 mb-2">Player Actions:</h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {event.playerActions.map((action, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Injects Table with Editing */}
            {hasInjects && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {melData ? 'MEL Injects' : 'Exercise Injects'}
                  </h3>
                  {melData && (
                    <div className="text-sm text-gray-600">
                      Last updated: {new Date(melData.timestamp).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">Actions</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faction</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {displayInjects.map((inject, index) => {
                        const injectId = inject.id || `inject-${index}`;
                        const isEditing = editingInjects[injectId];
                        const editedInject = editedValues[injectId] || inject;
                        
                        return (
                          <tr key={injectId} className={`hover:bg-gray-50 ${isEditing ? 'bg-blue-50' : ''}`}>
                            <td className="px-2 py-3 text-sm">
                              {isEditing ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => saveInjectEdit(injectId)}
                                    className="p-1 text-green-600 hover:text-green-800"
                                    title="Save changes"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => cancelEditingInject(injectId)}
                                    className="p-1 text-red-600 hover:text-red-800"
                                    title="Cancel editing"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEditingInject(injectId, inject)}
                                  className="p-1 text-gray-600 hover:text-gray-800"
                                  title="Edit inject"
                                >
                                  <Edit size={14} />
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{editedInject.Serial}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{editedInject.Number}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editedInject.Time}
                                  onChange={(e) => updateEditedValue(injectId, 'Time', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              ) : (
                                editedInject.Time
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editedInject.From}
                                  onChange={(e) => updateEditedValue(injectId, 'From', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              ) : (
                                editedInject.From
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editedInject.Faction}
                                  onChange={(e) => updateEditedValue(injectId, 'Faction', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              ) : (
                                editedInject.Faction
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{editedInject.Method}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editedInject.Subject}
                                  onChange={(e) => updateEditedValue(injectId, 'Subject', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              ) : (
                                editedInject.Subject
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {isEditing ? (
                                <textarea
                                  value={editedInject.Message}
                                  onChange={(e) => updateEditedValue(injectId, 'Message', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded resize-none"
                                  rows={2}
                                />
                              ) : (
                                <div className="max-w-xs truncate" title={editedInject.Message}>
                                  {editedInject.Message}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileText size={64} className="mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No Exercise Created</h3>
            <p className="text-center max-w-md">
              Start a conversation with Lisa in the chat panel to create your first crisis management exercise.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
