const betaFlag = process.env.NEXT_PUBLIC_BETA_ENABLED?.trim().toLowerCase();

export const BETA_ENABLED =
  !betaFlag || !["false", "0", "off", "no"].includes(betaFlag);

export const BETA_TRIAL_EXTENSION_FORM_URL =
  process.env.NEXT_PUBLIC_BETA_TRIAL_EXTENSION_FORM_URL?.trim() ||
  "https://forms.gle/JDGt4okrVXpWJn1w6";

export const BETA_TRIAL_EXTENSION_COPY =
  "Share beta feedback or report a bug to request one extra trial week.";

export const BETA_STATUS_TOOLTIP =
  "Currently in beta. Enjoy premium features without limitations. You may see occasional bugs or errors; don't panic, contact the site admin and we'll help.";
