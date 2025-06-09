
export enum ItemCategory {
  PERSONAJE = "Personaje",
  ENTORNO = "Entorno",
  ESCENA = "Escena",
  TECNOLOGIA = "Tecnología",
  EVENTO = "Evento",
  OBJETO_IMPORTANTE = "ObjetoImportante",
}

export interface ExtractedScene {
  id: string;
  title: string;
  summary: string; // Used for initial description
  visualDescriptionPrompt: string; // Used for image generation
  category: ItemCategory.ESCENA; // Fixed for scenes
}

export interface ExtractedEntity {
  id: string;
  name: string; // Used for title
  category: ItemCategory; // Personaje, Entorno, Tecnologia, Evento, ObjetoImportante
  visualDescriptionPrompt: string; // Used for image generation
}

export interface GeminiAnalysisResponse {
  scenes: ExtractedScene[];
  entities: ExtractedEntity[];
}

export interface UserEditableItemFields {
  title?: string;
  description?: string;
}

export interface ProcessedItem extends UserEditableItemFields {
  id: string;
  title: string; // From scene.title or entity.name, editable
  description: string; // Initially from scene.summary or generated for entity, editable
  category: ItemCategory;
  originalPrompt: string; // The visualDescriptionPrompt from Gemini text call
  imageUrl?: string; // base64 data URL from Gemini Image API
  tags: string[]; // e.g., [category, keyword1, keyword2]
  isGenerating?: boolean; // For loading state on individual card
}

export enum SortOption {
  APPEARANCE = "appearance",
  CATEGORY = "category",
  TITLE = "title",
}
    