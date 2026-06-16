import { Fragment } from "react";

const items = [
  "Digital Guidebooks",
  "AI Concierge 24/7",
  "One link, every guest",
  "Custom Branding",
  "Upsell Store",
  "Host Inbox",
  "One-Click PDF Conversion",
  "QR Codes",
  "Local Recommendations",
  "Analytics Dashboard",
  "Offline-Ready PWA",
  "Setup in 10 minutes",
  "Multiple Languages",
  "No App Download",
  "Password Protected",
] as const;

export function FeatureTicker() {
  const loop = [...items, ...items];

  return (
    <div className="landing-ticker" aria-label="GuestNix platform highlights">
      <div className="landing-ticker-track">
        {loop.map((item, index) => (
          <Fragment key={`${item}-${index}`}>
            {index > 0 ? (
              <span className="ticker-separator" aria-hidden="true">
                <svg
                  viewBox="0 0 383 497"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  focusable="false"
                >
                  <path
                    d="M354.897 494.923L200.215 422.125C197.471 420.855 194.418 420.192 191.319 420.192C188.22 420.192 185.167 420.855 182.423 422.125L27.7413 494.923C24.8576 496.203 21.6527 496.82 18.4253 496.716C15.1979 496.612 12.0529 495.789 9.2836 494.326C6.51425 492.862 4.2106 490.805 2.58732 488.346C0.964032 485.887 0.0739459 483.106 0 480.262V16.8513C0 12.3821 2.01568 8.09586 5.60361 4.93563C9.19153 1.7754 14.0578 0 19.1319 0H363.506C368.58 0 373.446 1.7754 377.034 4.93563C380.622 8.09586 382.638 12.3821 382.638 16.8513V480.262C382.564 483.106 381.674 485.887 380.051 488.346C378.427 490.805 376.124 492.862 373.354 494.326C370.585 495.789 367.44 496.612 364.213 496.716C360.985 496.82 357.78 496.203 354.897 494.923Z"
                    fill="#6FEF8B"
                  />
                </svg>
              </span>
            ) : null}
            <span className="ticker-item">{item}</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
