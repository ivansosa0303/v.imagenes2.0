
import { ItemCategory } from './types';

export const ALL_CATEGORIES: ItemCategory[] = [
  ItemCategory.ESCENA,
  ItemCategory.PERSONAJE,
  ItemCategory.ENTORNO,
  ItemCategory.OBJETO_IMPORTANTE,
  ItemCategory.TECNOLOGIA,
  ItemCategory.EVENTO,
];

export const AVERAGE_WORDS_PER_SCENE = 250;

export const DEFAULT_IMAGE_PROMPT_SUFFIX = "Dark moody aesthetic, cinematic lighting, ultra-realistic details, professional digital painting, high resolution.";

export const GEMINI_TEXT_MODEL = "gemini-2.5-flash-preview-04-17";
export const GEMINI_IMAGE_MODEL = "imagen-3.0-generate-002";

export const API_KEY_ERROR_MESSAGE = "Gemini API Key not found. Please set the API_KEY environment variable or enter it below. The key is required to use this application.";

export const INITIAL_TEXT_AREA_PLACEHOLDER = `Pega aquí tu capítulo...

Ejemplo:

El sol moribundo de Xylos proyectaba largas sombras sobre las ruinas de la Antigua Ciudad. Kaelen, el último de los Guardianes Estelares, ajustó su capa raída y observó el horizonte. Un temblor recorrió la tierra; la Bestia Cósmica se acercaba. Su única arma, la Lanza de Fragmentos Estelares, brillaba débilmente en su mano. Era una reliquia de un poder casi olvidado, forjada en el corazón de una estrella moribunda.

"Debo proteger el Nulificador", susurró, su voz apenas audible contra el viento gélido. El Nulificador, un artefacto de inmenso poder capaz de silenciar galaxias enteras, era la última esperanza y la mayor amenaza.

En el cielo, una fisura de energía pura se abrió, anunciando la llegada de la criatura. Tenía múltiples ojos llameantes y una forma que desafiaba la geometría conocida. Kaelen se preparó para la batalla final.
`;

export const PLACEHOLDER_IMAGE_IDENTIFIER = "placeholder_image_identifier";
