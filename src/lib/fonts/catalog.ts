export type FontCategory =
  | "sans-serif"
  | "serif"
  | "display"
  | "handwriting"
  | "monospace";

export type FontEntry = {
  family: string;
  category: FontCategory;
  weights: number[];
  italics?: boolean;
  recommend?: "heading" | "body" | "both";
};

export type CustomFontFormat = "woff2" | "woff" | "ttf" | "otf";

export type CustomFont = {
  /** Display family name. Also used verbatim as the CSS font-family. */
  family: string;
  source: "google" | "upload";
  /** Public URL for uploaded fonts (Supabase Storage). */
  url?: string;
  /** File format — used for the `@font-face src` format() hint. */
  format?: CustomFontFormat;
  /** Optional declared weights. Falls back to [400, 700] when omitted. */
  weights?: number[];
  italics?: boolean;
};

const DEFAULT_CUSTOM_WEIGHTS = [400, 700];

export const FONT_CATALOG: FontEntry[] = [
  { family: "Montserrat", category: "sans-serif", weights: [300, 400, 500, 600, 700, 800], italics: true, recommend: "both" },
  { family: "Inter", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "DM Sans", category: "sans-serif", weights: [400, 500, 700], recommend: "both" },
  { family: "Manrope", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Plus Jakarta Sans", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Work Sans", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Poppins", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Nunito", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Quicksand", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Outfit", category: "sans-serif", weights: [300, 400, 500, 600, 700], recommend: "both" },
  { family: "Lato", category: "sans-serif", weights: [400, 700], recommend: "body" },
  { family: "Open Sans", category: "sans-serif", weights: [400, 600, 700], recommend: "body" },
  { family: "Raleway", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Space Grotesk", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Karla", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Be Vietnam Pro", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Sora", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Figtree", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Albert Sans", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "IBM Plex Sans", category: "sans-serif", weights: [300, 400, 500, 600, 700], recommend: "both" },
  { family: "Public Sans", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Mulish", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Rubik", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Hind", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Cabin", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Onest", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Hanken Grotesk", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Urbanist", category: "sans-serif", weights: [300, 400, 500, 600, 700], recommend: "both" },
  { family: "Lexend", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Geologica", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Schibsted Grotesk", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Asap", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "PT Sans", category: "sans-serif", weights: [400, 700], recommend: "body" },
  { family: "Noto Sans", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Spline Sans", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Wix Madefor Text", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Inter Tight", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Rethink Sans", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Roboto", category: "sans-serif", weights: [300, 400, 500, 700, 900], recommend: "both" },
  { family: "Roboto Flex", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Source Sans 3", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Noto Sans Display", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "PT Sans Narrow", category: "sans-serif", weights: [400, 700], recommend: "heading" },
  { family: "Titillium Web", category: "sans-serif", weights: [400, 600, 700], recommend: "body" },
  { family: "Barlow", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Barlow Condensed", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Barlow Semi Condensed", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Heebo", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Assistant", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Saira", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Saira Condensed", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Saira Semi Condensed", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Saira Extra Condensed", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Archivo", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Archivo Narrow", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Yantramanav", category: "sans-serif", weights: [400, 500, 700], recommend: "body" },
  { family: "Chivo", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Maven Pro", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Dosis", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Encode Sans", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Encode Sans Condensed", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Exo 2", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Exo", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Cuprum", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Catamaran", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Kanit", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Prompt", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Mukta", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Mukta Vaani", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Tajawal", category: "sans-serif", weights: [400, 500, 700], recommend: "body" },
  { family: "Cairo", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Quattrocento Sans", category: "sans-serif", weights: [400, 700], recommend: "body" },
  { family: "Josefin Sans", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Fira Sans", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Fira Sans Condensed", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Overpass", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "M PLUS 1p", category: "sans-serif", weights: [400, 500, 700], recommend: "body" },
  { family: "M PLUS Rounded 1c", category: "sans-serif", weights: [400, 500, 700], recommend: "body" },
  { family: "Varela Round", category: "sans-serif", weights: [400], recommend: "body" },
  { family: "Comme", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Sen", category: "sans-serif", weights: [400, 700], recommend: "body" },
  { family: "Signika", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Signika Negative", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Antic", category: "sans-serif", weights: [400], recommend: "body" },
  { family: "Sarabun", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Asap Condensed", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Oxygen", category: "sans-serif", weights: [400, 700], recommend: "body" },
  { family: "Yanone Kaffeesatz", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Roboto Condensed", category: "sans-serif", weights: [400, 700], recommend: "heading" },
  { family: "Inter Display", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "DM Sans Display", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Outfit Variable", category: "sans-serif", weights: [300, 400, 500, 600, 700], recommend: "both" },
  { family: "Instrument Sans", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },
  { family: "Familjen Grotesk", category: "sans-serif", weights: [400, 500, 600, 700], recommend: "both" },

  { family: "Fraunces", category: "serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Playfair Display", category: "serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Cormorant Garamond", category: "serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Lora", category: "serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Merriweather", category: "serif", weights: [400, 700], recommend: "body" },
  { family: "EB Garamond", category: "serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Crimson Pro", category: "serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Source Serif 4", category: "serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Libre Caslon Text", category: "serif", weights: [400, 700], recommend: "body" },
  { family: "DM Serif Display", category: "serif", weights: [400], recommend: "heading" },
  { family: "Libre Baskerville", category: "serif", weights: [400, 700], recommend: "body" },
  { family: "Cardo", category: "serif", weights: [400, 700], recommend: "body" },
  { family: "Spectral", category: "serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Bitter", category: "serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "PT Serif", category: "serif", weights: [400, 700], recommend: "body" },
  { family: "Vollkorn", category: "serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Newsreader", category: "serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Gilda Display", category: "serif", weights: [400], recommend: "heading" },
  { family: "Ibarra Real Nova", category: "serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Forum", category: "serif", weights: [400], recommend: "heading" },
  { family: "Marcellus", category: "serif", weights: [400], recommend: "heading" },
  { family: "Bodoni Moda", category: "serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Crimson Text", category: "serif", weights: [400, 600, 700], recommend: "body" },
  { family: "Cinzel", category: "serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Tinos", category: "serif", weights: [400, 700], recommend: "body" },
  { family: "Yrsa", category: "serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Cormorant Infant", category: "serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Cormorant", category: "serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Cormorant SC", category: "serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Playfair", category: "serif", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Italianno", category: "serif", weights: [400], recommend: "heading" },
  { family: "Old Standard TT", category: "serif", weights: [400, 700], recommend: "body" },
  { family: "Sorts Mill Goudy", category: "serif", weights: [400], recommend: "body" },
  { family: "Domine", category: "serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Arvo", category: "serif", weights: [400, 700], recommend: "body" },
  { family: "Roboto Slab", category: "serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Zilla Slab", category: "serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Alegreya", category: "serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Alegreya SC", category: "serif", weights: [400, 500, 700], recommend: "heading" },
  { family: "Source Serif Pro", category: "serif", weights: [400, 600, 700], recommend: "body" },
  { family: "Noticia Text", category: "serif", weights: [400, 700], recommend: "body" },
  { family: "Volkhov", category: "serif", weights: [400, 700], recommend: "body" },
  { family: "Rozha One", category: "serif", weights: [400], recommend: "heading" },
  { family: "Gloock", category: "serif", weights: [400], recommend: "heading" },
  { family: "Prata", category: "serif", weights: [400], recommend: "heading" },
  { family: "Tenor Sans", category: "serif", weights: [400], recommend: "heading" },
  { family: "Cantata One", category: "serif", weights: [400], recommend: "heading" },
  { family: "Della Respira", category: "serif", weights: [400], recommend: "heading" },
  { family: "Holtwood One SC", category: "serif", weights: [400], recommend: "heading" },
  { family: "Caudex", category: "serif", weights: [400, 700], recommend: "body" },
  { family: "Quattrocento", category: "serif", weights: [400, 700], recommend: "body" },
  { family: "Andada Pro", category: "serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Petrona", category: "serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Literata", category: "serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Suranna", category: "serif", weights: [400], recommend: "heading" },
  { family: "Cantarell", category: "serif", weights: [400, 700], recommend: "body" },
  { family: "Trirong", category: "serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Buenard", category: "serif", weights: [400, 700], recommend: "body" },
  { family: "Goudy Bookletter 1911", category: "serif", weights: [400], recommend: "body" },
  { family: "Instrument Serif", category: "serif", weights: [400], recommend: "heading" },
  { family: "Young Serif", category: "serif", weights: [400], recommend: "heading" },
  { family: "Eczar", category: "serif", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Caladea", category: "serif", weights: [400, 700], recommend: "body" },
  { family: "Imbue", category: "serif", weights: [400, 500, 600, 700], recommend: "heading" },

  { family: "Bebas Neue", category: "display", weights: [400], recommend: "heading" },
  { family: "Abril Fatface", category: "display", weights: [400], recommend: "heading" },
  { family: "Archivo Black", category: "display", weights: [400], recommend: "heading" },
  { family: "Anton", category: "display", weights: [400], recommend: "heading" },
  { family: "Oswald", category: "display", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Righteous", category: "display", weights: [400], recommend: "heading" },
  { family: "Unbounded", category: "display", weights: [400, 600, 700], recommend: "heading" },
  { family: "Bricolage Grotesque", category: "display", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Syne", category: "display", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Big Shoulders Display", category: "display", weights: [400, 600, 700], recommend: "heading" },
  { family: "Yeseva One", category: "display", weights: [400], recommend: "heading" },
  { family: "Lobster", category: "display", weights: [400], recommend: "heading" },
  { family: "Comfortaa", category: "display", weights: [400, 500, 600, 700], recommend: "heading" },
  { family: "Russo One", category: "display", weights: [400], recommend: "heading" },
  { family: "Alfa Slab One", category: "display", weights: [400], recommend: "heading" },
  { family: "Yatra One", category: "display", weights: [400], recommend: "heading" },
  { family: "Audiowide", category: "display", weights: [400], recommend: "heading" },
  { family: "Six Caps", category: "display", weights: [400], recommend: "heading" },
  { family: "Limelight", category: "display", weights: [400], recommend: "heading" },
  { family: "Bungee", category: "display", weights: [400], recommend: "heading" },
  { family: "Monoton", category: "display", weights: [400], recommend: "heading" },
  { family: "Italiana", category: "display", weights: [400], recommend: "heading" },
  { family: "Chonburi", category: "display", weights: [400], recommend: "heading" },
  { family: "Cherry Bomb One", category: "display", weights: [400], recommend: "heading" },
  { family: "Krona One", category: "display", weights: [400], recommend: "heading" },
  { family: "Staatliches", category: "display", weights: [400], recommend: "heading" },
  { family: "Stardos Stencil", category: "display", weights: [400, 700], recommend: "heading" },
  { family: "Black Ops One", category: "display", weights: [400], recommend: "heading" },
  { family: "Bowlby One", category: "display", weights: [400], recommend: "heading" },
  { family: "Bowlby One SC", category: "display", weights: [400], recommend: "heading" },
  { family: "Codystar", category: "display", weights: [400, 300], recommend: "heading" },
  { family: "Carter One", category: "display", weights: [400], recommend: "heading" },
  { family: "Concert One", category: "display", weights: [400], recommend: "heading" },
  { family: "Fugaz One", category: "display", weights: [400], recommend: "heading" },
  { family: "Faster One", category: "display", weights: [400], recommend: "heading" },
  { family: "Flavors", category: "display", weights: [400], recommend: "heading" },
  { family: "Frijole", category: "display", weights: [400], recommend: "heading" },
  { family: "Goblin One", category: "display", weights: [400], recommend: "heading" },
  { family: "Henny Penny", category: "display", weights: [400], recommend: "heading" },
  { family: "Hammersmith One", category: "display", weights: [400], recommend: "heading" },
  { family: "Modak", category: "display", weights: [400], recommend: "heading" },
  { family: "Mountains of Christmas", category: "display", weights: [400, 700], recommend: "heading" },
  { family: "Press Start 2P", category: "display", weights: [400], recommend: "heading" },
  { family: "Plaster", category: "display", weights: [400], recommend: "heading" },
  { family: "Risque", category: "display", weights: [400], recommend: "heading" },
  { family: "Slackey", category: "display", weights: [400], recommend: "heading" },
  { family: "Special Elite", category: "display", weights: [400], recommend: "heading" },
  { family: "Sigmar", category: "display", weights: [400], recommend: "heading" },
  { family: "Wallpoet", category: "display", weights: [400], recommend: "heading" },
  { family: "Vampiro One", category: "display", weights: [400], recommend: "heading" },
  { family: "VT323", category: "display", weights: [400], recommend: "heading" },
  { family: "Zen Dots", category: "display", weights: [400], recommend: "heading" },

  { family: "Caveat", category: "handwriting", weights: [400, 600, 700], recommend: "heading" },
  { family: "Pacifico", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Dancing Script", category: "handwriting", weights: [400, 600, 700], recommend: "heading" },
  { family: "Sacramento", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Great Vibes", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Allura", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Kalam", category: "handwriting", weights: [400, 700], recommend: "heading" },
  { family: "Shadows Into Light", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Patrick Hand", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Indie Flower", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Satisfy", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Homemade Apple", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Architects Daughter", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Amatic SC", category: "handwriting", weights: [400, 700], recommend: "heading" },
  { family: "Cookie", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Marck Script", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Parisienne", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Tangerine", category: "handwriting", weights: [400, 700], recommend: "heading" },
  { family: "Permanent Marker", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Reenie Beanie", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Rock Salt", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Gloria Hallelujah", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Sue Ellen Francisco", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Walter Turncoat", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Schoolbell", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Just Another Hand", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Coming Soon", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Mr Dafoe", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Mrs Saint Delafield", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Pinyon Script", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Petit Formal Script", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Yellowtail", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Bilbo", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Birthstone", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Birthstone Bounce", category: "handwriting", weights: [400, 500], recommend: "heading" },
  { family: "Damion", category: "handwriting", weights: [400], recommend: "heading" },
  { family: "Bad Script", category: "handwriting", weights: [400], recommend: "heading" },

  { family: "JetBrains Mono", category: "monospace", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Fira Code", category: "monospace", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "IBM Plex Mono", category: "monospace", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Space Mono", category: "monospace", weights: [400, 700], recommend: "body" },
  { family: "Roboto Mono", category: "monospace", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Source Code Pro", category: "monospace", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Inconsolata", category: "monospace", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Cousine", category: "monospace", weights: [400, 700], recommend: "body" },
  { family: "Ubuntu Mono", category: "monospace", weights: [400, 700], recommend: "body" },
  { family: "Anonymous Pro", category: "monospace", weights: [400, 700], recommend: "body" },
  { family: "DM Mono", category: "monospace", weights: [400, 500], recommend: "body" },
  { family: "Geist Mono", category: "monospace", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Azeret Mono", category: "monospace", weights: [400, 500, 600, 700], recommend: "body" },
  { family: "Cutive Mono", category: "monospace", weights: [400], recommend: "body" },
  { family: "PT Mono", category: "monospace", weights: [400], recommend: "body" },
  { family: "Major Mono Display", category: "monospace", weights: [400], recommend: "heading" },
];

export const CATEGORY_LABELS: Record<FontCategory, string> = {
  "sans-serif": "Sans",
  serif: "Serif",
  display: "Display",
  handwriting: "Handwriting",
  monospace: "Mono",
};

export function findFont(family: string): FontEntry | null {
  if (!family) return null;
  const exact = FONT_CATALOG.find((f) => f.family === family);
  if (exact) return exact;
  const lower = family.toLowerCase();
  return FONT_CATALOG.find((f) => f.family.toLowerCase() === lower) ?? null;
}

/** Look up a custom font (Google-added or uploaded) by family name. */
export function findCustomFont(
  family: string,
  customFonts: CustomFont[] | undefined | null
): CustomFont | null {
  if (!family || !customFonts || customFonts.length === 0) return null;
  const exact = customFonts.find((f) => f.family === family);
  if (exact) return exact;
  const lower = family.toLowerCase();
  return customFonts.find((f) => f.family.toLowerCase() === lower) ?? null;
}

/**
 * Synthesize a FontEntry from a CustomFont so picker UI and weight helpers
 * can treat it uniformly. Uploaded fonts default to a sans-serif fallback
 * since we don't know their classification.
 */
export function customToFontEntry(font: CustomFont): FontEntry {
  return {
    family: font.family,
    category: "sans-serif",
    weights:
      Array.isArray(font.weights) && font.weights.length > 0
        ? font.weights
        : DEFAULT_CUSTOM_WEIGHTS,
    italics: font.italics ?? false,
  };
}

/**
 * Resolve a family name to a FontEntry, checking custom fonts first then the
 * catalog. Use this anywhere the UI needs to render a preview swatch or look
 * up category metadata without caring whether the font is custom.
 */
export function resolveFontEntry(
  family: string,
  customFonts?: CustomFont[] | null
): FontEntry | null {
  const custom = findCustomFont(family, customFonts);
  if (custom) return customToFontEntry(custom);
  return findFont(family);
}

/**
 * Return the available weights for a font family. Falls back to the standard
 * 6-step palette when the family isn't in our catalog (e.g. a future custom
 * font), so the UI still works.
 */
export function getAvailableWeights(
  family: string,
  customFonts?: CustomFont[] | null
): number[] {
  const custom = findCustomFont(family, customFonts);
  if (custom) {
    return Array.isArray(custom.weights) && custom.weights.length > 0
      ? custom.weights
      : DEFAULT_CUSTOM_WEIGHTS;
  }
  const entry = findFont(family);
  if (entry && entry.weights.length > 0) return entry.weights;
  return [300, 400, 500, 600, 700, 800];
}

/**
 * Snap a desired weight to the nearest available weight for a font. Used when
 * the host switches from a multi-weight font to one with fewer weights — we
 * don't want to leave font-weight: 700 set on a single-weight typeface and
 * trigger browser-synthesized bold.
 */
export function snapWeightToFont(
  desired: number,
  family: string,
  customFonts?: CustomFont[] | null
): number {
  const weights = getAvailableWeights(family, customFonts);
  if (weights.includes(desired)) return desired;
  let nearest = weights[0];
  let bestDelta = Math.abs(desired - nearest);
  for (const w of weights) {
    const delta = Math.abs(desired - w);
    if (delta < bestDelta) {
      bestDelta = delta;
      nearest = w;
    }
  }
  return nearest;
}

/**
 * Build a Google Fonts CSS2 URL for a list of font families.
 *
 * Families are matched against the curated catalog first; any family that is
 * not in the catalog but exists in `customFonts` with `source: "google"` is
 * included with the host-declared weights/italics (so hosts can opt into any
 * Google Font, not just the curated list).
 *
 * Uploaded custom fonts are skipped here — they load via `@font-face` from
 * `buildFontFaceCss()` instead.
 *
 * Returns null when nothing resolves to a Google-loadable family.
 */
export function buildGoogleFontsHref(
  families: string[],
  customFonts?: CustomFont[] | null
): string | null {
  const seen = new Set<string>();
  const params: string[] = [];

  for (const raw of families) {
    if (!raw) continue;

    const custom = findCustomFont(raw, customFonts);
    if (custom) {
      if (custom.source !== "google") continue;
      if (seen.has(custom.family)) continue;
      seen.add(custom.family);

      const weights =
        Array.isArray(custom.weights) && custom.weights.length > 0
          ? [...custom.weights].sort((a, b) => a - b)
          : DEFAULT_CUSTOM_WEIGHTS;
      const familyEncoded = custom.family.replace(/\s+/g, "+");
      if (custom.italics) {
        const tuples = weights.flatMap((w) => [`0,${w}`, `1,${w}`]).join(";");
        params.push(`family=${familyEncoded}:ital,wght@${tuples}`);
      } else {
        params.push(`family=${familyEncoded}:wght@${weights.join(";")}`);
      }
      continue;
    }

    const entry = findFont(raw);
    if (!entry) continue;
    if (seen.has(entry.family)) continue;
    seen.add(entry.family);

    const familyEncoded = entry.family.replace(/\s+/g, "+");
    if (entry.italics) {
      const tuples = entry.weights.flatMap((w) => [`0,${w}`, `1,${w}`]).join(";");
      params.push(`family=${familyEncoded}:ital,wght@${tuples}`);
    } else {
      params.push(`family=${familyEncoded}:wght@${entry.weights.join(";")}`);
    }
  }

  if (params.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${params.join("&")}&display=swap`;
}

/**
 * Build a CSS string of `@font-face` rules for uploaded custom fonts.
 * Returns an empty string when there are no uploads to register.
 */
export function buildFontFaceCss(
  customFonts?: CustomFont[] | null
): string {
  if (!customFonts || customFonts.length === 0) return "";

  const rules: string[] = [];
  for (const font of customFonts) {
    if (font.source !== "upload") continue;
    if (!font.url) continue;

    const formatHint = font.format ? `format("${cssFormat(font.format)}")` : "";
    const src = formatHint
      ? `url("${escapeCssUrl(font.url)}") ${formatHint}`
      : `url("${escapeCssUrl(font.url)}")`;

    rules.push(
      `@font-face{font-family:"${escapeCssString(font.family)}";` +
        `src:${src};` +
        `font-display:swap;` +
        `font-style:normal;` +
        `font-weight:100 900;}`
    );
  }

  return rules.join("");
}

function cssFormat(format: CustomFontFormat): string {
  switch (format) {
    case "woff2":
      return "woff2";
    case "woff":
      return "woff";
    case "ttf":
      return "truetype";
    case "otf":
      return "opentype";
  }
}

function escapeCssUrl(value: string): string {
  return value.replace(/"/g, '\\"');
}

function escapeCssString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
