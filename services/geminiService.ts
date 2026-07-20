import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  // Utilise la variable d'environnement Vite standard (définie dans .env.local)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Clé API Gemini manquante. Définissez VITE_GEMINI_API_KEY dans .env.local");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateCommunicationDraft = async (
  topic: string,
  audience: string,
  tone: string
): Promise<string> => {
  const client = getClient();
  if (!client) return "Erreur: Clé API manquante.";

  try {
    const prompt = `
      Tu es un assistant administratif pour une école. Rédige un message court, professionnel et clair.
      
      Sujet : ${topic}
      Public cible : ${audience}
      Ton : ${tone}
      
      Le message doit être prêt à être envoyé (email ou notification). Ne mets pas de texte avant ou après le message.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Aucune réponse générée.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Une erreur est survenue lors de la génération du message.";
  }
};

export const analyzeFinancialTip = async (
    income: number,
    expenses: number
): Promise<string> => {
    const client = getClient();
    if (!client) return "Impossible de générer un conseil.";

    try {
        const prompt = `
          En tant qu'expert financier pour une école, donne un conseil stratégique d'une phrase basé sur ces chiffres du mois :
          Revenus : ${income} €
          Dépenses : ${expenses} €
          
          Sois concis et constructif.
        `;

        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        return response.text || "Analyse indisponible.";
    } catch (e) {
        return "Analyse indisponible pour le moment.";
    }
}