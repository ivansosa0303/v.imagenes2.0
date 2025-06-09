
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { TextInputArea } from './components/TextInputArea';
import { ResultsGallery } from './components/ResultsGallery';
import { StoryPlayerView } from './components/StoryPlayerView';
import { FeedbackModal } from './components/FeedbackModal'; // New Import
import { GeminiService } from './services/geminiService';
import type { ProcessedItem, GeminiAnalysisResponse, ExtractedScene, ExtractedEntity, UserEditableItemFields } from './types';
import { ItemCategory, SortOption } from './types';
import { DEFAULT_IMAGE_PROMPT_SUFFIX, API_KEY_ERROR_MESSAGE, PLACEHOLDER_IMAGE_IDENTIFIER } from './constants';
import { PlayIcon } from './components/icons/PlayIcon';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [processedItems, setProcessedItems] = useState<ProcessedItem[]>([]);
  const [currentChapterText, setCurrentChapterText] = useState<string>('');
  
  const [activeFilters, setActiveFilters] = useState<Set<ItemCategory>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.APPEARANCE);

  const [geminiServiceInstance, setGeminiServiceInstance] = useState<GeminiService | null>(null);

  // Story Player State
  const [isStoryPlayerActive, setIsStoryPlayerActive] = useState<boolean>(false);

  // Feedback Modal State
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const envApiKey = process.env.API_KEY;
    if (envApiKey) {
      setApiKey(envApiKey);
      setGeminiServiceInstance(new GeminiService(envApiKey));
      setApiKeyError('');
    } else {
      setApiKeyError(API_KEY_ERROR_MESSAGE);
      console.warn(API_KEY_ERROR_MESSAGE);
    }
  }, []);

  const handleApiKeySubmit = (submittedKey: string) => {
    if (submittedKey.trim()) {
      setApiKey(submittedKey.trim());
      setGeminiServiceInstance(new GeminiService(submittedKey.trim()));
      setApiKeyError('');
    } else {
      setApiKeyError('API Key cannot be empty.');
    }
  };

  const handleProcessChapter = useCallback(async (text: string) => {
    if (!geminiServiceInstance) {
      setError('Gemini Service not initialized. Please check API Key.');
      return;
    }
    if (!text.trim()) {
      setError('Chapter text cannot be empty.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProcessedItems([]);
    setCurrentChapterText(text);

    try {
      const analysis: GeminiAnalysisResponse | null = await geminiServiceInstance.analyzeNarrativeText(text);
      if (!analysis) {
        setError('Failed to analyze narrative text. The response was empty or invalid.');
        setIsLoading(false);
        return;
      }
      
      const itemsToProcess: (ExtractedScene | ExtractedEntity)[] = [...analysis.scenes, ...analysis.entities];
      const initialProcessedItems: ProcessedItem[] = itemsToProcess.map((item, index) => ({
        id: item.id || `item-${Date.now()}-${index}`,
        title: (item as ExtractedScene).title || (item as ExtractedEntity).name,
        description: (item as ExtractedScene).summary || `Visual for ${ (item as ExtractedEntity).name}`,
        category: item.category,
        originalPrompt: item.visualDescriptionPrompt,
        tags: [item.category],
        isGenerating: true,
      }));
      setProcessedItems(initialProcessedItems);
      setIsLoading(false); 

      for (let i = 0; i < initialProcessedItems.length; i++) {
        const item = initialProcessedItems[i];
        try {
          const imagePrompt = `${item.originalPrompt} ${DEFAULT_IMAGE_PROMPT_SUFFIX}`;
          const imageDataUrlOrPlaceholder = await geminiServiceInstance.generateImage(imagePrompt);
          
          setProcessedItems(prev => prev.map(pItem => 
            pItem.id === item.id ? { ...pItem, imageUrl: imageDataUrlOrPlaceholder, isGenerating: false } : pItem
          ));

          if (imageDataUrlOrPlaceholder === PLACEHOLDER_IMAGE_IDENTIFIER) {
            console.warn(`Image generation failed for "${item.title}", using placeholder.`);
          }
        } catch (imgError) {
          console.error(`Unexpected error during image generation for ${item.title}:`, imgError);
          setError(prevError => `${prevError ? prevError + '; ' : ''}Unexpected error for ${item.title}.`);
          setProcessedItems(prev => prev.map(pItem => 
            pItem.id === item.id ? { ...pItem, isGenerating: false, imageUrl: PLACEHOLDER_IMAGE_IDENTIFIER } : pItem 
          ));
        }
      }

    } catch (e: any) {
      console.error("Error processing chapter:", e);
      setError(e.message || 'An unknown error occurred during chapter processing.');
      setIsLoading(false);
    }
  }, [geminiServiceInstance]);

  const handleRegenerateImage = useCallback(async (itemId: string) => {
    if (!geminiServiceInstance) {
      setError('Gemini Service not initialized.');
      return;
    }
    const itemIndex = processedItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;

    const itemToRegenerate = processedItems[itemIndex];
    setProcessedItems(prev => prev.map(pItem => 
      pItem.id === itemId ? { ...pItem, isGenerating: true, imageUrl: undefined } : pItem
    ));
    setError(null);

    try {
      const promptSource = itemToRegenerate.description.length > 20 ? itemToRegenerate.description : itemToRegenerate.originalPrompt;
      const imagePrompt = `${promptSource} ${DEFAULT_IMAGE_PROMPT_SUFFIX}`;
      const imageDataUrlOrPlaceholder = await geminiServiceInstance.generateImage(imagePrompt);
      setProcessedItems(prev => prev.map(pItem => 
        pItem.id === itemId ? { ...pItem, imageUrl: imageDataUrlOrPlaceholder, isGenerating: false } : pItem
      ));
      if (imageDataUrlOrPlaceholder === PLACEHOLDER_IMAGE_IDENTIFIER) {
        console.warn(`Image regeneration failed for "${itemToRegenerate.title}", using placeholder.`);
        setError(`Image regeneration failed for "${itemToRegenerate.title}", showing placeholder. This might be due to API limits.`);
      }
    } catch (e: any) {
      console.error(`Unexpected error regenerating image for ${itemToRegenerate.title}:`, e);
      setError(`Unexpected error regenerating image for ${itemToRegenerate.title}: ${e.message}`);
      setProcessedItems(prev => prev.map(pItem => 
        pItem.id === itemId ? { ...pItem, isGenerating: false, imageUrl: PLACEHOLDER_IMAGE_IDENTIFIER } : pItem
      ));
    }
  }, [geminiServiceInstance, processedItems]);

  const handleUpdateItem = useCallback((itemId: string, updates: UserEditableItemFields) => {
    setProcessedItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));
  }, []);

  const handleNewChapter = useCallback(() => {
    setCurrentChapterText('');
    setProcessedItems([]);
    setError(null);
    setIsLoading(false);
    setActiveFilters(new Set());
    setSearchTerm('');
    setSortOption(SortOption.APPEARANCE);
    setIsStoryPlayerActive(false);
  }, []);

  // Feedback Modal Handlers
  const handleOpenFeedbackModal = useCallback(() => {
    setIsFeedbackModalOpen(true);
  }, []);

  const handleCloseFeedbackModal = useCallback(() => {
    setIsFeedbackModalOpen(false);
  }, []);

  const handleSubmitFeedback = useCallback((feedbackText: string) => {
    console.log("Feedback submitted:", feedbackText);
    // In a real app, you would send this to a server or analytics service
    setIsFeedbackModalOpen(false);
    // Optionally, show a success message
  }, []);


  const itemsForPlayer = useMemo(() => {
    return processedItems.filter(item => item.imageUrl);
  }, [processedItems]);

  const filteredAndSortedItems = useMemo(() => {
    let items = [...processedItems];
    if (activeFilters.size > 0) {
      items = items.filter(item => activeFilters.has(item.category));
    }
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      items = items.filter(item => 
        item.title.toLowerCase().includes(lowerSearchTerm) || 
        item.description.toLowerCase().includes(lowerSearchTerm)
      );
    }
    switch (sortOption) {
      case SortOption.TITLE:
        items.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case SortOption.CATEGORY:
        items.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
        break;
      case SortOption.APPEARANCE:
      default:
        break;
    }
    return items;
  }, [processedItems, activeFilters, searchTerm, sortOption]);

  if (apiKeyError && !apiKey) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
          <h1 className="text-2xl font-bold text-center text-rose-400 mb-4">API Key Required</h1>
          <p className="text-center mb-6">{apiKeyError}</p>
          <p className="text-sm text-gray-400 mb-1">Please enter your Gemini API Key to use the application.</p>
          <p className="text-xs text-gray-500 mb-4">This key is used only in your browser and is not stored or sent anywhere other than to Google's Gemini API.</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const keyInput = (e.target as HTMLFormElement).elements.namedItem('apiKeyInput') as HTMLInputElement;
            handleApiKeySubmit(keyInput.value);
          }} className="space-y-4">
            <input 
              type="password"
              name="apiKeyInput"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none placeholder-gray-500"
              placeholder="Enter your API Key"
            />
            <button 
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3 px-4 rounded-md transition duration-150 ease-in-out"
            >
              Submit Key
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isStoryPlayerActive) {
    return (
      <StoryPlayerView
        items={itemsForPlayer} 
        onClose={() => setIsStoryPlayerActive(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col">
      <Header onNewChapter={handleNewChapter} onOpenFeedbackModal={handleOpenFeedbackModal} />
      <main className="flex-grow container mx-auto px-4 py-8 space-y-8">
        <TextInputArea onProcess={handleProcessChapter} isLoading={isLoading} initialText={currentChapterText} />
        {error && (
          <div className="bg-red-800 border border-red-700 text-red-100 px-4 py-3 rounded-md relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {processedItems.length > 0 && !isLoading && (
          <div className="my-6 text-center">
            <button
              onClick={() => setIsStoryPlayerActive(true)}
              className="bg-teal-500 hover:bg-teal-400 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-opacity-75 flex items-center mx-auto"
              disabled={itemsForPlayer.length === 0}
            >
              <PlayIcon className="h-6 w-6 mr-2" />
              Reproducir Historia Ilustrada
            </button>
            {itemsForPlayer.length === 0 && processedItems.length > 0 && <p className="text-sm text-gray-500 mt-2">Esperando que se generen imágenes o placeholders para reproducir la historia.</p>}
          </div>
        )}

        <ResultsGallery
          items={filteredAndSortedItems}
          isLoading={isLoading && processedItems.length === 0}
          onRegenerate={handleRegenerateImage}
          onUpdateItem={handleUpdateItem}
          activeFilters={activeFilters}
          setActiveFilters={setActiveFilters}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortOption={sortOption}
          setSortOption={setSortOption}
        />
      </main>
      <FeedbackModal 
        isOpen={isFeedbackModalOpen}
        onClose={handleCloseFeedbackModal}
        onSubmit={handleSubmitFeedback}
      />
      <footer className="text-center py-4 text-gray-500 text-sm border-t border-gray-700">
        Visualizador Narrativo de Capítulos © {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;