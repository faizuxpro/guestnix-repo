/**
 * Curated traveler phrasebook. Each language gets a set of common phrases
 * grouped by category so hosts can show the categories most relevant to
 * their property.
 */

export type PhrasebookCategory =
  | "greetings"
  | "dining"
  | "transport"
  | "emergency"
  | "shopping"
  | "directions";

export type Phrase = {
  en: string;
  local: string;
  pronunciation?: string;
};

export type PhrasebookLanguage = {
  code: string; // ISO 639-1
  name: string; // Display name in English
  endonym: string; // Name in the language itself
  categories: Partial<Record<PhrasebookCategory, Phrase[]>>;
};

export const PHRASEBOOK_LANGUAGES: PhrasebookLanguage[] = [
  {
    code: "es",
    name: "Spanish",
    endonym: "Español",
    categories: {
      greetings: [
        { en: "Hello", local: "Hola", pronunciation: "OH-lah" },
        { en: "Good morning", local: "Buenos días" },
        { en: "Thank you", local: "Gracias", pronunciation: "GRAH-syas" },
        { en: "Please", local: "Por favor" },
        { en: "Excuse me", local: "Perdón" },
        { en: "Yes / No", local: "Sí / No" },
      ],
      dining: [
        { en: "A table for two", local: "Una mesa para dos" },
        { en: "The menu, please", local: "El menú, por favor" },
        { en: "The check, please", local: "La cuenta, por favor" },
        { en: "I'm vegetarian", local: "Soy vegetariano(a)" },
        { en: "Water (still / sparkling)", local: "Agua (sin gas / con gas)" },
      ],
      transport: [
        { en: "Where is the metro?", local: "¿Dónde está el metro?" },
        { en: "Can you call a taxi?", local: "¿Puede llamar un taxi?" },
        { en: "How much is the fare?", local: "¿Cuánto cuesta el viaje?" },
      ],
      emergency: [
        { en: "Help!", local: "¡Ayuda!" },
        { en: "I need a doctor", local: "Necesito un médico" },
        { en: "Call the police", local: "Llame a la policía" },
      ],
      shopping: [
        { en: "How much?", local: "¿Cuánto cuesta?" },
        { en: "Can I pay with card?", local: "¿Puedo pagar con tarjeta?" },
        { en: "Do you have a smaller size?", local: "¿Tiene una talla más pequeña?" },
      ],
      directions: [
        { en: "Where is...?", local: "¿Dónde está...?" },
        { en: "On the left / right", local: "A la izquierda / derecha" },
        { en: "Straight ahead", local: "Todo recto" },
      ],
    },
  },
  {
    code: "fr",
    name: "French",
    endonym: "Français",
    categories: {
      greetings: [
        { en: "Hello", local: "Bonjour" },
        { en: "Good evening", local: "Bonsoir" },
        { en: "Thank you", local: "Merci" },
        { en: "Please", local: "S'il vous plaît" },
        { en: "Excuse me", local: "Excusez-moi" },
        { en: "Yes / No", local: "Oui / Non" },
      ],
      dining: [
        { en: "A table for two", local: "Une table pour deux" },
        { en: "The menu, please", local: "La carte, s'il vous plaît" },
        { en: "The check, please", local: "L'addition, s'il vous plaît" },
        { en: "I'm vegetarian", local: "Je suis végétarien(ne)" },
        { en: "Water (still / sparkling)", local: "Eau (plate / gazeuse)" },
      ],
      transport: [
        { en: "Where is the metro?", local: "Où est le métro ?" },
        { en: "Can you call a taxi?", local: "Pouvez-vous appeler un taxi ?" },
        { en: "How much is the fare?", local: "Combien coûte le trajet ?" },
      ],
      emergency: [
        { en: "Help!", local: "Au secours !" },
        { en: "I need a doctor", local: "J'ai besoin d'un médecin" },
        { en: "Call the police", local: "Appelez la police" },
      ],
      shopping: [
        { en: "How much?", local: "Combien ça coûte ?" },
        { en: "Can I pay with card?", local: "Puis-je payer par carte ?" },
      ],
      directions: [
        { en: "Where is...?", local: "Où est... ?" },
        { en: "On the left / right", local: "À gauche / à droite" },
        { en: "Straight ahead", local: "Tout droit" },
      ],
    },
  },
  {
    code: "it",
    name: "Italian",
    endonym: "Italiano",
    categories: {
      greetings: [
        { en: "Hello", local: "Ciao" },
        { en: "Good morning", local: "Buongiorno" },
        { en: "Thank you", local: "Grazie" },
        { en: "Please", local: "Per favore" },
        { en: "Excuse me", local: "Scusi" },
        { en: "Yes / No", local: "Sì / No" },
      ],
      dining: [
        { en: "A table for two", local: "Un tavolo per due" },
        { en: "The check, please", local: "Il conto, per favore" },
        { en: "I'm vegetarian", local: "Sono vegetariano(a)" },
        { en: "Water (still / sparkling)", local: "Acqua (naturale / frizzante)" },
      ],
      transport: [
        { en: "Where is the train station?", local: "Dov'è la stazione?" },
        { en: "Can you call a taxi?", local: "Può chiamare un taxi?" },
      ],
      emergency: [
        { en: "Help!", local: "Aiuto!" },
        { en: "I need a doctor", local: "Ho bisogno di un medico" },
      ],
      shopping: [
        { en: "How much?", local: "Quanto costa?" },
        { en: "Can I pay with card?", local: "Posso pagare con la carta?" },
      ],
    },
  },
  {
    code: "pt",
    name: "Portuguese",
    endonym: "Português",
    categories: {
      greetings: [
        { en: "Hello", local: "Olá" },
        { en: "Thank you", local: "Obrigado / Obrigada" },
        { en: "Please", local: "Por favor" },
        { en: "Yes / No", local: "Sim / Não" },
      ],
      dining: [
        { en: "A table for two", local: "Uma mesa para dois" },
        { en: "The check, please", local: "A conta, por favor" },
        { en: "I'm vegetarian", local: "Sou vegetariano(a)" },
      ],
      emergency: [
        { en: "Help!", local: "Socorro!" },
        { en: "I need a doctor", local: "Preciso de um médico" },
      ],
      shopping: [{ en: "How much?", local: "Quanto custa?" }],
    },
  },
  {
    code: "de",
    name: "German",
    endonym: "Deutsch",
    categories: {
      greetings: [
        { en: "Hello", local: "Hallo" },
        { en: "Good morning", local: "Guten Morgen" },
        { en: "Thank you", local: "Danke" },
        { en: "Please", local: "Bitte" },
        { en: "Yes / No", local: "Ja / Nein" },
      ],
      dining: [
        { en: "A table for two", local: "Einen Tisch für zwei" },
        { en: "The check, please", local: "Die Rechnung, bitte" },
        { en: "I'm vegetarian", local: "Ich bin Vegetarier(in)" },
      ],
      emergency: [
        { en: "Help!", local: "Hilfe!" },
        { en: "I need a doctor", local: "Ich brauche einen Arzt" },
      ],
      shopping: [{ en: "How much?", local: "Wie viel kostet das?" }],
      directions: [
        { en: "Where is...?", local: "Wo ist...?" },
        { en: "Straight ahead", local: "Geradeaus" },
      ],
    },
  },
  {
    code: "ja",
    name: "Japanese",
    endonym: "日本語",
    categories: {
      greetings: [
        { en: "Hello", local: "こんにちは", pronunciation: "kon-nichi-wa" },
        { en: "Thank you", local: "ありがとう", pronunciation: "arigatō" },
        { en: "Please", local: "お願いします", pronunciation: "onegaishimasu" },
        { en: "Yes / No", local: "はい / いいえ", pronunciation: "hai / iie" },
      ],
      dining: [
        { en: "The check, please", local: "お会計お願いします", pronunciation: "okaikei onegaishimasu" },
        { en: "Delicious!", local: "美味しい!", pronunciation: "oishii!" },
      ],
      emergency: [
        { en: "Help!", local: "助けて!", pronunciation: "tasukete!" },
        { en: "Call an ambulance", local: "救急車を呼んでください", pronunciation: "kyūkyūsha o yonde kudasai" },
      ],
    },
  },
  {
    code: "zh",
    name: "Mandarin Chinese",
    endonym: "中文",
    categories: {
      greetings: [
        { en: "Hello", local: "你好", pronunciation: "nǐ hǎo" },
        { en: "Thank you", local: "谢谢", pronunciation: "xièxie" },
        { en: "Yes / No", local: "是 / 不是", pronunciation: "shì / bú shì" },
      ],
      dining: [
        { en: "The check, please", local: "买单", pronunciation: "mǎi dān" },
      ],
      emergency: [
        { en: "Help!", local: "救命!", pronunciation: "jiù mìng!" },
      ],
      shopping: [
        { en: "How much?", local: "多少钱?", pronunciation: "duō shǎo qián?" },
      ],
    },
  },
  {
    code: "ar",
    name: "Arabic",
    endonym: "العربية",
    categories: {
      greetings: [
        { en: "Hello", local: "مرحبا", pronunciation: "marhaba" },
        { en: "Thank you", local: "شكرا", pronunciation: "shukran" },
        { en: "Please", local: "من فضلك", pronunciation: "min fadlak" },
      ],
      dining: [
        { en: "The check, please", local: "الحساب، من فضلك", pronunciation: "al-hisaab, min fadlak" },
      ],
      emergency: [
        { en: "Help!", local: "النجدة!", pronunciation: "an-najda!" },
      ],
    },
  },
];

export function getPhrasebookLanguage(code: string): PhrasebookLanguage | undefined {
  return PHRASEBOOK_LANGUAGES.find((l) => l.code === code);
}
